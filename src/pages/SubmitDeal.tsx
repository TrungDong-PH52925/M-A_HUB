/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, Button, Input, Label } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle, Info, PlusCircle } from 'lucide-react';

export default function SubmitDeal() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    industry: '',
    location: '',
    description: '',
    valuation: '',
    equityOffered: '',
    revenue: '',
    ebitda: '',
    netProfit: '',
    dealType: 'sale_100',
    visibility: 'public'
  });

  const upgradeToSeller = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'seller'
      });
      window.location.reload(); // Refresh to update profile in context
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (profile?.role !== 'seller') {
    return (
      <div className="max-w-md mx-auto pt-32 px-4 text-center">
        <Card className="p-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <PlusCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{language === 'vi' ? 'Trở thành Người bán' : 'Become a Seller'}</h1>
          <p className="text-slate-500 mb-8 text-sm">
            {language === 'vi' 
              ? 'Tài khoản của bạn hiện tại là Buyer. Để đăng tin bán doanh nghiệp hoặc gọi vốn, bạn cần chuyển đổi sang vai trò Seller.' 
              : 'Your account is currently a Buyer. To list a business or raise capital, you need to switch to a Seller role.'}
          </p>
          <Button className="w-full" onClick={upgradeToSeller} disabled={loading}>
            {loading ? '...' : (language === 'vi' ? 'Nâng cấp lên Seller ngay' : 'Upgrade to Seller Now')}
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const dealData = {
        title: formData.title,
        industry: formData.industry,
        location: formData.location,
        description: formData.description,
        valuation: parseFloat(formData.valuation),
        equityOffered: parseFloat(formData.equityOffered),
        dealType: formData.dealType,
        status: 'published', // For demo we publish immediately
        sellerId: user.uid,
        createdAt: new Date().toISOString(),
        metrics: {
          revenue: parseFloat(formData.revenue),
          ebitda: parseFloat(formData.ebitda),
          netProfit: parseFloat(formData.netProfit)
        },
        visibility: formData.visibility
      };

      await addDoc(collection(db, 'deals'), dealData);
      navigate('/dashboard');
    } catch (err) {
      console.error("Error submitting deal:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 font-medium">
        <ArrowLeft className="w-4 h-4" /> {language === 'vi' ? 'Quay lại Bảng điều khiển' : 'Back to Dashboard'}
      </button>

      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('submit.title')}</h1>
        <p className="text-slate-500 mt-2">{t('submit.subtitle')}</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-4 mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            <div className={`h-1 flex-1 rounded-full ${step > s ? 'bg-slate-900' : 'bg-slate-100'}`} />
          </div>
        ))}
      </div>

      <Card className="p-8">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-6">{t('submit.step1')}</h2>
            <div className="space-y-6">
              <div>
                <Label>{t('submit.headline')}</Label>
                <Input 
                  placeholder="e.g. Leading SaaS Platform in FinTech" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('submit.industry')}</Label>
                  <Input 
                    placeholder="e.g. Software, Healthcare" 
                    value={formData.industry} 
                    onChange={e => setFormData({...formData, industry: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t('submit.location')}</Label>
                  <Input 
                    placeholder="e.g. Singapore, Remote" 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>{t('submit.description')}</Label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 h-32"
                  placeholder={t('submit.descPlaceholder')}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>{language === 'vi' ? 'Tiếp tục: Tài chính' : 'Continue to Financials'}</Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-6">{t('submit.step2')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <Label>{t('submit.revLabel')}</Label>
                <Input 
                  type="number" 
                  placeholder="5,000,000" 
                  value={formData.revenue}
                  onChange={e => setFormData({...formData, revenue: e.target.value})}
                />
              </div>
              <div>
                <Label>{t('submit.ebitdaLabel')}</Label>
                <Input 
                  type="number" 
                  placeholder="1,200,000" 
                  value={formData.ebitda}
                  onChange={e => setFormData({...formData, ebitda: e.target.value})}
                />
              </div>
              <div>
                <Label>{t('submit.netProfitLabel')}</Label>
                <Input 
                  type="number" 
                  placeholder="850,000" 
                  value={formData.netProfit}
                  onChange={e => setFormData({...formData, netProfit: e.target.value})}
                />
              </div>
              <div>
                <Label>{t('submit.askValuation')}</Label>
                <Input 
                  type="number" 
                  placeholder="15,000,000" 
                  value={formData.valuation}
                  onChange={e => setFormData({...formData, valuation: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>{t('submit.back')}</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>{language === 'vi' ? 'Tiếp tục: Chi tiết M&A' : 'Continue to M&A Details'}</Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold mb-6">{t('submit.step3')}</h2>
            <div className="space-y-6 mb-8">
              <div>
                <Label>{t('submit.structure')}</Label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  value={formData.dealType}
                  onChange={e => setFormData({...formData, dealType: e.target.value})}
                >
                  <option value="sale_100">{language === 'vi' ? 'Mua lại 100%' : '100% Acquisition'}</option>
                  <option value="partial_sale">{language === 'vi' ? 'Bán một phần / Hợp tác chiến lược' : 'Partial Sale / Strategic Partnership'}</option>
                  <option value="fundraising">{language === 'vi' ? 'Gọi vốn cổ phần' : 'Equity Fundraising'}</option>
                </select>
              </div>
              <div>
                <Label>{t('submit.equityLabel')}</Label>
                <Input 
                  type="number" 
                  placeholder="100" 
                  value={formData.equityOffered}
                  onChange={e => setFormData({...formData, equityOffered: e.target.value})}
                />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl flex gap-3 text-sm text-slate-500 border border-slate-100">
                <Info className="w-5 h-5 shrink-0 text-slate-900" />
                {language === 'vi' 
                  ? 'Deal của bạn sẽ được đội ngũ tuân thủ của chúng tôi xem xét trước khi hiển thị cho người mua đã xác minh.' 
                  : 'Your deal will be reviewed by our compliance team before going live to verified buyers.'}
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>{t('submit.back')}</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? '...' : t('submit.publish')}
              </Button>
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
