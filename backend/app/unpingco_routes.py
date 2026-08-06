from fastapi import APIRouter, HTTPException
from app.unpingco_schemas import (
    SamplingAliasingRequest,
    SamplingAliasingResponse,
    ParksMcClellanFirRequest,
    ParksMcClellanFirResponse,
    AutocorrelationRequest,
    AutocorrelationResponse,
    LmsAdaptiveRequest,
    LmsAdaptiveResponse,
    CwtScalogramRequest,
    CwtScalogramResponse,
)
from app.unpingco_engine import UnpingcoEngine

router = APIRouter(tags=["Python Signal Processing Lab (Unpingco)"])


@router.post("/sampling-aliasing", response_model=SamplingAliasingResponse)
def simulate_sampling_aliasing(req: SamplingAliasingRequest):
    try:
        res = UnpingcoEngine.simulate_sampling_aliasing(
            f_signal_hz=req.f_signal_hz, f_sample_hz=req.f_sample_hz, duration_s=req.duration_s
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/fir-parks-mcclellan", response_model=ParksMcClellanFirResponse)
def design_parks_mcclellan_fir(req: ParksMcClellanFirRequest):
    try:
        res = UnpingcoEngine.design_parks_mcclellan_fir(
            num_taps=req.num_taps,
            cutoff_pass_hz=req.cutoff_pass_hz,
            cutoff_stop_hz=req.cutoff_stop_hz,
            sample_rate_hz=req.sample_rate_hz,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/autocorrelation", response_model=AutocorrelationResponse)
def compute_autocorrelation(req: AutocorrelationRequest):
    try:
        res = UnpingcoEngine.compute_autocorrelation(
            signal_data=req.signal_data,
            sample_rate_hz=req.sample_rate_hz,
            max_lag_samples=req.max_lag_samples,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/lms-adaptive", response_model=LmsAdaptiveResponse)
def lms_adaptive_filter(req: LmsAdaptiveRequest):
    try:
        res = UnpingcoEngine.lms_adaptive_filter(
            num_taps=req.num_taps,
            mu_step_size=req.mu_step_size,
            f_signal_hz=req.f_signal_hz,
            f_noise_hz=req.f_noise_hz,
            sample_rate_hz=req.sample_rate_hz,
            num_samples=req.num_samples,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/cwt-scalogram", response_model=CwtScalogramResponse)
def compute_cwt_scalogram(req: CwtScalogramRequest):
    try:
        res = UnpingcoEngine.compute_cwt_scalogram(
            f_start_hz=req.f_start_hz,
            f_stop_hz=req.f_stop_hz,
            num_scales=req.num_scales,
            sample_rate_hz=req.sample_rate_hz,
            duration_s=req.duration_s,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
