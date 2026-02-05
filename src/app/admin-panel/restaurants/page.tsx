'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';
import { useTheme } from '../../components/ThemeProvider';
import Link from 'next/link';
import DataStore, { Restaurant as DSRestaurant, Application } from '@/lib/dataStore';
import { ALL_LOCATIONS } from '@/lib/locations';
import { CUISINES } from '@/lib/cuisines';


interface Restaurant {
    id: string;
    name: string;
    address: string;
    phone: string;
    status: 'open' | 'busy' | 'closed';
    category: string;
    joinedAt: string;
    totalOrders: number;
    rating: string;
    authorizedPerson?: string;
    neighborhood?: string;
    managerEmail?: string;
    managerPassword?: string;
}

// Replaced by DataStore.Application

export default function AdminRestaurantsPage() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showAppsModal, setShowAppsModal] = useState(false);
    const [apps, setApps] = useState<Application[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [commissions, setCommissions] = useState<Record<string, any>>({});
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [formData, setFormData] = useState<Partial<Restaurant>>({
        name: '',
        address: '',
        phone: '',
        status: 'closed',
        category: CUISINES[0].name,
        authorizedPerson: '',
        neighborhood: '100. Yıl Mahallesi',
        managerEmail: '',
        managerPassword: ''
    });

    const loadData = async () => {
        const dataStore = DataStore.getInstance();
        const data = await dataStore.getRestaurants();
        setRestaurants(data);

        // Load Commissions for each restaurant
        const commObj: Record<string, any> = {};
        for (const res of data) {
            commObj[res.id] = await dataStore.getRestaurantCommission(res.id);
        }
        setCommissions(commObj);

        // Load Applications
        const applications = await dataStore.getApplications();
        setApps(applications);
    };

    const handleMarkPaid = async (resId: string) => {
        const dataStore = DataStore.getInstance();
        await dataStore.markRestaurantCommissionsPaid(resId);
        setToast({ message: 'Komisyon ödemesi başarıyla alındı olarak işaretlendi.', type: 'success' });
        await loadData();
    };

    useEffect(() => {
        loadData();
        window.addEventListener('storage', loadData);
        window.addEventListener('restaurant-update', loadData);
        return () => {
            window.removeEventListener('storage', loadData);
            window.removeEventListener('restaurant-update', loadData);
        };
    }, []);

    const handleApplicationAction = async (appId: string, action: 'APPROVED' | 'REJECTED') => {
        const dataStore = DataStore.getInstance();
        const application = apps.find(a => a.id === appId);
        if (!application) return;

        await dataStore.updateApplicationStatus(appId, action);

        // local state update for UI
        setApps(apps.map(a => a.id === appId ? { ...a, status: action } : a));

        if (action === 'APPROVED') {
            const newRestId = Math.random().toString(36).substr(2, 9);

            const newRestaurantData: any = {
                id: newRestId,
                name: application.restaurantName,
                address: 'Adres bekliyor...',
                phone: application.phone,
                status: 'closed',
                tags: application.cuisine || 'Yeni Restoran',
                img: '🏪',
                time: '30-40 dk',
                minBasket: 150,
                commission: 15,
                deliveryFee: 0,
                totalOrders: 0,
                rating: '0.0',
                revenue: 0,
                menu: []
            };

            await dataStore.addRestaurant(newRestaurantData);

            // Update user role efficiently via DataStore
            await dataStore.updateUser(application.email, {
                role: 'restaurant_manager',
                restaurantId: newRestId,
                restaurantName: application.restaurantName
            });

            setToast({ message: `${application.restaurantName} onaylandı!`, type: 'success' });
            window.dispatchEvent(new Event('restaurant-update'));
        } else {
            setToast({ message: 'Başvuru reddedildi.', type: 'info' });
        }
    };

    const handleSave = async () => {
        // Form Validation - Tüm alanlar zorunlu
        if (!formData.name || !formData.category || !formData.authorizedPerson ||
            !formData.phone || !formData.neighborhood || !formData.address ||
            !formData.managerEmail || !formData.managerPassword) {
            alert('Lütfen tüm zorunlu alanları doldurunuz!');
            return;
        }

        const dataStore = DataStore.getInstance();

        if (isEditing) {
            await dataStore.updateRestaurant(isEditing, formData);
        } else {
            await dataStore.addRestaurant({
                name: formData.name!,
                address: formData.address || '',
                phone: formData.phone || '',
                status: 'closed', // Otomatik kapalı düşsün
                tags: formData.category || 'Diğer',
                img: '🏪',
                time: '30-40 dk',
                minBasket: 200,
                commission: 15,
                authorizedPerson: formData.authorizedPerson,
                neighborhood: formData.neighborhood,
                managerEmail: formData.managerEmail,
                managerPassword: formData.managerPassword
            });
        }

        window.dispatchEvent(new Event('restaurant-update'));
        setShowModal(false);
        setIsEditing(null);
        setFormData({
            name: '', address: '', phone: '', status: 'closed', category: CUISINES[0].name,
            authorizedPerson: '', neighborhood: '100. Yıl Mahallesi', managerEmail: '', managerPassword: ''
        });
    };

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

    const initiateDelete = (id: string) => {
        setConfirmConfig({ isOpen: true, id });
    };

    const performDelete = async () => {
        if (confirmConfig.id) {
            // Need to implement delete in DataStore or do manual supabase call
            // For now, let's keep it simple or implement in DataStore
            const { supabase } = await import('@/lib/supabase');
            await supabase.from('restaurants').delete().eq('id', confirmConfig.id);
            window.dispatchEvent(new Event('restaurant-update'));
        }
        setConfirmConfig({ isOpen: false, id: null });
    };

    const filtered = restaurants.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-10 animate-fadeIn pb-12">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tighter uppercase tracking-wider`}>Restoran Yönetimi</h1>
                    <p className={`${isDark ? 'text-white/40' : 'text-gray-500'} font-bold uppercase text-[10px] tracking-widest mt-1`}>Platformdaki tüm işletmeleri denetle ve yenilerini ekle.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={() => setShowAppsModal(true)}
                        className={`px-8 py-4 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-700 shadow-sm'} font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-3 relative hover:bg-primary/5 transition-all border group`}
                    >
                        <span>📩</span> Başvurular
                        {apps.filter(a => a.status === 'PENDING').length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#07070a] animate-bounce"></span>
                        )}
                    </button>

                    <button
                        onClick={() => { setIsEditing(null); setFormData({ name: '', address: '', phone: '', status: 'open', category: CUISINES[0].name, authorizedPerson: '', neighborhood: '100. Yıl Mahallesi', managerEmail: '', managerPassword: '' }); setShowModal(true); }}
                        className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center gap-3"
                    >
                        <span>🏪</span> Yeni Restoran Ekle
                    </button>
                </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="relative group">
                <input
                    type="text"
                    placeholder="Restoran adı veya kategori ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#0c0c14] text-white border-white/5' : 'bg-white text-gray-900 border-gray-200'} border rounded-[2.5rem] py-6 px-12 text-sm font-bold outline-none focus:border-indigo-500/50 shadow-2xl transition-all`}
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-30">🔍</span>
            </div>

            {/* RESTAURANTS TABLE */}
            <div className={`${isDark ? 'bg-[#0c0c14] border-white/5' : 'bg-white border-gray-200 shadow-xl'} rounded-[3rem] border overflow-hidden shadow-2xl`}>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'} border-b`}>
                                <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-[0.2em]`}>Restoran Bilgisi</th>
                                <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-[0.2em]`}>Kategori</th>
                                <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-[0.2em]`}>Finansal Durum (Haftalık)</th>
                                <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-[0.2em]`}>Durum</th>
                                <th className={`px-10 py-6 text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} uppercase tracking-[0.2em]`}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map((r) => {
                                const comm = commissions[r.id] || { grossRevenue: 0, couponsUsed: 0, pendingCommission: 0 };
                                return (
                                    <tr
                                        key={r.id}
                                        className="group hover:bg-white/3 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/admin-panel/restaurants/${r.id}`)}
                                    >
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl border border-indigo-500/20 group-hover:scale-110 transition-transform">🏪</div>
                                                <div>
                                                    <h4 className={`text-[13px] font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>{r.name}</h4>
                                                    <p className={`text-[9px] font-black text-primary/50 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md inline-block mt-1`}>ID: {r.id}</p>
                                                    <p className={`text-[11px] font-bold ${isDark ? 'text-white/30' : 'text-gray-500'} mt-1`}>{r.address}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] font-black text-indigo-400">⭐ {r.rating}</span>
                                                        <span className={`${isDark ? 'text-white/10' : 'text-gray-200'}`}>•</span>
                                                        <span className={`text-[10px] font-bold ${isDark ? 'text-white/20' : 'text-gray-400'}`}>Kayıt: {r.joinedAt}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className={`px-5 py-2.5 ${isDark ? 'bg-white/5 border-white/5 text-white/40' : 'bg-gray-100 border-gray-200 text-gray-600'} rounded-xl text-[10px] font-black uppercase tracking-widest border`}>{r.category}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between text-[10px] font-bold">
                                                    <span className="text-gray-400 uppercase">Ciro:</span>
                                                    <span className={isDark ? 'text-white' : 'text-gray-900'}>{comm.grossRevenue.toFixed(2)} TL</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] font-bold">
                                                    <span className="text-gray-400 uppercase">Kupon:</span>
                                                    <span className="text-red-400">-{comm.couponsUsed.toFixed(2)} TL</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Net Komisyon:</span>
                                                    <span className={`text-xs font-black ${comm.pendingCommission > 0 ? 'text-green-400' : 'text-gray-500'}`}>{comm.pendingCommission.toFixed(2)} TL</span>
                                                </div>
                                                {comm.pendingCommission > 0 && (
                                                    <>
                                                        <Link
                                                            href={`/admin-panel/invoices?resId=${r.id}`}
                                                            className="text-[8px] font-black text-indigo-400 uppercase tracking-widest hover:underline mb-2 block text-center"
                                                        >
                                                            Haftalık Detayları Gör
                                                        </Link>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkPaid(r.id);
                                                            }}
                                                            className="mt-2 w-full py-2 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                                                        >
                                                            Tümünü Ödendi İşaretle
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const statuses: ('open' | 'busy' | 'closed')[] = ['open', 'busy', 'closed'];
                                                    const next = statuses[(statuses.indexOf(r.status) + 1) % statuses.length];
                                                    const dataStore = DataStore.getInstance();
                                                    dataStore.updateRestaurant(r.id, { status: next });
                                                }}
                                                className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border transition-all hover:scale-105 active:scale-95 ${r.status === 'open' ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white' :
                                                    r.status === 'busy' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white' :
                                                        'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                                                    }`}
                                                title="Durumu değiştirmek için tıkla"
                                            >
                                                {r.status === 'open' ? 'Açık' : r.status === 'busy' ? 'Yoğun' : 'Kapalı'}
                                            </button>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsEditing(r.id);
                                                        setFormData(r);
                                                        setShowModal(true);
                                                    }}
                                                    className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        initiateDelete(r.id);
                                                    }}
                                                    className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT/ADD MODAL */}
            {
                showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-2xl bg-black/80 animate-fadeIn">
                        <div className={`${isDark ? 'bg-surface border-white/10' : 'bg-white border-gray-100 shadow-2xl'} w-full max-w-2xl rounded-[3rem] border p-0 animate-scaleUp overflow-hidden max-h-[95vh] flex flex-col`}>

                            {/* Modal Header - Sticky */}
                            <div className={`p-8 md:p-10 border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50/50'} flex justify-between items-center shrink-0`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/20">
                                        {isEditing ? '✏️' : '🏪'}
                                    </div>
                                    <div>
                                        <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tighter uppercase`}>
                                            {isEditing ? 'İşletmeyi Güncelle' : 'Yeni İşletme Kaydı'}
                                        </h3>
                                        <p className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} tracking-[0.2em] uppercase mt-1`}>
                                            Tüm yıldızlı (*) alanlar zorunludur.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className={`w-12 h-12 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-gray-100 shadow-sm'} rounded-2xl flex items-center justify-center text-xl transition-all border ${isDark ? 'border-white/5' : 'border-gray-200'}`}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Modal Body - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 no-scrollbar">

                                {/* SECTION 1: GENEL BİLGİLER */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-lg">📋</span>
                                        <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Genel Bilgiler</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>Restoran Adı *</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">🏷️</span>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className={`w-full ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all placeholder:text-gray-400`}
                                                    placeholder="Örn: Lezzet Durağı"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>Mutfak Türü *</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">🍕</span>
                                                <select
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                    className={`w-full ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all appearance-none cursor-pointer`}
                                                >
                                                    {CUISINES.map(c => (
                                                        <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 2: İLETİŞİM & LOKASYON */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-lg">📍</span>
                                        <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>İletişim & Lokasyon</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>Yetkili İsim *</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">👤</span>
                                                <input
                                                    type="text"
                                                    value={formData.authorizedPerson}
                                                    onChange={e => setFormData({ ...formData, authorizedPerson: e.target.value })}
                                                    className={`w-full ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all placeholder:text-gray-400`}
                                                    placeholder="İsim Soyisim"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>Telefon *</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">📞</span>
                                                <input
                                                    type="text"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    className={`w-full ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all placeholder:text-gray-400`}
                                                    placeholder="05XX XXX XX XX"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>Mahalle *</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">🏘️</span>
                                                <select
                                                    value={formData.neighborhood}
                                                    onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                                                    className={`w-full ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all appearance-none cursor-pointer`}
                                                >
                                                    {ALL_LOCATIONS.map(loc => (
                                                        <optgroup key={loc.city} label={loc.city}>
                                                            {loc.neighborhoods.map(nw => (
                                                                <option key={nw} value={nw}>{nw}</option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>Aktif Durum</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">⚡</span>
                                                <select
                                                    value={formData.status}
                                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                                    className={`w-full ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all appearance-none cursor-pointer`}
                                                >
                                                    <option value="closed">Kapalı / Hizmet Dışı</option>
                                                    <option value="open">Aktif / Açık</option>
                                                    <option value="busy">Mutfak Yoğun</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>Tam Adres *</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-5 opacity-30 group-focus-within:opacity-100 transition-opacity">🏠</span>
                                                <textarea
                                                    rows={2}
                                                    value={formData.address}
                                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                    className={`w-full ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all resize-none placeholder:text-gray-400`}
                                                    placeholder="Mahalle, Cadde, Sokak No..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 3: HESAP BİLGİLERİ */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-lg">🔐</span>
                                        <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Hesap Bilgileri</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-500/5 p-6 md:p-8 rounded-[2rem] border border-indigo-500/10">
                                        <div className="space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>E-posta *</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">📧</span>
                                                <input
                                                    type="email"
                                                    value={formData.managerEmail}
                                                    onChange={e => setFormData({ ...formData, managerEmail: e.target.value })}
                                                    className={`w-full ${isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all placeholder:text-gray-400`}
                                                    placeholder="manager@restaurant.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-[10px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest ml-1`}>Şifre *</label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">🔑</span>
                                                <input
                                                    type="password"
                                                    value={formData.managerPassword}
                                                    onChange={e => setFormData({ ...formData, managerPassword: e.target.value })}
                                                    className={`w-full ${isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} focus:border-indigo-500/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold border outline-none transition-all placeholder:text-gray-400`}
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer - Sticky */}
                            <div className={`p-8 md:p-10 border-t ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50/50'} shrink-0`}>
                                <button
                                    onClick={handleSave}
                                    className="w-full py-6 bg-indigo-500 text-white font-black rounded-3xl text-sm uppercase tracking-widest shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                                >
                                    <span>{isEditing ? 'DEĞİŞİKLİKLERİ KAYDET' : 'MAĞAZAYI OLUŞTUR'}</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CONFIRM DELETE MODAL */}
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title="Restoranı Sil"
                message="Bu restoranı platformdan kaldırmak istediğinize emin misiniz? Tüm menü ve sipariş verileri kalıcı olarak silinecektir."
                onConfirm={performDelete}
                onCancel={() => setConfirmConfig({ isOpen: false, id: null })}
                confirmText="Evet, Sil"
                cancelText="Mühim Değil"
                type="danger"
            />

            {/* RESTAURANT APPLICATIONS MODAL */}
            {showAppsModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 backdrop-blur-2xl bg-black/80 animate-fadeIn">
                    <div className={`${isDark ? 'bg-surface border-white/10' : 'bg-white border-gray-100 shadow-2xl'} w-full max-w-4xl rounded-[3rem] border p-0 animate-scaleUp overflow-hidden max-h-[90vh] flex flex-col`}>
                        <div className={`p-8 md:p-10 border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50/50'} flex justify-between items-center shrink-0`}>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20">📩</div>
                                <div>
                                    <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tighter uppercase`}>İş Ortaklığı Başvuruları</h3>
                                    <p className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-400'} tracking-[0.2em] uppercase mt-1`}>
                                        Yeni işletme taleplerini bu ekrandan yönetebilirsiniz.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAppsModal(false)}
                                className={`w-12 h-12 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-gray-100 shadow-sm'} rounded-2xl flex items-center justify-center text-xl transition-all border ${isDark ? 'border-white/5' : 'border-gray-200'}`}
                            >✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-4 no-scrollbar">
                            {apps.filter(a => a.status === 'PENDING').length === 0 ? (
                                <div className="py-20 text-center opacity-30">
                                    <span className="text-6xl block mb-4">✨</span>
                                    <h3 className="text-xl font-black uppercase tracking-widest">Bekleyen Başvuru Yok</h3>
                                </div>
                            ) : (
                                apps.filter(a => a.status === 'PENDING').map(app => (
                                    <div key={app.id} className={`${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} p-8 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/20 transition-all group`}>
                                        <div className="flex items-center gap-6 flex-1 w-full">
                                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">🏪</div>
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>{app.restaurantName}</h4>
                                                    <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10">{app.cuisine || 'Genel'}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <span>👤 {app.ownerName}</span>
                                                    <span>📧 {app.email}</span>
                                                    <span>📞 {app.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button
                                                onClick={() => handleApplicationAction(app.id, 'REJECTED')}
                                                className="flex-1 md:flex-none px-6 py-4 bg-red-500/10 text-red-500 font-black rounded-2xl text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                            >Reddet</button>
                                            <button
                                                onClick={() => handleApplicationAction(app.id, 'APPROVED')}
                                                className="flex-1 md:flex-none px-8 py-4 bg-primary text-white font-black rounded-2xl text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                                            >Onayla & Kaydet</button>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* Show History section too? Keeping it simple for now as requested for a pop-up management UI */}
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div >
    );
}
