'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Toast from '../../components/Toast';
import DataStore, { Restaurant, Application } from '@/lib/dataStore';

// Replaced by DataStore.Application

export default function AdminApplicationsPage() {
    const [apps, setApps] = useState<Application[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    useEffect(() => {
        const loadApps = async () => {
            const dataStore = DataStore.getInstance();
            const applications = await dataStore.getApplications();
            setApps(applications);
        };
        loadApps();
        window.addEventListener('storage', loadApps);
        window.addEventListener('restaurant-update', loadApps);
        return () => {
            window.removeEventListener('storage', loadApps);
            window.removeEventListener('restaurant-update', loadApps);
        };
    }, []);

    const handleAction = async (appId: string, action: 'APPROVED' | 'REJECTED') => {
        const dataStore = DataStore.getInstance();
        const application = apps.find(a => a.id === appId);
        if (!application) return;

        await dataStore.updateApplicationStatus(appId, action);

        // Refresh local state
        const updatedApps = await dataStore.getApplications();
        setApps(updatedApps);

        if (action === 'APPROVED') {
            const newRestId = Math.random().toString(36).substr(2, 9);

            const newRestaurantData: Restaurant = {
                id: newRestId,
                name: application.restaurantName,
                address: application.address || 'Adres bekliyor...',
                phone: application.phone,
                status: 'closed',
                tags: application.cuisine || 'Yeni Restoran',
                time: '30-40 dk',
                minBasket: 150,
                img: '🏪',
                openTime: 9,
                closeTime: 23,
                commission: 15,
                deliveryFee: 0,
                totalOrders: 0,
                rating: '0.0',
                revenue: 0,
                menu: []
            };

            await dataStore.addRestaurant(newRestaurantData);

            await dataStore.updateUser(application.email, {
                role: 'restaurant_manager',
                restaurantId: newRestId,
                restaurantName: application.restaurantName
            });

            setToast({ message: `${application.restaurantName} başvurusu onaylandı!`, type: 'success' });
            window.dispatchEvent(new Event('restaurant-update'));
        } else {
            setToast({ message: 'Başvuru reddedildi.', type: 'info' });
        }
    };


    const filtered = apps.filter(a =>
        a.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fadeIn pb-12">

            {/* HEADER SECTION - Modern Light Theme */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Restoran Başvuruları</h1>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                            Platforma katılmak isteyen yeni işletmeleri yönetin
                        </p>
                    </div>

                    {/* SEARCH - Integrated inside header for cleaner look */}
                    <div className="relative w-full md:w-96 group">
                        <input
                            type="text"
                            placeholder="İşletme veya sahip adı ile ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-12 text-sm font-bold text-gray-900 outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                        />
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
                    </div>
                </div>
            </div>

            {/* APPLICATIONS LIST */}
            <div className="grid grid-cols-1 gap-4">
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-[3rem] border border-gray-100 p-24 text-center relative overflow-hidden group shadow-sm">
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 border border-gray-100 group-hover:scale-110 transition-transform duration-500">📩</div>
                            <h3 className="text-xl font-black text-gray-300 uppercase tracking-[0.2em]">Şu Anda Başvuru Yok</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">İş ortaklığı başvurusu geldiğinde burada görünecektir.</p>
                        </div>
                    </div>
                ) : (
                    filtered.map(app => (
                        <div key={app.id} className={`bg-white rounded-[2.5rem] border p-8 flex flex-col lg:flex-row items-center justify-between gap-8 transition-all relative overflow-hidden group ${app.status !== 'PENDING' ? 'opacity-60 border-gray-100 shadow-none' : 'border-gray-100 hover:border-primary/20 hover:shadow-xl'}`}>

                            <div className="flex items-center gap-8 flex-1">
                                <div className={`shrink-0 w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl group-hover:scale-110 transition-all shadow-inner ${app.status === 'PENDING' ? 'bg-primary/5 text-primary border border-primary/10' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                    🏪
                                </div>
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${app.status === 'PENDING' ? 'bg-amber-50 text-amber-500 border-amber-100' : app.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                            {app.status === 'PENDING' ? 'Beklemede' : app.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'}
                                        </span>
                                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{app.timestamp}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{app.restaurantName}</h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">İşletme Sahibi</span>
                                            <span className="text-xs font-bold text-gray-600">{app.ownerName}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">E-Posta</span>
                                            <span className="text-xs font-bold text-gray-600">{app.email}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Telefon</span>
                                            <span className="text-xs font-bold text-gray-600">{app.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {app.status === 'PENDING' ? (
                                <div className="flex items-center gap-3 shrink-0 relative z-10 w-full lg:w-auto">
                                    <button
                                        onClick={() => handleAction(app.id, 'REJECTED')}
                                        className="flex-1 lg:flex-none px-8 py-4 bg-gray-50 border border-gray-200 text-gray-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                                    >
                                        Reddet
                                    </button>
                                    <button
                                        onClick={() => handleAction(app.id, 'APPROVED')}
                                        className="flex-1 lg:flex-none px-10 py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Sisteme Kabul Et
                                    </button>
                                </div>
                            ) : (
                                <div className={`w-full lg:w-48 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center justify-center gap-3
                                    ${app.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}
                                `}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'APPROVED' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                    {app.status === 'APPROVED' ? 'Yayında' : 'Reddedildi'}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
