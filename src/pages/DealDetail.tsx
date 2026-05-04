/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Label, Input } from '../components/ui';
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  FileCheck, 
  TrendingUp, 
  Users, 
  Download,
  Share2,
  Calendar,
  MessageSquare,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

import { GoogleGenerativeAI } from '@google/generative-ai';

export default function DealDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ndaSigned, setNdaSigned] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    async function fetchDeal() {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'deals', id));
        if (docSnap.exists()) {
          setDeal({ id: docSnap.id, ...docSnap.data() });
          
          if (user) {
            const ndaQuery = query(
              collection(db, `deals/${id}/ndas`),
              where('buyerId', '==', user.uid)
            );
            const ndaSnap = await getDocs(ndaQuery);
            if (!ndaSnap.empty) {
              setNdaSigned(true);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching deal:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDeal();
  }, [id, user]);

  const generateAISummary = async () => {
    if (!deal) return;
    setSummarizing(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Summarize this M&A deal as a professional advisor. Highlight the strengths and potential risks.
      Title: ${deal.title}
      Industry: ${deal.industry}
      Description: ${deal.description}
      Revenue: $${deal.metrics.revenue}
      EBITDA: $${deal.metrics.ebitda}
      Valuation: $${deal.valuation}
      Keep it concise and professional.`;
      
      const result = await model.generateContent(prompt);
      setAiSummary(result.response.text());
    } catch (err) {
      console.error("AI Summary Error:", err);
      setAiSummary("Unable to generate AI summary at this time.");
    } finally {
      setSummarizing(false);
    }
  };

  const handleSignNDA = async () => {
    if (!user || !id) {
      navigate('/login');
      return;
    }
    try {
      await addDoc(collection(db, `deals/${id}/ndas`), {
        buyerId: user.uid,
        signedAt: new Date().toISOString(),
        status: 'active'
      });
      setNdaSigned(true);
    } catch (err) {
      console.error("Error signing NDA:", err);
    }
  };

  const handleSubmitOffer = async () => {
    if (!user || !id) return;
    try {
      await addDoc(collection(db, `deals/${id}/offers`), {
        dealId: id,
        buyerId: user.uid,
        amount: parseFloat(offerAmount),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setShowOfferForm(false);
      alert("Offer submitted successfully!");
    } catch (err) {
      console.error("Error submitting offer:", err);
    }
  };

  if (loading) return <div className="pt-24 text-center">{language === 'vi' ? 'Đang tải dữ liệu...' : 'Loading deal details...'}</div>;
  if (!deal) return <div className="pt-24 text-center">{language === 'vi' ? 'Không tìm thấy Deal.' : 'Deal not found.'}</div>;

  const isSeller = user?.uid === deal.sellerId;

  return (
    <div className="max-w-7xl mx-auto px-4 py-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 font-medium">
        <ArrowLeft className="w-4 h-4" /> {t('dealDetail.back')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Deal Content */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-white px-3 py-1 bg-slate-900 rounded-full">
                {deal.industry}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {t('dealDetail.verified')}
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              {deal.title}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed italic border-l-4 border-slate-200 pl-6 mb-10">
              {deal.description}
            </p>

            {/* AI Summary Section */}
            {(ndaSigned || isSeller) && (
              <Card className="p-6 bg-purple-50 border-purple-100 mb-10 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <TrendingUp className="w-24 h-24 text-purple-900" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-purple-900">{t('dealDetail.aiAnalysis')}</h3>
                  </div>
                  {!aiSummary && (
                    <Button 
                      size="sm" 
                      variant="primary" 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={generateAISummary}
                      disabled={summarizing}
                    >
                      {summarizing ? t('dealDetail.analyzing') : t('dealDetail.generateAnalysis')}
                    </Button>
                  )}
                </div>
                {aiSummary && (
                  <div className="text-sm text-purple-800 leading-relaxed font-medium">
                    {aiSummary}
                  </div>
                )}
                {!aiSummary && !summarizing && (
                  <p className="text-xs text-purple-600 font-medium">
                    {language === 'vi' 
                      ? 'Mở khóa phân tích từ AI về deal này, bao gồm đánh giá rủi ro và dự báo tăng trưởng.' 
                      : 'Unlock AI-driven insights about this deal, including risk assessment and growth projection.'}
                  </p>
                )}
              </Card>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">{t('dealDetail.revenue')}</div>
                <div className="text-xl font-bold text-slate-900">${(deal.metrics.revenue / 1000000).toFixed(1)}M</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">{t('dealDetail.ebitda')}</div>
                <div className="text-xl font-bold text-slate-900">${(deal.metrics.ebitda / 1000000).toFixed(1)}M</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">{t('dealDetail.netProfit')}</div>
                <div className="text-xl font-bold text-slate-900">${(deal.metrics.netProfit / 1000000).toFixed(1)}M</div>
              </div>
              <div className="p-6 bg-slate-900 text-white rounded-2xl">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1 text-slate-400">{t('dealDetail.valuation')}</div>
                <div className="text-xl font-bold">${(deal.valuation / 1000000).toFixed(1)}M</div>
              </div>
            </div>
          </section>

          {/* Data Room Simulation */}
          <section className="relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{t('dealDetail.dataRoom')}</h2>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <Shield className="w-4 h-4" />
                {language === 'vi' ? 'MÃ HÓA ĐẦU CUỐI BẢO MẬT' : 'SECURE END-TO-TO-END ENCRYPTION'}
              </div>
            </div>
            
            <div className={`rounded-3xl border-2 border-dashed border-slate-200 p-12 transition-all ${!ndaSigned && !isSeller ? 'blur-sm grayscale bg-slate-50' : 'bg-white'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name: language === 'vi' ? 'Báo cáo tài chính (3 năm)' : 'Financial Statements (3Y)', icon: FileCheck, size: '2.4 MB' },
                  { name: language === 'vi' ? 'Cấu trúc doanh nghiệp' : 'Corporate Structure & Cap Table', icon: Users, size: '1.5 MB' },
                  { name: language === 'vi' ? 'Danh mục sở hữu trí tuệ' : 'Intellectual Property Portfolio', icon: Shield, size: '4.8 MB' },
                  { name: language === 'vi' ? 'Hợp đồng khách hàng' : 'Customer Contracts & Pipelines', icon: FileCheck, size: '3.1 MB' }
                ].map((file, i) => (
                  <div key={i} className="p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-600">
                        <file.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{file.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">{file.size}</div>
                      </div>
                    </div>
                    {(ndaSigned || isSeller) && <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><Download className="w-4 h-4" /></Button>}
                  </div>
                ))}
              </div>
            </div>

            {!ndaSigned && !isSeller && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/40">
                <Card className="p-8 text-center max-w-sm shadow-2xl">
                  <Lock className="w-12 h-12 text-slate-900 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{language === 'vi' ? 'Yêu cầu ký NDA' : 'NDA Required'}</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    {t('dealDetail.dataRoomDesc')}
                  </p>
                  <Button className="w-full gap-2" onClick={handleSignNDA}>
                    {t('dealDetail.signNda')}
                  </Button>
                </Card>
              </div>
            )}
          </section>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-8">
          <Card className="p-8 sticky top-24">
            <div className="mb-8">
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">{t('dealDetail.askingPrice')}</div>
              <div className="text-4xl font-bold text-slate-900">${(deal.valuation / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-slate-400 mt-2">
                {language === 'vi' ? 'Cho' : 'For'} {deal.equityOffered}% {t('dealDetail.equity')}
              </div>
            </div>

            <div className="space-y-4">
              {!isSeller && (
                <>
                  <Button className="w-full h-12 text-lg font-bold shadow-lg" onClick={() => setShowOfferForm(true)}>
                    {t('dealDetail.submitOffer')}
                  </Button>
                  <Button variant="outline" className="w-full h-12 gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t('dealDetail.messageSeller')}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1 gap-2">
                      <Calendar className="w-4 h-4" />
                      {t('dealDetail.meeting')}
                    </Button>
                    <Button variant="secondary" className="w-12 h-10 p-0">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
              {isSeller && (
                <Button className="w-full h-12 text-lg font-bold" onClick={() => navigate('/dashboard')}>
                  {language === 'vi' ? 'Quản lý bài đăng' : 'Manage Submissions'}
                </Button>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">
                SD
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 italic">{language === 'vi' ? 'Đại diện người bán' : 'Seller Representative'}</div>
                <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {language === 'vi' ? 'Trực tuyến' : 'Online'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-50 border-none">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> {t('dealDetail.marketFit')}
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{language === 'vi' ? 'Chỉ số tăng trưởng' : 'Growth Index'}</span>
                  <span className="text-slate-500">8.2 / 10</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-900 w-[82%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{language === 'vi' ? 'Điểm rủi ro' : 'Risk Score'}</span>
                  <span className="text-slate-500">{language === 'vi' ? 'Thấp' : 'Low'}</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[20%]" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="w-full max-w-md p-8">
              <h2 className="text-2xl font-bold mb-6">{language === 'vi' ? 'Gửi đề nghị của bạn' : 'Submit Your Offer'}</h2>
              <div className="space-y-6">
                <div>
                  <Label>{language === 'vi' ? 'Giá đề nghị ($)' : 'Offer Amount ($)'}</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 14500000" 
                    value={offerAmount}
                    onChange={e => setOfferAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {language === 'vi' 
                    ? 'Đây là giá đề nghị tham khảo, không ràng buộc. Sau khi gửi, người bán sẽ xem xét đề nghị và hồ sơ của bạn để quyết định các bước thẩm định tiếp theo.' 
                    : 'This is a non-binding indicative offer. Following submission, the seller will review your offer and profile to determine next steps for primary due diligence.'}
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowOfferForm(false)}>{language === 'vi' ? 'Hủy' : 'Cancel'}</Button>
                  <Button className="flex-1" onClick={handleSubmitOffer}>{language === 'vi' ? 'Gửi đề nghị' : 'Submit Offer'}</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
