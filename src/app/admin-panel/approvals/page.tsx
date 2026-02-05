'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Toast from '../../components/Toast';
import DataStore from '@/lib/dataStore';

interface MenuApproval {
    id: string;
    restaurantId: string;
    restaurantName: string;
    productId: string;
    productName: string;
    type: 'ADD' | 'PRICE_CHANGE' | 'EDIT';
    oldValue?: string;
    newValue: string;
    oldData?: any;
    newData: any;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    timestamp: string;
}

export default function AdminGlobalApprovalsPage() {
    const [approvals, setApprovals] = useState<MenuApproval[]>([]);
    const [filter, setFilter] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    useEffect(() => {
        const loadApprovals = async () => {
            const dataStore = DataStore.getInstance();
            const data = await dataStore.getMenuApprovals();
            setApprovals(data as any);
        };

        loadApprovals();
        window.addEventListener('storage', loadApprovals);
        window.addEventListener('restaurant-update', loadApprovals);
        return () => {
            window.removeEventListener('storage', loadApprovals);
            window.removeEventListener('restaurant-update', loadApprovals);
        };
    }, []);

    const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
        const dataStore = DataStore.getInstance();
        await dataStore.updateMenuApproval(id, decision);

        window.dispatchEvent(new Event('restaurant-update'));
        setToast({
            message: decision === 'APPROVED' ? 'Talep onaylandı ve menü güncellendi.' : 'Talep reddedildi.',
            type: decision === 'APPROVED' ? 'success' : 'info'
        });
    };

    const displayList = approvals.filter(a => filter === 'PENDING' ? a.status === 'PENDING' : a.status !== 'PENDING');

    return (
        <div className="space-y-8 animate-fadeIn pb-12">

            {/* HEADER DASHBOARD - Modern Light Theme */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>

                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Menü Onayları</h1>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                        Menü ve fiyat güncellemelerini yönetin
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-10 relative z-10">
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner">
                        <button
                            onClick={() => setFilter('PENDING')}
                            className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'PENDING' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-gray-400 hover:text-gray-900'}`}
                        >
                            Bekleyenler ({approvals.filter(a => a.status === 'PENDING').length})
                        </button>
                        <button
                            onClick={() => setFilter('HISTORY')}
                            className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filter === 'HISTORY' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-gray-400 hover:text-gray-900'}`}
                        >
                            Geçmiş
                        </button>
                    </div>
                </div>
            </div>

            {/* LIST SECTION */}
            <div className="space-y-4">
                {displayList.length === 0 ? (
                    <div className="bg-white rounded-[3rem] border border-gray-100 p-24 text-center relative overflow-hidden group shadow-sm">
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 border border-gray-100 group-hover:scale-110 transition-transform duration-500">🍃</div>
                            <h3 className="text-xl font-black text-gray-300 uppercase tracking-[0.2em]">Şu Anda Talep Yok</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Restoranların şu an herhangi bir talebi bulunmuyor.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {displayList.map((req) => (
                            <div key={req.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 flex flex-col lg:flex-row items-center justify-between gap-8 hover:border-primary/20 hover:shadow-xl transition-all group relative overflow-hidden">

                                {/* Product Info */}
                                <div className="flex items-center gap-8 flex-1 w-full sm:w-auto">
                                    <div className="shrink-0 w-20 h-20 bg-gray-50 border border-gray-100 rounded-[2rem] flex items-center justify-center text-3xl group-hover:scale-110 transition-all shadow-inner">
                                        {req.newData?.image || (req.type === 'ADD' ? '✨' : req.type === 'PRICE_CHANGE' ? '💰' : '✏️')}
                                    </div>
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className="text-primary text-[10px] font-black uppercase tracking-widest py-1 px-3 bg-primary/5 rounded-full border border-primary/10">{req.restaurantName}</span>
                                            <span className="text-gray-300 text-[9px] font-black uppercase tracking-widest">{new Date(req.timestamp).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight truncate">{req.productName}</h3>

                                        <div className="flex items-center gap-6">
                                            {req.oldValue && (
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Eski Fiyat</span>
                                                    <span className="text-sm font-bold text-gray-400 line-through tracking-tight">{req.oldValue} TL</span>
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest mb-0.5">{req.type === 'ADD' ? 'Açılış Fiyatı' : 'Yeni Fiyat'}</span>
                                                <span className="text-lg font-black text-primary tracking-tight">{req.newValue} TL</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Request Summary */}
                                <div className="w-full lg:w-72 bg-gray-50 rounded-[1.5rem] p-6 border border-gray-100 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-primary/40 rounded-full"></div>
                                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sistem Analizi</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {req.newData?.unitAmount && (
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">Birim</span>
                                                <span className="text-[10px] font-bold text-gray-700">{req.newData.unitAmount} {req.newData.unitType}</span>
                                            </div>
                                        )}
                                        {req.newData?.baseCategory && (
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">Kategori</span>
                                                <span className="text-[10px] font-bold text-gray-700">{req.newData.baseCategory}</span>
                                            </div>
                                        )}
                                        {req.newData?.isMenu !== undefined && (
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">Tip</span>
                                                <span className="text-[10px] font-bold text-gray-700">{req.newData.isMenu ? 'Menü Ürünü' : 'Tekil Ürün'}</span>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic border-t border-gray-100 pt-2">
                                        {req.type === 'ADD' ? 'Yeni ürün girişi. Bölgesel standartlara uygun fiyatlandırma.' :
                                            req.type === 'PRICE_CHANGE' ? 'Maliyet bazlı fiyat güncelleme talebi.' :
                                                'İçerik veya görsel güncelleme çalışması.'}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 shrink-0 relative z-10 w-full lg:w-auto">
                                    {req.status === 'PENDING' ? (
                                        <>
                                            <button
                                                onClick={() => handleDecision(req.id, 'REJECTED')}
                                                className="flex-1 lg:flex-none px-8 py-4 bg-gray-50 border border-gray-200 text-gray-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                                            >
                                                Reddet
                                            </button>
                                            <button
                                                onClick={() => handleDecision(req.id, 'APPROVED')}
                                                className="flex-1 lg:flex-none px-10 py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                            >
                                                Onayla
                                            </button>
                                        </>
                                    ) : (
                                        <div className={`w-full lg:w-auto px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center justify-center gap-3
                                            ${req.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}
                                        `}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'APPROVED' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                            {req.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
