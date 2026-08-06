% MATLAB_DEMO.M — End-to-End REI SignalLab 2.1 MATLAB Add-On Demonstration
%
% Engineered by Batuhan Ayribas at RootCastle (https://rootcastle.com)

clc; clear; close all;

fprintf('--- REI SignalLab 2.1 MATLAB Add-On Demonstration ---\n');

%% 1. Initialize Client Connection
lab = REISignalLab('https://signallab.site');
lab.checkHealth();

%% 2. Synthesize & Filter Signal
fprintf('\n[1] Synthesizing 440 Hz Sine Wave with Butterworth Lowpass Filter...\n');
sigResult = lab.processSignal('sine', 440, 1.0, 44100, 0.05, 'lowpass', 1000);

% Plot Oscilloscope & FFT Spectrum in MATLAB
figure('Name', 'REI SignalLab 2.1 MATLAB Visualizer', 'NumberTitle', 'off');

subplot(2,1,1);
plot(sigResult.time, sigResult.signal, 'b-', 'LineWidth', 1.5);
grid on; xlabel('Time (s)'); ylabel('Amplitude (V)');
title(sprintf('Time Domain Oscilloscope (RMS = %.3f V)', sigResult.metrics.rms));

subplot(2,1,2);
stem(sigResult.fft.frequencies(1:100), sigResult.fft.magnitude(1:100), 'r', 'LineWidth', 1.2);
grid on; xlabel('Frequency (Hz)'); ylabel('Magnitude (dB)');
title('Fast Fourier Transform (FFT) Magnitude Spectrum');

%% 3. Industrial Machinery Vibration Balancing
fprintf('\n[2] Performing Single-Plane Rotor Balancing...\n');
vibResult = lab.analyzeVibration(25600, 1.2, 45, 10, 90, 0.5, 20);
fprintf('   Correction Mass Needed: %.2f grams @ %.1f degrees\n', ...
    vibResult.balancing.correction_mass, vibResult.balancing.correction_angle_deg);

%% 4. Kinematic Bearing Database Search
fprintf('\n[3] Searching Kinematic Bearing Catalog for "6205"...\n');
bearings = lab.searchBearing('6205');
if ~isempty(bearings)
    b = bearings(1);
    fprintf('   Found Bearing: %s (%s)\n', b.model, b.manufacturer);
    fprintf('   BPFO: %.2f Hz | BPFI: %.2f Hz | BSF: %.2f Hz | FTF: %.2f Hz\n', ...
        b.bpfo, b.bpfi, b.bsf, b.ftf);
end

%% 5. Electrical 3-Phase Fortescue Analysis
fprintf('\n[4] Analyzing 3-Phase Electrical Power Quality...\n');
powerResult = lab.analyzeElectrical(230, 225, 235, 50, 10000);
fprintf('   Positive Sequence V1: %.1f V | Negative Sequence V2: %.1f V\n', ...
    powerResult.v1_mag, powerResult.v2_mag);

%% 6. OpenRouter AI Senior DSP Copilot
fprintf('\n[5] Querying OpenRouter AI Senior DSP Copilot from MATLAB...\n');
aiReport = lab.askAiCopilot('Evaluate 2X line frequency vibration unbalance in induction motors.', 'vibration');
disp('--- AI Copilot Diagnostic Summary ---');
disp(aiReport(1:min(500, length(aiReport))));

fprintf('\n✓ Demonstration completed successfully!\n');
