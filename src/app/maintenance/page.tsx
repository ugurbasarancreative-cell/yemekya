'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function MaintenancePage() {
    const [timeLeft, setTimeLeft] = useState<{ hours: number, minutes: number, seconds: number } | null>(null);
    const [endTimeStr, setEndTimeStr] = useState<string>('');

    useEffect(() => {
        const updateCountdown = () => {
            const stored = localStorage.getItem('YEMEKYA_MAINTENANCE_MODE');
            if (!stored) {
                window.location.href = '/';
                return;
            }

            const data = JSON.parse(stored);
            const now = new Date().getTime();
            const diff = data.endTime - now;

            if (diff <= 0) {
                localStorage.removeItem('YEMEKYA_MAINTENANCE_MODE');
                window.location.href = '/';
                return;
            }

            setEndTimeStr(new Date(data.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            </div>

            <div className="max-w-2xl w-full text-center relative z-10 space-y-12">
                {/* Logo & Icon */}
                <div className="space-y-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary to-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-primary/40 animate-bounce transition-all duration-1000">
                        <span className="text-4xl">🛠️</span>
                    </div>
                    <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic tracking-widest">
                        YemekYa
                    </h1>
                </div>

                {/* Main Message */}
                <div className="space-y-4">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Sistem Bakım Çalışması</h2>
                    <p className="text-lg text-white/40 font-medium leading-relaxed max-w-lg mx-auto italic">
                        Şu an platformumuzda kapsamlı bir iyileştirme çalışması yapılıyor. Kısa süre sonra daha güçlü ve hızlı bir şekilde döneceğiz.
                    </p>
                </div>

                {/* Countdown Timer */}
                {timeLeft && (
                    <div className="grid grid-cols-3 gap-6 bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-xl">
                        <div className="space-y-2">
                            <div className="text-5xl font-black text-white">{timeLeft.hours.toString().padStart(2, '0')}</div>
                            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Saat</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-5xl font-black text-white">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Dakika</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-5xl font-black text-white">{timeLeft.seconds.toString().padStart(2, '0')}</div>
                            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Saniye</div>
                        </div>
                    </div>
                )}

                {/* Target Time */}
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-primary/10 border border-primary/20 rounded-full">
                    <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
                    <p className="text-sm font-black text-primary uppercase tracking-widest">
                        Tahmini Açılış: <span className="text-white ml-2">{endTimeStr}</span>
                    </p>
                </div>

                {/* Footer Footer */}
                <div className="pt-8 opacity-20 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">© 2026 YemekYa Teknoloji A.Ş. Tüm Hakları Saklıdır.</p>
                </div>
            </div>
        </div>
    );
}
