'use client';

import { useState, useEffect, useRef } from 'react';

export default function GlobalAnnouncement() {
    const [announcement, setAnnouncement] = useState<{ active: boolean, text: string, target: 'all' | 'user' | 'restaurant', id: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosedByUser, setIsClosedByUser] = useState(false);
    const lastPlayedId = useRef<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const checkAnnouncement = () => {
        const stored = localStorage.getItem('YEMEKYA_GLOBAL_ANNOUNCEMENT');
        if (stored) {
            const data = JSON.parse(stored);

            // Check if user should see this announcement based on role/path
            const pathname = window.location.pathname;
            let shouldShow = data.active && data.text.length > 0;

            if (shouldShow) {
                if (data.target === 'user' && pathname.includes('restaurant-panel')) shouldShow = false;
                if (data.target === 'restaurant' && !pathname.includes('restaurant-panel')) shouldShow = false;
            }

            // Only show if the user hasn't manually closed THIS specific announcement ID
            const closedId = localStorage.getItem('YEMEKYA_CLOSED_ANNOUNCEMENT_ID');
            if (closedId === data.id) {
                shouldShow = false;
            }

            setAnnouncement(data);
            setIsVisible(shouldShow);

            // Play notification sound if it's a NEW announcement ID we haven't played yet in this session
            if (shouldShow && data.id !== lastPlayedId.current && data.active) {
                playNotificationSound();
                lastPlayedId.current = data.id;
            }
        } else {
            setIsVisible(false);
        }
    };

    const playNotificationSound = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        }
        audioRef.current.play().catch(e => console.log('Autoplay blocked or audio error:', e));
    };

    const handleClose = () => {
        if (announcement) {
            localStorage.setItem('YEMEKYA_CLOSED_ANNOUNCEMENT_ID', announcement.id);
            setIsVisible(false);
        }
    };

    useEffect(() => {
        checkAnnouncement();
        window.addEventListener('storage', checkAnnouncement);
        window.addEventListener('announcement-change', checkAnnouncement);
        return () => {
            window.removeEventListener('storage', checkAnnouncement);
            window.removeEventListener('announcement-change', checkAnnouncement);
        };
    }, []);

    if (!isVisible || !announcement) return null;

    const getBgColor = () => {
        switch (announcement.target) {
            case 'user': return 'bg-primary'; // Purple for users
            case 'restaurant': return 'bg-orange-500'; // Orange for restaurants
            default: return 'bg-[#0c0c14]'; // Black for all
        }
    };

    return (
        <div className={`${getBgColor()} text-white py-3 px-6 text-center animate-slideDown shadow-lg relative z-[999] border-b border-white/10 group`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center justify-center gap-4">
                    <span className="text-xl animate-bounce">
                        {announcement.target === 'restaurant' ? '🏪' : announcement.target === 'user' ? '👤' : '📢'}
                    </span>
                    <p className="text-sm font-black uppercase tracking-[0.2em] italic truncate max-w-3xl">
                        <span className="opacity-50 mr-2">[{announcement.target === 'all' ? 'HERKES' : announcement.target === 'user' ? 'KULLANICILAR' : 'RESTORANLAR'}]</span>
                        {announcement.text}
                    </p>
                    <div className="hidden md:block w-2 h-2 bg-white rounded-full animate-ping" />
                </div>

                <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-sm font-bold border border-white/5"
                    title="Kapat"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
