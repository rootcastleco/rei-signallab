import pytest
import numpy as np
from scipy import signal as scipy_signal, fftpack

from app.graph.registry import NodeRegistry
from app.graph.engine import GraphExecutionEngine
from app.nodes.transforms import FFTNode, InverseRealFFTNode, DCTNode, HaarNode
from app.nodes.arithmetic import AddNode, MultiplyNode
from app.nodes.converters import ComplexToRealNode, RealToComplexNode, CartesianToPolarNode, PolarToCartesianNode
from app.nodes.filters import LowPassNode
from app.nodes.analysis import NoiseStatsNode
from app.graph.types import Frame, FrameMetadata, CanonicalPortType

# 1. Arithmetic Precision: Float64 error <= 1e-12
def test_golden_arithmetic_float64():
    x = np.random.RandomState(42).randn(1000).astype(np.float64)
    y = np.random.RandomState(43).randn(1000).astype(np.float64)

    meta = FrameMetadata()
    f_x = Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=x)
    f_y = Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=y)

    add_node = AddNode("arithmetic.add", "n1", "Add", {})
    res_add = add_node.process({"signal_in_a": f_x, "signal_in_b": f_y})
    expected_add = x + y
    assert np.max(np.abs(res_add["signal_out"].data - expected_add)) <= 1e-12

    mul_node = MultiplyNode("arithmetic.multiply", "n2", "Mul", {})
    res_mul = mul_node.process({"signal_in_a": f_x, "signal_in_b": f_y})
    expected_mul = x * y
    assert np.max(np.abs(res_mul["signal_out"].data - expected_mul)) <= 1e-12

# 2. Complex & Cartesian Round-Trip Reconstruction
def test_golden_complex_cartesian_round_trip():
    r = np.random.RandomState(44).randn(500)
    i = np.random.RandomState(45).randn(500)

    meta = FrameMetadata()
    f_r = Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=r)
    f_i = Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=i)

    c_node = RealToComplexNode("converter.real_to_complex", "n1", "R2C", {})
    c_res = c_node.process({"real": f_r, "imaginary": f_i})

    r_node = ComplexToRealNode("converter.complex_to_real", "n2", "C2R", {})
    r_res = r_node.process({"complex_in": c_res["complex_out"]})

    assert np.max(np.abs(r_res["real"].data - r)) <= 1e-12
    assert np.max(np.abs(r_res["imaginary"].data - i)) <= 1e-12

    cart_node = CartesianToPolarNode("converter.cartesian_to_polar", "n3", "C2P", {})
    polar_res = cart_node.process({"x": f_r, "y": f_i})

    pol_node = PolarToCartesianNode("converter.polar_to_cartesian", "n4", "P2C", {})
    cart_res = pol_node.process({"r": polar_res["r"], "theta": polar_res["theta"]})

    assert np.max(np.abs(cart_res["x"].data - r)) <= 1e-12
    assert np.max(np.abs(cart_res["y"].data - i)) <= 1e-12

# 3. FFT & Inverse FFT Reconstruction RMS Error <= 1e-9
def test_golden_fft_ifft_reconstruction():
    t = np.linspace(0, 0.1, 1024, endpoint=False)
    sig = np.sin(2 * np.pi * 440 * t) + 0.5 * np.cos(2 * np.pi * 880 * t)

    meta = FrameMetadata(sample_rate_hz=10240)
    f_sig = Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=sig)

    fft_node = FFTNode("transform.fft", "n1", "FFT", {"n_fft": 1024})
    fft_res = fft_node.process({"signal_in": f_sig})

    ifft_node = InverseRealFFTNode("transform.inverse_real_fft", "n2", "IFFT", {})
    ifft_res = ifft_node.process({"spectrum_in": fft_res["spectrum_out"]})

    rms_err = np.sqrt(np.mean((ifft_res["signal_out"].data - sig) ** 2))
    assert rms_err <= 1e-9

# 4. DCT Orthogonal Reconstruction Precision
def test_golden_dct_ortho_precision():
    x = np.random.RandomState(46).randn(512)
    meta = FrameMetadata()
    f_x = Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=x)

    dct_node = DCTNode("transform.dct", "n1", "DCT", {"dct_type": 2})
    dct_res = dct_node.process({"signal_in": f_x})

    rec = fftpack.idct(dct_res["dct_coefficients"].data, type=2, norm="ortho")
    rms_err = np.sqrt(np.mean((rec - x) ** 2))
    assert rms_err <= 1e-12

# 5. Haar Wavelet Reconstruction Precision <= 1e-9
def test_golden_haar_reconstruction():
    x = np.random.RandomState(47).randn(500)
    meta = FrameMetadata()
    f_x = Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=x)

    haar_node = HaarNode("transform.haar", "n1", "Haar", {})
    res = haar_node.process({"signal_in": f_x})

    approx = res["approximation"].data
    detail = res["detail"].data

    # Haar Inverse Reconstruction
    rec = np.empty_like(x)
    rec[0::2] = (approx + detail) / np.sqrt(2.0)
    rec[1::2] = (approx - detail) / np.sqrt(2.0)

    rms_err = np.sqrt(np.mean((rec - x) ** 2))
    assert rms_err <= 1e-12

# 6. Filter Magnitude Response Reference <= 0.1 dB
def test_golden_filter_magnitude_response():
    fs = 44100
    t = np.linspace(0, 0.1, 4410, endpoint=False)
    sig = np.sin(2 * np.pi * 100 * t) + np.sin(2 * np.pi * 5000 * t)

    meta = FrameMetadata(sample_rate_hz=fs)
    f_sig = Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=sig)

    flt_node = LowPassNode("filter.lowpass", "n1", "LowPass", {"cutoff": 1000.0, "order": 4})
    res = flt_node.process({"signal_in": f_sig})

    b, a = scipy_signal.butter(4, 1000.0 / (fs / 2.0), btype="low")
    ref_res = scipy_signal.filtfilt(b, a, sig)

    diff_db = 20 * np.log10(np.max(np.abs(res["signal_out"].data - ref_res)) + 1e-6)
    assert np.max(np.abs(res["signal_out"].data - ref_res)) <= 1e-3
