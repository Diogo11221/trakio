"""
Readiness to train (0–100) from training load.

Features follow the acute:chronic workload idea: the last 7 days of volume against the weekly
average of the last 28, plus rest since the last session and how hard recent sessions felt.
A scikit-learn classifier predicts the chance that the next session feels "hard" or "at the
limit" (the feeling people log after every workout is the label); readiness = 100 × (1 − p).
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
from pydantic import BaseModel, Field

from trakio_ai.config import settings

log = logging.getLogger(__name__)

FEATURES = ["acwr", "acute_sets", "days_since_last", "sessions_7d", "hard_share_7d", "last_feeling", "monotony"]
FEELING_SCORE = {"easy": 0.0, "good": 1.0, "hard": 2.0, "max": 3.0}
MODEL_FILE = "readiness.joblib"


class SessionIn(BaseModel):
    finished_at: datetime
    volume_kg: float = Field(ge=0)
    sets: int = Field(ge=0)
    feeling: Literal["easy", "good", "hard", "max"] | None = None


class ReadinessRequest(BaseModel):
    now: datetime
    sessions: list[SessionIn] = Field(default_factory=list, max_length=500)
    sleep_hours: float | None = Field(default=None, ge=0, le=16)


class Factor(BaseModel):
    kind: str
    value: float


class ReadinessResponse(BaseModel):
    score: int
    level: Literal["ready", "steady", "rest"]
    days_since_last: int | None
    acwr: float | None
    factors: list[Factor]
    model: str


def features(req: ReadinessRequest) -> dict[str, float]:
    now = req.now
    past = sorted((s for s in req.sessions if s.finished_at <= now), key=lambda s: s.finished_at)
    week = [s for s in past if s.finished_at > now - timedelta(days=7)]
    month = [s for s in past if s.finished_at > now - timedelta(days=28)]
    acute = sum(s.volume_kg for s in week)
    # Weekly average over the history there is (1–4 weeks): someone who started 10 days ago
    # isn't compared against weeks in which they had no account yet.
    first = month[0].finished_at if month else now
    weeks = min(4.0, max(1.0, (now - first).total_seconds() / (7 * 86400)))
    chronic = sum(s.volume_kg for s in month) / weeks
    acwr = acute / chronic if chronic > 0 else (1.0 if acute == 0 else 1.5)
    days_since = (now - past[-1].finished_at).total_seconds() / 86400 if past else 14.0
    felt = [FEELING_SCORE[s.feeling] for s in week if s.feeling]
    hard_share = sum(1 for f in felt if f >= 2) / len(felt) if felt else 0.0
    last = FEELING_SCORE.get(past[-1].feeling, 1.0) if past and past[-1].feeling else 1.0
    daily = [sum(s.volume_kg for s in week if (now - s.finished_at).days == d) for d in range(7)]
    mean = float(np.mean(daily))
    monotony = mean / float(np.std(daily)) if np.std(daily) > 0 else 0.0
    return {
        "acwr": min(acwr, 3.0),
        "acute_sets": float(sum(s.sets for s in week)),
        "days_since_last": min(days_since, 14.0),
        "sessions_7d": float(len(week)),
        "hard_share_7d": hard_share,
        "last_feeling": last,
        "monotony": min(monotony, 5.0),
    }


@dataclass
class ReadinessModel:
    estimator: object
    version: str

    @classmethod
    def load(cls, directory: Path | None = None) -> "ReadinessModel":
        path = (directory or settings().model_dir) / MODEL_FILE
        if not path.exists():
            # First start: train the bootstrap model (seconds) and keep it.
            from trakio_ai.training import train_and_save
            train_and_save(path)
        bundle = joblib.load(path)
        return cls(estimator=bundle["model"], version=bundle["version"])

    def predict(self, req: ReadinessRequest) -> ReadinessResponse:
        f = features(req)
        x = np.array([[f[name] for name in FEATURES]])
        p_fatigue = float(self.estimator.predict_proba(x)[0][1])
        score = 100 * (1 - p_fatigue)
        # Sleep isn't in the training data yet (no watch integration): a light, explicit adjustment.
        if req.sleep_hours is not None and req.sleep_hours < 6:
            score -= (6 - req.sleep_hours) * 4
        score = int(round(min(98, max(20, score))))
        level = "ready" if score >= 75 else "steady" if score >= 55 else "rest"
        factors = sorted(
            [Factor(kind="load", value=round(f["acwr"], 2)), Factor(kind="rest-days", value=round(f["days_since_last"], 1)),
             Factor(kind="hard-sessions", value=round(f["hard_share_7d"], 2)), Factor(kind="sessions-7d", value=f["sessions_7d"])],
            key=lambda x: x.kind)
        has_history = any(s.finished_at <= req.now for s in req.sessions)
        return ReadinessResponse(score=score, level=level,
                                 days_since_last=int(math.floor(f["days_since_last"])) if has_history else None,
                                 acwr=round(f["acwr"], 2) if has_history else None, factors=factors, model=self.version)
