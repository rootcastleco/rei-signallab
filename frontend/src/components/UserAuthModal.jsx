import React, { useState } from 'react';
import { User, LogIn, UserPlus, LogOut, ShieldCheck, Key, AlertCircle, X, CheckCircle2, Eye, EyeOff, Mail, Lock, RefreshCw, Copy, Check } from 'lucide-react';
import {
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  loginGuest,
  logoutUser,
  resetUserPassword,
  formatAuthError
} from '../firebaseAuth';

export default function UserAuthModal({ user, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Password Strength Calculator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Not Entered', color: 'bg-gray-300' };
    if (pwd.length < 6) return { score: 1, label: 'Weak (Min 6 chars)', color: 'bg-[#FF0000]' };
    const hasNum = /\d/.exec(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.exec(pwd);
    if (pwd.length >= 10 && hasNum && hasSpecial) return { score: 3, label: 'Strong ✓', color: 'bg-[#00AA00]' };
    if (pwd.length >= 8 && (hasNum || hasSpecial)) return { score: 2, label: 'Medium', color: 'bg-[#FFAA00]' };
    return { score: 1, label: 'Valid', color: 'bg-[#FFCC00]' };
  };

  const pwdStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          throw { code: 'auth/weak-password' };
        }
        await signUpWithEmail(email, password, displayName);
        setSuccessMsg('Account created successfully! You are now logged in.');
      } else if (mode === 'forgot') {
        await resetUserPassword(email);
        setSuccessMsg(`Password reset email sent to ${email}. Please check your inbox.`);
      } else {
        await loginWithEmail(email, password);
        setSuccessMsg('Logged in successfully!');
      }
      if (mode !== 'forgot') {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const u = await loginWithGoogle();
      if (u) {
        setSuccessMsg('Signed in with Google account successfully!');
        setTimeout(() => onClose(), 1000);
      } else {
        setSuccessMsg('Initiating Google OAuth redirect...');
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await loginGuest();
      setSuccessMsg('Signed in under Anonymous Guest Demo mode.');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setSuccessMsg('User logged out successfully.');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const copyUidToClipboard = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
      <div className="win98-outset w-full max-w-lg bg-[#C0C0C0] p-3 flex flex-col gap-3 shadow-2xl">
        {/* Titlebar */}
        <div className="win98-titlebar flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User size={14} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">User Account & Cloud Profile - REI SignalLab 2.1</span>
          </div>
          <button onClick={onClose} className="win98-btn p-0.5 text-xs font-bold text-[#FF0000]">
            <X size={14} />
          </button>
        </div>

        {/* Current User Status Banner */}
        <div className="win98-inset p-3 bg-[#FFFFFF] flex items-center justify-between gap-3 border border-[#808080]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${user ? 'bg-[#00AA00] text-white' : 'bg-[#808080] text-white'}`}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="font-bold text-xs text-[#000080]">
                {user ? (
                  user.displayName ? `${user.displayName} (${user.email || 'Guest User'})` : (user.isAnonymous ? 'Guest User (Offline Demo Mode)' : user.email)
                ) : 'Not Logged In'}
              </div>
              <div className="text-[10px] text-[#555555] font-mono flex items-center gap-1.5 mt-0.5">
                <span>{user ? `UID: ${user.uid}` : 'Sign in to save node graphs & workbenches to Cloud Firestore'}</span>
                {user && (
                  <button onClick={copyUidToClipboard} className="text-[#0000FF] hover:underline flex items-center gap-0.5" title="Copy UID">
                    {copiedUid ? <Check size={10} className="text-[#00AA00]" /> : <Copy size={10} />}
                  </button>
                )}
              </div>
            </div>
          </div>
          {user && (
            <button onClick={handleLogout} disabled={loading} className="win98-btn text-xs bg-[#FF5555] text-white font-bold flex items-center gap-1 px-3 py-1">
              <LogOut size={12} /> Sign Out
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="win98-inset p-2.5 bg-[#FFDDDD] border border-[#FF0000] text-[#CC0000] text-xs font-mono flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#FF0000]" />
            <div>
              <div className="font-bold">Authentication Error:</div>
              <div>{error}</div>
            </div>
          </div>
        )}
        {successMsg && (
          <div className="win98-inset p-2.5 bg-[#DDFFDD] border border-[#00AA00] text-[#008800] text-xs font-mono flex items-start gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-[#00AA00]" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Auth Forms (If not logged in) */}
        {!user && (
          <div className="flex flex-col gap-3">
            {/* Mode Switch Tabs */}
            <div className="flex border-b border-[#808080]">
              <button
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className={`win98-tab text-xs font-bold flex-1 py-1.5 ${mode === 'login' ? 'active bg-[#FFFFCC] text-[#000080] font-black' : ''}`}
              >
                <LogIn size={13} className="inline mr-1" /> Sign In
              </button>
              <button
                onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
                className={`win98-tab text-xs font-bold flex-1 py-1.5 ${mode === 'signup' ? 'active bg-[#FFFFCC] text-[#000080] font-black' : ''}`}
              >
                <UserPlus size={13} className="inline mr-1" /> Register Account
              </button>
              <button
                onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                className={`win98-tab text-xs font-bold flex-1 py-1.5 ${mode === 'forgot' ? 'active bg-[#FFFFCC] text-[#000080] font-black' : ''}`}
              >
                <RefreshCw size={13} className="inline mr-1" /> Reset Password
              </button>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="win98-outset p-3 bg-[#E0E0E0] flex flex-col gap-3">
              {mode === 'signup' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold flex items-center gap-1">
                    <User size={12} className="text-[#000080]" /> Full Name / Display Name:
                  </label>
                  <input
                    type="text"
                    placeholder="Batuhan Ayribas"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full text-xs font-mono p-1.5 border border-[#808080] bg-white"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold flex items-center gap-1">
                  <Mail size={12} className="text-[#000080]" /> Email Address:
                </label>
                <input
                  type="email"
                  required
                  placeholder="engineer@signallab.site"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-xs font-mono p-1.5 border border-[#808080] bg-white"
                />
              </div>

              {mode !== 'forgot' && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold flex items-center gap-1">
                      <Lock size={12} className="text-[#000080]" /> Password:
                    </label>
                    {mode === 'signup' && (
                      <span className="text-[10px] font-mono font-bold text-[#555555]">
                        Security: <span className="text-[#000080]">{pwdStrength.label}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full text-xs font-mono p-1.5 pr-8 border border-[#808080] bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 text-[#808080] hover:text-[#000000]"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {mode === 'signup' && password.length > 0 && (
                    <div className="h-1.5 w-full bg-[#CCCCCC] rounded-full overflow-hidden mt-1">
                      <div className={`h-full ${pwdStrength.color} transition-all duration-300`} style={{ width: `${(pwdStrength.score / 3) * 100}%` }} />
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="win98-btn text-xs font-bold bg-[#000080] text-white py-2 flex items-center justify-center gap-1.5 mt-1 shadow-md hover:bg-[#0000AA]"
              >
                {loading ? (
                  <span>PROCESSING...</span>
                ) : mode === 'signup' ? (
                  <> <UserPlus size={14} /> CREATE ACCOUNT & SIGN IN </>
                ) : mode === 'forgot' ? (
                  <> <RefreshCw size={14} /> SEND PASSWORD RESET EMAIL </>
                ) : (
                  <> <LogIn size={14} /> SIGN IN </>
                )}
              </button>
            </form>

            {/* Quick SSO & Guest Logins */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#808080]">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="win98-btn text-xs font-bold bg-[#FFFFFF] text-[#333333] border border-[#808080] py-2 flex items-center justify-center gap-2 hover:bg-[#F5F5F5]"
              >
                <Key size={14} className="text-[#4285F4]" />
                <span>Sign In with Google Account</span>
              </button>

              <button
                onClick={handleGuestLogin}
                disabled={loading}
                className="win98-btn text-xs font-bold bg-[#E8E8E8] text-[#444444] py-1.5 flex items-center justify-center gap-1"
              >
                ⚡ Continue as Guest (Offline Demo Mode)
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-[#808080] pt-2">
          <button onClick={onClose} className="win98-btn text-xs px-4 py-1 font-bold">
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
