"""
Trains the readiness classifier.

Bootstrap (default): synthetic athletes whose chance of a hard session rises with a load
spike (acute:chronic ratio above ~1.3), little rest, a hard run of sessions and monotonous
training — the patterns described in sports-science load-monitoring work. It gives sensible
behaviour on day one and is replaced by real data as soon as there is enough of it:

    python -m trakio_ai.training --csv sessions.csv   # columns: FEATURES + label (1 = hard/max)
"""

from __future__ import annotations

import argparse
import csv
import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

from trakio_ai.readiness import FEATURES, MODEL_FILE

log = logging.getLogger(__name__)


def synthetic(n: int = 20000, seed: int = 7) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    acwr = np.clip(rng.lognormal(mean=0.0, sigma=0.35, size=n), 0.2, 3.0)
    sessions = rng.integers(0, 8, size=n).astype(float)
    acute_sets = np.clip(sessions * rng.normal(20, 6, size=n), 0, None)
    days_since = np.clip(rng.exponential(1.6, size=n), 0, 14)
    hard_share = np.clip(rng.beta(2, 4, size=n) + 0.08 * (acwr - 1), 0, 1)
    last_feeling = np.clip(np.round(rng.normal(1.1 + 0.6 * (acwr - 1), 0.8, size=n)), 0, 3)
    monotony = np.clip(rng.gamma(2.0, 0.6, size=n), 0, 5)
    logit = (-1.4 + 2.2 * np.clip(acwr - 1.3, 0, None) - 0.8 * np.clip(0.8 - acwr, 0, None)
             - 0.55 * np.minimum(days_since, 4) + 1.3 * hard_share + 0.45 * last_feeling
             + 0.25 * np.clip(sessions - 4, 0, None) + 0.3 * np.clip(monotony - 2, 0, None))
    p = 1 / (1 + np.exp(-logit))
    y = (rng.random(n) < p).astype(int)
    x = np.column_stack([acwr, acute_sets, days_since, sessions, hard_share, last_feeling, monotony])
    return x, y


def from_csv(path: Path) -> tuple[np.ndarray, np.ndarray]:
    with path.open() as f:
        rows = list(csv.DictReader(f))
    x = np.array([[float(r[name]) for name in FEATURES] for r in rows])
    y = np.array([int(r["label"]) for r in rows])
    return x, y


def train(x: np.ndarray, y: np.ndarray) -> tuple[HistGradientBoostingClassifier, float]:
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=1, stratify=y)
    # More load → more fatigue, more rest → less: monotonic constraints keep the model sane.
    monotonic = [1, 0, -1, 1, 1, 1, 1]
    model = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08, max_depth=4, monotonic_cst=monotonic,
                                           random_state=1)
    model.fit(x_train, y_train)
    auc = roc_auc_score(y_test, model.predict_proba(x_test)[:, 1])
    return model, float(auc)


def train_and_save(path: Path, csv_path: Path | None = None) -> float:
    x, y = from_csv(csv_path) if csv_path else synthetic()
    model, auc = train(x, y)
    path.parent.mkdir(parents=True, exist_ok=True)
    version = ("real" if csv_path else "bootstrap") + f"-auc{auc:.2f}"
    joblib.dump({"model": model, "version": version, "features": FEATURES}, path)
    log.info("Readiness model saved to %s (%s)", path, version)
    return auc


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, help="real training data: feature columns + label")
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "models" / MODEL_FILE)
    args = parser.parse_args()
    print(f"AUC on held-out data: {train_and_save(args.out, args.csv):.3f}")
