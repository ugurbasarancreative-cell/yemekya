'use client';

import { useState, useEffect, Suspense } from 'react';
import DataStore from '@/lib/dataStore';
import Toast from '../../components/Toast';
import ConfirmModal from '../../components/ConfirmModal';
import { useTheme } from '../../components/ThemeProvider';
import { useSearchParams } from 'next/navigation';

function AdminInvoicesContent() {
    const searchParams = useSearchParams();
    const resIdFromUrl = searchParams.get('resId');
    const { isDark } = useTheme();
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(resIdFromUrl);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, resId: string | null, mondayKey: string | null }>({
        isOpen: false,
        resId: null,
        mondayKey: null
    });

    const loadRestaurants = async () => {
        const ds = DataStore.getInstance();
        const all = await ds.getRestaurants();
        setRestaurants(all);
        setIsLoading(false);
    };

    const loadInvoices = async (resId: string) => {
        const ds = DataStore.getInstance();
        const history = await ds.getInvoiceHistory(resId);
        setInvoices(history);
    };

    useEffect(() => {
        loadRestaurants();
    }, []);

    useEffect(() => {
        if (selectedRestaurant) {
            loadInvoices(selectedRestaurant);
        }
    }, [selectedRestaurant]);

    const handleMarkPaid = (resId: string, mondayKey: string) => {
        setConfirmConfig({
            isOpen: true,
            resId,
            mondayKey
        });
    };

    const confirmMarkPaid = async () => {
        if (confirmConfig.resId && confirmConfig.mondayKey) {
            const ds = DataStore.getInstance();
            await ds.markInvoicePaid(confirmConfig.resId, confirmConfig.mondayKey);
            setToast({ message: 'Seçili dönemin ödemesi başarıyla onaylandı.', type: 'success' });
            loadInvoices(confirmConfig.resId);
        }
        setConfirmConfig({ isOpen: false, resId: null, mondayKey: null });
    };

    return (
        <div className="space-y-12 animate-fadeIn max-w-[1600px] mx-auto pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <h1 className={`text-5xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tighter mb-4`}>FİNANSAL YÖNETİM</h1>
                    <p className={`text-sm font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} max-w-xl`}>
                        Restoranların haftalık komisyon ödemelerini takip edin ve ödemesi gelen faturaları buradan onaylayarak mutabakat sağlayın.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className={`${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'} px-8 py-5 rounded-[2rem] border min-w-[200px]`}>
                        <span className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-[0.2em] block mb-1`}>Fatura Periyodu</span>
                        <span className={`text-lg font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Haftalık (%5)</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
                {/* Restaurant List Sidebar */}
                <div className={`lg:col-span-1 rounded-[2.5rem] border ${isDark ? 'bg-surface border-white/10' : 'bg-white border-gray-100 shadow-2xl'} overflow-hidden flex flex-col max-h-[700px]`}>
                    <div className={`p-8 border-b ${isDark ? 'border-white/5' : 'border-gray-50'} shrink-0`}>
                        <h3 className={`text-xs font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-widest`}>Restoran Listesi</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        {restaurants.map(res => (
                            <button
                                key={res.id}
                                onClick={() => setSelectedRestaurant(res.id)}
                                className={`w-full p-6 rounded-3xl text-left transition-all group relative overflow-hidden ${selectedRestaurant === res.id
                                    ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20'
                                    : `${isDark ? 'hover:bg-white/5 text-white/50' : 'hover:bg-gray-50 text-gray-500'}`
                                    }`}
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <span className={`text-2xl transition-transform group-hover:scale-110 ${selectedRestaurant === res.id ? 'opacity-100' : 'opacity-40'}`}>🏪</span>
                                    <div className="flex flex-col">
                                        <span className={`text-xs font-black truncate w-32 ${selectedRestaurant === res.id ? 'text-white' : ''}`}>{res.name}</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${selectedRestaurant === res.id ? 'text-white/60' : 'text-gray-400/60'}`}>{res.category}</span>
                                    </div>
                                </div>
                                {selectedRestaurant === res.id && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-pulse shadow-lg" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Invoices Detailed Area */}
                <div className="lg:col-span-3 space-y-8">
                    {selectedRestaurant ? (
                        <div className={`rounded-[3rem] border ${isDark ? 'bg-surface border-white/10' : 'bg-white border-gray-100 shadow-2xl'} overflow-hidden animate-fadeIn`}>
                            <div className={`p-10 border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-50 bg-gray-50/50'} flex justify-between items-center`}>
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl">🧾</div>
                                    <div>
                                        <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tighter uppercase`}>Hizmet Bedeli Geçmişi</h3>
                                        <p className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-[0.2em] mt-1`}>{restaurants.find(r => r.id === selectedRestaurant)?.name}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className={`${isDark ? 'bg-white/2' : 'bg-gray-50/50'}`}>
                                            <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-widest`}>Dönem / Fatura No</th>
                                            <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-widest text-center`}>Brüt Ciro</th>
                                            <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-widest text-center`}>Net Komisyon</th>
                                            <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-widest text-center`}>Vade / Durum</th>
                                            <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-widest text-right`}>Yönetim</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {invoices.length > 0 ? invoices.map((inv) => (
                                            <tr key={inv.id} className="group hover:bg-white/2 transition-colors">
                                                <td className="px-10 py-8">
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{inv.period}</span>
                                                        <span className={`text-[10px] font-bold ${isDark ? 'text-white/20' : 'text-gray-400'} lowercase`}>{inv.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-center">
                                                    <span className={`text-sm font-bold ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{inv.grossRevenue.toLocaleString('tr-TR')} TL</span>
                                                </td>
                                                <td className="px-10 py-8 text-center">
                                                    <span className={`text-sm font-black ${isDark ? 'text-indigo-400 bg-indigo-500/5' : 'text-indigo-600 bg-indigo-50'} px-4 py-2 rounded-xl border border-indigo-500/10`}>
                                                        {inv.netCommission.toLocaleString('tr-TR')} TL
                                                    </span>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border shadow-sm ${inv.status === 'Ödendi' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                            inv.status === 'Ödeme Bekliyor' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                'bg-red-500/10 text-red-500 border-red-500/20'
                                                            }`}>
                                                            {inv.status}
                                                        </span>
                                                        <span className={`text-[9px] font-bold ${isDark ? 'text-white/20' : 'text-gray-400'} lowercase italic`}>Vade: {inv.date}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    {inv.status !== 'Ödendi' ? (
                                                        <button
                                                            onClick={() => handleMarkPaid(selectedRestaurant!, inv.start.split('.').reverse().join('-'))}
                                                            className="px-5 py-2.5 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
                                                        >
                                                            ÖDEME ONAYLA
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col items-end opacity-40">
                                                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">ONAYLANDI</span>
                                                            <span className="text-[9px] font-bold text-gray-500">Kayıt Başarılı</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center">
                                                    <div className="space-y-4">
                                                        <span className="text-4xl opacity-20 block">🍃</span>
                                                        <p className={`text-[10px] font-black ${isDark ? 'text-white/20' : 'text-gray-400'} uppercase tracking-[0.3em]`}>Herhangi bir finansal kayıt bulunamadı.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className={`h-[500px] rounded-[3rem] border border-dashed ${isDark ? 'border-white/10' : 'border-gray-200'} flex flex-center items-center justify-center text-center p-12`}>
                            <div className="space-y-6 animate-pulse">
                                <div className="text-6xl opacity-20">📡</div>
                                <h4 className={`text-sm font-black ${isDark ? 'text-white/20' : 'text-gray-400 uppercase tracking-widest'}`}>Lütfen Detaylarını Görmek İstediğiniz<br />Restoranı Soldan Seçiniz.</h4>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title="Ödeme Onayı"
                message="Seçili döneme ait komisyon ödemesinin tahsil edildiğini onaylıyor musunuz? Bu işlem restoran panelindeki durumu 'Ödendi' olarak güncelleyecektir."
                onConfirm={confirmMarkPaid}
                onCancel={() => setConfirmConfig({ isOpen: false, resId: null, mondayKey: null })}
                confirmText="Evet, Onayla"
                type="info"
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

export default function AdminInvoicesPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-xs font-black uppercase tracking-widest animate-pulse text-indigo-500">Finans Verileri Yükleniyor...</div>}>
            <AdminInvoicesContent />
        </Suspense>
    );
}
