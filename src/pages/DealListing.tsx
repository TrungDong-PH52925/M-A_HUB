/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../lib/firebase';
import { Card, Button, Input } from '../components/ui';
import { Link } from 'react-router-dom';
import { Search, MapPin, BarChart2, DollarSign, Filter, Info } from 'lucide-react';
import { motion } from 'motion/react';

export default function DealListing() {
  const { t } = useLanguage();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchDeals() {
      try {
        setLoading(true);
        // Only fetch published deals for the public listing
        const q = query(
          collection(db, 'deals'),
          where('status', '==', 'published'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching deals:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, []);

  const filteredDeals = deals.filter(deal => 
    deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('deals.title')}</h1>
          <p className="text-slate-500 mt-2">
            {t('deals.subtitle')}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            className="pl-10" 
            placeholder={t('deals.searchPlaceholder')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          {t('deals.filters')}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredDeals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDeals.map((deal) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full flex flex-col hover:border-slate-400 transition-all group">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1 bg-slate-50 rounded">
                      {deal.industry || t('dashboard.general')}
                    </span>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {deal.location || t('dashboard.remote')}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-slate-800 mb-3">{deal.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                    {deal.description || t('dashboard.defaultDescription')}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <BarChart2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('dealDetail.revenue')}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">${(deal.metrics?.revenue / 1000000).toFixed(1)}M</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('dealDetail.ebitda')}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">${(deal.metrics?.ebitda / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{t('dealDetail.valuation')}</div>
                      <div className="text-lg font-bold text-slate-900">${(deal.valuation / 1000000).toFixed(1)}M</div>
                    </div>
                    <Link to={`/deals/${deal.id}`}>
                      <Button size="sm">{t('deals.viewDeal')}</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">{t('deals.noDeals')}</h3>
          <p className="text-slate-500 mt-1">{t('deals.adjustFilters')}</p>
        </div>
      )}
    </div>
  );
}
