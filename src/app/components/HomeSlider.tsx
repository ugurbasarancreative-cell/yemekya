'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DataStore, { Banner } from '@/lib/dataStore';

// Replaced by DataStore.Banner

export default function HomeSlider() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const loadBanners = async () => {
            const dataStore = DataStore.getInstance();
            const all = await dataStore.getBanners();
            setBanners(all.filter(b => b.active));
        };

        loadBanners();
        window.addEventListener('storage', loadBanners);
        window.addEventListener('banner-update', loadBanners);
        return () => {
            window.removeEventListener('storage', loadBanners);
            window.removeEventListener('banner-update', loadBanners);
        };
    }, []);

    const nextSlide = useCallback(() => {
        if (banners.length === 0) return;
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, [banners.length]);

    const prevSlide = () => {
        if (banners.length === 0) return;
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    useEffect(() => {
        if (isPaused || banners.length <= 1) return;
        const interval = setInterval(nextSlide, 5000); // 5 saniyede bir otomatik geçiş
        return () => clearInterval(interval);
    }, [isPaused, banners.length, nextSlide]);

    if (banners.length === 0) return null;

    return (
        <div
            className="relative w-full overflow-hidden rounded-[2rem] md:rounded-[3rem] shadow-premium border border-border group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Slides */}
            <div
                className="flex transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {banners.map((banner) => (
                    <div key={banner.id} className="min-w-full relative aspect-[21/9] md:aspect-[3/1]">
                        <Link href={banner.link || '#'} className="block w-full h-full relative cursor-pointer">
                            <img
                                src={banner.image}
                                alt={banner.title}
                                className="w-full h-full object-cover select-none"
                            />
                            {/* Overlay for Title */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 md:p-12">
                                <h3 className="text-white text-xl md:text-3xl font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                    {banner.title}
                                </h3>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            {/* Navigation Arrows */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-primary transition-all z-10"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-primary transition-all z-10"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6 6-6" /></svg>
                    </button>
                </>
            )}

            {/* Pagination Dots */}
            {banners.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {banners.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-500 ${currentIndex === idx ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
