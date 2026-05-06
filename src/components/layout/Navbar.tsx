/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { auth } from '../../lib/firebase';
import { Button } from '../ui';
import { LogOut, User, LayoutDashboard, Search, PlusCircle, Languages, Shield, MessageSquare } from 'lucide-react';

export function Navbar() {
  const { user, profile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'vi' : 'en');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold tracking-tight text-slate-900 group flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-mono">M</div>
              M&A Hub
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/deals" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                {t('nav.browseDeals')}
              </Link>
              <Link to="/submit-deal" className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                {t('nav.listBusiness')}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-400">
              <Languages className="w-4 h-4" />
              {language}
            </Button>

            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    {profile?.role === 'advisor' ? t('advisor.dashboard') : t('nav.dashboard')}
                  </Button>
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {language === 'vi' ? 'Tin nhắn' : 'Messages'}
                  </Button>
                </Link>
                {(profile?.role === 'admin' || user?.email === 'dongntph52925@gmail.com') && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Shield className="w-4 h-4" />
                      {t('admin.dashboard')}
                    </Button>
                  </Link>
                )}
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center gap-3">
                  <Link to="/profile" className="flex flex-col items-end mr-1 group">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-slate-600 transition-colors">{profile?.name || user.email}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{profile?.role || 'User'}</span>
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleSignOut} title={t('nav.signOut')} className="w-8 h-8 p-0 rounded-full">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">{t('nav.getStarted')}</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
