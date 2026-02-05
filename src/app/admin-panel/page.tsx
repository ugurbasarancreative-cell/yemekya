'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DataStore, { Order } from '@/lib/dataStore';

export default function AdminDashboard() {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState({
        totalRestaurants: 0,
        pendingApprovals: 0,
        totalRevenue: 0
    });

    const [orderTimeframe, setOrderTimeframe] = useState<'gunluk' | 'haftalik' | 'aylik' | 'yillik'>('gunluk');
    const [revenueTimeframe, setRevenueTimeframe] = useState<'gunluk' | 'haftalik' | 'aylik' | 'yillik'>('gunluk');
    const [radarTimeframe, setRadarTimeframe] = useState<'günlük' | 'haftalık' | 'aylık' | 'yıllık'>('aylık');

    const [chartData, setChartData] = useState<number[]>([]);
    const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

    // Live Dynamics States
    const [liveTraffic, setLiveTraffic] = useState({ online: 0, activeOrders: 0, activeRestaurants: 0 });
    const [announcement, setAnnouncement] = useState({
        active: false,
        text: '',
        target: 'all' as 'all' | 'user' | 'restaurant',
        id: ''
    });
    const [draftText, setDraftText] = useState('');

    useEffect(() => {
        const storedAnn = localStorage.getItem('YEMEKYA_GLOBAL_ANNOUNCEMENT');
        if (storedAnn) {
            const parsed = JSON.parse(storedAnn);
            setAnnouncement(parsed);
            setDraftText(parsed.text);
        }
    }, []);

    const publishAnnouncement = (active: boolean) => {
        const newData = {
            active,
            text: draftText,
            target: announcement.target,
            id: Date.now().toString() // New ID triggers sound and resets "closed" status
        };
        setAnnouncement(newData);
        localStorage.setItem('YEMEKYA_GLOBAL_ANNOUNCEMENT', JSON.stringify(newData));
        window.dispatchEvent(new Event('announcement-change'));
    };

    const updateTarget = (target: 'all' | 'user' | 'restaurant') => {
        setAnnouncement(prev => ({ ...prev, target }));
    };

    // Advanced Analytics States
    const [topRestaurants, setTopRestaurants] = useState<any[]>([]);
    const [popularProducts, setPopularProducts] = useState<any[]>([]);
    const [neighborhoodStats, setNeighborhoodStats] = useState<any[]>([]);

    const syncData = async () => {
        const dataStore = DataStore.getInstance();
        const [platformStats, orders, allApprovals, users] = await Promise.all([
            dataStore.getAdminStats(),
            dataStore.getOrders(),
            dataStore.getMenuApprovals(),
            dataStore.getUsers()
        ]);

        const activeOrderCount = orders.filter(o => !['Teslim Edildi', 'İptal Edildi'].includes(o.status)).length;
        const realUserCount = users.filter(u => u.role === 'user').length;

        setLiveTraffic({
            online: realUserCount,
            activeOrders: activeOrderCount,
            activeRestaurants: platformStats.activeRestaurants
        });

        setAllOrders(orders);
        setStats({
            totalRestaurants: platformStats.totalRestaurants,
            pendingApprovals: platformStats.pendingApprovals,
            totalRevenue: platformStats.totalRevenue
        });

        // 1. TOP RESTAURANTS CALCULATION
        const restaurantRevenue: Record<string, { name: string; total: number; count: number }> = {};
        orders.forEach(o => {
            if (!restaurantRevenue[o.restaurantId]) {
                restaurantRevenue[o.restaurantId] = { name: o.restaurantName, total: 0, count: 0 };
            }
            restaurantRevenue[o.restaurantId].total += Number(o.total) || 0;
            restaurantRevenue[o.restaurantId].count += 1;
        });
        const topRest = Object.entries(restaurantRevenue)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);
        setTopRestaurants(topRest);

        // 2. POPULAR PRODUCTS CALCULATION
        const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};
        orders.forEach(o => {
            o.items.forEach(item => {
                if (!productCounts[item.name]) {
                    productCounts[item.name] = { name: item.name, count: 0, revenue: 0 };
                }
                productCounts[item.name].count += item.quantity;
                productCounts[item.name].revenue += (item.price * item.quantity);
            });
        });
        const popular = Object.values(productCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        setPopularProducts(popular);

        // 3. NEIGHBORHOOD STATS
        const hoodStats: Record<string, { name: string; count: number }> = {};
        orders.forEach(o => {
            const hood = o.neighborhood || 'Bilinmiyor';
            if (!hoodStats[hood]) hoodStats[hood] = { name: hood, count: 0 };
            hoodStats[hood].count++;
        });
        const topHoods = Object.values(hoodStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);
        setNeighborhoodStats(topHoods);

        // Radar Chart Logic
        const segments = Array(12).fill(0);
        const now = new Date();
        let filteredForRadar = orders;
        if (radarTimeframe === 'günlük') {
            const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            filteredForRadar = orders.filter(o => new Date(o.date) > dayAgo);
            filteredForRadar.forEach(o => {
                const hour = new Date(o.date).getHours();
                const idx = Math.floor(hour / 2);
                segments[idx]++;
            });
        } else if (radarTimeframe === 'haftalık') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredForRadar = orders.filter(o => new Date(o.date) > weekAgo);
            filteredForRadar.forEach(o => {
                const day = new Date(o.date).getDay();
                const idx = day % 12;
                segments[idx]++;
            });
        } else if (radarTimeframe === 'aylık') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filteredForRadar = orders.filter(o => new Date(o.date) > monthAgo);
            filteredForRadar.forEach(o => {
                const dom = new Date(o.date).getDate();
                const idx = Math.floor(dom / 3) % 12;
                segments[idx]++;
            });
        } else {
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            filteredForRadar = orders.filter(o => new Date(o.date) > yearAgo);
            filteredForRadar.forEach(o => {
                const month = new Date(o.date).getMonth();
                segments[month]++;
            });
        }
        const maxVal = Math.max(...segments, 1);
        setChartData(segments.map(s => (s / maxVal) * 100 || 5));

        // Alerts
        const pending = allApprovals.filter(a => a.status === 'PENDING').slice(0, 3);
        const alerts = pending.map(p => ({
            title: 'Menü Onayı Bekliyor',
            desc: `${p.restaurantName}: ${p.productName} için ${p.type} talebi.`,
            status: 'Sistem',
            time: 'Şimdi',
            link: '/admin-panel/approvals'
        }));
        if (alerts.length === 0) {
            alerts.push({
                title: 'Sistem Stabil',
                desc: 'Tüm operasyonlar normal seyrediyor. Bekleyen kritik ihbar bulunmuyor.',
                status: 'Normal',
                time: '-',
                link: '/admin-panel/analytics'
            });
        }
        setRecentAlerts(alerts);
    };

    useEffect(() => {
        syncData();
        window.addEventListener('storage', syncData);
        window.addEventListener('restaurant-update', syncData);
        return () => {
            window.removeEventListener('storage', syncData);
            window.removeEventListener('restaurant-update', syncData);
        };
    }, [radarTimeframe]);

    const getFilteredStats = (type: 'orders' | 'revenue', timeframe: string) => {
        const now = new Date();
        let threshold = new Date(0);
        if (timeframe === 'gunluk') threshold = new Date(now.setHours(0, 0, 0, 0));
        else if (timeframe === 'haftalik') threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (timeframe === 'aylik') threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        else if (timeframe === 'yillik') threshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        const filtered = allOrders.filter(o => new Date(o.date) >= threshold);
        if (type === 'orders') return filtered.length;
        return filtered.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    };

    const toggleOrderTimeframe = () => {
        const sequence: ('gunluk' | 'haftalik' | 'aylik' | 'yillik')[] = ['gunluk', 'haftalik', 'aylik', 'yillik'];
        const nextIdx = (sequence.indexOf(orderTimeframe) + 1) % sequence.length;
        setOrderTimeframe(sequence[nextIdx]);
    };

    const toggleRevenueTimeframe = () => {
        const sequence: ('gunluk' | 'haftalik' | 'aylik' | 'yillik')[] = ['gunluk', 'haftalik', 'aylik', 'yillik'];
        const nextIdx = (sequence.indexOf(revenueTimeframe) + 1) % sequence.length;
        setRevenueTimeframe(sequence[nextIdx]);
    };

    return (
        <div className="space-y-12 animate-fadeIn pb-12">

            {/* LIVE PLATFORM STATUS & ANNOUNCEMENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Live Traffic */}
                <div className="lg:col-span-1 bg-[#0c0c14] rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Platform Nabzı</h3>
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Canlı</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Restoran</span>
                                <div className="text-3xl font-black tracking-tighter transition-all duration-500 text-green-400">{liveTraffic.activeRestaurants}</div>
                            </div>
                            <div className="space-y-1 text-center">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Kullanıcı</span>
                                <div className="text-3xl font-black tracking-tighter transition-all duration-500">{liveTraffic.online}</div>
                            </div>
                            <div className="space-y-1 text-right">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Sipariş</span>
                                <div className="text-3xl font-black tracking-tighter transition-all duration-500 text-primary">{liveTraffic.activeOrders}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Global Announcement Controller */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-border p-10 shadow-premium flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center text-2xl">📢</div>
                            <h3 className="text-2xl font-black text-text uppercase tracking-tighter italic">Global Duyuru Paneli</h3>
                        </div>
                        <div className="relative h-14 group">
                            <input
                                type="text"
                                placeholder="Tüm platforma mesaj gönder..."
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                                className="w-full h-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 font-bold text-sm focus:border-primary focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex flex-col gap-3">
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                            {(['all', 'user', 'restaurant'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => updateTarget(t)}
                                    className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${announcement.target === t ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {t === 'all' ? 'HERKES' : t === 'user' ? 'MÜŞTERİ' : 'RESTORAN'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => publishAnnouncement(!announcement.active)}
                            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${announcement.active ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-green-500 text-white shadow-green-500/20'}`}
                        >
                            {announcement.active ? 'Duyuruyu Kapat' : 'Duyuruyu Yayınla'}
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white rounded-[2.5rem] p-8 border border-border relative overflow-hidden group shadow-premium transition-all hover:shadow-xl">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">🏪</span>
                    </div>
                    <div className="mt-8 relative z-10">
                        <h3 className="text-4xl font-black text-text tracking-tighter">{stats.totalRestaurants}</h3>
                        <p className="text-[11px] font-bold text-text-light uppercase tracking-widest mt-1">Aktif Mağazalar</p>
                    </div>
                </div>

                <div onClick={toggleOrderTimeframe} className="bg-white rounded-[2.5rem] p-8 border border-border relative overflow-hidden group shadow-premium cursor-pointer hover:border-primary/20 transition-all hover:shadow-xl">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl">🧾</span>
                        <span className="text-[9px] font-black uppercase bg-purple-600 text-white px-3 py-1 rounded-full tracking-tighter shadow-lg shadow-purple-600/20">{orderTimeframe.toUpperCase()}</span>
                    </div>
                    <div className="mt-8 relative z-10">
                        <h3 className="text-4xl font-black text-text tracking-tighter">{getFilteredStats('orders', orderTimeframe)}</h3>
                        <p className="text-[11px] font-bold text-text-light uppercase tracking-widest mt-1">Platform Sipariş</p>
                    </div>
                </div>

                <div onClick={toggleRevenueTimeframe} className="bg-white rounded-[2.5rem] p-8 border border-border relative overflow-hidden group shadow-premium cursor-pointer hover:border-emerald-500/20 transition-all hover:shadow-xl">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl">💰</span>
                        <span className="text-[9px] font-black uppercase bg-emerald-600 text-white px-3 py-1 rounded-full tracking-tighter shadow-lg shadow-emerald-600/20">{revenueTimeframe.toUpperCase()}</span>
                    </div>
                    <div className="mt-8 relative z-10">
                        <h3 className="text-4xl font-black text-text tracking-tighter">{getFilteredStats('revenue', revenueTimeframe).toLocaleString('tr-TR')} TL</h3>
                        <p className="text-[11px] font-bold text-text-light uppercase tracking-widest mt-1">Toplam Ciro</p>
                    </div>
                </div>

                {/* FEATURE 4: KOMİSYON TAHMİNCİSİ (%5 varsayılan) */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-border relative overflow-hidden group shadow-premium transition-all hover:shadow-xl">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl transition-transform duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <span className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl">📉</span>
                        <span className="text-[9px] font-black uppercase bg-amber-500 text-white px-3 py-1 rounded-full tracking-tighter shadow-lg shadow-amber-500/20">%5 Komisyon</span>
                    </div>
                    <div className="mt-8 relative z-10">
                        <h3 className="text-4xl font-black text-text tracking-tighter">{(stats.totalRevenue * 0.05).toLocaleString('tr-TR')} TL</h3>
                        <p className="text-[11px] font-bold text-text-light uppercase tracking-widest mt-1">Platform Kazancı</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* FEATURE 1: EN ÇOK KAZANAN RESTORANLAR */}
                <div className="bg-white rounded-[3rem] border border-border p-10 shadow-premium">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl border border-indigo-100 shadow-sm">🏆</div>
                        <div>
                            <h3 className="text-2xl font-black text-text tracking-tighter uppercase">Ciro Rekortmenleri</h3>
                            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">En Çok Kazanan 4 Restoran</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {topRestaurants.map((r, i) => (
                            <div key={r.id} className="p-6 bg-gray-50/50 rounded-2xl border border-border flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                                <div className="flex items-center gap-4">
                                    <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-border">{i + 1}</span>
                                    <div>
                                        <h4 className="text-sm font-black text-text uppercase">{r.name}</h4>
                                        <p className="text-[10px] font-bold text-text-light uppercase">{r.count} Toplam Sipariş</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-indigo-600">{r.total.toLocaleString('tr-TR')} TL</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FEATURE 2: POPÜLER ÜRÜNLER ANALİZİ */}
                <div className="bg-white rounded-[3rem] border border-border p-10 shadow-premium">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-3xl border border-orange-100 shadow-sm">🍔</div>
                        <div>
                            <h3 className="text-2xl font-black text-text tracking-tighter uppercase">Trend Lezzetler</h3>
                            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Platformun Favori 5 Ürünü</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {popularProducts.map((p, i) => (
                            <div key={i} className="p-6 bg-gray-50/50 rounded-2xl border border-border flex flex-col gap-2 group hover:bg-white hover:shadow-lg transition-all">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-black text-text uppercase">{p.name}</h4>
                                    <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase">{p.count} Adet</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 transition-all duration-1000"
                                        style={{ width: `${(p.count / (popularProducts[0]?.count || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* SIPARIS RADARI (MEVCUT) */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-border p-10 flex flex-col justify-between shadow-premium relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-3xl text-primary border border-primary/20">📡</div>
                            <div>
                                <h3 className="text-2xl font-black text-text tracking-tighter uppercase">Sipariş Radarı</h3>
                                <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Yoğunluk Analizi</p>
                            </div>
                        </div>
                        <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-border">
                            {['günlük', 'haftalık', 'aylık', 'yıllık'].map((t) => (
                                <button key={t} onClick={() => setRadarTimeframe(t as any)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${radarTimeframe === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-light hover:text-text'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-64 flex items-end gap-3 px-6 py-8 bg-gray-50/50 rounded-[2.5rem] border border-border border-dashed relative z-10">
                        {chartData.map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-4 group cursor-pointer relative">
                                <div className="w-full bg-gradient-to-t from-primary to-purple-500 rounded-t-2xl transition-all duration-1000 group-hover:scale-y-110" style={{ height: `${h}%`, minHeight: '4px' }} />
                                <span className="text-[8px] font-black text-text-light uppercase tracking-tighter opacity-40">S-{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FEATURE 3: BÖLGESEL YOĞUNLUK */}
                <div className="bg-white rounded-[3rem] border border-border p-10 shadow-premium">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl border border-emerald-100 shadow-sm">📍</div>
                        <div>
                            <h3 className="text-2xl font-black text-text tracking-tighter uppercase">Mahalle Analizi</h3>
                            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">En Aktif Bölgeler</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {neighborhoodStats.map((hood, i) => (
                            <div key={i} className="flex items-center gap-6">
                                <div className="shrink-0 w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-sm font-black text-emerald-600 border border-border">%{Math.round((hood.count / allOrders.length) * 100 || 0)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-black text-text uppercase truncate">{hood.name}</h4>
                                        <span className="text-[10px] font-bold text-text-light">{hood.count} Sipariş</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${(hood.count / (neighborhoodStats[0]?.count || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* NOTIFICATION CENTER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-3 bg-white rounded-[3rem] border border-border p-10 shadow-premium">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl border border-red-100">🚨</div>
                        <div>
                            <h3 className="text-2xl font-black text-text tracking-tighter uppercase">Sistem & Bildirim Merkezi</h3>
                            <p className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em]">Kritik Onay ve Durum Takibi</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentAlerts.map((inc, i) => (
                            <div key={i} className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-border border-l-8 border-primary group hover:bg-white transition-all hover:shadow-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-[13px] font-black text-text uppercase">{inc.title}</h4>
                                    <span className="text-[9px] font-black text-text-light/50">{inc.time}</span>
                                </div>
                                <p className="text-[11px] font-bold text-text-light leading-relaxed mb-6">{inc.desc}</p>
                                <Link href={inc.link} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Detayı İncele →</Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
