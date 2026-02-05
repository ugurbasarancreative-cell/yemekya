'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeProvider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DataStore from '@/lib/dataStore';

export default function RestaurantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showStatusDrawer, setShowStatusDrawer] = useState(false);
    const [status, setStatus] = useState<'open' | 'busy' | 'closed'>('open');
    const [dailyRevenue, setDailyRevenue] = useState(12450);
    const { isDark, toggleTheme } = useTheme();
    const pathname = usePathname();

    const [userRestaurant, setUserRestaurant] = useState<{ name: string, img?: string } | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const userRaw = localStorage.getItem('yemekya_user');
            if (!userRaw) {
                window.location.href = '/login';
                return;
            }

            const user = JSON.parse(userRaw);
            if (user.role !== 'restaurant_manager' && user.role !== 'admin') {
                window.location.href = '/';
                return;
            }

            // Find Restaurant Data
            const dataStore = DataStore.getInstance();
            if (user.restaurantId) {
                const found = await dataStore.getRestaurant(user.restaurantId);
                if (found) {
                    setUserRestaurant({ name: found.name, img: found.img || '🏪' });
                }
            } else if (user.role === 'restaurant_manager') {
                setUserRestaurant({ name: user.name, img: '🏪' });
            }
        };

        const syncData = async () => {
            const userRaw = localStorage.getItem('yemekya_user');
            if (!userRaw) return;
            const user = JSON.parse(userRaw);
            const resId = user.restaurantId;

            const dataStore = DataStore.getInstance();
            if (resId) {
                const found = await dataStore.getRestaurant(resId);
                if (found) {
                    if (found.status) setStatus(found.status as any);
                    setUserRestaurant({ name: found.name, img: found.img || '🏪' });
                }
            }

            // --- NOTIFICATION ENGINE ---
            const allOrders = await dataStore.getOrders();
            const myOrders = resId ? allOrders.filter((o: any) => o.restaurantId === resId) : [];

            const totalRev = myOrders.reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
            setDailyRevenue(totalRev);

            const allReviews = await dataStore.getReviews();
            const myReviews = resId ? allReviews.filter((r: any) => r.restaurantId === resId) : [];

            const allApprovals = await dataStore.getMenuApprovals();
            const myApprovals = resId ? allApprovals.filter((a: any) => a.restaurantId === resId) : [];

            const restaurant = resId ? await dataStore.getRestaurant(resId) : null;
            const myMenu = restaurant?.menu || [];

            let dynamicNotifs: any[] = [];

            // 1. Order Notifications (Recent 'Yeni' orders)
            myOrders.filter((o: any) => o.status === 'Yeni').forEach((o: any) => {
                dynamicNotifs.push({
                    id: `order-${o.id}`,
                    title: 'Yeni Sipariş!',
                    desc: `${o.userName} tarafından ${o.total} TL tutarında sipariş.`,
                    time: 'Şimdi',
                    type: 'order',
                    rawTime: new Date(o.date).getTime()
                });
            });

            // 2. Review Notifications (Recent reviews)
            myReviews.slice(0, 3).forEach((r: any) => {
                dynamicNotifs.push({
                    id: `review-${r.id}`,
                    title: 'Yeni Yorum Geldi',
                    desc: `${r.userName} işletmenize ${r.scores.lezzet} puan verdi.`,
                    time: 'Bugün',
                    type: 'review',
                    rawTime: new Date(r.date || Date.now()).getTime()
                });
            });

            // 3. Approval Notifications (Status changes)
            myApprovals.slice(0, 3).forEach((a: any) => {
                dynamicNotifs.push({
                    id: `appr-${a.id}`,
                    title: a.status === 'APPROVED' ? 'Menü Onaylandı' : a.status === 'REJECTED' ? 'Menü Reddedildi' : 'Onay Bekliyor',
                    desc: `${a.productName} için ${a.type} talebi güncellendi.`,
                    time: 'Sistem',
                    type: 'system',
                    rawTime: new Date(a.timestamp).getTime()
                });
            });

            // 4. Stock Alerts
            myMenu.filter((item: any) => item.stock !== undefined && (item.stock === false || (typeof item.stock === 'number' && item.stock <= 5))).forEach((item: any) => {
                dynamicNotifs.push({
                    id: `stock-${item.id}`,
                    title: 'Stok Uyarısı!',
                    desc: `${item.name} stokları tükeniyor ya da yok.`,
                    time: 'Kritik',
                    type: 'system',
                    rawTime: Date.now() - 1000 // Just below current time to prioritize orders
                });
            });

            // Sort by time and set
            dynamicNotifs.sort((a, b) => (b.rawTime || 0) - (a.rawTime || 0));
            setNotifications(dynamicNotifs.slice(0, 10));
        };

        const init = async () => {
            await checkAuth();
            await syncData();
        };

        init();
        window.addEventListener('storage', syncData);
        window.addEventListener('restaurant-update', syncData);
        return () => {
            window.removeEventListener('storage', syncData);
            window.removeEventListener('restaurant-update', syncData);
        };
    }, []);

    const updateStatus = (newStatus: 'open' | 'busy' | 'closed') => {
        setStatus(newStatus);

        const userRaw = localStorage.getItem('yemekya_user');
        if (!userRaw) return;
        const user = JSON.parse(userRaw);
        const resId = user.restaurantId;

        if (resId) {
            const dataStore = DataStore.getInstance();
            dataStore.updateRestaurant(resId, { status: newStatus });
        }

        setShowStatusDrawer(false);
    };

    const clearNotifications = () => {
        setNotifications([]);
        localStorage.setItem('yemekya_restaurant_notifications', JSON.stringify([]));
        setShowNotifications(false);
    };

    const navItems = [
        { name: 'Dashboard', icon: '📊', path: '/restaurant-panel' },
        { name: 'Siparişler', icon: '📦', path: '/restaurant-panel/orders' },
        { name: 'Menü Yönetimi', icon: '🍴', path: '/restaurant-panel/menu' },
        { name: 'Kampanyalar', icon: '🏷️', path: '/restaurant-panel/campaigns' },
        { name: 'Bölgeler', icon: '📍', path: '/restaurant-panel/delivery' },
        { name: 'Yorumlar', icon: '⭐', path: '/restaurant-panel/reviews' },
        { name: 'Finans', icon: '💰', path: '/restaurant-panel/invoices' },
        { name: 'Analitik', icon: '📈', path: '/restaurant-panel/analytics' },
        { name: 'Ayarlar', icon: '⚙️', path: '/restaurant-panel/settings' },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">

            {/* STATUS DRAWER BACKDROP */}
            {showStatusDrawer && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] animate-fadeIn"
                    onClick={() => setShowStatusDrawer(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`w-full md:w-72 bg-surface border-r border-border flex flex-col transition-none ${showStatusDrawer ? 'z-[100]' : 'z-50'}`}>
                <div className="p-8">
                    <Link href="/restaurant-panel" className="flex items-center gap-2 select-none group">
                        <span className="text-2xl font-black text-primary tracking-tighter hover:scale-105 transition-transform inline-block">YemekYa</span>
                        <span className="text-[10px] font-black text-white bg-primary px-1.5 py-0.5 rounded shadow-sm">PANEL</span>
                    </Link>
                    <p className="text-[10px] font-bold text-text-light uppercase tracking-[0.2em] mt-2 opacity-50">Restoran Yönetimi</p>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-text-light hover:bg-background-alt hover:text-text'
                                    }`}
                            >
                                <span className={`text-xl transition-transform group-hover:scale-110 ${isActive ? '' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                                    {item.icon}
                                </span>
                                {item.name}
                                {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 mt-auto border-t border-border relative">
                    {/* DRAWER CONTENT */}
                    <div className={`absolute left-6 right-6 bottom-[100%] mb-4 bg-surface border border-border rounded-3xl shadow-2xl transition-all duration-300 origin-bottom transform ${showStatusDrawer ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
                        } overflow-hidden z-[70]`}>
                        <div className="p-4 border-b border-border bg-background-alt/50">
                            <span className="text-[10px] font-black text-text-light uppercase tracking-widest">Durum Değiştir</span>
                        </div>
                        <div className="p-2 space-y-1">
                            {[
                                { id: 'open', label: 'DÜKKANI AÇ', icon: '🟢', color: 'text-green-500' },
                                { id: 'busy', label: 'YOĞUN MOD', icon: '🟠', color: 'text-amber-500' },
                                { id: 'closed', label: 'DÜKKANI KAPAT', icon: '🔴', color: 'text-red-500' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => updateStatus(item.id as any)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background-alt transition-colors ${status === item.id ? 'bg-background-alt' : ''}`}
                                >
                                    <span className="text-sm">{item.icon}</span>
                                    <span className={`text-[10px] font-extrabold uppercase tracking-tight ${status === item.id ? item.color : 'text-text-light'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-background-alt rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-border/30 transition-all relative"
                        onClick={() => setShowStatusDrawer(!showStatusDrawer)}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-xl shadow-sm relative group-hover:scale-105 transition-transform font-bold">
                                {userRestaurant?.img || '🏪'}
                                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background-alt ${status === 'open' ? 'bg-green-500' : status === 'busy' ? 'bg-amber-500' : 'bg-red-500'
                                    }`}></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-text truncate w-24">{userRestaurant?.name || 'Yükleniyor...'}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${status === 'open' ? 'text-green-500' : status === 'busy' ? 'text-amber-500' : 'text-red-500'
                                    }`}>
                                    {status === 'open' ? 'Açık • Çevrimiçi' : status === 'busy' ? 'Yoğun • Çevrimiçi' : 'Kapalı • Çevrimdışı'}
                                </span>
                            </div>
                        </div>
                        <div className={`transition-transform duration-300 ${showStatusDrawer ? 'rotate-180' : ''}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-text-light/50"><path d="M18 15l-6-6-6 6" /></svg>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 px-2">
                        <button
                            onClick={() => {
                                localStorage.removeItem('yemekya_user');
                                window.location.href = '/login';
                            }}
                            className="flex items-center gap-2 text-xs font-bold text-red-500/60 hover:text-red-500 transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                            Çıkış
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-alt border border-border shadow-sm hover:scale-110 transition-all text-xs"
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* TOP BAR */}
                <header className="h-20 bg-surface/80 backdrop-blur-xl border-b border-border flex items-center px-8 justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black text-text tracking-tight uppercase tracking-tighter">
                            {navItems.find(n => n.path === pathname)?.name || 'Dashboard'}
                        </h2>
                        <div className="hidden sm:flex bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                            Sistem Çevrimiçi
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex flex-col text-right">
                            <span className="text-[10px] font-black text-text-light uppercase tracking-widest leading-none">Bugünkü Ciro</span>
                            <span className="text-lg font-black text-primary leading-none mt-1">{dailyRevenue.toLocaleString('tr-TR')} TL</span>
                        </div>
                        <div className="w-px h-8 bg-border"></div>
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border transition-all group ${showNotifications ? 'bg-primary border-primary text-white' : 'bg-background-alt border-border hover:bg-surface'}`}
                            >
                                <span className={`text-xl transition-transform ${showNotifications ? '' : 'group-hover:scale-110'}`}>🔔</span>
                                {notifications.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-surface animate-bounce">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-[90]" onClick={() => setShowNotifications(false)}></div>
                                    <div className="absolute right-0 top-full mt-4 w-80 bg-surface border border-border rounded-3xl shadow-2xl z-[100] animate-fadeIn overflow-hidden">
                                        <div className="p-5 border-b border-border flex justify-between items-center bg-background-alt/30">
                                            <h4 className="text-sm font-black text-text uppercase tracking-widest">Bildirimler</h4>
                                            <button className="text-[10px] font-bold text-primary hover:underline" onClick={() => setShowNotifications(false)}>Kapat</button>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                            {notifications.length > 0 ? notifications.map(n => (
                                                <div key={n.id} className="p-4 border-b border-border hover:bg-background-alt transition-colors cursor-pointer group">
                                                    <div className="flex gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${n.type === 'order' ? 'bg-primary/10 text-primary' : n.type === 'review' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                            {n.type === 'order' ? '📦' : n.type === 'review' ? '⭐' : '⚙️'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-text">{n.title}</span>
                                                            <span className="text-[10px] font-medium text-text-light leading-snug my-1">{n.desc}</span>
                                                            <span className="text-[9px] font-bold text-text-light/50">{n.time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-12 text-center text-text-light italic font-bold opacity-30">Bildiriminiz bulunmamaktadır.</div>
                                            )}
                                        </div>
                                        <button
                                            onClick={clearNotifications}
                                            className="w-full py-4 bg-background-alt hover:bg-red-500 hover:text-white text-[10px] font-black text-text-light uppercase tracking-widest transition-all"
                                        >
                                            Tümünü Temizle
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT WINDOW */}
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-background">
                    {children}
                </div>
            </main>

        </div >
    );
}
