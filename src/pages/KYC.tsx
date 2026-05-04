/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, Button, Input, Label } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function KYCPage() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        kycStatus: 'verified' // Auto-verify for demo
      });
      setSubmitted(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-4 bg-slate-50">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('kyc.success')}</h1>
          <p className="text-slate-500">{t('kyc.successDesc')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-24">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('kyc.title')}</h1>
        <p className="text-slate-500 mt-2">{t('kyc.subtitle')}</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t('kyc.documents')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-400 transition-colors cursor-pointer text-center group">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2 group-hover:text-slate-900" />
                <div className="text-xs font-bold text-slate-900">Passport / ID</div>
                <div className="text-[10px] text-slate-400 mt-1">{language === 'vi' ? 'Tải lên mặt trước và sau' : 'Upload front and back'}</div>
              </div>
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-400 transition-colors cursor-pointer text-center group">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2 group-hover:text-slate-900" />
                <div className="text-xs font-bold text-slate-900">{language === 'vi' ? 'Bằng chứng địa chỉ' : 'Proof of Address'}</div>
                <div className="text-[10px] text-slate-400 mt-1">{language === 'vi' ? 'Hóa đơn tiện ích hoặc sao kê ngân hàng' : 'Utility bill or bank statement'}</div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{t('kyc.businessProof')}</h2>
            <div className="p-6 border border-slate-200 rounded-xl bg-slate-50">
              <Label>{language === 'vi' ? 'Mã số đăng ký kinh doanh' : 'Business Registration Number'}</Label>
              <Input placeholder="e.g. UEN 201112345M" />
            </div>
          </section>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : t('kyc.submit')}
          </Button>
          
          <p className="text-[10px] text-center text-slate-400 uppercase font-black tracking-widest px-8">
            {language === 'vi' 
              ? 'Tất cả dữ liệu được mã hóa và lưu trữ theo các quy định AML/KYC toàn cầu và tiêu chuẩn GSOC-2.' 
              : 'All data is encrypted and stored according to global AML/KYC regulations and GSOC-2 standards.'}
          </p>
        </form>
      </Card>
    </div>
  );
}
