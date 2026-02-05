'use client';

import { useState, useEffect } from 'react';
import Toast from '../../components/Toast';
import DataStore from '@/lib/dataStore';

type RestaurantStatus = 'open' | 'busy' | 'closed';

interface DaySchedule {
    isOpen: boolean;
    open: string;
    close: string;
}

interface WeeklyHours {
    [key: string]: DaySchedule;
}

const DAYS = [
    { id: 'monday', label: 'Pazartesi' },
    { id: 'tuesday', label: 'Salı' },
    { id: 'wednesday', label: 'Çarşamba' },
    { id: 'thursday', label: 'Perşembe' },
    { id: 'friday', label: 'Cuma' },
    { id: 'saturday', label: 'Cumartesi' },
    { id: 'sunday', label: 'Pazar' }
];

export default function RestaurantSettingsPage() {
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [info, setInfo] = useState({
        name: 'Burger King',
        email: 'contact@burgerking.com',
        phone: '0850 222 54 64',
        address: 'Caddebostan Mah. Bağdat Cad. No:342',
        minBasket: 200,
        status: 'open' as RestaurantStatus,
        remoteAreaApproval: false,
        autoAccept: true,
        autoPrint: false,
        printerType: '80mm',
        weeklyHours: DAYS.reduce((acc, day) => ({
            ...acc,
            [day.id]: { isOpen: true, open: '10:00', close: '22:00' }
        }), {} as WeeklyHours)
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const userRaw = localStorage.getItem('yemekya_user');
            if (!userRaw) return;
            const user = JSON.parse(userRaw);
            const resId = user.restaurantId;

            const dataStore = DataStore.getInstance();
            if (resId) {
                const found = await dataStore.getRestaurant(resId);

                if (found) {
                    setInfo(prev => ({
                        ...prev,
                        name: found.name || prev.name,
                        phone: found.phone || prev.phone,
                        address: found.address || prev.address,
                        minBasket: found.minBasket || prev.minBasket,
                        status: found.status as RestaurantStatus || prev.status,
                        weeklyHours: (found as any).weeklyHours || prev.weeklyHours
                    }));
                }
            }
        };

        fetchSettings();
    }, []);

    const saveSettings = async () => {
        const userRaw = localStorage.getItem('yemekya_user');
        if (!userRaw) return;
        const user = JSON.parse(userRaw);
        const resId = user.restaurantId;

        if (resId) {
            const dataStore = DataStore.getInstance();
            await dataStore.updateRestaurant(resId, {
                name: info.name,
                phone: info.phone,
                address: info.address,
                minBasket: info.minBasket,
                status: info.status as any,
                weeklyHours: info.weeklyHours as any
            });

            localStorage.setItem('yemekya_restaurant_settings', JSON.stringify(info));
            setToast({ message: 'Ayarlar başarıyla kaydedildi ve tüm sistemle senkronize edildi!', type: 'success' });
        }
    };

    const updateWeeklyDay = (dayId: string, updates: Partial<DaySchedule>) => {
        setInfo(prev => ({
            ...prev,
            weeklyHours: {
                ...prev.weeklyHours,
                [dayId]: { ...prev.weeklyHours[dayId], ...updates }
            }
        }));
    };

    return (
        <div className="space-y-10 animate-fadeIn pb-20 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-text tracking-tighter">İşletme Ayarları</h1>
                    <p className="text-text-light font-bold">Profilini yönet ve dükkanının çalışma düzenini belirle.</p>
                </div>
                <div className="hidden md:block">
                    {/* Upper button removed to prevent redundancy as there is one at the bottom */}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                {/* LEFT COLUMN: FORM CONTENT */}
                <div className="lg:col-span-8 space-y-10">

                    {/* General Info */}
                    <section className="bg-surface rounded-[3rem] border border-border shadow-premium p-10 space-y-8">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">🏢</span>
                            <h3 className="text-xl font-black text-text tracking-tight">Genel Bilgiler</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Restoran Adı</label>
                                <input type="text" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4.5 px-6 text-sm font-bold outline-none transition-all shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">İletişim Numarası</label>
                                <input type="text" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4.5 px-6 text-sm font-bold outline-none transition-all shadow-inner" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Restoran Adresi</label>
                                <textarea rows={2} value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl py-4.5 px-6 text-sm font-bold outline-none transition-all shadow-inner resize-none" />
                            </div>
                        </div>
                    </section>

                    {/* Weekly Schedule */}
                    <section className="bg-surface rounded-[3rem] border border-border shadow-premium p-10 space-y-8">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">📅</span>
                            <h3 className="text-xl font-black text-text tracking-tight">Haftalık Çalışma Saatleri</h3>
                        </div>

                        <div className="space-y-4">
                            {DAYS.map(day => (
                                <div key={day.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-background-alt/30 rounded-3xl border border-border/50 gap-4">
                                    <div className="flex items-center gap-4 min-w-[140px]">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={info.weeklyHours[day.id].isOpen} onChange={(e) => updateWeeklyDay(day.id, { isOpen: e.target.checked })} className="sr-only peer" />
                                            <div className="w-10 h-5 bg-background-alt peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                                        </label>
                                        <span className={`text-sm font-black ${info.weeklyHours[day.id].isOpen ? 'text-text' : 'text-text-light opacity-50'}`}>{day.label}</span>
                                    </div>

                                    {info.weeklyHours[day.id].isOpen ? (
                                        <div className="flex items-center gap-3">
                                            <input type="time" value={info.weeklyHours[day.id].open} onChange={(e) => updateWeeklyDay(day.id, { open: e.target.value })} className="bg-surface border border-border rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-primary" />
                                            <span className="text-text-light font-black">-</span>
                                            <input type="time" value={info.weeklyHours[day.id].close} onChange={(e) => updateWeeklyDay(day.id, { close: e.target.value })} className="bg-surface border border-border rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-primary" />
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">KAPALI</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Operational Settings */}
                    <section className="bg-surface rounded-[3rem] border border-border shadow-premium p-10 space-y-8">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">⚙️</span>
                            <h3 className="text-xl font-black text-text tracking-tight uppercase tracking-tighter">Operasyonel Kontroller</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 bg-background-alt/50 rounded-[2.5rem] border border-border flex flex-col justify-between group hover:border-primary/30 transition-all gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-text underline decoration-amber-500/30">Uzak Bölge Kontrolü</h4>
                                    </div>
                                    <p className="text-[11px] font-bold text-text-light leading-relaxed">
                                        Uzak mahalleler için "Geçici Onay" özelliğini aktif edin.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={info.remoteAreaApproval} onChange={() => setInfo({ ...info, remoteAreaApproval: !info.remoteAreaApproval })} className="sr-only peer" />
                                    <div className="w-14 h-7 bg-background-alt peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border shadow-inner"></div>
                                </label>
                            </div>

                            <div className="p-8 bg-background-alt/50 rounded-[2.5rem] border border-border flex flex-col justify-between group hover:border-primary/30 transition-all gap-6">
                                <div className="space-y-2">
                                    <h4 className="font-black text-text underline decoration-primary/30">Otomatik Sipariş Onayı</h4>
                                    <p className="text-[11px] font-bold text-text-light leading-relaxed">
                                        Gelen siparişleri otomatik olarak "Hazırlanıyor" durumuna al.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={info.autoAccept} onChange={() => setInfo({ ...info, autoAccept: !info.autoAccept })} className="sr-only peer" />
                                    <div className="w-14 h-7 bg-background-alt peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border shadow-inner"></div>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Printing & Hardware Settings */}
                    <section className="bg-surface rounded-[3rem] border border-border shadow-premium p-10 space-y-8">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">🖨️</span>
                            <h3 className="text-xl font-black text-text tracking-tight uppercase tracking-tighter">Yazıcı ve Donanım</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-8 bg-background-alt/50 rounded-[2.5rem] border border-border">
                                <div className="space-y-1">
                                    <h4 className="font-black text-text">Siparişi Anında Yazdır</h4>
                                    <p className="text-[11px] font-bold text-text-light">
                                        Yeni sipariş düştüğü an mutfak yazıcısına otomatik fiş gönderir.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={info.autoPrint} onChange={() => setInfo({ ...info, autoPrint: !info.autoPrint })} className="sr-only peer" />
                                    <div className="w-14 h-7 bg-background-alt peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border shadow-inner"></div>
                                </label>
                            </div>

                            <div className="flex flex-col gap-6 p-8 bg-background-alt/50 rounded-[2.5rem] border border-border">
                                <div>
                                    <h4 className="font-black text-text">Termal Yazıcı Tipi</h4>
                                    <p className="text-[11px] font-bold text-text-light">Mutfak yazıcınızın kağıt genişliğine göre seçim yapın.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: '80mm', label: '80mm (Standart)', desc: 'Geniş fiş yapısı' },
                                        { id: '58mm', label: '58mm (Dar)', desc: 'Kompakt rulo yapısı' }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setInfo({ ...info, printerType: type.id })}
                                            className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-2 ${info.printerType === type.id ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' : 'bg-surface border-transparent opacity-60'}`}
                                        >
                                            <span className="text-sm font-black text-text">{type.label}</span>
                                            <span className="text-[9px] font-bold text-text-light uppercase tracking-tighter italic">{type.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: CONTROLS */}
                <div className="lg:col-span-4 space-y-8">



                    {/* Progress Chart / Info Card */}
                    <div className="bg-gradient-to-br from-primary to-purple-600 rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                        <h4 className="text-lg font-black tracking-tight mb-2">Profil Doluluğu</h4>
                        <div className="h-2 w-full bg-white/20 rounded-full mb-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-1000" style={{ width: '85%' }}></div>
                        </div>
                        <p className="text-[11px] font-bold opacity-80 leading-relaxed italic">
                            Daha iyi görünürlük için tüm çalışma saatlerini ve ürün görsellerini güncel tutun!
                        </p>
                    </div>

                    {/* Floating Save Button inside Sticky Area */}
                    <button
                        onClick={saveSettings}
                        className="w-full py-6 bg-primary text-white font-black rounded-[2.5rem] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 border-b-4 border-black/20"
                    >
                        <span>💾</span> Değişiklikleri Kaydet
                    </button>

                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
