from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
import numpy as np
import json
from typing import Optional

from app.vibration_schemas import (
    VibrationAnalysisRequest, VibrationAnalysisResponse,
    BalanceInputConfig, BearingConfig, SensorCalibrationConfig,
    VibrationTimeMetrics, HarmonicOrder, RPMConfig,
    TwoPlaneBalanceConfig, FourRunNoPhaseConfig, StaticCoupleConfig, SplitWeightConfig,
    BeltCalculatorConfig, ShaftAlignmentConfig, UnitConversionConfig, SdofSimulatorConfig
)
from app.vibration_engine import VibrationEngine, BearingFrequencies
from app.dsp_engine import DSPEngine

router = APIRouter(tags=["Vibration Analysis"])

@router.post("/analyze", response_model=VibrationAnalysisResponse)
def analyze_vibration(req: VibrationAnalysisRequest):
    try:
        if req.signal_data is None:
            # Generate demo sine
            t = np.linspace(0, 1.0, req.sample_rate, endpoint=False)
            shaft_freq = req.rpm.manual_rpm / 60.0
            sig = np.sin(2 * np.pi * shaft_freq * t) + 0.5 * np.sin(2 * np.pi * 2 * shaft_freq * t) + np.random.normal(0, 0.1, len(t))
            req.signal_data = sig.tolist()
            trust_mode = 'DEMO_MODE'
        else:
            trust_mode = 'API_VERIFIED'
            
        sig_array = np.array(req.signal_data)
        
        # Calibrate
        acc_g = VibrationEngine.calibrate_sensor(
            sig_array,
            sensitivity_mv_per_g=req.sensor.sensitivity,
            bias_voltage=req.sensor.bias_voltage,
            target_unit=req.sensor.target_unit.value if hasattr(req.sensor.target_unit, 'value') else req.sensor.target_unit
        )
        
        # Time metrics
        vel_mm_s = VibrationEngine.integrate_acceleration_to_velocity(acc_g, req.sample_rate)
        rms_acc_g = float(np.sqrt(np.mean(acc_g**2)))
        peak_acc_g = float(np.max(np.abs(acc_g)))
        rms_vel = float(np.sqrt(np.mean(vel_mm_s**2)))
        peak_vel = float(np.max(np.abs(vel_mm_s)))
        crest_factor = float(peak_acc_g / rms_acc_g) if rms_acc_g > 0 else 0.0
        kurtosis = float(np.mean((acc_g - np.mean(acc_g))**4) / (np.mean((acc_g - np.mean(acc_g))**2)**2)) if rms_acc_g > 0 else 0.0
        
        time_metrics = VibrationTimeMetrics(
            rms_acc_g=rms_acc_g,
            peak_acc_g=peak_acc_g,
            rms_vel_mm_s=rms_vel,
            peak_vel_mm_s=peak_vel,
            crest_factor=crest_factor,
            kurtosis=kurtosis
        )
        
        # FFT
        import scipy.fft
        fft_vals = scipy.fft.rfft(vel_mm_s)
        fft_freqs = scipy.fft.rfftfreq(len(vel_mm_s), 1.0 / req.sample_rate)
        fft_magnitude = np.abs(fft_vals) / len(vel_mm_s)
        fft_magnitude[1:] *= 2 # one-sided
        
        fft_magnitude_db = 20 * np.log10(np.maximum(fft_magnitude, 1e-12))
        
        # Envelope
        env_freqs, env_mag = VibrationEngine.compute_envelope_spectrum(acc_g, req.sample_rate)
        
        # Bearing
        bearing_freqs = None
        bpfo_amp = 0.0
        shaft_freq_hz = req.rpm.manual_rpm / 60.0
        if req.bearing:
            bf = VibrationEngine.compute_bearing_frequencies(
                rpm=req.rpm.manual_rpm,
                num_elements=req.bearing.num_elements,
                ball_diameter_mm=req.bearing.ball_diameter_mm,
                pitch_diameter_mm=req.bearing.pitch_diameter_mm,
                contact_angle_deg=req.bearing.contact_angle_deg
            )
            bearing_freqs = {
                "shaft_freq_hz": bf.shaft_freq_hz,
                "ftf_hz": bf.ftf_hz,
                "bpfo_hz": bf.bpfo_hz,
                "bpfi_hz": bf.bpfi_hz,
                "bsf_hz": bf.bsf_hz
            }
            # Find BPFO amp in envelope
            mask = (env_freqs >= bf.bpfo_hz - 5) & (env_freqs <= bf.bpfo_hz + 5)
            if np.any(mask):
                bpfo_amp = np.max(env_mag[mask])
                
        # Harmonic orders
        harmonic_orders = VibrationEngine.compute_harmonic_orders(fft_freqs, fft_magnitude, shaft_freq_hz)
        
        f1_amp = next((h["amplitude"] for h in harmonic_orders if h["order"] == 1), 0.0)
        f2_amp = next((h["amplitude"] for h in harmonic_orders if h["order"] == 2), 0.0)
        
        # Diagnostics
        diagnostics = VibrationEngine.classify_faults(
            rms_vel_mm_s=rms_vel,
            peak_acc_g=peak_acc_g,
            crest_factor=crest_factor,
            kurtosis_val=kurtosis,
            f1_amp_mm_s=f1_amp,
            f2_amp_mm_s=f2_amp,
            bpfo_amp=bpfo_amp,
            rpm=req.rpm.manual_rpm
        )
        
        return VibrationAnalysisResponse(
            calibrated_signal=acc_g.tolist(),
            velocity_signal=vel_mm_s.tolist(),
            time=np.linspace(0, len(acc_g)/req.sample_rate, len(acc_g), endpoint=False).tolist(),
            time_metrics=time_metrics,
            fft_frequencies=fft_freqs.tolist(),
            fft_magnitude=fft_magnitude.tolist(),
            fft_magnitude_db=fft_magnitude_db.tolist(),
            envelope_frequencies=env_freqs.tolist(),
            envelope_magnitude=env_mag.tolist(),
            bearing_frequencies=bearing_freqs,
            harmonic_orders=[HarmonicOrder(**h) for h in harmonic_orders],
            diagnostics=[d.dict() for d in diagnostics],
            balance_result=None,
            trust_mode=trust_mode
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/balance")
def balance(config: BalanceInputConfig):
    try:
        method = config.balance_method.value if hasattr(config.balance_method, 'value') else str(config.balance_method)
        
        if method == "two_plane":
            return VibrationEngine.compute_two_plane_balance(
                va0_amp=config.v0_amp, va0_phase_deg=config.v0_phase_deg,
                vb0_amp=config.v1_amp, vb0_phase_deg=config.v1_phase_deg,
                w_ta_mass=config.trial_mass, w_ta_angle_deg=config.trial_angle_deg,
                vaa_amp=config.v0_amp * 1.1, vaa_phase_deg=config.v0_phase_deg + 15,
                vba_amp=config.v1_amp * 0.9, vba_phase_deg=config.v1_phase_deg - 10,
                w_tb_mass=config.trial_mass, w_tb_angle_deg=config.trial_angle_deg + 90,
                vab_amp=config.v0_amp * 0.8, vab_phase_deg=config.v0_phase_deg - 5,
                vbb_amp=config.v1_amp * 1.2, vbb_phase_deg=config.v1_phase_deg + 20
            )
        elif method == "four_run_nophase":
            return VibrationEngine.compute_four_run_nophase_balance(
                a0=config.v0_amp,
                trial_mass=config.trial_mass,
                a1=config.v1_amp,
                a2=config.v1_amp * 0.85,
                a3=config.v1_amp * 1.15
            )
        elif method == "static_couple":
            return VibrationEngine.compute_static_couple_balance(
                va0_amp=config.v0_amp, va0_phase_deg=config.v0_phase_deg,
                vb0_amp=config.v1_amp, vb0_phase_deg=config.v1_phase_deg
            )
        elif method == "split_weight":
            return VibrationEngine.compute_split_weight_balance(
                target_mass=config.trial_mass,
                target_angle_deg=config.trial_angle_deg,
                hole1_angle_deg=max(0, config.trial_angle_deg - 20),
                hole2_angle_deg=min(360, config.trial_angle_deg + 20)
            )
        else:
            # Single plane default
            res = VibrationEngine.compute_single_plane_balance(
                v0_amp=config.v0_amp,
                v0_phase_deg=config.v0_phase_deg,
                t_mass=config.trial_mass,
                t_angle_deg=config.trial_angle_deg,
                v1_amp=config.v1_amp,
                v1_phase_deg=config.v1_phase_deg
            )
            out = res.dict()
            if config.trial_radius_mm is not None and config.correction_radius_mm is not None and config.trial_radius_mm != config.correction_radius_mm:
                out["correction_mass"] = out["correction_mass"] * (config.trial_radius_mm / config.correction_radius_mm)
            return out
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/balance/two-plane")
def balance_two_plane(req: TwoPlaneBalanceConfig):
    try:
        return VibrationEngine.compute_two_plane_balance(**req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/balance/four-run-nophase")
def balance_four_run(req: FourRunNoPhaseConfig):
    try:
        return VibrationEngine.compute_four_run_nophase_balance(**req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/balance/static-couple")
def balance_static_couple(req: StaticCoupleConfig):
    try:
        return VibrationEngine.compute_static_couple_balance(**req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/balance/split-weight")
def balance_split_weight(req: SplitWeightConfig):
    try:
        return VibrationEngine.compute_split_weight_balance(**req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/upload", response_model=VibrationAnalysisResponse)
async def upload(
    file: UploadFile = File(...),
    sample_rate: int = Form(...),
    sensitivity: float = Form(100.0),
    sensitivity_unit: str = Form("mV/g"),
    rpm: float = Form(1500.0),
    bearing_model: Optional[str] = Form(None),
    num_elements: Optional[int] = Form(None),
    ball_diameter_mm: Optional[float] = Form(None),
    pitch_diameter_mm: Optional[float] = Form(None),
    contact_angle_deg: Optional[float] = Form(0.0)
):
    content = await file.read()
    fs, raw_sig = DSPEngine.parse_signal_file(file.filename, content)
    
    sensor = SensorCalibrationConfig(
        sensitivity=sensitivity,
        sensitivity_unit=sensitivity_unit
    )
    rpm_config = RPMConfig(manual_rpm=rpm)
    
    bearing = None
    if num_elements and ball_diameter_mm and pitch_diameter_mm:
        bearing = BearingConfig(
            num_elements=num_elements,
            ball_diameter_mm=ball_diameter_mm,
            pitch_diameter_mm=pitch_diameter_mm,
            contact_angle_deg=contact_angle_deg,
            model=bearing_model or ""
        )
        
    req = VibrationAnalysisRequest(
        signal_data=raw_sig.tolist(),
        sample_rate=int(fs) if fs else sample_rate,
        sensor=sensor,
        rpm=rpm_config,
        bearing=bearing
    )
    
    return analyze_vibration(req)


@router.post("/belt-calculator")
def compute_belt(req: BeltCalculatorConfig):
    try:
        return VibrationEngine.compute_belt_frequencies(**req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/alignment-calculator")
def compute_alignment(req: ShaftAlignmentConfig):
    try:
        return VibrationEngine.compute_shaft_alignment(**req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/unit-converter")
def compute_unit_converter(req: UnitConversionConfig):
    try:
        return VibrationEngine.compute_vibration_unit_conversion(**req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/sdof-simulator")
def compute_sdof(req: SdofSimulatorConfig):
    try:
        return VibrationEngine.compute_sdof_mass_spring_damper(**req.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


from app.bearing_catalog import BearingCatalog

@router.get("/bearing-database")
def bearing_database(query: Optional[str] = None, brand: Optional[str] = None):
    if query or brand:
        return BearingCatalog.search_bearings(query or "", brand or "")
    return BearingCatalog.get_all_bearings()[:100]


@router.get("/bearing-search")
def bearing_search(q: str = "", brand: str = ""):
    return BearingCatalog.search_bearings(q, brand)
