/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, Button, Input, Label } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, CheckCircle2, Camera, RefreshCw, FileText, Image as ImageIcon, Building, Users, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function KYCPage() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [permissionError, setPermissionError] = useState(false);

  // Identity State
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  
  // Company Profile State (Section III)
  const [companyData, setCompanyData] = useState({
    legalName: '',
    taxId: '',
    country: 'Vietnam',
    foundingYear: '',
    industry: '',
    productService: '',
    targetMarket: '',
    founderPct: '80',
    investorPct: '10',
    esopPct: '10'
  });
  
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setPermissionError(false);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setPermissionError(true);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const streams = (videoRef.current.srcObject as MediaStream).getTracks();
      streams.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setSelfie(dataUrl);
        stopCamera();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isBuyer = profile?.role === 'buyer';

    if (!idFront || !idBack || !selfie) {
      alert(language === 'vi' 
        ? 'Vui lòng hoàn tất tất cả các bước xác minh nhận diện.' 
        : 'Please complete all identity verification steps.');
      return;
    }

    if (!isBuyer && (!companyData.legalName || !companyData.taxId)) {
      alert(language === 'vi' 
        ? 'Vui lòng điền thông tin doanh nghiệp.' 
        : 'Please complete company data.');
      return;
    }
    
    if (!user) return;
    setLoading(true);
    
    const resizeImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
      });
    };

    try {
      const idFrontData = await resizeImage(idFront);
      const idBackData = await resizeImage(idBack);

      const kycPayload: any = {
        idFrontName: idFront.name,
        idBackName: idBack.name,
        idFrontData,
        idBackData,
        selfieData: selfie,
        verifiedAt: new Date().toISOString(),
      };

      if (!isBuyer) {
        Object.assign(kycPayload, companyData);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        kycStatus: 'pending',
        ...( !isBuyer ? { company: companyData.legalName, country: companyData.country } : {} ),
        kycData: kycPayload
      });
      setSubmitted(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      console.error('KYC Submission failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto pt-48 px-4 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('kyc.success')}</h1>
          <p className="text-slate-500">{t('kyc.successDesc')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-24">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{t('kyc.title')}</h1>
        <p className="text-slate-500 mt-2">{t('kyc.subtitle')}</p>
      </div>

      {/* Steps Indicator - Hidden for Buyers */}
      {profile?.role !== 'buyer' && (
      <div className="flex items-center justify-center gap-4 mb-12 max-w-xl mx-auto">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              step >= s ? 'bg-slate-900 text-white shadow-lg scale-110' : 'bg-slate-100 text-slate-400'
            }`}>
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            {s < 3 && <div className={`h-1 flex-1 rounded-full ${step > s ? 'bg-slate-900' : 'bg-slate-100'}`} />}
          </div>
        ))}
      </div>
      )}

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                {/* ID Documents */}
                <section className="space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {t('kyc.documents')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="mb-2 block text-xs font-bold text-slate-600">{t('kyc.idFront')}</Label>
                      <label className={`relative group block p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center ${idFront ? 'border-green-200 bg-green-50' : 'border-slate-200 hover:border-slate-400'}`}>
                        <input type="file" className="hidden" accept="image/*" onChange={e => setIdFront(e.target.files?.[0] || null)} />
                        {idFront ? (
                          <div className="text-green-600">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-xs font-bold truncate px-4">{idFront.name}</div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-slate-900" />
                            <div className="text-xs font-bold text-slate-900">{t('kyc.idFront')}</div>
                          </>
                        )}
                      </label>
                    </div>
                    <div>
                      <Label className="mb-2 block text-xs font-bold text-slate-600">{t('kyc.idBack')}</Label>
                      <label className={`relative group block p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center ${idBack ? 'border-green-200 bg-green-50' : 'border-slate-200 hover:border-slate-400'}`}>
                        <input type="file" className="hidden" accept="image/*" onChange={e => setIdBack(e.target.files?.[0] || null)} />
                        {idBack ? (
                          <div className="text-green-600">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-xs font-bold truncate px-4">{idBack.name}</div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-slate-900" />
                            <div className="text-xs font-bold text-slate-900">{t('kyc.idBack')}</div>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </section>

                {/* Face Verification */}
                <section className="space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Camera className="w-4 h-4" /> {t('kyc.faceVerify')}
                  </h2>
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center min-h-[300px] flex flex-col justify-center">
                    {permissionError && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 mb-6 max-w-md mx-auto">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <h4 className="font-bold mb-1">{language === 'vi' ? 'Lỗi truy cập Camera' : 'Camera Access Error'}</h4>
                        <p className="text-xs text-left">
                          {language === 'vi' 
                            ? 'Vui lòng kiểm tra quyền truy cập camera trong cài đặt trình duyệt của bạn. Bạn cần cho phép trang web này sử dụng camera để thực hiện KYC.' 
                            : 'Please check camera permissions in your browser settings. You must allow this site to use the camera for KYC verification.'}
                        </p>
                        <Button variant="outline" size="sm" className="mt-4 border-red-200 hover:bg-red-100" onClick={startCamera}>
                          {t('kyc.retake')}
                        </Button>
                      </div>
                    )}

                    {!showCamera && !selfie && !permissionError && (
                      <div className="py-12">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                          <Camera className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500 mb-6">{t('kyc.selfiePrompt')}</p>
                        <Button type="button" onClick={startCamera}>
                          <Camera className="w-4 h-4 mr-2" /> {t('kyc.startCamera')}
                        </Button>
                      </div>
                    )}
                    
                    {showCamera && (
                      <div className="space-y-6">
                        <div className="relative aspect-video max-w-md mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 border-2 border-dashed border-white/50 rounded-full" />
                          </div>
                        </div>
                        <div className="flex justify-center gap-4">
                          <Button type="button" variant="outline" onClick={stopCamera}>{language === 'vi' ? 'Hủy' : 'Cancel'}</Button>
                          <Button type="button" onClick={capturePhoto}><CheckCircle2 className="w-4 h-4 mr-2" /> {t('kyc.capture')}</Button>
                        </div>
                      </div>
                    )}
                    
                    {selfie && !showCamera && (
                      <div className="space-y-6">
                        <div className="relative aspect-video max-w-sm mx-auto bg-slate-200 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                          <img src={selfie} alt="Selfie" className="w-full h-full object-cover scale-x-[-1]" />
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={startCamera}><RefreshCw className="w-3 h-3 mr-2" /> {t('kyc.retake')}</Button>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </section>
                
                <div className="pt-6 border-t border-slate-100">
                  {profile?.role === 'buyer' ? (
                    <Button type="submit" className="w-full h-14" disabled={!idFront || !idBack || !selfie || loading}>
                      {loading ? '...' : (language === 'vi' ? 'Gửi xác minh' : 'Submit Verification')}
                    </Button>
                  ) : (
                    <Button type="button" className="w-full h-14" onClick={() => setStep(2)} disabled={!idFront || !idBack || !selfie}>
                      {language === 'vi' ? 'Tiếp tục: Hồ sơ doanh nghiệp' : 'Continue: Company Profile'}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                <section className="space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Building className="w-4 h-4" /> {t('kyc.companyProfile')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 border border-slate-200 rounded-3xl bg-slate-50/50">
                    <div>
                      <Label>{t('kyc.legalName')}</Label>
                      <Input placeholder="Acme International Ltd" value={companyData.legalName} onChange={e => setCompanyData({...companyData, legalName: e.target.value})} />
                    </div>
                    <div>
                      <Label>{t('kyc.taxId')}</Label>
                      <Input placeholder="VAT 123456789" value={companyData.taxId} onChange={e => setCompanyData({...companyData, taxId: e.target.value})} />
                    </div>
                    <div>
                      <Label>{language === 'vi' ? 'Quốc gia đăng ký' : 'Country of Reg'}</Label>
                      <Input value={companyData.country} onChange={e => setCompanyData({...companyData, country: e.target.value})} />
                    </div>
                    <div>
                      <Label>{t('kyc.foundingYear')}</Label>
                      <Input placeholder="2015" value={companyData.foundingYear} onChange={e => setCompanyData({...companyData, foundingYear: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>{t('submit.industry')}</Label>
                      <Input placeholder="FinTech, SaaS, Healthcare" value={companyData.industry} onChange={e => setCompanyData({...companyData, industry: e.target.value})} />
                    </div>
                    <div>
                      <Label>{language === 'vi' ? 'Sản phẩm / Dịch vụ' : 'Product / Service'}</Label>
                      <Input value={companyData.productService} onChange={e => setCompanyData({...companyData, productService: e.target.value})} />
                    </div>
                    <div>
                      <Label>{t('kyc.targetMarket')}</Label>
                      <Input placeholder="SEA, Global" value={companyData.targetMarket} onChange={e => setCompanyData({...companyData, targetMarket: e.target.value})} />
                    </div>
                  </div>
                </section>
                
                <div className="flex gap-4 pt-6 border-t border-slate-100">
                  <Button type="button" variant="outline" className="flex-1 h-14" onClick={() => setStep(1)}>{language === 'vi' ? 'Quay lại' : 'Back'}</Button>
                  <Button type="button" className="flex-1 h-14" onClick={() => setStep(3)} disabled={!companyData.legalName || !companyData.taxId}>
                    {language === 'vi' ? 'Tiếp tục: Cơ cấu sở hữu' : 'Continue: Ownership'}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                <section className="space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Users className="w-4 h-4" /> {t('kyc.ownership')}
                  </h2>
                  <div className="p-8 border border-slate-200 rounded-3xl bg-slate-50/50 space-y-6 text-center">
                    <p className="text-sm text-slate-500 mb-8">{language === 'vi' ? 'Phân bổ cổ phần hiện tại của doanh nghiệp' : 'Current equity allocation of the business'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <Label>{t('kyc.founderPct')}</Label>
                        <Input type="number" value={companyData.founderPct} onChange={e => setCompanyData({...companyData, founderPct: e.target.value})} className="text-center text-xl font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('kyc.investorPct')}</Label>
                        <Input type="number" value={companyData.investorPct} onChange={e => setCompanyData({...companyData, investorPct: e.target.value})} className="text-center text-xl font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('kyc.esopPct')}</Label>
                        <Input type="number" value={companyData.esopPct} onChange={e => setCompanyData({...companyData, esopPct: e.target.value})} className="text-center text-xl font-bold" />
                      </div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded-full flex overflow-hidden mt-12 shadow-inner">
                      <div className="bg-slate-900 h-full border-r border-white/20" style={{ width: `${companyData.founderPct}%` }} title="Founder" />
                      <div className="bg-blue-600 h-full border-r border-white/20" style={{ width: `${companyData.investorPct}%` }} title="Investor" />
                      <div className="bg-green-500 h-full" style={{ width: `${companyData.esopPct}%` }} title="ESOP" />
                    </div>
                  </div>
                </section>
                
                <div className="space-y-6">
                  <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={loading}>
                    {loading ? '...' : t('kyc.submit')}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(2)}>{language === 'vi' ? 'Quay lại' : 'Back'}</Button>
                  
                  <p className="text-[10px] text-center text-slate-400 uppercase font-bold tracking-widest px-8 leading-relaxed max-w-lg mx-auto">
                    {language === 'vi' 
                      ? 'Tất cả dữ liệu được mã hoá theo tiêu chuẩn GSOC-2. Việc cung cấp thông tin sai lệch có thể dẫn đến đình chỉ tài khoản vĩnh viễn.' 
                      : 'All data is encrypted to GSOC-2 standards. Providing false information may lead to permanent account suspension.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Card>
    </div>
  );
}
