import { useState } from 'react';
import { X, User, Eye, EyeOff, Apple } from 'lucide-react';
import { auth } from './lib/supabase';

export type AuthView = 'login' | 'register' | 'forgot';

export interface UserType {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
}

interface AuthModalProps {
  showAuth: boolean;
  setShowAuth: (show: boolean) => void;
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
}

export function AuthModal({ showAuth, setShowAuth, authView, setAuthView }: AuthModalProps) {
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      // Real Supabase auth
      const { data, error } = await auth.signIn(authEmail, authPassword);

      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        // Success handled by App.tsx onAuthStateChange
        setAuthEmail('');
        setAuthPassword('');
        setShowAuth(false);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      const { data, error } = await auth.signUp(authEmail, authPassword, authName);

      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        setSuccessMessage('Account created! Please check your email to verify your account.');
        setTimeout(() => {
          setAuthView('login');
          setSuccessMessage('');
          setAuthEmail('');
          setAuthPassword('');
          setAuthName('');
        }, 3000);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      const { error } = await auth.resetPassword(authEmail);

      if (error) {
        setAuthError(error.message);
      } else {
        setSuccessMessage('Password reset link sent! Please check your email.');
        setTimeout(() => {
          setAuthView('login');
          setSuccessMessage('');
          setAuthEmail('');
        }, 3000);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAuthError('');
    setIsLoading(true);

    try {
      const { error } = await auth.signInWithApple();

      if (error) {
        setAuthError(error.message);
      }
      // OAuth redirect will handle the rest
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!showAuth) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-cardstock rounded-3xl p-8 w-full max-w-md mx-4 relative text-ink">
        <button
          type="button"
          onClick={() => setShowAuth(false)}
          className="absolute top-4 right-4 p-2 hover:bg-paper-ruled rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-craft-mint/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-craft-mint" />
          </div>
          <h2 className="font-heading text-2xl font-bold">
            {authView === 'login' ? 'Welcome Back' : authView === 'register' ? 'Create Account' : 'Reset Password'}
          </h2>
        </div>

        {authError && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm">{authError}</div>
        )}

        {successMessage && (
          <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-4 text-sm">{successMessage}</div>
        )}

        {/* Apple Sign In - Only show on login */}
        {authView === 'login' && (
          <>
            <button
              onClick={handleAppleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 mb-4"
            >
              <Apple className="w-5 h-5" />
              Continue with Apple
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-cardstock text-ink-muted">Or continue with email</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={authView === 'login' ? handleLogin : authView === 'register' ? handleRegister : handleForgotPassword} className="space-y-4">
          {authView === 'register' && (
            <div>
              <label className="block text-sm font-semibold mb-2">Name</label>
              <input
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-ink/10 focus:border-craft-mint focus:ring-2 focus:ring-craft-mint/20 outline-none bg-paper-ruled text-ink placeholder:text-ink/40"
                placeholder="Your name"
                required={authView === 'register'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-ink/10 focus:border-craft-mint focus:ring-2 focus:ring-craft-mint/20 outline-none bg-paper-ruled text-ink placeholder:text-ink/40"
              placeholder="you@example.com"
              required
            />
          </div>

          {authView !== 'forgot' && (
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-ink/10 focus:border-craft-mint focus:ring-2 focus:ring-craft-mint/20 outline-none bg-paper-ruled text-ink placeholder:text-ink/40"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-ink-muted" /> : <Eye className="w-4 h-4 text-ink-muted" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full btn-primary py-3 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : authView === 'login' ? 'Sign In' : authView === 'register' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {authView === 'login' ? (
            <>
              <p className="text-ink-muted mb-2">Don't have an account? <button onClick={() => setAuthView('register')} className="text-craft-mint font-semibold">Sign up</button></p>
              <button onClick={() => setAuthView('forgot')} className="text-ink-muted">Forgot password?</button>
            </>
          ) : authView === 'register' ? (
            <p className="text-ink-muted">Already have an account? <button onClick={() => setAuthView('login')} className="text-craft-mint font-semibold">Sign in</button></p>
          ) : (
            <p className="text-ink-muted">Remember your password? <button onClick={() => setAuthView('login')} className="text-craft-mint font-semibold">Sign in</button></p>
          )}
        </div>

        <div className="mt-4 p-3 bg-paper-ruled rounded-xl text-xs text-ink-muted">
          <p className="font-semibold mb-1 text-ink/70">Need help?</p>
          <p>Contact your site administrator for access.</p>
        </div>
      </div>
    </div>
  );
}

// Ensure module exports are properly registered
export default AuthModal;
