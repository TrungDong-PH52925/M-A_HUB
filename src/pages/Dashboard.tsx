/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, Button } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'motion/react';
import { 
  PlusCircle, 
  TrendingUp, 
  Briefcase, 
  Eye, 
  MessageSquare, 
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { t, language } = useLanguage();
  const [deals, setDeals] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      
      try {
        setLoading(true);
        if (profile?.role === 'seller') {
          // Fetch seller's deals
          const q = query(
            collection(db, 'deals'),
            where('sellerId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const snap = await getDocs(q);
          setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else if (profile?.role === 'buyer') {
          // In a real app we'd fetch saved deals or sent offers
          // For now let's just fetch some activity
        }
      } catch (err) {
        console.error("Error fetching dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, profile]);

  if (!profile) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('dashboard.dashboard')}</h1>
          <p className="text-slate-500 mt-1">{t('dashboard.welcome')}, {profile.name}.</p>
        </div>
        {profile.role === 'seller' && (
          <Link to="/submit-deal">
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" />
              {t('dashboard.newDeal')}
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: t('dashboard.activeDeals'), value: '3', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('dashboard.views'), value: '1.2k', icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t('dashboard.interests'), value: '14', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('dashboard.messages'), value: '8', icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Activity */}
        <div className="lg:col-span-2 space-y-8">
        {(profile.role === 'seller' || profile.role === 'advisor') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {profile.role === 'advisor' ? t('advisor.assignedDeals') : t('dashboard.recentListings')}
              </h2>
              <Link to="/my-deals" className="text-sm font-semibold text-slate-600 hover:text-slate-900 underline">{t('dashboard.viewAll')}</Link>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />
                ))
              ) : deals.length > 0 ? (
                deals.map((deal) => (
                  <Card key={deal.id} className="p-4 flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">
                        {deal.title.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{deal.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {deal.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            ${(deal.valuation / 1000000).toFixed(1)}M {t('dashboard.valuation')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link to={`/deals/${deal.id}`}>
                      <Button variant="ghost" size="sm">{t('dashboard.manage')}</Button>
                    </Link>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400">
                    {profile.role === 'advisor' ? 'No deals assigned for advisory yet.' : t('dashboard.noListings')}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t('dashboard.recentActivity')}</h2>
            <Card className="divide-y divide-slate-100">
              {[
                { type: 'offer', text: language === 'vi' ? 'Đề nghị mới nhận được cho "Project Phoenix"' : 'New offer received for "Project Phoenix"', time: language === 'vi' ? '2 giờ trước' : '2h ago', status: 'pending' },
                { type: 'nda', text: language === 'vi' ? 'NDA được ký bởi VentureGlobal LLC' : 'NDA signed by VentureGlobal LLC', time: language === 'vi' ? '5 giờ trước' : '5h ago', status: 'success' },
                { type: 'message', text: language === 'vi' ? 'Cố vấn đã để lại bình luận' : 'Advisor left a comment on Due Diligence documents', time: language === 'vi' ? '1 ngày trước' : '1d ago', status: 'info' }
              ].map((activity, i) => (
                <div key={i} className="p-4 flex items-start gap-4">
                  <div className="mt-1">
                    {activity.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900 font-medium">{activity.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t('dashboard.verificationStatus')}</h2>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${profile.kycStatus === 'verified' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                  {profile.kycStatus === 'verified' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {profile.kycStatus === 'verified' ? t('dashboard.identityVerified') : t('dashboard.kycPending')}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tier 1 Access</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                {t('dashboard.reviewNotice')}
              </p>
              <Link to="/kyc">
                <Button variant="outline" size="sm" className="w-full">{t('dashboard.completeKyc')}</Button>
              </Link>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t('dashboard.marketOutlook')}</h2>
            <Card className="p-6 bg-slate-900 text-white border-none shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.industryTrends')}</div>
                <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </div>
              </div>
              <h3 className="text-lg font-bold mb-4">
                {t('dashboard.techSectorTrend')}
              </h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {t('dashboard.saasTrend')}
              </p>
              <Button variant="secondary" size="sm" className="w-full">{t('dashboard.readFullReport')}</Button>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
