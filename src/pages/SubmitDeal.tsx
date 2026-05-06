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
import { ArrowLeft, CheckCircle, Info, PlusCircle, Upload, FileText } from 'lucide-react';

export default function SubmitDeal() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [documents, setDocuments] = useState<File[]>([]);
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
    growthRate: '',
    reasonForSale: '',
    futurePlan: '',
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

  const handleNextStep = (next: number) => {
    if (step === 1) {
      if (!formData.title || !formData.industry || !formData.location) {
        alert(language === 'vi' ? 'Tiêu đề, Ngành nghề và Địa điểm là bắt buộc.' : 'Title, Industry and Location are required.');
        return;
      }
    }
    if (step === 2) {
      if (!formData.revenue || !formData.ebitda || !formData.valuation) {
        alert(language === 'vi' ? 'Vui lòng điền đầy đủ các chỉ số tài chính.' : 'Please fill in all financial metrics.');
        return;
      }
    }
    if (step === 3) {
      if (documents.length === 0) {
        alert(language === 'vi' ? 'Vui lòng cung cấp tài liệu chứng minh cho Deal.' : 'Please provide proof documents for the deal.');
        return;
      }
    }
    setStep(next);
  };

  const handleSubmit = async () => {
    if (profile?.role !== 'seller' && profile?.role !== 'admin') {
      alert(language === 'vi' ? 'Chỉ Người bán mới có thể đăng Deal.' : 'Only Sellers can list deals.');
      return;
    }
    if (profile?.kycStatus !== 'verified') {
      alert(language === 'vi' ? 'Bạn cần hoàn tất xác minh KYC trước khi đăng bài.' : 'You must complete KYC verification before listing a deal.');
      navigate('/kyc');
      return;
    }
    if (!formData.title || !formData.industry || !formData.location || !formData.description) {
      alert(language === 'vi' ? 'Vui lòng điền đầy đủ các thông tin bắt buộc.' : 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    
    const resizeImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        // If not image, just return a dummy string or ignore. Here we assume we only accept images for preview or we just handle them if they are images.
        if (!file.type.startsWith('image/')) {
          resolve(''); // Non-image docs will have no thumbnail
          return;
        }

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
      const documentsData = await Promise.all(documents.map(d => resizeImage(d)));

      const dealData = {
        title: formData.title,
        industry: formData.industry,
        location: formData.location,
        description: formData.description,
        valuation: parseFloat(formData.valuation),
        equityOffered: parseFloat(formData.equityOffered),
        dealType: formData.dealType,
        status: 'submitted', // Change to submitted for moderation
        sellerId: user.uid,
        createdAt: new Date().toISOString(),
        documents: documents.map(d => d.name), // Store file names for demo
        documentsData,
        metrics: {
          revenue: parseFloat(formData.revenue),
          ebitda: parseFloat(formData.ebitda),
          netProfit: parseFloat(formData.netProfit),
          growthRate: parseFloat(formData.growthRate)
        },
        strategic: {
          reasonForSale: formData.reasonForSale,
          futurePlan: formData.futurePlan
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
              <Button className="w-full" onClick={() => handleNextStep(2)}>{language === 'vi' ? 'Tiếp tục: Tài chính' : 'Continue to Financials'}</Button>
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
                <Label>{language === 'vi' ? 'Tốc độ tăng trưởng (%)' : 'Growth Rate (%)'}</Label>
                <Input 
                  type="number" 
                  placeholder="15" 
                  value={formData.growthRate}
                  onChange={e => setFormData({...formData, growthRate: e.target.value})}
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
              <Button className="flex-1" onClick={() => handleNextStep(3)}>{language === 'vi' ? 'Tiếp tục: Chi tiết M&A' : 'Continue to M&A Details'}</Button>
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
              <div>
                <Label>{language === 'vi' ? 'Lý do bán' : 'Reason for Sale'}</Label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg h-20"
                  value={formData.reasonForSale}
                  onChange={e => setFormData({...formData, reasonForSale: e.target.value})}
                />
              </div>
              <div>
                <Label>{language === 'vi' ? 'Kế hoạch tương lai' : 'Future Plans'}</Label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg h-20"
                  value={formData.futurePlan}
                  onChange={e => setFormData({...formData, futurePlan: e.target.value})}
                />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl flex gap-3 text-sm text-slate-500 border border-slate-100 mb-6">
                <Info className="w-5 h-5 shrink-0 text-slate-900" />
                {language === 'vi' 
                  ? 'Deal của bạn sẽ được đội ngũ tuân thủ của chúng tôi xem xét trước khi hiển thị cho người mua đã xác minh.' 
                  : 'Your deal will be reviewed by our compliance team before going live to verified buyers.'}
              </div>
            </div>
            
            <div className="space-y-6 mb-8 border-t border-slate-100 pt-6">
              <div>
                <Label>{language === 'vi' ? 'Tài liệu chứng minh (VD: BCTC, Giấy chứng nhận ĐKKD)' : 'Proof Documents (e.g., Financials, Business Reg.)'}</Label>
                <div className="mt-2">
                  <label className="relative group block p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center border-slate-200 hover:border-slate-400">
                    <input type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => {
                      if (e.target.files) {
                        setDocuments(Array.from(e.target.files));
                      }
                    }} />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-slate-900" />
                    <div className="text-sm font-bold text-slate-900">{language === 'vi' ? 'Tải lên tài liệu' : 'Upload Documents'}</div>
                  </label>
                  {documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>{doc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
