import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from trakio_ai import main
from trakio_ai.meals import CatalogFood, EstimateRequest, MealEstimator, Per100

TOKEN = {"X-Internal-Token": "test-token-" + "x" * 40}
NOW = datetime(2026, 11, 26, 18, 0, tzinfo=timezone.utc)
client = TestClient(main.app)


def sessions(days_ago: list[float], volume: float = 5000, feeling: str = "good"):
    return [{"finished_at": (NOW - timedelta(days=d)).isoformat(), "volume_kg": volume, "sets": 20, "feeling": feeling}
            for d in days_ago]


def test_every_route_but_health_needs_the_token():
    assert client.get("/health").status_code == 200
    assert client.post("/v1/readiness", json={"now": NOW.isoformat()}).status_code == 401
    assert client.post("/v1/readiness", json={"now": NOW.isoformat()}, headers={"X-Internal-Token": "wrong"}).status_code == 401
    assert client.get("/docs").status_code == 404


def test_readiness_drops_with_a_load_spike_and_recovers_with_rest():
    steady = sessions([2, 5, 9, 12, 16, 19, 23, 26])
    spike = sessions([0.2, 1, 2, 3, 4, 5], volume=9000, feeling="hard") + sessions([9, 16, 23], volume=4000)
    rested = sessions([5, 9, 12, 16, 19, 23, 26])

    def score(s):
        r = client.post("/v1/readiness", json={"now": NOW.isoformat(), "sessions": s}, headers=TOKEN)
        assert r.status_code == 200
        return r.json()

    assert score(spike)["score"] < score(steady)["score"] <= score(rested)["score"] + 5
    assert score(spike)["level"] in ("rest", "steady")
    assert score([])["days_since_last"] is None


def test_insights_explain_themselves():
    body = {
        "first_name": "Ana", "now": NOW.isoformat(),
        "sessions": sessions([0.2, 1, 2, 3], volume=9000, feeling="max") + sessions([10, 17, 24], volume=3000),
        "workouts_done": 4, "workouts_expected": 12, "stalled_exercises": ["Peso morto"],
    }
    r = client.post("/v1/insights", json=body, headers=TOKEN).json()
    kinds = [s["kind"] for s in r["suggestions"]]
    # Skipping workouts: no "lighter week" on top of it.
    assert kinds == ["home-workout", "variation"]
    assert "4 de 12" in r["suggestions"][0]["body"]


def test_a_real_load_spike_suggests_a_lighter_week():
    steady_weeks = sessions([8, 10, 12, 15, 17, 19, 22, 24, 26], volume=4000)
    spike = sessions([0.2, 1, 2, 3, 4], volume=9000, feeling="max")
    body = {"first_name": "Rui", "now": NOW.isoformat(), "sessions": steady_weeks + spike,
            "workouts_done": 14, "workouts_expected": 12, "stalled_exercises": []}
    r = client.post("/v1/insights", json=body, headers=TOKEN).json()
    assert [s["kind"] for s in r["suggestions"]] == ["light-week"]
    assert "subiu" in r["suggestions"][0]["body"]


def test_newcomers_are_not_compared_with_weeks_before_they_started():
    newcomer = sessions([1, 4, 8], volume=5000)
    r = client.post("/v1/readiness", json={"now": NOW.isoformat(), "sessions": newcomer}, headers=TOKEN).json()
    assert r["acwr"] < 1.5
    assert r["level"] != "rest"


class FakeAnthropic:
    """Stands in for the SDK client: returns a canned structured-output response."""

    def __init__(self, payload: dict, stop_reason: str = "end_turn"):
        self.calls = []
        outer = self

        class Messages:
            def create(self, **kwargs):
                outer.calls.append(kwargs)
                return SimpleNamespace(stop_reason=stop_reason, stop_details=None,
                                       content=[SimpleNamespace(type="text", text=json.dumps(payload))])

        self.beta = SimpleNamespace(messages=Messages())


CATALOG = [CatalogFood(id="frango", name="Frango grelhado", per100=Per100(kcal=165, protein=31, carbs=0, fat=3.6))]


def test_known_foods_use_the_table_and_impossible_estimates_are_dropped():
    fake = FakeAnthropic({
        "items": [
            {"food_id": "frango", "name": "Frango", "grams": 150, "kcal_per_100g": 1, "protein_per_100g": 1,
             "carbs_per_100g": 1, "fat_per_100g": 1, "confidence": "high"},
            {"food_id": "", "name": "Bolo de bolacha", "grams": 120, "kcal_per_100g": 420, "protein_per_100g": 5,
             "carbs_per_100g": 50, "fat_per_100g": 22, "confidence": "medium"},
            {"food_id": "", "name": "Impossível", "grams": 100, "kcal_per_100g": 10, "protein_per_100g": 90,
             "carbs_per_100g": 90, "fat_per_100g": 90, "confidence": "low"},
        ],
        "unrecognised": ["guardanapo"], "note": "Assumi uma fatia média de bolo.",
    })
    result = MealEstimator(client=fake).estimate(EstimateRequest(text="150 g de frango e bolo de bolacha", catalog=CATALOG))
    assert [i.name for i in result.items] == ["Frango grelhado", "Bolo de bolacha"]
    assert result.items[0].per100.kcal == 165
    assert "Impossível" in result.unrecognised
    call = fake.calls[0]
    assert call["model"] == "claude-opus-5-5"
    assert call["output_config"]["format"]["type"] == "json_schema"
    assert call["fallbacks"] == "default"
    assert "<meal_description>" in call["messages"][0]["content"][-1]["text"]


def test_refusals_are_handled():
    fake = FakeAnthropic({}, stop_reason="refusal")
    result = MealEstimator(client=fake).estimate(EstimateRequest(text="arroz", catalog=CATALOG))
    assert result.items == [] and result.note


def test_transcription_rejects_anything_that_is_not_audio():
    r = client.post("/v1/transcribe", files={"audio": ("x.m4a", b"<html>not audio</html>", "audio/mp4")}, headers=TOKEN)
    assert r.status_code == 415


@pytest.mark.parametrize("data", [b"\x00\x00\x00\x20ftypM4A ", b"RIFF\x00\x00\x00\x00WAVE", b"\x1aE\xdf\xa3"])
def test_recognises_phone_audio_formats(data):
    from trakio_ai.transcribe import looks_like_audio
    assert looks_like_audio(data)
