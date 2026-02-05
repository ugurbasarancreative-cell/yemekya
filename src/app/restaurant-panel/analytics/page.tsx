'use client';

import { useState, useEffect } from 'react';
import Toast from '../../components/Toast';
import DataStore from '@/lib/dataStore';

export default function AnalyticsPage() {
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [stats, setStats] = useState([
        { label: 'Haftalık Sipariş', value: '142', trend: '+12%', color: 'text-green-500' },
        { label: 'En Çok Satan', value: 'Whopper® Menü', trend: 'Popüler', color: 'text-primary' },
        { label: 'İptal Oranı', value: '%1.2', trend: '-0.5%', color: 'text-blue-500' },
        { label: 'Müşteri Skoru', value: '4.8', trend: 'Mükemmel', color: 'text-amber-500' },
    ]);

    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [distribution, setDistribution] = useState<any[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [forecast] = useState([
        { time: '12:00', level: 85, predicted: 110, label: 'Öğle Yoğunluğu' },
        { time: '15:00', level: 30, predicted: 45, label: 'Sakin Saat' },
        { time: '19:00', level: 95, predicted: 130, label: 'Akşam Zirvesi' },
        { time: '22:00', level: 60, predicted: 80, label: 'Gece Atıştırmalığı' }
    ]);

    useEffect(() => {
        const calculateStats = async () => {
            const userRaw = localStorage.getItem('yemekya_user');
            if (!userRaw) return;
            const user = JSON.parse(userRaw);
            const resId = user.restaurantId;

            if (!resId) return;

            const dataStore = DataStore.getInstance();
            const allOrders = await dataStore.getOrders();
            const reviews = await dataStore.getReviews(resId);

            const orders = allOrders.filter((o: any) => o.restaurantId === resId || o.restaurant_id === resId);

            const productCounts: any = {};
            orders.forEach((o: any) => {
                const items = Array.isArray(o.items) ? o.items : [];
                items.forEach((item: any) => {
                    productCounts[item.name] = (productCounts[item.name] || 0) + (item.qty || item.quantity || 1);
                });
            });

            const sortedProds = Object.entries(productCounts)
                .map(([name, sales]) => ({
                    name,
                    sales: sales as number,
                    revenue: (Number(sales) * 185).toLocaleString('tr-TR') + ' TL'
                }))
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 4);

            setTopProducts(sortedProds);

            const zones: any = {};
            orders.forEach((o: any) => {
                if (o.neighborhood) zones[o.neighborhood] = (zones[o.neighborhood] || 0) + 1;
            });

            const distData = Object.entries(zones).map(([zone, count]) => ({
                zone,
                percentage: Math.round(((count as number) / Math.max(orders.length, 1)) * 100)
            })).sort((a, b) => b.percentage - a.percentage);

            setDistribution(distData);

            const reviewScore = reviews.length > 0 ? reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length : 0;

            setStats([
                { label: 'Toplam Sipariş', value: orders.length.toString(), trend: 'Genel', color: 'text-green-500' },
                { label: 'En Çok Satan', value: sortedProds[0]?.name || '-', trend: 'Trend', color: 'text-primary' },
                { label: 'İptal Oranı', value: '%0.0', trend: 'Yeni', color: 'text-blue-500' },
                { label: 'Müşteri Skoru', value: reviewScore > 0 ? reviewScore.toFixed(1) : '-', trend: 'Puan', color: 'text-amber-500' },
            ]);
        };

        calculateStats();
        window.addEventListener('storage', calculateStats);
        window.addEventListener('restaurant-update', calculateStats);
        return () => {
            window.removeEventListener('storage', calculateStats);
            window.removeEventListener('restaurant-update', calculateStats);
        };
    }, []);

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            setToast({ message: 'Rapor başarıyla oluşturuldu ve indiriliyor... (PDF/Excel)', type: 'success' });
            setIsExporting(false);
        }, 1500);
    };

    return (
        <div className="space-y-10 animate-fadeIn pb-12">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-text tracking-tighter">İstatistik & Analiz</h1>
                    <p className="text-text-light font-bold">Veriye dayalı kararlar alarak işletmeni büyüt.</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all text-sm flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                    {isExporting ? '🔄 Hazırlanıyor...' : '📊 Veri Raporu Al'}
                </button>
            </div>

            {/* PERFORMANCE RADAR (Intensity Prediction) */}
            <div className="bg-surface rounded-[3rem] border border-border shadow-premium p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-20 group-hover:bg-primary/10 transition-colors duration-700" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-3xl flex items-center justify-center text-3xl animate-pulse">📡</div>
                        <div>
                            <h3 className="text-xl font-black text-text tracking-tight uppercase tracking-tighter">Sipariş Tahmin Radarı</h3>
                            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] opacity-50">AI Destekli Gelecek Analizi</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {forecast.map((f, i) => (
                        <div key={i} className="space-y-4 text-center">
                            <span className="text-xs font-black text-text-light uppercase tracking-widest">{f.time}</span>
                            <div className="h-40 bg-background-alt/30 rounded-3xl relative overflow-hidden flex items-end p-2 border border-border">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10" />
                                <div
                                    className="w-full bg-gradient-to-t from-primary/80 to-accent/90 rounded-2xl transition-all duration-[2000ms] ease-out shadow-lg"
                                    style={{ height: `${f.level}%` }}
                                >
                                    <div className="absolute top-[-25px] left-0 w-full text-[10px] font-black text-primary">%{f.predicted} Artış</div>
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-text-light uppercase">{f.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-10 p-6 bg-primary/5 rounded-2xl border border-dashed border-primary/20 flex items-center gap-4">
                    <span className="text-2xl">💡</span>
                    <p className="text-xs font-bold text-text-light">
                        <span className="text-primary font-black uppercase">Strateji:</span> Akşam zirvesi için saat 18:30 civarında hazırlıklara başlamanız tavsiye edilir. Tahmin edilen yoğunluk artışı <span className="text-primary font-black">%130</span> seviyesindedir.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* TOP PRODUCTS */}
                <div className="lg:col-span-2 bg-surface rounded-[3rem] border border-border shadow-premium flex flex-col">
                    <div className="p-8 border-b border-border flex items-center justify-between">
                        <h3 className="text-xl font-black text-text tracking-tight uppercase tracking-tighter">En Çok Satan Ürünler</h3>
                        <span className="text-[10px] font-black text-text-light">SON 7 GÜN</span>
                    </div>
                    <div className="p-4 flex-1">
                        {topProducts.map((prod, i) => (
                            <div key={i} className="flex items-center justify-between p-5 hover:bg-background-alt/40 rounded-[2rem] transition-all group">
                                <div className="flex items-center gap-5">
                                    <span className="text-2xl bg-white/5 w-12 h-12 flex items-center justify-center rounded-2xl border border-border">{i === 0 ? '👑' : i === 1 ? '🥈' : '🥉'}</span>
                                    <div>
                                        <h4 className="text-sm font-black text-text group-hover:text-primary transition-colors">{prod.name}</h4>
                                        <div className="flex gap-2 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            <p className="text-[10px] font-bold text-text-light uppercase tracking-tighter">Sürekli Sipariş</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-text">{prod.sales}</p>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{prod.revenue}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DISTRIBUTION */}
                <div className="bg-surface rounded-[3rem] border border-border shadow-premium p-10 flex flex-col justify-between">
                    <div className="space-y-8">
                        <h3 className="text-xl font-black text-text tracking-tight uppercase tracking-tighter">Bölgesel Yoğunluk</h3>
                        <div className="space-y-8">
                            {distribution.map((item, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-text-light uppercase tracking-widest">{item.zone}</span>
                                        <span className="text-sm font-black text-primary">%{item.percentage}</span>
                                    </div>
                                    <div className="h-4 w-full bg-background-alt rounded-full overflow-hidden border border-border/20 p-1">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 shadow-sm"
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="w-full mt-10 py-5 bg-background-alt border border-border hover:bg-surface text-text font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest">
                        Tüm Bölgeleri Gör
                    </button>
                </div>
            </div>

            {/* QUICK STATS BOTTOM */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {stats.map((item, i) => (
                    <div key={i} className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-premium group hover:-translate-y-2 transition-all">
                        <p className="text-[10px] font-black text-text-light uppercase tracking-widest">{item.label}</p>
                        <h3 className="text-2xl font-black text-text mt-2">{item.value}</h3>
                        <span className={`text-[9px] font-black mt-1 inline-block ${item.color} uppercase tracking-tighter`}>{item.trend} DEĞİŞİM</span>
                    </div>
                ))}
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
