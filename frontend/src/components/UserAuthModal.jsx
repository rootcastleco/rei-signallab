import React, { useState } from 'react';
import { User, LogIn, UserPlus, LogOut, ShieldCheck, Key, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import {
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  loginGuest,
  logoutUser
} from '../firebaseAuth';

export default function UserAuthModal({ user, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
        setSuccessMsg('Account created successfully! You are now logged in.');
      } else {
        await loginWithEmail(email, password);
        setSuccessMsg('Logged in successfully!');
      }
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMsg('Logged in with Google!');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginGuest();
      setSuccessMsg('Logged in as Guest Demo User.');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setSuccessMsg('Logged out successfully.');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
      <div className="win98-outset w-full max-w-md bg-[#C0C0C0] p-3 flex flex-col gap-3 shadow-2xl">
        {/* Titlebar */}
        <div className="win98-titlebar flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User size={14} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">User Authentication & Cloud Profile - REI SignalLab 2.1</span>
          </div>
          <button onClick={onClose} className="win98-btn p-0.5 text-xs font-bold text-[#FF0000]">
            <X size={14} />
          </button>
        </div>

        {/* Current User Status Banner */}
        <div className="win98-inset p-2.5 bg-[#FFFFFF] flex items-center justify-between gap-2 border border-[#808080]">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-full ${user ? 'bg-[#00AA00] text-white' : 'bg-[#808080] text-white'}`}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="font-bold text-xs text-[#000080]">
                {user ? (user.isAnonymous ? 'Guest User (Demo Account)' : user.email) : 'Not Logged In'}
              </div>
              <div className="text-[10px] text-[#555555] font-mono">
                {user ? `UID: ${user.uid.slice(0, 12)}...` : 'Sign in to save projects to Cloud Firestore'}
              </div>
            </div>
          </div>
          {user && (
            <button onClick={handleLogout} disabled={loading} className="win98-btn text-xs bg-[#FF5555] text-white font-bold flex items-center gap-1">
              <LogOut size={12} /> Logout
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="win98-inset p-2 bg-[#FFDDDD] border border-[#FF0000] text-[#CC0000] text-xs font-mono flex items-start gap-1.5">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        {successMsg && (
          <div className="win98-inset p-2 bg-[#DDFFDD] border border-[#00AA00] text-[#008800] text-xs font-mono flex items-start gap-1.5">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Auth Forms if not logged in */}
        {!user && (
          <div className="flex flex-col gap-3">
            {/* Mode Switch Tabs */}
            <div className="flex border-b border-[#808080]">
              <button
                onClick={() => setMode('login')}
                className={`win98-tab text-xs font-bold flex-1 ${mode === 'login' ? 'active bg-[#FFFFCC] text-[#000080]' : ''}`}
              >
                <LogIn size={12} className="inline mr-1" /> Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`win98-tab text-xs font-bold flex-1 ${mode === 'signup' ? 'active bg-[#FFFFCC] text-[#000080]' : ''}`}
              >
                <UserPlus size={12} className="inline mr-1" /> Register New Account
              </button>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="win98-outset p-3 bg-[#E0E0E0] flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold">Email Address:</label>
                <input
                  type="email"
                  required
                  placeholder="engineer@signallab.site"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-xs font-mono p-1 border border-[#808080] bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold">Password:</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full text-xs font-mono p-1 border border-[#808080] bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="win98-btn text-xs font-bold bg-[#000080] text-white py-1.5 flex items-center justify-center gap-1 mt-1"
              >
                {mode === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
                {loading ? 'PROCESSING...' : (mode === 'login' ? 'SIGN IN WITH EMAIL' : 'CREATE ACCOUNT')}
              </button>
            </form>

            {/* Alternative Login Providers */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="win98-btn text-xs font-bold bg-[#FFFFFF] text-[#333333] border border-[#808080] py-1 flex items-center justify-center gap-2"
              >
                <Key size={14} className="text-[#4285F4]" /> Sign In with Google
              </button>

              <button
                onClick={handleGuestLogin}
                disabled={loading}
                className="win98-btn text-xs font-bold bg-[#E8E8E8] text-[#555555] py-1 flex items-center justify-center gap-1"
              >
                Continue as Guest (Local Offline Mode)
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-[#808080] pt-2">
          <button onClick={onClose} className="win98-btn text-xs px-4 font-bold">
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
