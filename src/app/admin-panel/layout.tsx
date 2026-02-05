'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeProvider';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import DataStore from '@/lib/dataStore';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [showSystemAlerts, setShowSystemAlerts] = useState(false);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    const [totalRevenue, setTotalRevenue] = useState(0);

    const syncData = async () => {
        // Auth Check
        const userData = localStorage.getItem('yemekya_user');
        if (!userData) {
            setIsAuthorized(false);
            return;
        }
        const user = JSON.parse(userData);
        if (user.role !== 'admin') {
            setIsAuthorized(false);
            return;
        }
        setIsAuthorized(true);

        const dataStore = DataStore.getInstance();
        const platformStats = await dataStore.getAdminStats();
        setTotalRevenue(platformStats.totalRevenue || 0);
        setPendingCount(platformStats.pendingApprovals || 0);

        const allApprovals = await dataStore.getMenuApprovals();
        const pending = allApprovals.filter((a: any) => a.status === 'PENDING');

        // Convert pending to alerts
        const newAlerts = pending.map((p: any) => ({
            id: p.id,
            title: 'Menü Değişikliği',
            desc: `${p.restaurantName}: ${p.productName} için ${p.type === 'ADD' ? 'yeni ürün' : 'fiyat'} talebi.`,
            time: p.timestamp,
            type: 'info'
        }));
        setAlerts(newAlerts);
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

    const { isDark, toggleTheme } = useTheme();
    const pathname = usePathname();

    const navItems = [
        { name: 'Genel Bakış', icon: '💎', path: '/admin-panel' },
        { name: 'Restoranlar', icon: '🏪', path: '/admin-panel/restaurants' },
        { name: 'Menü Onayları', icon: '🍱', path: '/admin-panel/approvals', badge: pendingCount },
        { name: 'Tüm Siparişler', icon: '🧾', path: '/admin-panel/orders' },
        { name: 'Finansal Takip', icon: '💰', path: '/admin-panel/invoices' },
        { name: 'Banner Yönetimi', icon: '🖼️', path: '/admin-panel/banners' },
        { name: 'Platform Analitik', icon: '📊', path: '/admin-panel/analytics' },
        { name: 'Market Yönetimi', icon: '🎁', path: '/admin-panel/market' },
        { name: 'Sistem Kontrol', icon: '🛡️', path: '/admin-panel/system' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('yemekya_user');
        router.push('/login');
    };

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#07070a] text-white' : 'bg-gray-50 text-gray-900'} flex flex-col md:flex-row font-sans selection:bg-primary selection:text-white transition-colors duration-300`}>

            {/* SIDEBAR */}
            <aside className={`w-full md:w-80 ${isDark ? 'bg-[#0c0c14]/80 text-white' : 'bg-white text-gray-900 shadow-xl'} backdrop-blur-2xl border-r ${isDark ? 'border-white/5' : 'border-gray-200'} flex flex-col z-50 transition-colors`}>
                <div className="p-10">
                    <Link href="/admin-panel" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                            👑
                        </div>
                        <div>
                            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tighter block leading-none`}>YemekYa</span>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1 block">Admin</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-6 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-sm transition-all group relative overflow-hidden ${isActive
                                    ? 'bg-primary text-white shadow-xl shadow-primary/20'
                                    : `${isDark ? 'text-white/40 hover:bg-white/5 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`
                                    }`}
                            >
                                <span className={`text-xl transition-transform group-hover:scale-110 ${isActive ? '' : 'opacity-40'}`}>
                                    {item.icon}
                                </span>
                                {item.name}
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className={`ml-auto w-5 h-5 ${isActive ? 'bg-white text-primary' : 'bg-primary text-white'} text-[9px] flex items-center justify-center rounded-full animate-pulse shadow-lg`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-bold text-sm transition-all text-red-500 hover:bg-red-500/10`}
                    >
                        <span className="text-xl">🚪</span>
                        Güvenli Çıkış
                    </button>
                </nav>

                <div className="p-8 mt-auto border-t border-border">
                    <div className="bg-background-alt rounded-3xl p-6 border border-border flex items-center gap-4 group cursor-pointer hover:bg-border/30 transition-all">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-xl text-primary">👨‍💻</div>
                        <div className="flex flex-col">
                            <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Süper Admin</span>
                            <span className={`text-[9px] font-bold ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-widest`}>Çevrimiçi</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className={`flex-1 flex flex-col h-screen overflow-hidden ${isDark ? 'bg-background' : 'bg-white'}`}>

                {/* TOP HEADER */}
                <header className={`h-24 border-b ${isDark ? 'border-border bg-surface/50' : 'border-border bg-white'} flex items-center px-12 justify-between shrink-0 backdrop-blur-md relative z-50`}>
                    <div className="flex items-center gap-6">
                        <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight uppercase tracking-tighter`}>
                            {navItems.find(n => n.path === pathname)?.name || 'Admin Panel'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-8">

                        <div className="relative">
                            <button
                                onClick={() => setShowSystemAlerts(!showSystemAlerts)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'} transition-all relative ${showSystemAlerts ? 'bg-primary border-primary scale-95 shadow-lg shadow-primary/20' : ''} hover:bg-primary/10`}
                            >
                                <span className="text-xl">🔔</span>
                                {alerts.length > 0 && (
                                    <span className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 ${isDark ? 'border-[#07070a]' : 'border-white'} animate-bounce`}>
                                        {alerts.length}
                                    </span>
                                )}
                            </button>

                            {/* ALERTS DROPDOWN */}
                            {showSystemAlerts && (
                                <div className={`fixed right-12 top-28 w-96 ${isDark ? 'bg-surface border-border shadow-2xl shadow-black/80' : 'bg-white border-gray-200 shadow-2xl shadow-black/10'} border rounded-[2.5rem] z-[9999] animate-fadeIn p-2 overflow-hidden`}>
                                    <div className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-gray-100'} flex justify-between items-center`}>
                                        <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-widest`}>Sistem Uyarıları</h4>
                                        <button className={`text-[9px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} hover:text-primary uppercase tracking-widest`} onClick={() => setAlerts([])}>Temizle</button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto no-scrollbar p-2 space-y-1">
                                        {alerts.length > 0 ? alerts.map(alert => (
                                            <div key={alert.id} className="p-4 rounded-2xl hover:bg-background-alt transition-colors cursor-pointer group flex gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${alert.type === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                                    {alert.type === 'critical' ? '🛡️' : '🔔'}
                                                </div>
                                                <div>
                                                    <p className={`text-[11px] font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{alert.title}</p>
                                                    <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-500'} my-1`}>{alert.desc}</p>
                                                    <span className={`text-[9px] font-bold ${isDark ? 'text-white/20' : 'text-gray-300'}`}>{alert.time}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-12 text-center text-[10px] font-black text-text-light uppercase tracking-widest">⚠️ Bildirim Bulunmuyor</div>
                                        )}
                                    </div>
                                    <div className={`p-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-b-[2rem]`}>
                                        <button className="w-full py-4 text-center text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Tüm Detayları Gör</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* CONTENT VIEWPORT */}
                <div className={`flex-1 overflow-y-auto p-12 no-scrollbar ${isDark ? 'bg-[radial-gradient(circle_at_top_right,#121221,transparent)]' : 'bg-background'}`}>
                    {isAuthorized === false ? (
                        <div className="h-full flex items-center justify-center p-6 text-center">
                            <div className="space-y-6 animate-scaleUp">
                                <div className="text-8xl mb-4">🔐</div>
                                <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Erişim Yetkiniz Yok</h1>
                                <p className="text-white/40 font-bold max-w-md mx-auto leading-relaxed">Bu sayfa sadece Platform Yöneticileri içindir. Eğer bir hata olduğunu düşünüyorsanız lütfen sistem yöneticisi ile iletişime geçin.</p>
                                <button
                                    onClick={() => router.push('/login')}
                                    className="px-12 py-5 bg-indigo-500 text-white font-black rounded-3xl shadow-2xl shadow-indigo-500/20 hover:scale-[1.05] active:scale-95 transition-all text-xs uppercase tracking-widest"
                                >
                                    Giriş Sayfasına Güvenli Dönüş
                                </button>
                            </div>
                        </div>
                    ) : isAuthorized === null ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </main>

        </div>
    );
}
