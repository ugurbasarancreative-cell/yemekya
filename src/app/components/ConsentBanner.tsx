'use client';

import { useState, useEffect } from 'react';

export default function ConsentBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('yemekya_consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem('yemekya_consent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-8 left-8 right-8 z-[1000] animate-bounceUp">
            <div className="bg-white/80 backdrop-blur-2xl border border-white/20 p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 max-w-6xl mx-auto">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl">🛡️</div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-black text-primary uppercase tracking-tighter">Veri Güvenliği ve KVKK</h4>
                        <p className="text-[11px] font-bold text-gray-500 leading-relaxed max-w-xl">
                            YemekYa, size daha iyi hizmet sunabilmek için çerezler ve KVKK uyumlu veri işleme yöntemleri kullanır. Sitemizi kullanarak
                            <span className="text-primary cursor-pointer hover:underline mx-1">Kullanıcı Sözleşmesini</span> ve
                            <span className="text-primary cursor-pointer hover:underline mx-1">Gizlilik Politikasını</span> kabul etmiş sayılırsınız.
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 shrink-0">
                    <button onClick={accept} className="px-10 py-4 bg-primary text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all">
                        Anladım, Kabul Ediyorum
                    </button>
                </div>
            </div>
        </div>
    );
}
