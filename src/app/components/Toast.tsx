'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
    onClose: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-primary'
    };

    const icons = {
        success: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white"><path d="M20 6L9 17l-5-5" /></svg>
        ),
        error: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ),
        info: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        )
    };

    return (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95'} ${type === 'error' ? 'bg-red-500/10 border border-red-500/20' : type === 'info' ? 'bg-primary/10 border border-primary/20' : 'bg-green-500/10 border border-green-500/20'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${bgColors[type]}`}>
                {icons[type]}
            </div>
            <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${type === 'error' ? 'text-red-500' : type === 'info' ? 'text-primary' : 'text-green-500'}`}>
                    {type === 'error' ? 'Hata' : type === 'info' ? 'Bilgi' : 'Başarılı'}
                </span>
                <span className="text-sm font-bold text-text dark:text-white leading-tight">{message}</span>
            </div>
        </div>
    );
}
