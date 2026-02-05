'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '../components/ThemeProvider';
import Toast from '../components/Toast';
import DataStore, { MarketItem } from '@/lib/dataStore';

export default function MarketPage() {
    const { isDark, toggleTheme } = useTheme();
    const [points, setPoints] = useState(0);
    const [rewards, setRewards] = useState<MarketItem[]>([]);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const ds = DataStore.getInstance();

    const loadData = async () => {
        const storedUser = localStorage.getItem('yemekya_user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        const u = JSON.parse(storedUser);
        setUser(u);

        const [p, r] = await Promise.all([
            ds.getUserPoints(u.email),
            ds.getMarketItems()
        ]);
        setPoints(p);
        setRewards(r);
    };

    useEffect(() => {
        loadData();
        window.addEventListener('points-update', loadData);
        return () => window.removeEventListener('points-update', loadData);
    }, []);

    const redeemReward = async (reward: MarketItem) => {
        if (!user) return;
        const result = await ds.redeemReward(user.email, reward.id);
        if (result.success) {
            setToast({ message: result.message, type: 'success' });
            loadData(); // Refresh points
        } else {
            setToast({ message: result.message, type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-surface/80 backdrop-blur-xl border-b border-border h-20 sticky top-0 z-50">
                <div className="container h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="bg-background-alt p-2 rounded-xl group-hover:bg-primary/10 transition-colors border border-border">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            </div>
                            <span className="text-xl font-black text-primary tracking-tighter">Market</span>
                        </Link>

                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-background-alt border border-border shadow-premium hover:border-primary/20 transition-all"
                        >
                            {isDark ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                            )}
                        </button>
                    </div>
                    <div className="bg-primary/10 px-6 py-2 rounded-2xl border border-primary/20 flex items-center gap-3 backdrop-blur-md">
                        <span className="text-2xl animate-bounce">💎</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-primary uppercase leading-none">Mevcut Puanım</span>
                            <span className="text-lg font-black text-text leading-none">{points}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container py-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* Hero Section */}
                    <section className="bg-primary rounded-[3rem] p-12 text-white text-center space-y-4 relative overflow-hidden shadow-premium">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                        <h1 className="text-4xl font-black italic tracking-tighter">Yedikçe Kazan, Kazandıkça Harca!</h1>
                        <p className="text-white/80 font-bold max-w-md mx-auto">Siparişlerinden kazandığın YemekYa puanlarını dilediğin dijital kod veya indirimle hemen takas edebilirsin.</p>
                    </section>

                    {/* Rewards Grid */}
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rewards.map((item) => (
                            <div key={item.id} className="bg-surface rounded-[2.5rem] border border-border p-6 flex flex-col shadow-premium hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden">
                                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-lg font-black text-text mb-2 tracking-tight">{item.name}</h3>
                                <div className="flex items-center gap-2 mb-8">
                                    <span className="text-primary font-black text-xl">{item.points}</span>
                                    <span className="text-[10px] font-black text-text-light uppercase tracking-widest">Puan</span>
                                </div>
                                <button
                                    onClick={() => redeemReward(item)}
                                    className={`w-full py-4 rounded-2xl font-black transition-all text-xs uppercase tracking-widest
                                        ${points >= item.points
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95'
                                            : 'bg-background-alt text-text-light cursor-not-allowed opacity-50'}`}
                                >
                                    {points >= item.points ? 'Hemen Al' : 'Yetersiz Puan'}
                                </button>
                            </div>
                        ))}
                    </section>
                </div>
            </main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
