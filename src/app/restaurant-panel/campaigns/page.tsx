'use client';

import { useState, useEffect } from 'react';
import DataStore, { Campaign } from '@/lib/dataStore';

// Replaced by DataStore.Campaign

export default function CampaignPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newCamp, setNewCamp] = useState<Partial<Campaign>>({
        title: '',
        description: '',
        type: 'Discount',
        value: '',
        active: true
    });

    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('yemekya_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.restaurantId) {
                setRestaurantId(user.restaurantId);
            }
        }
    }, []);

    useEffect(() => {
        const loadCampaigns = async () => {
            if (!restaurantId) return;
            const dataStore = DataStore.getInstance();
            const data = await dataStore.getCampaigns(restaurantId);
            setCampaigns(data);
        };
        loadCampaigns();
        window.addEventListener('storage', loadCampaigns);
        window.addEventListener('campaign-update', loadCampaigns);
        return () => {
            window.removeEventListener('storage', loadCampaigns);
            window.removeEventListener('campaign-update', loadCampaigns);
        };
    }, [restaurantId]);

    const saveToStorage = async (updated: Campaign[]) => {
        const dataStore = DataStore.getInstance();
        const all = await dataStore.getCampaigns();
        // Remove old ones for this restaurant and add updated
        const otherResCampaigns = all.filter((c: Campaign) => c.restaurantId !== restaurantId);
        const next = [...otherResCampaigns, ...updated];
        await dataStore.saveCampaigns(next);
        setCampaigns(updated);
    };

    const toggleCampaign = (id: string) => {
        const updated = campaigns.map((c: Campaign) => c.id === id ? { ...c, active: !c.active } : c);
        saveToStorage(updated);
    };

    const deleteCampaign = (id: string) => {
        const updated = campaigns.filter((c: Campaign) => c.id !== id);
        saveToStorage(updated);
    };

    const handleCreate = () => {
        if (!newCamp.title || !newCamp.value || !restaurantId) return;
        const fresh: Campaign = {
            id: Math.random().toString(36).substr(2, 9),
            restaurantId: restaurantId,
            title: newCamp.title!,
            description: newCamp.description || '',
            type: newCamp.type as any,
            value: newCamp.value!,
            active: true,
            participationCount: 0
        };
        saveToStorage([...campaigns, fresh]);
        setShowModal(false);
        setNewCamp({ title: '', description: '', type: 'Discount', value: '', active: true });
    };

    return (
        <div className="space-y-10 animate-fadeIn pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-text tracking-tighter">Kampanya Yönetimi</h1>
                    <p className="text-text-light font-bold">Müşterilerini mutlu edecek kampanyalar oluştur ve yönet.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-3"
                >
                    <span>🏷️</span> Yeni Kampanya Oluştur
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {campaigns.map((camp) => (
                    <div key={camp.id} className={`bg-surface rounded-[3rem] border border-border shadow-premium p-10 space-y-6 transition-all duration-500 ${!camp.active ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-3xl shadow-sm border border-primary/20">
                                    {camp.type === 'Discount' ? '🏷️' : '🎁'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-text tracking-tight">{camp.title}</h3>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{camp.type === 'Discount' ? 'İndirim' : 'Hediye Ürün'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-2xl font-black text-primary">{camp.value}</span>
                                <label className="relative inline-flex items-center cursor-pointer scale-90">
                                    <input type="checkbox" checked={camp.active} onChange={() => toggleCampaign(camp.id)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-background-alt rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full border border-border shadow-inner"></div>
                                </label>
                            </div>
                        </div>

                        <p className="text-sm font-medium text-text-light leading-relaxed">
                            {camp.description}
                        </p>

                        <div className="pt-6 border-t border-dashed border-border flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-text-light uppercase tracking-widest leading-none">Bugünkü Katılım</span>
                                    <span className="text-sm font-black text-text mt-1">{Math.floor(Math.random() * 20) + 5} Müşteri</span>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteCampaign(camp.id)}
                                className="text-[10px] font-black text-text-light hover:text-red-500 uppercase tracking-widest transition-colors"
                            >
                                Kampanyayı Sil
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={() => setShowModal(true)}
                    className="bg-background-alt/30 rounded-[3rem] border-2 border-dashed border-border p-12 flex flex-col items-center justify-center text-center group hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[250px]"
                >
                    <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">✨</span>
                    <h4 className="text-lg font-black text-text-light tracking-tight group-hover:text-primary transition-colors">Yeni Bir Fırsat Dönemi Başlat</h4>
                    <p className="text-[10px] font-bold text-text-light/50 uppercase tracking-widest mt-2">Daha fazla müşteriye ulaşmak için bir adım at.</p>
                </button>
            </div>

            {/* CREATE MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                    <div className="bg-surface w-full max-w-lg rounded-[3rem] border border-border shadow-2xl p-10 animate-popIn">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-text tracking-tighter">Yeni Kampanya</h3>
                            <button onClick={() => setShowModal(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Kampanya Başlığı</label>
                                <input
                                    type="text"
                                    placeholder="Örn: Hafta Sonu Çılgınlığı"
                                    value={newCamp.title}
                                    onChange={e => setNewCamp({ ...newCamp, title: e.target.value })}
                                    className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Tür</label>
                                    <select
                                        value={newCamp.type}
                                        onChange={e => setNewCamp({ ...newCamp, type: e.target.value as any })}
                                        className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                                    >
                                        <option value="Discount">İndirim (%)</option>
                                        <option value="Gift">Hediye Ürün</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Değer / İkon</label>
                                    <input
                                        type="text"
                                        placeholder="%20 veya 🍔"
                                        value={newCamp.value}
                                        onChange={e => setNewCamp({ ...newCamp, value: e.target.value })}
                                        className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Açıklama</label>
                                <textarea
                                    rows={3}
                                    placeholder="Kampanya detaylarını yazın..."
                                    value={newCamp.description}
                                    onChange={e => setNewCamp({ ...newCamp, description: e.target.value })}
                                    className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none resize-none"
                                />
                            </div>

                            <button
                                onClick={handleCreate}
                                className="w-full py-5 bg-primary text-white font-black rounded-[2rem] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest mt-4"
                            >
                                Kampanyayı Başlat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
