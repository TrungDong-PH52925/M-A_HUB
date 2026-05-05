/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate, useInView } from 'motion/react';
import { Button } from '../components/ui';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowRight, BarChart3, Shield, Zap, Globe, Users } from 'lucide-react';

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -100px 0px" });

  useEffect(() => {
    if (isInView && ref.current) {
      const controls = animate(0, value, {
        duration: 2.5,
        ease: "easeOut",
        onUpdate(val) {
          if (ref.current) {
            if (decimals === 0) {
              ref.current.textContent = `${prefix}${Math.floor(val).toLocaleString()}${suffix}`;
            } else {
              ref.current.textContent = `${prefix}${val.toFixed(decimals)}${suffix}`;
            }
          }
        }
      });
      return () => controls.stop();
    }
  }, [value, prefix, suffix, decimals, isInView]);

  return <div ref={ref} className="text-4xl font-bold mb-2">{prefix}0{suffix}</div>;
}

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2970&auto=format&fit=crop", // Corporate skyscraper
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2940&auto=format&fit=crop", // Business meeting
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2940&auto=format&fit=crop"  // Financial analysis
];

export default function LandingPage() {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroSlides = (t('landing.heroSlides') as any[]) || [];

  useEffect(() => {
    if (heroSlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

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
      <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 lg:pt-40 lg:pb-32 px-4">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.img 
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              src={HERO_IMAGES[currentSlide] || HERO_IMAGES[0]} 
              alt="Background" 
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-950 z-10" />
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto text-center">
          <div className="min-h-[450px] sm:min-h-[400px] lg:min-h-[420px] flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold mb-8 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {heroSlides[currentSlide]?.tagline || t('landing.tagline')}
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tight mb-8 drop-shadow-lg">
                  {heroSlides[currentSlide]?.title1 || t('landing.title')} <br /> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 drop-shadow-sm">
                    {heroSlides[currentSlide]?.title2}
                  </span>
                </h1>
                
                <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                  {heroSlides[currentSlide]?.subtitle || t('landing.subtitle')}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto gap-2 group bg-yellow-500 text-slate-900 hover:bg-yellow-400 border-none font-semibold shadow-xl">
                {t('landing.ctaEnter')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/deals">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                {t('landing.ctaBrowse')}
              </Button>
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60 text-white"
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
            <AnimatedNumber value={4.2} prefix="$" suffix="B+" decimals={1} />
            <div className="text-slate-400 text-sm">{t('landing.stats.volume')}</div>
          </div>
          <div className="text-center">
            <AnimatedNumber value={1200} suffix="+" />
            <div className="text-slate-400 text-sm">{t('landing.stats.entities')}</div>
          </div>
          <div className="text-center">
            <AnimatedNumber value={98} suffix="%" />
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
