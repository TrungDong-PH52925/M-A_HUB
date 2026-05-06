/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  const [otp, setOtp] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [testEmailUrl, setTestEmailUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  const getAuthErrorMessage = (err: any) => {
    if (err.code === 'auth/user-not-found') return language === 'vi' ? 'Tài khoản chưa tồn tại hoặc sai email.' : 'Account does not exist or wrong email.';
    if (err.code === 'auth/wrong-password') return language === 'vi' ? 'Sai mật khẩu.' : 'Incorrect password.';
    if (err.code === 'auth/invalid-credential') return language === 'vi' ? 'Tài khoản không tồn tại hoặc thông tin không chính xác. Vui lòng đăng ký nếu chưa có tài khoản.' : 'Account not found or incorrect credential. Please sign up if you do not have an account.';
    if (err.code === 'auth/email-already-in-use') return language === 'vi' ? 'Email này đã được sử dụng.' : 'This email is already in use.';
    if (err.code === 'auth/operation-not-allowed') return language === 'vi' ? 'Phương thức đăng nhập này chưa được kích hoạt. Bạn cần vào Firebase Console -> Authentication -> Sign-in method để bật Email/Password.' : 'This sign-in method is disabled. Please enable Email/Password in Firebase Console -> Authentication -> Sign-in method.';
    if (err.code === 'auth/popup-closed-by-user') return language === 'vi' ? 'Cửa sổ đăng nhập đã bị đóng. Vui lòng thử lại.' : 'Login popup was closed. Please try again.';
    
    // Default error
    return err.message || (language === 'vi' ? 'Đã xảy ra lỗi không xác định.' : 'An unknown error occurred.');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(language === 'vi' ? 'Vui lòng nhập email.' : 'Please enter your email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length === 0) {
          throw new Error(language === 'vi' ? 'Email này chưa được đăng ký trong hệ thống.' : 'This email is not registered in the system.');
        }
      } catch (checkErr: any) {
        // fetchSignInMethodsForEmail might fail if enumeration protection is enabled.
        if (checkErr.code === 'auth/user-not-found') {
          throw new Error(language === 'vi' ? 'Email này chưa được đăng ký trong hệ thống.' : 'This email is not registered in the system.');
        }
        if (checkErr.message && (checkErr.message.includes('not registered') || checkErr.message.includes('không được đăng ký') || checkErr.message.includes('chưa được đăng ký'))) {
          throw checkErr;
        }
      }

      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError(language === 'vi' ? 'Email này chưa được đăng ký trong hệ thống.' : 'This email is not registered in the system.');
      } else {
        setError(getAuthErrorMessage(err));
      }
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
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        if (password.length < 6) {
          throw new Error(language === 'vi' ? 'Mật khẩu phải có ít nhất 6 ký tự.' : 'Password must be at least 6 characters.');
        }
        if (!name) {
          throw new Error(language === 'vi' ? 'Vui lòng nhập họ tên.' : 'Please enter your full name.');
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          name,
          email,
          role: role,
          kycStatus: 'pending',
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        });
        navigate('/dashboard');
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const userData = userDoc.data();
        
        if (userData?.twoFactorEnabled && !twoFactorRequired) {
          setLoading(true);
          try {
            const res = await fetch('/api/auth/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.testUrl) {
              setTestEmailUrl(data.testUrl);
            }
            setTwoFactorRequired(true);
          } catch(e) {
            setError('Failed to send OTP email.');
          } finally {
            setLoading(false);
          }
          return;
        }

        if (twoFactorRequired) {
          setLoading(true);
          try {
            const res = await fetch('/api/auth/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (!data.success) {
              throw new Error(data.error || (language === 'vi' ? 'Mã 2FA không hợp lệ.' : 'Invalid 2FA code.'));
            }
          } catch(e: any) {
            throw new Error(e.message || (language === 'vi' ? 'Mã 2FA không hợp lệ.' : 'Invalid 2FA code.'));
          }
        }

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
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
              {isSignUp && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <Label>{t('auth.fullName')}</Label>
                    <Input 
                      placeholder="Jane Doe" 
                      value={name} 
                      onChange={(e) => { setName(e.target.value); setError(null); }} 
                      required={isSignUp}
                    />
                  </div>
                  <div>
                    <Label>{language === 'vi' ? 'Vai trò' : 'Role'}</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button 
                        type="button"
                        onClick={() => setRole('buyer')}
                        className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${role === 'buyer' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      >
                        {language === 'vi' ? 'Người Mua / Đầu Tư' : 'Buyer / Investor'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRole('seller')}
                        className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${role === 'seller' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      >
                        {language === 'vi' ? 'Người Bán / Doanh Nghiệp' : 'Seller / Business'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!twoFactorRequired && !showForgotPassword && (
              <>
                <div>
                  <Label>{t('auth.email')}</Label>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email} 
                    onChange={(e) => { setEmail(e.target.value); setError(null); }} 
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label>{t('auth.password')}</Label>
                    {!isSignUp && (
                      <button 
                        type="button" 
                        onClick={() => { setShowForgotPassword(true); setError(null); setResetSent(false); }} 
                        className="text-xs text-slate-500 hover:text-slate-900 font-medium"
                      >
                        {language === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?'}
                      </button>
                    )}
                  </div>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => { setPassword(e.target.value); setError(null); }} 
                    required
                  />
                </div>
              </>
            )}

            {showForgotPassword && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Label>{language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset Password'}</Label>
                <div className="space-y-4 mt-2">
                  <p className="text-sm text-slate-500">
                    {language === 'vi' ? 'Nhập email của bạn để nhận liên kết đặt lại mật khẩu.' : 'Enter your email to receive a password reset link.'}
                  </p>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required
                  />
                  {resetSent && (
                    <div className="p-3 bg-green-50 text-green-700 text-xs rounded-lg flex gap-2 items-center">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      {language === 'vi' ? 'Liên kết đã được gửi! Kiểm tra email của bạn.' : 'Link sent! Check your email.'}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {twoFactorRequired && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Label>{t('auth.twoFactor')}</Label>
                <div className="space-y-2 mb-4">
                  <Input 
                    type="text" 
                    placeholder={t('auth.enterOtp')} 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                    maxLength={6}
                    required
                  />
                  {testEmailUrl && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg mt-2">
                       <p className="font-bold mb-1">{language === 'vi' ? 'Chế độ Demo (Không dùng SendGrid thật)' : 'Demo Mode (No real SendGrid)'}</p>
                       <p>{language === 'vi' ? 'Vui lòng nhấn vào liên kết bên dưới để xem email chứa mã 2FA:' : 'Please click the link below to view the email containing your 2FA code:'}</p>
                       <a href={testEmailUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium block mt-1 break-all">
                         {language === 'vi' ? 'Mở Hộp thư Demo' : 'Open Demo Mailbox'}
                       </a>
                    </div>
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

            <Button className="w-full" disabled={loading} onClick={showForgotPassword ? handleForgotPassword : undefined} type={showForgotPassword ? "button" : "submit"}>
              {loading ? 'Processing...' : (
                showForgotPassword ? (language === 'vi' ? 'Gửi liên kết' : 'Send Link') :
                twoFactorRequired ? t('auth.signIn') :
                (isSignUp ? t('auth.signUp') : t('auth.signIn'))
              )}
            </Button>
            
            {(twoFactorRequired || showForgotPassword) && (
              <Button 
                variant="ghost" 
                className="w-full text-xs" 
                onClick={() => { setTwoFactorRequired(false); setShowForgotPassword(false); setOtp(''); }}
                type="button"
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
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
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
