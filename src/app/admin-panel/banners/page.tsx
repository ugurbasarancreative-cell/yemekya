'use client';

import { useState, useEffect } from 'react';
import Toast from '../../components/Toast';
import DataStore, { Banner } from '@/lib/dataStore';

// Replaced by DataStore.Banner

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newBanner, setNewBanner] = useState({ title: '', image: '', link: '' });

    useEffect(() => {
        const loadBanners = async () => {
            const dataStore = DataStore.getInstance();
            const data = await dataStore.getBanners();
            setBanners(data);
        };
        loadBanners();
        window.addEventListener('storage', loadBanners);
        window.addEventListener('banner-update', loadBanners);
        return () => {
            window.removeEventListener('storage', loadBanners);
            window.removeEventListener('banner-update', loadBanners);
        };
    }, []);

    const saveBannersAction = async (list: Banner[]) => {
        const dataStore = DataStore.getInstance();
        await dataStore.saveBanners(list);
        setBanners(list);
    };

    const addBanner = () => {
        if (!newBanner.image) {
            setToast({ message: 'Lütfen bir görsel URL girin.', type: 'error' });
            return;
        }
        const banner: Banner = {
            id: Math.random().toString(36).substr(2, 9),
            ...newBanner,
            active: true
        };
        const updated = [...banners, banner];
        saveBannersAction(updated);
        setIsAddModalOpen(false);
        setNewBanner({ title: '', image: '', link: '' });
        setToast({ message: 'Banner başarıyla eklendi.', type: 'success' });
    };

    const deleteBanner = (id: string) => {
        const updated = banners.filter(b => b.id !== id);
        saveBannersAction(updated);
        setToast({ message: 'Banner silindi.', type: 'info' });
    };

    const toggleStatus = (id: string) => {
        const updated = banners.map(b => b.id === id ? { ...b, active: !b.active } : b);
        saveBannersAction(updated);
    };

    return (
        <div className="space-y-12 animate-fadeIn pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-text tracking-tighter uppercase">Banner Yönetimi</h1>
                    <p className="text-text-light font-bold">Anasayfada dönen kampanya görsellerini yönetin.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all text-sm uppercase tracking-widest"
                >
                    + Yeni Banner Ekle
                </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex items-start gap-4">
                <span className="text-2xl">📏</span>
                <div className="space-y-1">
                    <h4 className="text-sm font-black text-amber-600 uppercase tracking-widest">Görsel Standartları</h4>
                    <p className="text-xs font-bold text-amber-700/80 leading-relaxed italic">
                        Bannerların anasayfada düzgün görünmesi için <span className="text-amber-600 font-black">1200x350px</span> veya <span className="text-amber-600 font-black">16:9</span> oranında yüksek çözünürlüklü görseller kullanmanız önerilir.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {banners.map(banner => (
                    <div key={banner.id} className="bg-surface border border-border rounded-3xl overflow-hidden group shadow-premium">
                        <div className="h-48 relative overflow-hidden">
                            <img src={banner.image} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${banner.active ? 'bg-green-500 text-white shadow-lg' : 'bg-background-alt text-text-light border border-border'}`}>
                                    {banner.active ? 'Aktif' : 'Pasif'}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-text uppercase tracking-tighter">{banner.title}</h3>
                                <p className="text-[10px] font-bold text-text-light mt-1 truncate max-w-[200px]">{banner.link}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleStatus(banner.id)}
                                    className="w-10 h-10 bg-background-alt border border-border rounded-xl flex items-center justify-center text-lg hover:border-primary transition-colors"
                                    title={banner.active ? 'Duraklat' : 'Aktif Et'}
                                >
                                    {banner.active ? '⏸️' : '▶️'}
                                </button>
                                <button
                                    onClick={() => deleteBanner(banner.id)}
                                    className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-lg hover:bg-red-500 hover:text-white transition-colors text-red-500"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40 animate-fadeIn">
                    <div className="bg-surface w-full max-w-md rounded-[3rem] border border-border shadow-2xl overflow-hidden animate-scaleUp p-10">
                        <h2 className="text-2xl font-black text-text tracking-tighter mb-8 text-center uppercase">Yeni Banner Ekle</h2>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-4">Banner Başlığı</label>
                                <input
                                    type="text"
                                    value={newBanner.title}
                                    onChange={e => setNewBanner({ ...newBanner, title: e.target.value })}
                                    className="w-full bg-background-alt border border-border rounded-2xl py-4 px-6 text-text text-sm font-bold outline-none focus:border-primary transition-colors"
                                    placeholder="Örn: Hafta Sonu Kampanyası"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-4">Görsel URL (1200x350)</label>
                                <input
                                    type="text"
                                    value={newBanner.image}
                                    onChange={e => setNewBanner({ ...newBanner, image: e.target.value })}
                                    className="w-full bg-background-alt border border-border rounded-2xl py-4 px-6 text-text text-sm font-bold outline-none focus:border-primary transition-colors"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-4">Yönlendirme Linki (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={newBanner.link}
                                    onChange={e => setNewBanner({ ...newBanner, link: e.target.value })}
                                    className="w-full bg-background-alt border border-border rounded-2xl py-4 px-6 text-text text-sm font-bold outline-none focus:border-primary transition-colors"
                                    placeholder="#"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 bg-background-alt text-text-light font-black rounded-2xl text-[10px] uppercase">Vazgeç</button>
                                <button onClick={addBanner} className="flex-1 py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase shadow-lg shadow-primary/20">BANNERI EKLE</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
