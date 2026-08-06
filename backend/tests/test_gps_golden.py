import pytest
import numpy as np
from app.gps_engine import GpsEngine

def test_gold_code_generation():
    """Test GPS C/A Gold Code generation for PRN 1 and PRN 2."""
    code1 = GpsEngine.generate_gold_code(1)
    code2 = GpsEngine.generate_gold_code(2)

    assert len(code1) == 1023
    assert len(code2) == 1023
    assert set(code1) == {-1, 1}
    assert set(code2) == {-1, 1}
    # PRN 1 and PRN 2 Gold Codes must be orthogonal / different
    assert not np.array_equal(code1, code2)

def test_gold_code_auto_correlation():
    """Test Gold Code peak auto-correlation property."""
    code = GpsEngine.generate_gold_code(1)
    corr = GpsEngine.compute_auto_correlation(code)

    # Zero lag peak must equal code length 1023
    assert corr[0] == 1023.0
    # Off-peak values must be small (|corr| <= 65)
    assert np.max(np.abs(corr[1:])) <= 65.0

def test_geodetic_to_ecef_conversion():
    """Test WGS84 Geodetic to ECEF coordinate conversion."""
    # Equator at prime meridian (0, 0, 0)
    x, y, z = GpsEngine.geodetic_to_ecef(0.0, 0.0, 0.0)
    assert pytest.approx(x, abs=100.0) == 6378137.0
    assert pytest.approx(y, abs=1.0) == 0.0
    assert pytest.approx(z, abs=1.0) == 0.0

def test_gps_constellation_simulation():
    """Test GPS L1 C/A SDR constellation simulation."""
    res = GpsEngine.simulate(
        lat_deg=37.7749,
        lon_deg=-122.4194,
        alt_m=10.0,
        elevation_mask_deg=5.0,
        sample_rate_hz=2600000,
        duration_s=0.01
    )

    assert res["total_satellites"] == 32
    assert res["visible_satellites_count"] >= 4
    assert res["pdop"] > 0.0
    assert res["hdop"] > 0.0
    assert "GPGGA" in res["nmea_sentence"]
    assert len(res["satellites"]) == 32
    assert len(res["fft_frequencies"]) == 2048
