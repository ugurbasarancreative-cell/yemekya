'use client';

import { useState, useEffect } from 'react';
import DataStore, { Order, Restaurant } from '@/lib/dataStore';
import Toast from '@/app/components/Toast';

export default function AdminAnalyticsPage() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        pendingApprovals: 0,
        acceptanceRate: 98,
        activeRestaurants: 0,
        weeklyGrowth: 0,
        cancelRate: 0,
        revenueTrend: '...',
        avgBasketTrend: '...',
        storesTrend: '...',
        ordersTrend: '...',
        efficiency: 0
    });

    const [topRestaurants, setTopRestaurants] = useState<any[]>([]);
    const [insights, setInsights] = useState<any[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const syncData = async () => {
        const dataStore = DataStore.getInstance();
        const platformStats = await dataStore.getAdminStats();
        const orders = await dataStore.getOrders();
        const restaurants = await dataStore.getRestaurants();

        // --- TREND CALCULATIONS ---
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const currentPeriodOrders = orders.filter(o => new Date(o.date) >= thirtyDaysAgo);
        const previousPeriodOrders = orders.filter(o => new Date(o.date) >= sixtyDaysAgo && new Date(o.date) < thirtyDaysAgo);

        const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        const calculateTrend = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? '+100%' : 'Yeni';
            const diff = ((curr - prev) / prev) * 100;
            return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
        };

        const revenueTrend = calculateTrend(currentRevenue, previousRevenue);
        const ordersTrend = calculateTrend(currentPeriodOrders.length, previousPeriodOrders.length);

        const currentAvg = currentPeriodOrders.length > 0 ? currentRevenue / currentPeriodOrders.length : 0;
        const previousAvg = previousPeriodOrders.length > 0 ? previousRevenue / previousPeriodOrders.length : 0;
        const avgBasketTrend = calculateTrend(currentAvg, previousAvg);

        // Active Stores Trend (Last 30 days vs before)
        const currentStores = restaurants.length;
        // Mocking joinedAt if not present for a better calculation, or using a simpler logic
        const storesTrend = '+0%'; // Logic can be added if joinedAt is reliably tracked

        // 1. Calculate top restaurants BY ORDER COUNT
        const restaurantStats: Record<string, { name: string; orders: number; revenue: number; rate: number }> = {};
        orders.forEach(o => {
            if (!restaurantStats[o.restaurantId]) {
                restaurantStats[o.restaurantId] = { name: o.restaurantName, orders: 0, revenue: 0, rate: 100 };
            }
            restaurantStats[o.restaurantId].orders++;
            restaurantStats[o.restaurantId].revenue += Number(o.total) || 0;
        });

        const sorted = Object.entries(restaurantStats)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        setTopRestaurants(sorted);

        // 2. Real Strategic Insights
        const newInsights = [];
        const avgTotal = platformStats.avgOrderValue;
        const totalOrders = orders.length;
        const cancelledOrders = orders.filter(o => o.status === 'İptal Edildi').length;
        const currentCancelRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

        if (avgTotal < 250) {
            newInsights.push({
                icon: '💡',
                title: 'Büyüme Fırsatı: Sepet Tutarı',
                desc: `Ortalama sepet tutarı ${Math.round(avgTotal)} TL. Restoranlara "Kombo Menü" ve "Tatlı Ekleme" teşvikleri sunarak cironuzu %15 artırabilirsiniz.`,
                action: 'Duyuru Gönder'
            });
        }
        if (currentCancelRate > 5) {
            newInsights.push({
                icon: '⚠️',
                title: 'Operasyonel Uyarı',
                desc: `İptal oranınız %${currentCancelRate.toFixed(1)} seviyesine çıktı. Özellikle yoğun saatlerdeki gecikmeler iptallere neden oluyor.`,
                action: 'Kurye Analizi'
            });
        } else {
            newInsights.push({
                icon: '🚀',
                title: 'Verimlilik Skoru',
                desc: `İptal oranınız %${currentCancelRate.toFixed(1)} ile rekor seviyede düşük. Müşteri memnuniyeti şu an zirvede.`,
                action: 'Ödüllü Mağazalar'
            });
        }

        setInsights(newInsights);

        // Calculate Hybrid Efficiency Score (80% Order Success + 20% Customer Satisfaction)
        const totalRating = restaurants.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
        const avgPlatformRating = restaurants.length > 0 ? totalRating / restaurants.length : 5;
        const ratingPercentage = (avgPlatformRating / 5) * 100;
        const orderSuccessRate = totalOrders > 0 ? (100 - currentCancelRate) : 100;
        const operationalEfficiency = Math.round((orderSuccessRate * 0.8) + (ratingPercentage * 0.2));

        setStats({
            totalRevenue: platformStats.totalRevenue,
            totalOrders: platformStats.totalOrders,
            avgOrderValue: Math.round(platformStats.avgOrderValue),
            pendingApprovals: platformStats.pendingApprovals,
            acceptanceRate: orderSuccessRate,
            activeRestaurants: restaurants.length,
            weeklyGrowth: parseFloat(ordersTrend),
            cancelRate: currentCancelRate,
            revenueTrend,
            avgBasketTrend,
            storesTrend,
            ordersTrend,
            efficiency: operationalEfficiency // New dynamic field
        });
    };

    useEffect(() => {
        syncData();
        window.addEventListener('storage', syncData);
        window.addEventListener('restaurant-update', syncData);
        return () => {
            window.removeEventListener('storage', syncData);
            window.removeEventListener('restaurant-update', syncData);
        };
    }, []);

    const handleExportCSV = () => {
        const headers = ["Restoran", "Sipariş Sayısı", "Toplam Ciro"];
        const rows = topRestaurants.map(r => [r.name, r.orders, r.revenue.toFixed(2)]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `YemekYa_Rapor_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToast({ message: 'CSV başarıyla oluşturuldu ve indirildi.', type: 'success' });
    };

    const handleExportPDF = () => {
        setToast({ message: 'PDF raporu hazırlanıyor...', type: 'info' });
        setTimeout(() => {
            window.print();
        }, 1000);
    };

    return (
        <div className="space-y-12 animate-fadeIn pb-12 print:p-0">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                <div>
                    <h1 className="text-3xl font-black text-text tracking-tighter uppercase tracking-wider">Platform Analitik & Raporlama</h1>
                    <p className="text-text-light font-bold">Veri odaklı büyüme stratejileri için tüm sistemi analiz et.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleExportCSV}
                        className="px-6 py-3 bg-background-alt border border-border rounded-xl text-[10px] font-black text-text uppercase tracking-widest hover:bg-border/20 transition-all flex items-center gap-2"
                    >
                        <span>📊</span> Dışa Aktar (CSV)
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-6 py-3 bg-primary text-white font-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <span>📄</span> PDF Raporu Oluştur
                    </button>
                </div>
            </div>

            {/* HIGH LEVEL STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {[
                    { label: 'Toplam Hacim', value: (stats.totalRevenue || 0).toLocaleString('tr-TR') + ' TL', icon: '📈', trend: stats.revenueTrend },
                    { label: 'Ort. Sepet Tutarı', value: stats.avgOrderValue + ' TL', icon: '🛒', trend: stats.avgBasketTrend },
                    { label: 'Sipariş Kabul Oranı', value: `%${Math.round(stats.acceptanceRate)}`, icon: '✅', trend: 'Sabit' },
                    { label: 'Aktif Mağaza', value: stats.activeRestaurants.toString(), icon: '🏪', trend: stats.storesTrend },
                    { label: 'Bekleyen Onay', value: stats.pendingApprovals.toString(), icon: '🔔', trend: stats.pendingApprovals > 0 ? 'ACİL' : 'TEMİZ', alert: stats.pendingApprovals > 0, hideOnPrint: true },
                ].map((s, i) => (
                    <div key={i} className={`bg-surface border border-border p-8 rounded-[2rem] hover:border-primary/30 transition-all group shadow-premium ${s.hideOnPrint ? 'print:hidden' : ''}`}>
                        <div className="flex justify-between items-start mb-6">
                            <span className="text-2xl">{s.icon}</span>
                            <span className={`text-[9px] font-black uppercase ${s.trend.startsWith('+') ? 'text-green-500' : s.trend.startsWith('-') ? 'text-red-500' : 'text-text-light'}`}>{s.trend}</span>
                        </div>
                        <h3 className="text-xl font-black text-text mb-1 group-hover:text-primary transition-colors uppercase">{s.value}</h3>
                        <p className="text-[10px] font-bold text-text-light uppercase tracking-widest leading-tight">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* RESTAURANT RANKING */}
                <div className="bg-surface rounded-[3rem] border border-border p-10 shadow-premium">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black text-text uppercase tracking-tighter italic">Restoran Sıralaması</h3>
                        <span className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">SİPARİŞ BAZLI</span>
                    </div>

                    <div className="space-y-6">
                        {topRestaurants.map((r, i) => (
                            <div key={i} className="p-6 bg-background-alt/50 rounded-3xl border border-border flex items-center justify-between group hover:bg-background-alt transition-all">
                                <div className="flex items-center gap-5">
                                    <span className={`text-xl font-black ${i === 0 ? 'text-primary' : 'text-text-light/20'}`}>0{i + 1}</span>
                                    <div>
                                        <h4 className="text-sm font-black text-text uppercase tracking-tight">{r.name}</h4>
                                        <p className="text-[10px] font-bold text-text-light uppercase mt-1">Ciro: {r.revenue.toLocaleString('tr-TR')} TL</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-text">{r.orders} Sipariş</p>
                                    <div className="w-24 h-1.5 bg-border rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] transition-all duration-1000"
                                            style={{ width: `${(r.orders / (topRestaurants[0]?.orders || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* STRATEGIC INSIGHTS */}
                <div className="bg-surface rounded-[3rem] border border-border p-10 flex flex-col shadow-premium print:hidden">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black text-text uppercase tracking-tighter italic">Stratejik Öngörüler</h3>
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">CANLI ANALİZ</span>
                    </div>

                    <div className="space-y-8 flex-1">
                        {insights.map((ins, idx) => (
                            <div key={idx} className="p-8 bg-primary/5 border border-primary/20 rounded-[2rem] space-y-4 group hover:bg-white hover:shadow-xl transition-all">
                                <span className="text-3xl">{ins.icon}</span>
                                <h4 className="text-lg font-black text-text uppercase tracking-tighter">{ins.title}</h4>
                                <p className="text-sm font-medium text-text-light leading-relaxed">
                                    {ins.desc}
                                </p>
                                <button className="text-xs font-black text-primary underline uppercase tracking-widest hover:text-indigo-600">{ins.action}</button>
                            </div>
                        ))}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-background-alt rounded-2xl border border-border group hover:border-primary/30 transition-all">
                                <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-2">Haftalık Değişim</span>
                                <span className={`text-2xl font-black ${stats.weeklyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {isNaN(stats.weeklyGrowth) ? 'YENİ' : `${stats.weeklyGrowth >= 0 ? '+' : ''}${stats.weeklyGrowth.toFixed(1)}%`}
                                </span>
                            </div>
                            <div className="p-6 bg-background-alt rounded-2xl border border-border group hover:border-primary/30 transition-all">
                                <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-2">İptal Oranı</span>
                                <span className={`text-2xl font-black ${stats.cancelRate > 5 ? 'text-red-500' : 'text-green-500'}`}>%{stats.cancelRate.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PERFORMANCE SUMMARY */}
            <div className="bg-gradient-to-br from-primary/10 via-white to-transparent rounded-[3rem] border border-primary/10 p-12 overflow-hidden relative group shadow-premium print:bg-white print:border-none">
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="max-w-md space-y-4">
                        <h3 className="text-3xl font-black text-text uppercase tracking-tighter">Operasyonel Sağlık Özeti</h3>
                        <p className="text-sm font-medium text-text-light leading-relaxed italic">
                            Platform genelinde sipariş kabul ve teslimat süreçleri %{stats.efficiency} verimlilikle çalışmaya devam ediyor. Toplam {(stats.totalRevenue || 0).toLocaleString('tr-TR')} TL hacim yaratılarak platform hedefleri üzerinde bir performans sergilendi.
                        </p>
                    </div>

                    <div className="relative w-48 h-48 shrink-0 group-hover:scale-110 transition-transform duration-700">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="96" cy="96" r="80" className="stroke-gray-100 fill-none" strokeWidth="16" />
                            <circle cx="96" cy="96" r="80" className="stroke-primary fill-none transition-all duration-[2000ms] ease-out" strokeWidth="16" strokeDasharray="502.6" strokeDashoffset={502.6 * (1 - stats.efficiency / 100)} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-text">%{stats.efficiency}</span>
                            <span className="text-[8px] font-black text-text-light uppercase tracking-[0.2em] mt-1">Verimlilik</span>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <div className="print:hidden"><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}

            {/* Print Only Header */}
            <div className="hidden print:block border-b-4 border-primary pb-8 mb-12">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-text uppercase tracking-tighter">Platform Performans Raporu</h1>
                        <p className="text-sm font-bold text-text-light mt-2">{new Date().toLocaleDateString('tr-TR')} • YemekYa Yönetim Paneli</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-primary">YemekYa</span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1.5cm;
                    }
                    nav, aside, header, footer, button, .print\\:hidden, #toast-container { 
                        display: none !important; 
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        font-size: 12pt;
                    }
                    main { 
                        width: 100% !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        display: block !important;
                    }
                    .shadow-premium { 
                        box-shadow: none !important; 
                        border: 1px solid #ddd !important; 
                        background: white !important;
                    }
                    .bg-surface, .bg-background-alt, .bg-gray-50 {
                        background-color: white !important;
                        border: 1px solid #eee !important;
                    }
                    .grid {
                        display: block !important;
                    }
                    .grid > div {
                        margin-bottom: 2rem !important;
                        page-break-inside: avoid;
                    }
                    .animate-fadeIn { 
                        animation: none !important; 
                        opacity: 1 !important;
                        transform: none !important;
                    }
                    h1, h2, h3, h4 {
                        color: black !important;
                    }
                    .text-primary {
                        color: #6366f1 !important; /* Indigo-500 equivalent */
                    }
                }
            `}</style>
        </div>
    );
}
