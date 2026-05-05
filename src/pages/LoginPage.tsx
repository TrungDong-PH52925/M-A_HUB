/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Button, Card, Input, Label } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Info } from 'lucide-react';

export default function LoginPage() {
  const { t, language } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller' | 'advisor'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError(language === 'vi' ? 'Email không hợp lệ.' : 'Invalid email address.');
      return;
    }
    if (isSignUp && password.length < 6) {
      setError(language === 'vi' ? 'Mật khẩu phải có ít nhất 6 ký tự.' : 'Password must be at least 6 characters.');
      return;
    }
    if (isSignUp && !name) {
      setError(language === 'vi' ? 'Vui lòng nhập họ tên.' : 'Please enter your full name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Simulate/Trigger OTP sending via server
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to send OTP');
      setShowOtp(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Invalid OTP');

      // Proceed with actual Firebase Signup
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        name,
        email,
        role,
        kycStatus: 'pending',
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || 'Unnamed User',
          email: user.email,
          role: 'buyer',
          kycStatus: 'pending',
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Cửa sổ đăng nhập đã bị đóng. Vui lòng thử lại.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && !showOtp) {
      return handleSendOtp(e);
    }
    
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        return handleVerifyOtpAndSignUp(e);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const userData = userDoc.data();
        
        if (userData?.twoFactorEnabled && !twoFactorRequired) {
          setTwoFactorRequired(true);
          setLoading(false);
          return;
        }

        if (twoFactorRequired) {
          // Verify 2FA code (simulated logic for demo)
          if (otp !== '123456') throw new Error('Invalid 2FA code. Hint: Use 123456 for demo.');
        }

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {twoFactorRequired ? t('auth.twoFactor') : (isSignUp ? t('auth.createAccount') : t('auth.welcomeBack'))}
          </h1>
          <p className="text-slate-500 mt-2">
            {twoFactorRequired ? t('auth.twoFactorPrompt') : 'Professional M&A platform for the digital age'}
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {isSignUp && !showOtp && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <Label>{t('auth.fullName')}</Label>
                    <Input 
                      placeholder="Jane Doe" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required={isSignUp}
                    />
                  </div>
                  <div>
                    <Label>{t('auth.iam')}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['buyer', 'seller', 'advisor'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                            role === r 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showOtp && !twoFactorRequired && (
              <>
                <div>
                  <Label>{t('auth.email')}</Label>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <Label>{t('auth.password')}</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required
                  />
                </div>
              </>
            )}

            {(showOtp || twoFactorRequired) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Label>{showOtp ? t('auth.confirmOtp') : t('auth.twoFactor')}</Label>
                <div className="space-y-2">
                  <Input 
                    type="text" 
                    placeholder={t('auth.enterOtp')} 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                    maxLength={6}
                    required
                  />
                  {showOtp && (
                    <p className="text-[10px] text-slate-400 font-medium">{t('auth.otpSent')}</p>
                  )}
                </div>
              </motion.div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex gap-2 items-center">
                <Info className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button className="w-full" disabled={loading}>
              {loading ? 'Processing...' : (
                showOtp ? t('auth.confirmOtp') : 
                twoFactorRequired ? t('auth.signIn') :
                (isSignUp ? t('auth.signUp') : t('auth.signIn'))
              )}
            </Button>
            
            {(showOtp || twoFactorRequired) && (
              <Button 
                variant="ghost" 
                className="w-full text-xs" 
                onClick={() => { setShowOtp(false); setTwoFactorRequired(false); setOtp(''); }}
              >
                Back
              </Button>
            )}
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
            <div className="h-px flex-1 bg-slate-100" />
            OR
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Button variant="outline" className="w-full mt-6 gap-2" onClick={handleGoogleAuth} disabled={loading}>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('auth.google')}
          </Button>

          <p className="mt-8 text-center text-sm text-slate-500">
            {isSignUp ? t('auth.alreadyAccount') : t('auth.noAccount')}{' '}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-slate-900 font-semibold hover:underline"
            >
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </p>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Secured with enterprise-grade encryption</span>
        </div>
      </motion.div>
    </div>
  );
}
