'use client';

import { useState, useEffect } from 'react';
import Toast from '../../components/Toast';
import DataStore from '@/lib/dataStore';

interface Review {
    id: number;
    customer: string;
    rating: number;
    comment: string;
    date: string;
    reply?: string;
    flavor: number;
    service: number;
    speed: number;
}

export default function ReviewManagementPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [filter, setFilter] = useState<'all' | 'high' | 'low' | 'unreplied'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    useEffect(() => {
        const fetchReviews = async () => {
            const userRaw = localStorage.getItem('yemekya_user');
            const resId = userRaw ? JSON.parse(userRaw).restaurantId : null;
            const dataStore = DataStore.getInstance();
            if (resId) {
                const data = await dataStore.getReviews(resId);
                setReviews(data as any);
            }
        };

        fetchReviews();
        window.addEventListener('storage', fetchReviews);
        window.addEventListener('restaurant-update', fetchReviews);
        return () => {
            window.removeEventListener('storage', fetchReviews);
            window.removeEventListener('restaurant-update', fetchReviews);
        };
    }, []);

    const handleReply = async (id: number) => {
        // For now, update local state or implement reply in DataStore
        // Since DataStore doesn't have updateReview yet, let's use manual supabase if needed
        // but for now let's just update local and storage for demo
        const { supabase } = await import('@/lib/supabase');
        await supabase.from('reviews').update({ reply: replyText }).eq('id', id);

        setToast({ message: 'Cevabınız müşteriye iletildi!', type: 'success' });
        setReplyingTo(null);
        setReplyText('');
        window.dispatchEvent(new Event('restaurant-update'));
    };

    const filteredReviews = reviews.filter(r => {
        const matchesSearch = r.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.comment.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === 'high') return r.rating >= 8 && matchesSearch;
        if (filter === 'low') return r.rating <= 5 && matchesSearch;
        if (filter === 'unreplied') return !r.reply && matchesSearch;
        return matchesSearch;
    });

    const averageRating = (reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0).toFixed(1);
    const averageFlavor = (reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.flavor || 0), 0) / reviews.length : 0).toFixed(1);
    const averageService = (reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.service || 0), 0) / reviews.length : 0).toFixed(1);
    const averageSpeed = (reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.speed || 0), 0) / reviews.length : 0).toFixed(1);

    return (
        <div className="space-y-8 animate-fadeIn pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-text tracking-tighter">Müşteri Yorumları</h1>
                    <p className="text-text-light font-bold">Müşterilerinin sesine kulak ver ve onlarla etkileşime geç.</p>
                </div>
                <div className="bg-surface p-1.5 rounded-2xl border border-border shadow-premium flex items-center gap-1">
                    {[
                        { id: 'all', label: 'Tümü' },
                        { id: 'unreplied', label: 'Cevapsız' },
                        { id: 'high', label: 'Yüksek' },
                        { id: 'low', label: 'Düşük' },
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            onClick={() => setFilter(btn.id as any)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === btn.id ? 'bg-primary text-white shadow-lg' : 'text-text-light hover:bg-background-alt'}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Genel Puan', value: reviews.length > 0 ? averageRating : '-', icon: '⭐', color: 'bg-amber-500/10 text-amber-500' },
                    { label: 'Lezzet', value: reviews.length > 0 ? averageFlavor : '-', icon: '😋', color: 'bg-green-500/10 text-green-500' },
                    { label: 'Servis', value: reviews.length > 0 ? averageService : '-', icon: '🥡', color: 'bg-primary/10 text-primary' },
                    { label: 'Hız', value: reviews.length > 0 ? averageSpeed : '-', icon: '⚡', color: 'bg-indigo-500/10 text-indigo-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-surface p-6 rounded-[2rem] border border-border shadow-premium flex items-center gap-4 group hover:-translate-y-1 transition-all">
                        <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-text-light uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-2xl font-black text-text">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="relative">
                <input
                    type="text"
                    placeholder="Yorumlarda veya isimlerde ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface border border-border rounded-[2.5rem] py-5 px-10 text-sm font-bold outline-none focus:border-primary/50 shadow-premium"
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xl opacity-20">🔍</span>
            </div>

            <div className="space-y-6">
                {filteredReviews.map((review) => (
                    <div key={review.id} className="bg-surface rounded-[2.5rem] border border-border shadow-premium overflow-hidden transition-all hover:border-primary/20">
                        <div className="p-8 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-xl font-black text-primary">
                                        {review.customer[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-text">{review.customer}</h4>
                                        <span className="text-xs font-bold text-text-light">{review.date}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-xl font-black text-sm shadow-lg shadow-amber-500/20">
                                    <span>★</span> {review.rating}
                                </div>
                            </div>

                            <div className="bg-background-alt/50 p-4 rounded-2xl border border-border flex flex-wrap gap-6">
                                <div>
                                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-1">Lezzet</span>
                                    <div className="h-1.5 w-24 bg-background-alt rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${review.flavor * 10}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-1">Servis</span>
                                    <div className="h-1.5 w-24 bg-background-alt rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500" style={{ width: `${review.service * 10}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-1">Hız</span>
                                    <div className="h-1.5 w-24 bg-background-alt rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${review.speed * 10}%` }} />
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm font-medium text-text italic leading-relaxed">
                                "{review.comment}"
                            </p>

                            {review.reply ? (
                                <div className="bg-primary/5 p-6 rounded-2xl border border-dashed border-primary/20 relative animate-fadeIn">
                                    <span className="absolute -top-3 left-6 bg-primary text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">Senin Cevabın</span>
                                    <p className="text-xs font-bold text-text-light">
                                        {review.reply}
                                    </p>
                                </div>
                            ) : (
                                <div className="pt-4">
                                    {replyingTo === review.id ? (
                                        <div className="space-y-4 animate-fadeIn">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Müşterine bir cevap yaz..."
                                                className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none resize-none"
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => setReplyingTo(null)} className="px-6 py-2 bg-background-alt text-text-light font-black rounded-xl text-xs uppercase tracking-widest">İptal</button>
                                                <button onClick={() => handleReply(review.id)} className="px-6 py-2 bg-primary text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20">Cevabı Gönder</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setReplyingTo(review.id)} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-2">
                                            <span>↩</span> Cevap Yazarak Müşterini Kazan
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filteredReviews.length === 0 && (
                    <div className="p-20 text-center space-y-4 opacity-40">
                        <span className="text-6xl block">🔎</span>
                        <p className="font-black text-text-light uppercase tracking-widest">Aradığınız kriterlere uygun yorum bulunamadı.</p>
                    </div>
                )}
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
