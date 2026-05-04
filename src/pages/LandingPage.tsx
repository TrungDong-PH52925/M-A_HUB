/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRight, BarChart3, Shield, Zap, Globe, Users } from 'lucide-react';

export default function LandingPage() {
  const { t } = useLanguage();
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-slate-50 rounded-full blur-3xl opacity-50" />
        </div>
        
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {t('landing.tagline')}
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl lg:text-7xl font-bold text-slate-900 tracking-tight mb-8"
          >
            {t('landing.title').split(' ').slice(0, 2).join(' ')} <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">
              {t('landing.title').split(' ').slice(2).join(' ')}
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t('landing.subtitle')}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto gap-2 group">
                {t('landing.ctaEnter')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/deals">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {t('landing.ctaBrowse')}
              </Button>
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale"
          >
            {/* Mock logos */}
            <div className="flex items-center justify-center font-bold text-2xl italic tracking-tighter">GlobalCorp</div>
            <div className="flex items-center justify-center font-bold text-2xl italic tracking-tighter">TechVentures</div>
            <div className="flex items-center justify-center font-bold text-2xl italic tracking-tighter">MetroCapital</div>
            <div className="flex items-center justify-center font-bold text-2xl italic tracking-tighter">EvoBank</div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">$4.2B+</div>
            <div className="text-slate-400 text-sm">{t('landing.stats.volume')}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">1,200+</div>
            <div className="text-slate-400 text-sm">{t('landing.stats.entities')}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">98%</div>
            <div className="text-slate-400 text-sm">{t('landing.stats.success')}</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{t('landing.infrastructure.title')}</h2>
            <p className="text-slate-500 mt-4">{t('landing.infrastructure.subtitle')}</p>
          </div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              { icon: Shield, title: t('landing.infrastructure.vdrTitle'), desc: t('landing.infrastructure.vdrDesc') },
              { icon: Zap, title: t('landing.infrastructure.aiTitle'), desc: t('landing.infrastructure.aiDesc') },
              { icon: BarChart3, title: t('landing.infrastructure.analyticsTitle'), desc: t('landing.infrastructure.analyticsDesc') },
              { icon: Globe, title: t('landing.infrastructure.networkTitle'), desc: t('landing.infrastructure.networkDesc') },
              { icon: Users, title: t('landing.infrastructure.negotiationTitle'), desc: t('landing.infrastructure.negotiationDesc') },
              { icon: Shield, title: t('landing.infrastructure.complianceTitle'), desc: t('landing.infrastructure.complianceDesc') }
            ].map((f, i) => (
              <motion.div key={i} variants={item} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-6">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white text-[10px] font-bold">M</div>
            <span className="text-sm font-semibold text-slate-900">M&A Hub</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400 font-medium">
            <a href="#" className="hover:text-slate-900">{t('landing.footer.security')}</a>
            <a href="#" className="hover:text-slate-900">{t('landing.footer.privacy')}</a>
            <a href="#" className="hover:text-slate-900">{t('landing.footer.terms')}</a>
            <a href="#" className="hover:text-slate-900">{t('landing.footer.contact')}</a>
          </div>
          <p className="text-xs text-slate-400">© 2026 M&A Hub Ecosystem. {t('landing.footer.rights')}</p>
        </div>
      </footer>
    </div>
  );
}
