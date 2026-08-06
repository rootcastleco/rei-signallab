classdef REISignalLab < handle
    % REISIGNALLAB MATLAB Add-On Toolbox & Client API for REI SignalLab 2.1
    %
    % Engineered by Batuhan Ayribas at RootCastle (https://rootcastle.com)
    %
    % Usage:
    %   lab = REISignalLab('https://signallab.site');
    %   health = lab.checkHealth();
    %   sig = lab.processSignal('sine', 440, 1.0, 44100, 0.1, 'lowpass', 1000);
    %   plot(sig.time, sig.signal); title('REI SignalLab MATLAB Signal');

    properties
        BaseUrl (1,1) string = "https://signallab.site"
        Timeout (1,1) double = 30
    end

    methods
        function obj = REISignalLab(url)
            % Constructor: Initialize REI SignalLab MATLAB Client
            if nargin > 0 && ~isempty(url)
                obj.BaseUrl = strip(string(url), 'right', '/');
            end
        end

        function status = checkHealth(obj)
            % Check live connection health to REI SignalLab API
            endpoint = obj.BaseUrl + "/api/health/ready";
            options = weboptions('Timeout', obj.Timeout);
            try
                status = webread(endpoint, options);
                fprintf('✓ Connected to REI SignalLab Engine v%s [%s]\n', status.version, status.environment);
            catch ME
                error('REISignalLab:ConnectionFailed', 'Failed to connect to REI SignalLab at %s: %s', endpoint, ME.message);
            end
        end

        function result = processSignal(obj, waveform, frequency, amplitude, sampleRate, duration, filterType, cutoff)
            % Synthesize, filter, and extract spectral metrics for a signal
            if nargin < 2, waveform = 'sine'; end
            if nargin < 3, frequency = 440; end
            if nargin < 4, amplitude = 1.0; end
            if nargin < 5, sampleRate = 44100; end
            if nargin < 6, duration = 0.1; end
            if nargin < 7, filterType = 'lowpass'; end
            if nargin < 8, cutoff = 1000; end

            payload = struct();
            payload.generator = struct(...
                'waveform', string(waveform), ...
                'frequency', frequency, ...
                'amplitude', amplitude, ...
                'phase', 0, ...
                'offset', 0, ...
                'noise_level', 0, ...
                'sample_rate', sampleRate, ...
                'duration', duration, ...
                'modulation_type', 'none');
            payload.math = struct('envelope_extraction', false, 'dc_remove', false, 'gain_db', 0);
            payload.filter = struct('enabled', true, 'filter_type', string(filterType), 'filter_design', 'butterworth', 'cutoff', cutoff, 'order', 4);
            payload.fft = struct('n_fft', 1024, 'window', 'hann');

            endpoint = obj.BaseUrl + "/api/signal/process";
            options = weboptions('MediaType', 'application/json', 'Timeout', obj.Timeout);
            result = webwrite(endpoint, payload, options);
        end

        function result = analyzeVibration(obj, sampleRate, v0Amp, v0PhaseDeg, trialMass, trialAngleDeg, v1Amp, v1PhaseDeg)
            % Execute industrial vibration analysis and single-plane rotor balancing
            if nargin < 2, sampleRate = 25600; end
            if nargin < 3, v0Amp = 1.2; end
            if nargin < 4, v0PhaseDeg = 45; end
            if nargin < 5, trialMass = 10; end
            if nargin < 6, trialAngleDeg = 90; end
            if nargin < 7, v1Amp = 0.5; end
            if nargin < 8, v1PhaseDeg = 20; end

            payload = struct(...
                'sample_rate', sampleRate, ...
                'v0_amp', v0Amp, ...
                'v0_phase_deg', v0PhaseDeg, ...
                'trial_mass', trialMass, ...
                'trial_angle_deg', trialAngleDeg, ...
                'v1_amp', v1Amp, ...
                'v1_phase_deg', v1PhaseDeg);

            endpoint = obj.BaseUrl + "/api/vibration/balance";
            options = weboptions('MediaType', 'application/json', 'Timeout', obj.Timeout);
            result = webwrite(endpoint, payload, options);
        end

        function result = searchBearing(obj, query)
            % Search 3,570+ kinematic bearing database (SKF, NTN, Cooper, Dodge)
            endpoint = obj.BaseUrl + "/api/vibration/bearing-search?q=" + urlencode(string(query));
            options = weboptions('Timeout', obj.Timeout);
            result = webread(endpoint, options);
        end

        function result = analyzeElectrical(obj, va, vb, vc, frequency, sampleRate)
            % Calculate 3-phase Fortescue symmetrical components (V0, V1, V2) and THD
            if nargin < 2, va = 230; end
            if nargin < 3, vb = 230; end
            if nargin < 4, vc = 230; end
            if nargin < 5, frequency = 50; end
            if nargin < 6, sampleRate = 10000; end

            payload = struct('va', va, 'vb', vb, 'vc', vc, 'frequency', frequency, 'sample_rate', sampleRate);
            endpoint = obj.BaseUrl + "/api/electrical/analyze";
            options = weboptions('MediaType', 'application/json', 'Timeout', obj.Timeout);
            result = webwrite(endpoint, payload, options);
        end

        function result = analyzeAntenna(obj, frequencyHz, zReal, zImag, distanceKm)
            % Calculate VSWR, S11 Return Loss, and Friis Free Space Path Loss
            if nargin < 2, frequencyHz = 2.4e9; end
            if nargin < 3, zReal = 50.0; end
            if nargin < 4, zImag = 0.0; end
            if nargin < 5, distanceKm = 1.0; end

            payload = struct('frequency_hz', frequencyHz, 'z_real', zReal, 'z_imag', zImag, 'distance_km', distanceKm);
            endpoint = obj.BaseUrl + "/api/antenna/analyze";
            options = weboptions('MediaType', 'application/json', 'Timeout', obj.Timeout);
            result = webwrite(endpoint, payload, options);
        end

        function report = askAiCopilot(obj, promptStr, contextType, modelId)
            % Run OpenRouter AI Copilot inference directly from MATLAB
            if nargin < 3, contextType = 'general'; end
            if nargin < 4, modelId = 'google/gemini-2.0-flash-lite-preview-02-05:free'; end

            payload = struct('prompt', string(promptStr), 'context_type', string(contextType), 'model', string(modelId));
            endpoint = obj.BaseUrl + "/api/ai/analyze";
            options = weboptions('MediaType', 'application/json', 'Timeout', obj.Timeout);
            resp = webwrite(endpoint, payload, options);
            report = resp.analysis;
        end
    end
end
