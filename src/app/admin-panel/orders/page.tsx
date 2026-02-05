'use client';

import { useState, useEffect } from 'react';
import DataStore from '@/lib/dataStore';
import { useTheme } from '../../components/ThemeProvider';
import Toast from '../../components/Toast';

interface Order {
    id: string;
    restaurant: string;
    customer: string;
    total: number;
    status: string;
    time: string;
    region: string;
    items: any[];
    isOffer?: boolean;
    offerStatus?: 'Accepted' | 'Rejected' | 'Pending';
}

export default function AdminOrdersPage() {
    const { isDark } = useTheme();
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterRestaurant, setFilterRestaurant] = useState('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const loadOrders = async () => {
        const dataStore = DataStore.getInstance();
        const orders = await dataStore.getOrders();
        setAllOrders(orders.map((o: any) => ({
            ...o,
            restaurant: o.restaurantName || o.restaurant || 'Bilinmeyen Restoran',
            region: o.neighborhood || o.region || 'Belirtilmemiş',
            time: o.time || o.date || '—',
            customer: o.userName || o.customer || 'Misafir'
        })));
    };

    useEffect(() => {
        loadOrders();
        window.addEventListener('storage', loadOrders);
        window.addEventListener('restaurant-update', loadOrders);
        return () => {
            window.removeEventListener('storage', loadOrders);
            window.removeEventListener('restaurant-update', loadOrders);
        };
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        const dataStore = DataStore.getInstance();
        await dataStore.updateOrder(id, { status: newStatus as any });
        setToast({ message: `Sipariş durumu "${newStatus}" olarak güncellendi.`, type: 'success' });
        window.dispatchEvent(new Event('restaurant-update'));
        setSelectedOrder(null);
    };

    const restaurantNames = ['All', ...Array.from(new Set(allOrders.map(o => o.restaurant)))];

    const filtered = allOrders.filter(o => {
        const matchStatus = filterStatus === 'All' || o.status === filterStatus;
        const matchRestaurant = filterRestaurant === 'All' || o.restaurant === filterRestaurant;
        return matchStatus && matchRestaurant;
    });

    const statusOptions = ['All', 'Yeni', 'Hazırlanıyor', 'Yolda', 'Hazır', 'Teslim Edildi', 'İptal Edildi'];

    return (
        <div className="space-y-8 animate-fadeIn pb-12">

            {/* HEADER SECTION - Modern Light Theme */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Tüm Siparişler</h1>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                            Platform genelindeki tüm operasyonu yönetin
                        </p>
                    </div>

                    <div className="relative w-full md:w-72">
                        <select
                            value={filterRestaurant}
                            onChange={e => setFilterRestaurant(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-[11px] font-black text-gray-900 outline-none uppercase tracking-widest focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer pr-12"
                        >
                            {restaurantNames.map(r => (
                                <option key={r} value={r}>
                                    {r === 'All' ? '📌 TÜM RESTORANLAR' : `🏪 ${r.toUpperCase()}`}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">▼</div>
                    </div>
                </div>
            </div>

            {/* STATUS FILTER BAR */}
            <div className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm flex flex-wrap gap-1 overflow-x-auto no-scrollbar">
                {statusOptions.map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${filterStatus === s
                            ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-100'
                            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50 scale-95'}`}
                    >
                        {s === 'All' ? 'TÜMÜ' : s} ({allOrders.filter(o => (s === 'All' || o.status === s) && (filterRestaurant === 'All' || o.restaurant === filterRestaurant)).length})
                    </button>
                ))}
            </div>

            {/* ORDERS LIST */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-[3rem] border border-gray-100 p-24 text-center relative overflow-hidden group shadow-sm">
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 border border-gray-100 group-hover:scale-110 transition-transform duration-500">🧾</div>
                            <h3 className="text-xl font-black text-gray-300 uppercase tracking-[0.2em]">Kayıt Bulunmuyor</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Seçili kriterlere uygun sipariş bulunamadı.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filtered.map((o) => (
                            <div key={o.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 flex flex-col lg:flex-row items-center justify-between gap-8 hover:border-primary/20 hover:shadow-xl transition-all group relative overflow-hidden">

                                {/* Info Box */}
                                <div className="flex items-center gap-8 flex-1 w-full">
                                    <div className={`shrink-0 w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl transition-all shadow-inner border
                                        ${o.status === 'Yeni' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                            o.status === 'Hazırlanıyor' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                                                o.status === 'Yolda' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' :
                                                    o.status === 'Teslim Edildi' ? 'bg-green-50 text-green-500 border-green-100' :
                                                        'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                        {o.status === 'Yeni' ? '🔔' : o.status === 'Hazırlanıyor' ? '👨‍🍳' : o.status === 'Yolda' ? '🛵' : '✅'}
                                    </div>

                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className="text-primary text-[10px] font-black uppercase tracking-widest py-1 px-3 bg-primary/5 rounded-full border border-primary/10">#{o.id}</span>
                                            <span className="text-gray-300 text-[9px] font-black uppercase tracking-widest">{o.time}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{o.restaurant}</h3>

                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Müşteri</span>
                                                <span className="text-xs font-bold text-gray-700">{o.customer}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Bölge</span>
                                                <span className="text-xs font-bold text-gray-700">{o.region}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest mb-0.5">Toplam Tutar</span>
                                                <span className="text-sm font-black text-primary">{o.total} TL</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Tag & Actions */}
                                <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto">
                                    <div className={`flex-1 lg:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border text-center
                                        ${o.status === 'Yeni' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            o.status === 'Hazırlanıyor' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                o.status === 'Yolda' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                    o.status === 'Teslim Edildi' ? 'bg-green-50 text-green-600 border-green-100' :
                                                        'bg-red-50 text-red-600 border-red-100'}`}>
                                        {o.status}
                                    </div>

                                    <button
                                        onClick={() => setSelectedOrder(o)}
                                        className="px-10 py-4 bg-gray-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-gray-900/10 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Müdahale Et
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* INTERVENTION MODAL */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/60 animate-fadeIn">
                    <div className="bg-white w-full max-w-xl rounded-[3.5rem] border border-gray-100 shadow-2xl p-12 animate-scaleUp overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-primary to-green-500"></div>

                        <div className="text-center space-y-4 mb-10">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto shadow-inner border border-gray-100 mb-6 group-hover:rotate-12 transition-transform">⚙️</div>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Sipariş Yönetimi</h3>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 mb-1">ID: {selectedOrder.id}</span>
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{selectedOrder.restaurant}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <button
                                onClick={() => updateStatus(selectedOrder.id, 'İptal Edildi')}
                                className="p-8 bg-red-50 border border-red-100 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-red-500 hover:text-white transition-all group shadow-sm text-red-600"
                            >
                                <span className="text-3xl">🚫</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Siparişi İptal Et</span>
                            </button>
                            <button
                                onClick={() => updateStatus(selectedOrder.id, 'Teslim Edildi')}
                                className="p-8 bg-green-50 border border-green-100 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-green-500 hover:text-white transition-all group shadow-sm text-green-600"
                            >
                                <span className="text-3xl">✅</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Teslim Edildi Yap</span>
                            </button>
                            <button
                                onClick={() => updateStatus(selectedOrder.id, 'Hazırlanıyor')}
                                className="p-6 bg-amber-50 border border-amber-100 rounded-[1.5rem] flex flex-col items-center gap-2 hover:bg-amber-500 hover:text-white transition-all text-amber-600"
                            >
                                <span className="text-xl">👨‍🍳</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">Hazırlanıyor</span>
                            </button>
                            <button
                                onClick={() => updateStatus(selectedOrder.id, 'Yolda')}
                                className="p-6 bg-indigo-50 border border-indigo-100 rounded-[1.5rem] flex flex-col items-center gap-2 hover:bg-indigo-500 hover:text-white transition-all text-indigo-600"
                            >
                                <span className="text-xl">🛵</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">Yolda</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setSelectedOrder(null)}
                            className="w-full py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-900 transition-colors"
                        >
                            Değişiklik Yapmadan Kapat
                        </button>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
