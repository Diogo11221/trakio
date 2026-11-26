"""
Suggestions for a PT about one student, worked out from the student's own data. Each one has
a plain-language reason with the numbers behind it and one action the PT can apply or ignore.
Deterministic on purpose: a PT must be able to see why a suggestion appeared.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal

from pydantic import BaseModel, Field

from trakio_ai.readiness import ReadinessModel, ReadinessRequest, SessionIn


class InsightsRequest(BaseModel):
    first_name: str = Field(max_length=80)
    now: datetime
    sessions: list[SessionIn] = Field(default_factory=list, max_length=500)
    workouts_done: int = Field(ge=0)
    workouts_expected: int = Field(ge=0)
    stalled_exercises: list[str] = Field(default_factory=list, max_length=20)


class Suggestion(BaseModel):
    kind: Literal["light-week", "home-workout", "variation"]
    title: str
    body: str
    action: str
    priority: int


class InsightsResponse(BaseModel):
    readiness: int
    suggestions: list[Suggestion]


def _volume_change(sessions: list[SessionIn], now, weeks: int = 3) -> float | None:
    """
    % change of weekly volume: the last week against the average of the `weeks` before it.
    None unless the person trained in every one of those weeks — otherwise "more volume" only
    means "came back after missing weeks", not a load spike.
    """
    last = sum(s.volume_kg for s in sessions if now - timedelta(days=7) < s.finished_at <= now)
    before = [sum(s.volume_kg for s in sessions if now - timedelta(days=7 * (w + 1)) < s.finished_at <= now - timedelta(days=7 * w))
              for w in range(1, weeks + 1)]
    if any(v <= 0 for v in before):
        return None
    base = sum(before) / weeks
    return (last - base) / base * 100


def suggest(req: InsightsRequest, model: ReadinessModel) -> InsightsResponse:
    readiness = model.predict(ReadinessRequest(now=req.now, sessions=req.sessions))
    name = req.first_name.strip() or "O aluno"
    out: list[Suggestion] = []

    change = _volume_change(req.sessions, req.now)
    missing_workouts = req.workouts_expected >= 2 and req.workouts_done < req.workouts_expected * 0.7
    # Someone who is skipping workouts needs help to show up, not a lighter week.
    if not missing_workouts and (readiness.level == "rest" or (change is not None and change >= 15 and readiness.score < 70)):
        reason = f"O volume subiu {round(change)}% face às semanas anteriores" if change and change > 0 else "A carga recente está alta"
        out.append(Suggestion(
            kind="light-week", priority=1,
            title="Cansaço alto previsto",
            body=f"{reason} e a prontidão está em {readiness.score} de 100. Sugestão: uma semana mais leve, com menos uma série por exercício.",
            action="Aplicar semana leve"))

    if missing_workouts:
        missed = req.workouts_expected - req.workouts_done
        out.append(Suggestion(
            kind="home-workout", priority=2,
            title=f"Faltou {missed} {'treino' if missed == 1 else 'treinos'} nas últimas semanas",
            body=f"{name} fez {req.workouts_done} de {req.workouts_expected} treinos previstos. Sugestão: enviar um treino de 30 minutos para fazer em casa.",
            action="Enviar treino em casa"))

    if req.stalled_exercises:
        exercise = req.stalled_exercises[0]
        out.append(Suggestion(
            kind="variation", priority=3,
            title=f"{exercise} sem evolução há 3 semanas",
            body=f"A carga máxima estimada no {exercise.lower()} não sobe há 3 semanas. Sugestão: 2 semanas com uma variação antes de voltar a testar.",
            action="Aplicar variação"))

    return InsightsResponse(readiness=readiness.score, suggestions=sorted(out, key=lambda s: s.priority))
