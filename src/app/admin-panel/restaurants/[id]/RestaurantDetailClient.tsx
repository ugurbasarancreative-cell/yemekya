'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '../../../components/Toast';
import DataStore, { Restaurant, MenuApproval, Review } from '@/lib/dataStore';
import { ALL_LOCATIONS } from '@/lib/locations';

export default function AdminRestaurantDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const router = useRouter();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'delivery' | 'billing' | 'approvals'>('approvals');
    const [approvals, setApprovals] = useState<MenuApproval[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Zone Management
    const [zones, setZones] = useState<any[]>([]);
    const [showZoneModal, setShowZoneModal] = useState(false);
    const [editingZone, setEditingZone] = useState<number | null>(null);
    const [zoneFormData, setZoneFormData] = useState({ neighborhood: '', minAmount: 150, deliveryFee: 0, estimatedTime: '20-30 dk' });

    const [reviews, setReviews] = useState<Review[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            const dataStore = DataStore.getInstance();
            const found = await dataStore.getRestaurant(params.id as string);
            if (found) {
                setRestaurant({
                    ...found,
                    category: (found as any).tags || 'Restoran',
                    joinedAt: (found as any).joinedAt || '01.01.2024',
                    deliveryTime: found.time || '30-45 dk',
                    deliveryFee: found.deliveryFee || 25,
                    minOrder: found.minBasket || 150
                } as any);

                // Load Invoices
                const history = await dataStore.getInvoiceHistory(params.id as string);
                setInvoices(history);

                // Load Reviews
                const resReviews = await dataStore.getReviews(params.id as string);
                setReviews(resReviews);
            }
        };
        load();

        // Load zones
        const zoneKey = `yemekya_delivery_zones_${params.id}`;
        const storedZones = localStorage.getItem(zoneKey);
        if (storedZones) setZones(JSON.parse(storedZones));
    }, [params.id]);

    const handleSaveZone = () => {
        if (!zoneFormData.neighborhood) return;
        const zoneKey = `yemekya_delivery_zones_${params.id}`;
        let updated;
        if (editingZone) {
            // Edit modunda, mahalle değiştiyse çakışma kontrolü yap (kendisi hariç)
            const exists = zones.find(z => z.neighborhood === zoneFormData.neighborhood && z.id !== editingZone);
            if (exists) {
                setToast({ message: 'Bu mahalle zaten tanımlanmış.', type: 'error' });
                return;
            }
            updated = zones.map(z => z.id === editingZone ? { ...z, ...zoneFormData } : z);
        } else {
            // Yeni eklemede çakışma kontrolü
            const exists = zones.find(z => z.neighborhood === zoneFormData.neighborhood);
            if (exists) {
                setToast({ message: 'Bu mahalle zaten tanımlanmış.', type: 'error' });
                return;
            }
            updated = [...zones, { ...zoneFormData, id: Date.now(), status: 'Aktif' }];
        }
        setZones(updated);
        localStorage.setItem(zoneKey, JSON.stringify(updated));
        setShowZoneModal(false);
        setToast({ message: 'Bölge ayarları kaydedildi.', type: 'success' });
    };

    const handleDeleteZone = (id: number) => {
        const zoneKey = `yemekya_delivery_zones_${params.id}`;
        const updated = zones.filter(z => z.id !== id);
        setZones(updated);
        localStorage.setItem(zoneKey, JSON.stringify(updated));
        setToast({ message: 'Bölge kaldırıldı.', type: 'info' });
    };

    const handleApproval = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
        const storedAppr = localStorage.getItem('yemekya_menu_approvals');
        if (!storedAppr) return;

        let allAppr = JSON.parse(storedAppr);
        const apprIdx = allAppr.findIndex((a: any) => a.id === id);
        if (apprIdx === -1) return;

        const originalAppr = allAppr[apprIdx];
        allAppr[apprIdx].status = decision;
        localStorage.setItem('yemekya_menu_approvals', JSON.stringify(allAppr));

        if (decision === 'APPROVED') {
            const dataStore = DataStore.getInstance();
            const res = await dataStore.getRestaurant(originalAppr.restaurantId);
            if (res) {
                let menu = res.menu || [];
                if (originalAppr.type === 'ADD') {
                    menu.push({ ...originalAppr.data, id: Date.now().toString(), status: 'approved' });
                } else {
                    const pIdx = menu.findIndex((p: any) => p.name === originalAppr.productName);
                    if (pIdx !== -1) {
                        menu[pIdx] = { ...menu[pIdx], ...originalAppr.data, status: 'approved' };
                    }
                }
                await dataStore.updateRestaurant(originalAppr.restaurantId, { menu: menu as any });

                // Update local state
                const updatedRes = await dataStore.getRestaurant(originalAppr.restaurantId);
                if (updatedRes) {
                    setRestaurant({
                        ...updatedRes,
                        category: (updatedRes as any).tags || 'Restoran',
                        joinedAt: (updatedRes as any).joinedAt || '01.01.2024',
                        deliveryTime: updatedRes.time || '30-45 dk',
                        deliveryFee: updatedRes.deliveryFee || 25,
                        minOrder: updatedRes.minBasket || 150
                    } as any);
                }
            }
        }

        setApprovals(allAppr.filter((a: any) => a.restaurantId === params.id));
        setToast({
            message: decision === 'APPROVED' ? 'Değişiklik onaylandı ve yayınlandı!' : 'Değişiklik reddedildi.',
            type: decision === 'APPROVED' ? 'success' : 'info'
        });
    };

    const handleToggleReviewVisibility = async (reviewId: string, currentHidden: boolean) => {
        const dataStore = DataStore.getInstance();
        await dataStore.updateReview(reviewId, { isHidden: !currentHidden });
        const updated = await dataStore.getReviews(params.id as string);
        setReviews(updated);
        setToast({ message: `Yorum ${!currentHidden ? 'gizlendi' : 'görünür yapıldı'}.`, type: 'info' });
    };

    const handleSaveDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const dataStore = DataStore.getInstance();

        if (restaurant) {
            const updates = {
                time: formData.get('deliveryTime') as string,
                deliveryFee: Number(formData.get('deliveryFee')),
                minBasket: Number(formData.get('minBasket')),
            };
            await dataStore.updateRestaurant(restaurant.id, updates);

            const updated = await dataStore.getRestaurant(restaurant.id);
            if (updated) {
                setRestaurant({
                    ...updated,
                    category: (updated as any).tags || 'Restoran',
                    joinedAt: (updated as any).joinedAt || '01.01.2024',
                    deliveryTime: updated.time || '30-45 dk',
                    deliveryFee: updated.deliveryFee || 25,
                    minOrder: updated.minBasket || 150
                } as any);
            }
            setToast({ message: 'Teslimat ayarları güncellendi.', type: 'success' });
        }
    };

    if (!restaurant) return null;

    return (
        <div className="space-y-10 animate-fadeIn pb-12">

            {/* BACK BUTTON & HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all text-xl">←</button>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{restaurant.name}</h1>
                        <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1">{restaurant.category} • Detaylı İşletme Yönetimi</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <span className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${restaurant.status === 'open' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        restaurant.status === 'busy' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                        {restaurant.status === 'open' ? 'Açık' : restaurant.status === 'busy' ? 'Yoğun' : 'Kapalı'}
                    </span>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-4 bg-[#0c0c14] p-2 rounded-[2rem] border border-white/5 overflow-x-auto no-scrollbar">
                {[
                    { id: 'approvals', label: 'Menü Onayları', icon: '📝', count: approvals.filter(a => a.status === 'PENDING').length },
                    { id: 'menu', label: 'Canlı Menü', icon: '🍴' },
                    { id: 'reviews', label: 'Yorumlar', icon: '⭐' },
                    { id: 'delivery', label: 'Teslimat Ayarları', icon: '📍' },
                    { id: 'billing', label: 'Faturalar', icon: '🧾' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shrink-0 ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 border border-indigo-400/20' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="w-5 h-5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full animate-pulse">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <div className="min-h-[500px]">

                {activeTab === 'approvals' && (
                    <div className="space-y-6 animate-fadeIn">
                        {approvals.length === 0 ? (
                            <div className="bg-[#0c0c14] rounded-[3rem] border border-white/5 p-20 text-center space-y-4">
                                <span className="text-5xl opacity-20 block">✅</span>
                                <h3 className="text-xl font-black text-white/20 uppercase tracking-widest">Bekleyen Onay Yok</h3>
                                <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.2em]">Bu restoran için tüm menü güncellemeleri güncel.</p>
                            </div>
                        ) : (
                            approvals.map(appr => (
                                <div key={appr.id} className={`bg-[#0c0c14] border rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 transition-all ${appr.status !== 'PENDING' ? 'opacity-40 grayscale' : 'border-indigo-500/20 shadow-lg shadow-indigo-500/5'}`}>
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-3xl">
                                            {appr.type === 'ADD' ? '✨' : appr.type === 'PRICE_CHANGE' ? '💰' : '✏️'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${appr.type === 'ADD' ? 'bg-green-500/20 text-green-500' :
                                                    appr.type === 'PRICE_CHANGE' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'
                                                    }`}>
                                                    {appr.type === 'ADD' ? 'Yeni Ürün' : appr.type === 'PRICE_CHANGE' ? 'Fiyat Değişimi' : 'Düzenleme'}
                                                </span>
                                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{appr.timestamp}</span>
                                            </div>
                                            <h4 className="text-lg font-black text-white uppercase tracking-tight">{appr.productName}</h4>
                                            <div className="flex items-center gap-4 mt-2">
                                                {appr.oldValue && (
                                                    <span className="text-xs font-bold text-white/30 line-through">{appr.oldValue} TL</span>
                                                )}
                                                <span className="text-sm font-black text-indigo-400">{appr.newValue} {appr.type === 'ADD' ? 'TL' : 'TL (YENİ)'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {appr.status === 'PENDING' && (
                                        <div className="flex gap-4">
                                            <button onClick={() => handleApproval(appr.id, 'REJECTED')} className="px-8 py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all">Reddet</button>
                                            <button onClick={() => handleApproval(appr.id, 'APPROVED')} className="px-8 py-4 bg-indigo-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all">Onayla & Yayınla</button>
                                        </div>
                                    )}

                                    {appr.status !== 'PENDING' && (
                                        <div className="px-8 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20">
                                            {appr.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'menu' && (
                    <div className="bg-[#0c0c14] rounded-[3rem] border border-white/5 p-10 animate-fadeIn">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Canlı Yayındaki Menü</h3>
                                <p className="text-sm text-white/40">Müşterilerin şu anda gördüğü aktif ürün listesi.</p>
                            </div>
                        </div>

                        {(restaurant as any).menu && (restaurant as any).menu.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(restaurant as any).menu.map((item: any, i: number) => (
                                    <div key={i} className="p-6 bg-white/5 rounded-[2rem] border border-white/5 flex gap-4 hover:border-indigo-500/20 transition-all group">
                                        <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                            {item.image || '🍔'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-white truncate text-sm">{item.name}</h4>
                                            <p className="text-[10px] text-white/30 font-bold uppercase mt-1">{item.category || 'Genel'}</p>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-sm font-black text-indigo-400">{item.price} TL</span>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded ${item.stock !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {item.stock !== false ? 'STOKTA' : 'TÜKENDİ'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                <span className="text-4xl block mb-4">🍽️</span>
                                <h4 className="text-white/20 font-black uppercase tracking-widest">Henüz Ürün Eklenmemiş</h4>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                        {reviews.length > 0 ? reviews.map(rev => {
                            const avgRating = Math.round((rev.scores.lezzet + rev.scores.servis + rev.scores.teslimat) / 3);
                            return (
                                <div key={rev.id} className={`bg-[#0c0c14] border rounded-[2.5rem] p-8 space-y-4 hover:border-indigo-500/20 transition-all group ${rev.isHidden ? 'opacity-40 border-dashed border-white/10' : 'border-white/5'}`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{rev.userName}</h4>
                                            {rev.isHidden && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-1">Bu yorum müşteriye gizlendi</span>}
                                        </div>
                                        <div className="flex text-amber-500 text-xs">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < avgRating ? '' : 'opacity-20'}>⭐</span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-medium text-white/40 leading-relaxed italic">"{rev.comment}"</p>
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{new Date(rev.date).toLocaleDateString('tr-TR')}</span>
                                        <button
                                            onClick={() => handleToggleReviewVisibility(rev.id, !!rev.isHidden)}
                                            className={`text-[9px] font-black uppercase tracking-widest transition-all ${rev.isHidden ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}
                                        >
                                            {rev.isHidden ? 'Görünür Yap' : 'Müşteriden Gizle'}
                                        </button>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="col-span-full py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                <span className="text-4xl block mb-4">💬</span>
                                <h4 className="text-white/20 font-black uppercase tracking-widest">Henüz Yorum Yapılmamış</h4>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'delivery' && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Bölge Bazlı Lojistik</h3>
                                <p className="text-sm text-white/40">Restoranın hizmet verdiği mahalleleri ve özel şartlarını yönetin.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingZone(null);
                                    setZoneFormData({ neighborhood: '', minAmount: 150, deliveryFee: 0, estimatedTime: '20-30 dk' });
                                    setShowZoneModal(true);
                                }}
                                className="px-6 py-3 bg-indigo-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                            >
                                + Yeni Bölge Tanımla
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {zones.map((zone: any) => (
                                <div key={zone.id} className="bg-[#0c0c14] border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-lg font-black text-white uppercase tracking-tight">{zone.neighborhood}</h4>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Aktif Bölge</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingZone(zone.id); setZoneFormData(zone); setShowZoneModal(true); }} className="text-[10px] font-bold text-white/30 hover:text-white uppercase transition-colors">Düzenle</button>
                                            <button onClick={() => handleDeleteZone(zone.id)} className="text-[10px] font-bold text-red-500/50 hover:text-red-500 uppercase transition-colors">Sil</button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Min. Tutar</span>
                                            <span className="text-sm font-black text-white">{zone.minAmount} TL</span>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Gönderim</span>
                                            <span className="text-sm font-black text-white">{zone.deliveryFee === 0 ? 'Ücretsiz' : `${zone.deliveryFee} TL`}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-dashed border-white/5 flex items-center gap-2">
                                        <span className="text-lg">⏱️</span>
                                        <span className="text-xs font-bold text-white/40">{zone.estimatedTime}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ZONE MODAL */}
                        {showZoneModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                                <div className="bg-[#0c0c14] w-full max-w-lg rounded-[3rem] border border-white/10 p-10 animate-scaleUp">
                                    <div className="flex justify-between items-center mb-10">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{editingZone ? 'Bölgeyi Güncelle' : 'Planlanan Yeni Bölge'}</h3>
                                        <button onClick={() => setShowZoneModal(false)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl">✕</button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Mahalle Adı</label>
                                            <select
                                                value={zoneFormData.neighborhood}
                                                onChange={e => setZoneFormData({ ...zoneFormData, neighborhood: e.target.value })}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/30"
                                            >
                                                <option value="" className="bg-[#0c0c14]">Mahalle Seçiniz</option>
                                                {ALL_LOCATIONS.map(city => (
                                                    <optgroup key={city.city} label={city.city} className="bg-[#0c0c14]">
                                                        {city.neighborhoods.map(neighborhood => (
                                                            <option key={neighborhood} value={neighborhood} className="bg-[#0c0c14]">{neighborhood}</option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Min. Paket (TL)</label>
                                                <input
                                                    type="number"
                                                    value={zoneFormData.minAmount}
                                                    onChange={e => setZoneFormData({ ...zoneFormData, minAmount: Number(e.target.value) })}
                                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/30"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Gönderim (TL)</label>
                                                <input
                                                    type="number"
                                                    value={zoneFormData.deliveryFee}
                                                    onChange={e => setZoneFormData({ ...zoneFormData, deliveryFee: Number(e.target.value) })}
                                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/30"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Tahmini Teslimat Süresi</label>
                                            <select
                                                value={zoneFormData.estimatedTime}
                                                onChange={e => setZoneFormData({ ...zoneFormData, estimatedTime: e.target.value })}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-5 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/30"
                                            >
                                                <option value="10-20 dk">10-20 dk</option>
                                                <option value="20-30 dk">20-30 dk</option>
                                                <option value="30-40 dk">30-40 dk</option>
                                                <option value="40-50 dk">40-50 dk</option>
                                            </select>
                                        </div>
                                        <button onClick={handleSaveZone} className="w-full py-6 bg-indigo-500 text-white font-black rounded-[2rem] text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] transition-all mt-4">Ayarları Kaydet</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="bg-[#0c0c14] border border-white/5 rounded-[3rem] overflow-hidden animate-fadeIn">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Fatura ID / Dönem</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Tutar</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Platform Komisyonu (%5)</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Durum</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-white/30 uppercase tracking-widest"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {invoices.length > 0 ? invoices.map(inv => (
                                    <tr key={inv.id} className="group hover:bg-white/3 transition-colors">
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-white">{inv.period}</span>
                                                <span className="text-[10px] font-bold text-white/20 mt-1 uppercase tracking-widest">{inv.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-sm font-bold text-white/40">{inv.grossRevenue?.toLocaleString('tr-TR')} TL</td>
                                        <td className="px-10 py-8 text-sm font-black text-indigo-400">{inv.netCommission?.toLocaleString('tr-TR')} TL</td>
                                        <td className="px-10 py-8">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${inv.status === 'Ödendi' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                inv.status === 'Ödeme Bekliyor' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                    'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <button className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest">Detayı Gör</button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-20 text-center text-white/10 italic font-bold uppercase tracking-widest text-xs">Henüz bir finansal veri oluşmadı.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
