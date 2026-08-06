from fastapi import APIRouter, HTTPException
import numpy as np

from app.antenna_schemas import (
    AntennaAnalysisRequest, AntennaAnalysisResponse,
    AntennaType, AntennaResonanceResult, LinkBudgetResult, SmithChartPoint
)
from app.antenna_engine import AntennaEngine

router = APIRouter(tags=["Antenna & RF Waveguide"])

@router.post("/analyze", response_model=AntennaAnalysisResponse)
def analyze_antenna(req: AntennaAnalysisRequest):
    try:
        vswr, s11_db, gamma_mag, gamma_phase = AntennaEngine.compute_vswr_and_s11(
            req.load_impedance_r, req.load_impedance_x, req.characteristic_impedance_z0
        )

        smith_point = AntennaEngine.compute_smith_chart_point(
            req.load_impedance_r, req.load_impedance_x, req.characteristic_impedance_z0
        )

        link_budget = AntennaEngine.compute_friis_link_budget(
            req.frequency_hz, req.distance_m, req.tx_power_dbm, req.tx_gain_dbi, req.rx_gain_dbi
        )

        resonance = AntennaEngine.compute_antenna_resonance(
            req.frequency_hz, AntennaType.HALF_WAVE_DIPOLE, req.relative_permittivity_er
        )

        waveguide_cutoffs = AntennaEngine.compute_waveguide_cutoff(
            req.waveguide_width_a_mm, req.waveguide_height_b_mm
        )

        # Frequency sweep for S11 and VSWR plot (±20% span around center frequency)
        f_center = req.frequency_hz / 1e6  # MHz
        f_sweep = np.linspace(f_center * 0.8, f_center * 1.2, 100)
        s11_sweep = []
        vswr_sweep = []

        for f in f_sweep:
            # Model resonant load variation near center frequency
            f_hz = f * 1e6
            detune = (f_hz - req.frequency_hz) / req.frequency_hz
            r_f = req.load_impedance_r + 50.0 * (detune**2)
            x_f = req.load_impedance_x + 150.0 * detune

            v_s, s_db, _, _ = AntennaEngine.compute_vswr_and_s11(r_f, x_f, req.characteristic_impedance_z0)
            s11_sweep.append(s_db)
            vswr_sweep.append(v_s)

        return AntennaAnalysisResponse(
            frequency_hz=req.frequency_hz,
            vswr=vswr,
            return_loss_s11_db=s11_db,
            reflection_coefficient_gamma=gamma_mag,
            gamma_phase_deg=gamma_phase,
            input_impedance_z_in={"R": req.load_impedance_r, "X": req.load_impedance_x},
            smith_chart_point=smith_point,
            link_budget=link_budget,
            antenna_resonance=resonance,
            sweep_frequencies_mhz=f_sweep.tolist(),
            sweep_s11_db=s11_sweep,
            sweep_vswr=vswr_sweep,
            waveguide_cutoff_hz=waveguide_cutoffs,
            trust_mode='API_VERIFIED'
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
