/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, query, getDocs, updateDoc, doc, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { Card, Button } from '../components/ui';
import { 
  Users, 
  Shield, 
  FileCheck, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Eye,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeUserTab, setActiveUserTab] = useState<'pending' | 'all'>('pending');
  const [roleUpdates, setRoleUpdates] = useState<Record<string, string>>({});
  const [expandedKyc, setExpandedKyc] = useState<string | null>(null);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [activeDealTab, setActiveDealTab] = useState<'pending' | 'all'>('pending');
  const [dealStatusUpdates, setDealStatusUpdates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isBootstrappedAdmin = user?.email === 'dongntph52925@gmail.com';
    if (profile?.role !== 'admin' && !isBootstrappedAdmin && profile) {
      navigate('/dashboard');
      return;
    }

    async function fetchAdminData() {
      try {
        setLoading(true);
        // Fetch users pending KYC
        const usersPath = 'users';
        let usersSnap;
        try {
          usersSnap = await getDocs(query(collection(db, usersPath), where('kycStatus', '==', 'pending')));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, usersPath);
          return;
        }
        
        // Deduplicate by email (take latest/most complete if possible, simple approach: first seen)
        const pendingMap = new Map();
        usersSnap.docs.forEach(d => {
          const data = { id: d.id, ...d.data() } as any;
          if (!pendingMap.has(data.email) || data.kycData) {
            pendingMap.set(data.email, data);
          }
        });
        setUsers(Array.from(pendingMap.values()));

        // Fetch all users
        let allUsersSnap;
        try {
          allUsersSnap = await getDocs(query(collection(db, usersPath)));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, usersPath);
          return;
        }
        
        const allMap = new Map();
        allUsersSnap.docs.forEach(d => {
          const data = { id: d.id, ...d.data() } as any;
          if (!allMap.has(data.email) || data.kycStatus === 'verified' || data.kycData) {
             allMap.set(data.email, data);
          }
        });
        setAllUsers(Array.from(allMap.values()));

        // Fetch deals under review
        const dealsPath = 'deals';
        let dealsSnap;
        try {
          dealsSnap = await getDocs(query(collection(db, dealsPath), where('status', '==', 'submitted')));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, dealsPath);
          return;
        }
        setDeals(dealsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Fetch all deals
        let allDealsSnap;
        try {
          allDealsSnap = await getDocs(query(collection(db, dealsPath)));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, dealsPath);
          return;
        }
        setAllDeals(allDealsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, [profile, navigate]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setAllUsers(allUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setRoleUpdates(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleApproveKYC = async (userId: string) => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { kycStatus: 'verified' });
      setUsers(users.filter(u => u.id !== userId));
      setAllUsers(allUsers.map(u => u.id === userId ? { ...u, kycStatus: 'verified' } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleRejectKYC = async (userId: string) => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { kycStatus: 'rejected' });
      setUsers(users.filter(u => u.id !== userId));
      setAllUsers(allUsers.map(u => u.id === userId ? { ...u, kycStatus: 'rejected' } : u));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleUpdateDealStatus = async (dealId: string, newStatus: string) => {
    const path = `deals/${dealId}`;
    try {
      await updateDoc(doc(db, 'deals', dealId), { status: newStatus });
      setAllDeals(allDeals.map(d => d.id === dealId ? { ...d, status: newStatus } : d));
      if (newStatus === 'under_review' || newStatus === 'approved' || newStatus === 'published' || newStatus === 'in_negotiation' || newStatus === 'closed' || newStatus === 'rejected') {
         // remove from pending if it's no longer submitted, or add it if it reverted
      }
      setDeals(deals.filter(d => d.id !== dealId));
      setDealStatusUpdates(prev => {
        const next = { ...prev };
        delete next[dealId];
        return next;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleApproveDeal = async (dealId: string) => {
    await handleUpdateDealStatus(dealId, 'published');
  };

  const handleRejectDeal = async (dealId: string) => {
    await handleUpdateDealStatus(dealId, 'rejected');
  };

  if (profile?.role !== 'admin' && user?.email !== 'dongntph52925@gmail.com') return null;

  const totalVolume = allDeals.reduce((sum, deal) => sum + (deal.valuation || 0), 0);
  
  const formatCurrency = (value: number) => {
    if (value === 0) return '$0';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  };
  const formattedTotalVolume = formatCurrency(totalVolume);

  const handleMessageUser = async (targetUserId: string) => {
    if (!user) return;
    try {
      const d1 = await getDocs(query(collection(db, 'chats'), where('participants', '==', [user.uid, targetUserId])));
      const d2 = await getDocs(query(collection(db, 'chats'), where('participants', '==', [targetUserId, user.uid])));
      
      let chatId = '';
      if (!d1.empty) chatId = d1.docs[0].id;
      else if (!d2.empty) chatId = d2.docs[0].id;
      
      if (!chatId) {
        await addDoc(collection(db, 'chats'), {
          participants: [user.uid, targetUserId],
          updatedAt: new Date().toISOString()
        });
      }
      navigate('/messages');
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-24">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('admin.dashboard')}</h1>
        <p className="text-slate-500 mt-1">System-wide control and moderation panel.</p>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {[
          { label: t('admin.stats.totalUsers'), value: allUsers.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('admin.stats.pendingKyc'), value: users.length.toString(), icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: t('admin.stats.totalVolume'), value: formattedTotalVolume, icon: BarChart3, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <Card key={i} className="p-8 border-none shadow-sm bg-white ring-1 ring-slate-100">
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Users Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5" /> {t('admin.manageUsers')}
            </h2>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${activeUserTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveUserTab('pending')}
              >
                Pending ({users.length})
              </button>
              <button
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${activeUserTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveUserTab('all')}
              >
                All Users ({allUsers.length})
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {activeUserTab === 'pending' ? (
              users.length > 0 ? users.map((user) => (
                <Card key={user.id} className="p-6">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedKyc(expandedKyc === user.id ? null : user.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{user.name}</h3>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedKyc(expandedKyc === user.id ? null : user.id); }}>
                        {expandedKyc === user.id ? (language === 'vi' ? 'Đóng' : 'Close') : (language === 'vi' ? 'Xem tài liệu' : 'View Docs')}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleRejectKYC(user.id); }}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApproveKYC(user.id); }} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> {language === 'vi' ? 'Duyệt' : 'Approve'}
                      </Button>
                    </div>
                  </div>
                  
                  {expandedKyc === user.id && (
                    user.kycData ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-6 mt-6 border-t border-slate-100 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-400 font-medium">Company</p>
                          <p className="font-bold">{user.kycData.legalName}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Tax ID</p>
                          <p className="font-bold">{user.kycData.taxId}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-400 font-medium mb-3">Submitted Documents (Images)</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {user.kycData.idFrontData && (
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 border-b border-slate-100">ID Front</div>
                                <img src={user.kycData.idFrontData} alt="ID Front" className="w-full object-cover max-h-48" />
                              </div>
                            )}
                            {user.kycData.idBackData && (
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 border-b border-slate-100">ID Back</div>
                                <img src={user.kycData.idBackData} alt="ID Back" className="w-full object-cover max-h-48" />
                              </div>
                            )}
                            {user.kycData.selfieData && (
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 border-b border-slate-100">Selfie Match</div>
                                <img src={user.kycData.selfieData} alt="Selfie" className="w-full object-cover max-h-48" />
                              </div>
                            )}
                          </div>
                          {(!user.kycData.idFrontData && !user.kycData.idBackData && !user.kycData.selfieData) && (
                            <div className="flex gap-2 mt-4 text-slate-500 italic">
                              <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium">✓ {user.kycData.idFrontName || 'ID Front'}</span>
                              <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium">✓ {user.kycData.idBackName || 'ID Back'}</span>
                              <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-medium">✓ Selfie Match</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-6 mt-6 border-t border-slate-100 text-sm">
                        <div className="p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-center">
                          {language === 'vi' ? 'Người dùng chưa tải lên tài liệu xác minh.' : 'User has not uploaded verification documents yet.'}
                        </div>
                      </motion.div>
                    )
                  )}
                </Card>
              )) : (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400">No pending KYC requests</p>
                </div>
              )
            ) : (
              allUsers.length > 0 ? allUsers.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 relative">
                      <div className="flex items-center gap-1">
                        <select 
                          value={roleUpdates[user.id] || user.role} 
                          onChange={(e) => setRoleUpdates({ ...roleUpdates, [user.id]: e.target.value })}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider outline-none border cursor-pointer border-transparent hover:border-slate-300 ${(roleUpdates[user.id] || user.role) === 'admin' ? 'bg-purple-100 text-purple-700' : (roleUpdates[user.id] || user.role) === 'seller' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                          style={{ appearance: 'none', WebkitAppearance: 'none' }}
                        >
                          <option value="buyer" className="bg-white text-slate-900">BUYER</option>
                          <option value="seller" className="bg-white text-slate-900">SELLER</option>
                          <option value="advisor" className="bg-white text-slate-900">ADVISOR</option>
                          <option value="admin" className="bg-white text-slate-900">ADMIN</option>
                        </select>
                        {(roleUpdates[user.id] && roleUpdates[user.id] !== user.role) && (
                          <button
                            onClick={() => {
                              handleUpdateRole(user.id, roleUpdates[user.id]);
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white rounded p-0.5 flex items-center justify-center transition-colors shadow-sm"
                            title="Xác nhận đổi quyền"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${user.kycStatus === 'verified' ? 'bg-green-100 text-green-700' : user.kycStatus === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        KYC: {user.kycStatus}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleMessageUser(user.id); }} className="h-8 w-8 p-0 ml-2 mt-auto mb-auto" title="Message User">
                      <MessageSquare className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                    </Button>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400">No users found</p>
                </div>
              )
            )}
          </div>
        </section>

        {/* Deal Moderation Queue */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5" /> {t('admin.manageDeals')}
            </h2>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${activeDealTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveDealTab('pending')}
              >
                Pending ({deals.length})
              </button>
              <button
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${activeDealTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveDealTab('all')}
              >
                All Deals ({allDeals.length})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {activeDealTab === 'pending' ? (
            deals.length > 0 ? deals.map((deal) => (
              <Card key={deal.id} className="p-6">
                <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{deal.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{deal.industry}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">|</span>
                      <span className="text-[10px] font-bold text-slate-700">${(deal.valuation / 1000000).toFixed(1)}M Val</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedDeal(expandedDeal === deal.id ? null : deal.id); }}>
                      {expandedDeal === deal.id ? (language === 'vi' ? 'Đóng' : 'Close') : (language === 'vi' ? 'Xem tài liệu' : 'View Docs')}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleRejectDeal(deal.id); }}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handleUpdateDealStatus(deal.id, 'under_review'); }} className="bg-blue-600 hover:bg-blue-700">
                      Under Review
                    </Button>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApproveDeal(deal.id); }} className="bg-slate-900">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> {language === 'vi' ? 'Duyệt (Publish)' : 'Approve (Publish)'}
                    </Button>
                  </div>
                </div>
                
                {expandedDeal === deal.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-6 mt-6 border-t border-slate-100 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-400 font-medium">Revenue / EBITDA</p>
                        <p className="font-bold">${(deal.metrics?.revenue || 0).toLocaleString()} / ${(deal.metrics?.ebitda || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Structure</p>
                        <p className="font-bold">{deal.dealType}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-medium mb-3">Uploaded Proof Documents</p>
                        
                        {(deal.documentsData && deal.documentsData.length > 0) ? (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {deal.documentsData.map((dataUri: string, i: number) => (
                              dataUri ? (
                                <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                                  <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 border-b border-slate-100 truncate flex items-center justify-between">
                                    <span>Doc {i + 1}</span>
                                    {deal.documents?.[i] && <span className="font-normal text-[10px] text-slate-400 max-w-[80px] truncate" title={deal.documents[i]}>{deal.documents[i]}</span>}
                                  </div>
                                  <img src={dataUri} alt={`Doc ${i + 1}`} className="w-full object-cover max-h-32" />
                                </div>
                              ) : null
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(deal.documents || []).length > 0 ? deal.documents.map((docName: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-medium">✓ {docName}</span>
                            )) : (
                              <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">No documents attached</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </Card>
            )) : (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400">No deals pending moderation</p>
              </div>
            )
            ) : (
              allDeals.length > 0 ? allDeals.map((deal) => (
                <Card key={deal.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-sm">{deal.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">{deal.industry} • ${(deal.valuation / 1000000).toFixed(1)}M Val</p>
                    </div>
                    <div className="flex items-center gap-2 relative">
                      <div className="flex items-center gap-1">
                        <select 
                          value={dealStatusUpdates[deal.id] || deal.status} 
                          onChange={(e) => setDealStatusUpdates({ ...dealStatusUpdates, [deal.id]: e.target.value })}
                          className={`px-2 py-1 rounded text-xs font-bold outline-none border cursor-pointer border-slate-200 hover:border-slate-300 bg-slate-50`}
                        >
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="approved">Approved</option>
                          <option value="published">Published</option>
                          <option value="in_negotiation">In Negotiation</option>
                          <option value="closed">Closed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        {(dealStatusUpdates[deal.id] && dealStatusUpdates[deal.id] !== deal.status) && (
                          <button
                            onClick={() => handleUpdateDealStatus(deal.id, dealStatusUpdates[deal.id])}
                            className="bg-green-500 hover:bg-green-600 text-white rounded p-1 flex items-center justify-center transition-colors shadow-sm"
                            title="Confirm Status Change"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)} className="h-8 w-8 p-0 ml-2">
                        <Eye className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                  {expandedDeal === deal.id && (
                    <div className="pt-4 mt-4 border-t border-slate-100 text-xs">
                       <p><span className="text-slate-400 font-bold">Seller ID:</span> {deal.sellerId}</p>
                       <p className="mt-1"><span className="text-slate-400 font-bold">Created At:</span> {deal.createdAt}</p>
                    </div>
                  )}
                </Card>
              )) : (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400">No deals found</p>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
