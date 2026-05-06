
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '../lib/firebase';
import { Card, Button, Input, Label } from '../components/ui';
import { motion } from 'motion/react';
import { User, Shield, Phone, Building, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phoneNumber: profile?.phoneNumber || '',
    company: profile?.company || '',
  });

  const [twoFactor, setTwoFactor] = useState(profile?.twoFactorEnabled || false);

  const handleToggle2FA = async () => {
    const newValue = !twoFactor;
    setTwoFactor(newValue);
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: newValue,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update 2FA failed:', error);
      setTwoFactor(!newValue); // revert
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        twoFactorEnabled: twoFactor,
        updatedAt: new Date().toISOString(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(firebaseAuth);
    navigate('/login');
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-24">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('profile.title')}</h1>
          <p className="text-slate-500 mt-2">{language === 'vi' ? 'Quản lý tài khoản và thiết lập bảo mật của bạn.' : 'Manage your account and security settings.'}</p>
        </div>
        <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" /> {t('profile.logout')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5" /> {t('profile.personalInfo')}
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>{t('auth.fullName')}</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>{t('auth.email')}</Label>
                  <Input value={profile.email} disabled className="bg-slate-50 opacity-60" />
                </div>
                <div>
                  <Label>{t('profile.phoneNumber')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input 
                      className="pl-10" 
                      placeholder="+84 ..." 
                      value={formData.phoneNumber} 
                      onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('profile.company')}</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input 
                      className="pl-10" 
                      placeholder="Acme Corp" 
                      value={formData.company} 
                      onChange={e => setFormData({...formData, company: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? '...' : t('profile.saveChanges')}
                </Button>
                {success && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-600 text-sm font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {language === 'vi' ? 'Đã lưu!' : 'Saved!'}
                  </motion.span>
                )}
              </div>
            </form>
          </Card>

          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5" /> {t('profile.security')}
              </h2>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{t('profile.enable2fa')}</h3>
                <p className="text-sm text-slate-500 max-w-md mt-1">{t('profile.twoFactorDesc')}</p>
              </div>
              <button 
                onClick={handleToggle2FA}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${twoFactor ? 'bg-slate-900' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactor ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">{language === 'vi' ? 'Trạng thái xác minh' : 'Verification Status'}</h3>
            <div className={`p-4 rounded-xl flex items-start gap-3 ${profile.kycStatus === 'verified' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {profile.kycStatus === 'verified' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <div>
                <div className="font-bold text-sm">
                  {profile.kycStatus === 'verified' ? t('dashboard.identityVerified') : t('dashboard.kycPending')}
                </div>
                <p className="text-xs mt-1 opacity-80">
                  {profile.kycStatus === 'verified' 
                    ? (language === 'vi' ? 'Hồ sơ của bạn đã được phê duyệt cho các giao dịch cao cấp.' : 'Your profile is approved for high-tier transactions.') 
                    : (language === 'vi' ? 'Bạn cần tải lên giấy tờ tùy thân để kích hoạt các tính năng nâng cao.' : 'You need to upload identity documents to unlock advanced features.')}
                </p>
                {profile.kycStatus !== 'verified' && (
                  <Button variant="outline" size="sm" className="mt-3 w-full border-amber-200 hover:bg-amber-100 text-amber-900" onClick={() => navigate('/kyc')}>
                    {t('dashboard.completeKyc')}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-900 text-white border-none">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{language === 'vi' ? 'Vai trò tài khoản' : 'Account Role'}</h3>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span className="capitalize">{profile.role}</span>
              <div className="text-[10px] px-2 py-0.5 bg-white/20 rounded uppercase tracking-tighter">Pro</div>
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              {profile.role === 'buyer' 
                ? (language === 'vi' ? 'Bạn có thể xem Deal và ký NDA.' : 'You can view deals and sign NDAs.') 
                : (language === 'vi' ? 'Bạn có quyền đăng tin và quản lý danh mục đầu tư.' : 'You have rights to list deals and manage portfolio.')}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
