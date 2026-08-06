% INSTALL_REI_SIGNALLAB
% 1-Click MATLAB Add-On Installer & Path Registration Script
%
% Engineered by Batuhan Ayribas at RootCastle (https://rootcastle.com)

clc;
fprintf('=====================================================\n');
fprintf('   REI SignalLab 2.1 — MATLAB Add-On Toolbox Installer\n');
fprintf('   RootCastle (https://rootcastle.com)\n');
fprintf('=====================================================\n\n');

try
    % Get current directory path
    installDir = fileparts(mfilename('fullpath'));
    
    % Add directory to MATLAB Path
    addpath(installDir);
    fprintf('[1/3] Added %s to MATLAB path...\n', installDir);
    
    % Try saving path permanently
    try
        savepath;
        fprintf('[2/3] Saved MATLAB search path successfully.\n');
    catch
        fprintf('[2/3] Note: Path added for current session (Admin rights required to savepath).\n');
    end

    % Test Connection to Live Service
    fprintf('[3/3] Testing connection to https://signallab.site...\n');
    lab = REISignalLab('https://signallab.site');
    lab.checkHealth();

    fprintf('\n=====================================================\n');
    fprintf(' 🎉 REI SignalLab 2.1 MATLAB Add-On Installed Successfully!\n');
    fprintf('=====================================================\n');
    fprintf(' Quick Start Commands in MATLAB:\n');
    fprintf('   lab = REISignalLab(); % Connect to live engine\n');
    fprintf('   sig = lab.processSignal(''sine'', 440, 1.0);\n');
    fprintf('   plot(sig.signal);\n');
    fprintf('   aiReport = lab.askAiCopilot(''How to balance a rotor?'');\n');
    fprintf('=====================================================\n\n');

catch ME
    fprintf('\n❌ Installation encountered an issue: %s\n', ME.message);
end
