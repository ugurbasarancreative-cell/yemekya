'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import DataStore from '@/lib/dataStore';
import { ALL_LOCATIONS } from '@/lib/locations';
import Toast from '../../components/Toast';

interface DeliveryZone {
    id: number;
    neighborhood: string;
    minAmount: number;
    deliveryFee: number;
    estimatedTime: string;
    status: 'Aktif' | 'Yoğun' | 'Kapalı';
}

export default function DeliveryZonesPage() {
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<DeliveryZone>>({
        neighborhood: '',
        minAmount: 150,
        deliveryFee: 0,
        estimatedTime: '20-30 dk',
        status: 'Aktif'
    });
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });

    useEffect(() => {
        const userRaw = localStorage.getItem('yemekya_user');
        const resId = userRaw ? JSON.parse(userRaw).restaurantId : null;
        const KEY = resId ? `yemekya_delivery_zones_${resId}` : 'yemekya_delivery_zones';

        const stored = localStorage.getItem(KEY);
        if (stored) {
            setZones(JSON.parse(stored));
        } else {
            const initial: DeliveryZone[] = [
                { id: 1, neighborhood: '100. Yıl Mah.', minAmount: 150, deliveryFee: 0, estimatedTime: '20-30 dk', status: 'Aktif' },
                { id: 2, neighborhood: 'Beşbinevler Mah.', minAmount: 180, deliveryFee: 15, estimatedTime: '30-45 dk', status: 'Aktif' },
                { id: 3, neighborhood: 'Yeni Mahalle', minAmount: 200, deliveryFee: 20, estimatedTime: '35-50 dk', status: 'Aktif' },
                { id: 4, neighborhood: 'Bayır Mah.', minAmount: 250, deliveryFee: 30, estimatedTime: '45-60 dk', status: 'Aktif' },
                { id: 5, neighborhood: 'Cumhuriyet Mah.', minAmount: 150, deliveryFee: 10, estimatedTime: '25-35 dk', status: 'Aktif' },
            ];
            setZones(initial);
            localStorage.setItem(KEY, JSON.stringify(initial));
        }
    }, []);

    const saveZones = (updated: DeliveryZone[]) => {
        const userRaw = localStorage.getItem('yemekya_user');
        const resId = userRaw ? JSON.parse(userRaw).restaurantId : null;
        const KEY = resId ? `yemekya_delivery_zones_${resId}` : 'yemekya_delivery_zones';

        setZones(updated);
        localStorage.setItem(KEY, JSON.stringify(updated));

        const dataStore = DataStore.getInstance();
        if (resId) {
            const activeZone = updated.find(z => z.status === 'Aktif') || updated[0];
            if (activeZone) {
                dataStore.updateRestaurant(resId, {
                    minBasket: activeZone.minAmount,
                    deliveryFee: activeZone.deliveryFee,
                    time: activeZone.estimatedTime
                });
            }
        }
    };

    const toggleStatus = (id: number) => {
        saveZones(zones.map(z => {
            if (z.id === id) {
                const nextStatus: any = z.status === 'Aktif' ? 'Yoğun' : z.status === 'Yoğun' ? 'Kapalı' : 'Aktif';
                return { ...z, status: nextStatus };
            }
            return z;
        }));
    };

    const handleSave = () => {
        if (!formData.neighborhood) return;

        // Çakışma Kontrolü
        const isDuplicate = zones.some(z => z.neighborhood === formData.neighborhood && z.id !== isEditing);
        if (isDuplicate) {
            setToast({ message: `"${formData.neighborhood}" mahallesi zaten ekli.`, type: 'error' });
            return;
        }

        if (isEditing) {
            saveZones(zones.map(z => z.id === isEditing ? { ...z, ...formData } as DeliveryZone : z));
            setToast({ message: 'Bölge güncellendi.', type: 'success' });
        } else {
            const { id: _unusedId, ...rest } = formData;
            const fresh: DeliveryZone = {
                ...rest as any,
                id: Date.now()
            };
            saveZones([...zones, fresh]);
            setToast({ message: 'Yeni bölge eklendi.', type: 'success' });
        }

        setShowModal(false);
        setIsEditing(null);
        setFormData({ neighborhood: '', minAmount: 150, deliveryFee: 0, estimatedTime: '20-30 dk', status: 'Aktif' });
    };

    const editZone = (z: DeliveryZone) => {
        setFormData(z);
        setIsEditing(z.id);
        setShowModal(true);
    };

    const deleteZone = (id: number) => {
        setConfirmConfig({ isOpen: true, id });
    };

    const performDelete = () => {
        if (confirmConfig.id) {
            saveZones(zones.filter(z => z.id !== confirmConfig.id));
        }
        setConfirmConfig({ isOpen: false, id: null });
    };

    return (
        <div className="space-y-8 animate-fadeIn">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-text tracking-tighter">Bölge ve Teslimat</h1>
                    <p className="text-text-light font-bold">Hangi mahallelere, ne kadara hizmet veriyorsun?</p>
                </div>
            </div>

            {/* ZONES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.map((zone) => (
                    <div key={zone.id} className="bg-surface rounded-[2.5rem] border border-border shadow-premium p-8 space-y-6 group hover:-translate-y-1 transition-all relative">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black text-text tracking-tight">{zone.neighborhood}</h3>
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Hizmet Alanı</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background-alt/50 rounded-2xl p-4 border border-border">
                                <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-1">Min. Tutar</span>
                                <span className="text-sm font-black text-text">{zone.minAmount} TL</span>
                            </div>
                            <div className="bg-background-alt/50 rounded-2xl p-4 border border-border">
                                <span className="text-[9px] font-black text-text-light uppercase tracking-widest block mb-1">Gönderim</span>
                                <span className="text-sm font-black text-text">{zone.deliveryFee === 0 ? 'Ücretsiz' : `${zone.deliveryFee} TL`}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-dashed border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">⏱️</span>
                                <span className="text-xs font-bold text-text-light">{zone.estimatedTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => editZone(zone)} className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">Düzenle</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ZONE MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                    <div className="bg-surface w-full max-w-lg rounded-[3rem] border border-border shadow-2xl p-10 animate-popIn">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-text tracking-tighter">{isEditing ? 'Bölgeyi Düzenle' : 'Yeni Bölge'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Mahalle Adı</label>
                                <select
                                    value={formData.neighborhood}
                                    onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                                    className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none appearance-none transition-all"
                                >
                                    <option value="">Mahalle Seçiniz</option>
                                    {ALL_LOCATIONS.map(city => (
                                        <optgroup key={city.city} label={city.city}>
                                            {city.neighborhoods.map(neighborhood => (
                                                <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Min. Paket (TL)</label>
                                    <input
                                        type="number"
                                        value={formData.minAmount}
                                        onChange={e => setFormData({ ...formData, minAmount: Number(e.target.value) })}
                                        className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Getirme Ücreti (TL)</label>
                                    <input
                                        type="number"
                                        value={formData.deliveryFee}
                                        onChange={e => setFormData({ ...formData, deliveryFee: Number(e.target.value) })}
                                        className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Tahmini Süre</label>
                                <select
                                    value={formData.estimatedTime}
                                    onChange={e => setFormData({ ...formData, estimatedTime: e.target.value })}
                                    className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                                >
                                    <option value="10-20 dk">10-20 dk</option>
                                    <option value="20-30 dk">20-30 dk</option>
                                    <option value="30-40 dk">30-40 dk</option>
                                    <option value="40-50 dk">40-50 dk</option>
                                </select>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full py-5 bg-primary text-white font-black rounded-[2rem] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest mt-4"
                            >
                                {isEditing ? 'Değişiklikleri Kaydet' : 'Bölgeyi Ekle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* DELETE CONFIRM MODAL */}
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title="Bölgeyi Sil"
                message="Bu teslimat bölgesini listeden kaldırmak istediğinize emin misiniz?"
                onConfirm={performDelete}
                onCancel={() => setConfirmConfig({ isOpen: false, id: null })}
                confirmText="Evet, Sil"
                type="danger"
            />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
