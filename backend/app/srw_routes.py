from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.srw_schemas import SrwSimulationRequest, SrwSimulationResponse
from app.srw_engine import SrwEngine

router = APIRouter(tags=["SRW Synchrotron Radiation Workbench"])


@router.post("/simulate", response_model=SrwSimulationResponse)
def simulate_undulator(req: SrwSimulationRequest):
    """
    Run SRW Synchrotron Radiation & Undulator Physics Simulation.
    """
    try:
        res = SrwEngine.simulate_undulator_radiation(
            beam_cfg=req.electron_beam,
            und_cfg=req.undulator,
            obs_dist_m=req.observation_dist_m,
            max_harmonic=req.max_harmonic,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"SRW_SIMULATION_FAILED: {str(e)}")
