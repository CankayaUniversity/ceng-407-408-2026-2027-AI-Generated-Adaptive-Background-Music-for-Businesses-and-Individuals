import pytest
from pydantic import ValidationError

from app.mood.vector import MoodVector


def test_accepts_values_in_range_including_bounds() -> None:
    vector = MoodVector(valence=-1, texture=0.25, energy=1)

    assert (vector.valence, vector.texture, vector.energy) == (-1, 0.25, 1)


@pytest.mark.parametrize("axis", ["valence", "texture", "energy"])
@pytest.mark.parametrize("value", [-1.01, 1.01, 5])
def test_rejects_out_of_range_axes(axis: str, value: float) -> None:
    fields = {"valence": 0.0, "texture": 0.0, "energy": 0.0, axis: value}

    with pytest.raises(ValidationError, match=axis):
        MoodVector(**fields)
