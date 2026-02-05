'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DataStore, { Address, Order, User, Restaurant, UserCoupon } from '@/lib/dataStore';
import Toast from '../components/Toast';
import { ALL_LOCATIONS } from '@/lib/locations';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'coupons' | 'favorites'>('orders');
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [showAddrModal, setShowAddrModal] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [newAddr, setNewAddr] = useState({
        title: '',
        neighborhood: '',
        street: '',
        building: '',
        floor: '',
        apartment: '',
        icon: '🏠'
    });
    const [orders, setOrders] = useState<Order[]>([]);
    const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
    const [favorites, setFavorites] = useState<Restaurant[]>([]);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsForm, setSettingsForm] = useState({ name: '', surname: '', phone: '', email: '', password: '', newPassword: '' });

    useEffect(() => {
        const storedUser = localStorage.getItem('yemekya_user');
        if (!storedUser) {
            router.push('/login');
        } else {
            setUser(JSON.parse(storedUser));
        }

        const storedAddresses = localStorage.getItem('yemekya_addresses');
        if (storedAddresses) {
            setAddresses(JSON.parse(storedAddresses));
        } else {
            setAddresses([]);
            localStorage.setItem('yemekya_addresses', JSON.stringify([]));
        }

        const sync = async () => {
            const store = DataStore.getInstance();
            const uStr = localStorage.getItem('yemekya_user') || '{}';
            const u = JSON.parse(uStr);
            const userId = u.id || u.email;
            if (!userId) return;

            const [myOrders, myCoupons, allRestaurants] = await Promise.all([
                store.getOrdersByUserId(userId),
                store.getUserCoupons(u.name),
                store.getRestaurants()
            ]);

            setOrders(myOrders);
            setUserCoupons(myCoupons);

            if (u.favorites) {
                setFavorites(allRestaurants.filter(r => u.favorites.includes(r.id)));
            }

            setUser(u);
            setSettingsForm({
                name: u.name || '',
                surname: u.surname || '',
                phone: u.phone || '',
                email: u.email || '',
                password: '',
                newPassword: ''
            });
        };

        if (storedUser) {
            sync();
        }

        window.addEventListener('storage', sync);
        window.addEventListener('coupons-update', sync);
        window.addEventListener('restaurant-update', sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener('coupons-update', sync);
            window.removeEventListener('restaurant-update', sync);
        };
    }, [router]);

    const setActiveAddress = (id: string | number) => {
        const updated = addresses.map((a: Address) => ({ ...a, isActive: a.id === id }));
        setAddresses(updated);
        localStorage.setItem('yemekya_addresses', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
    };

    const addAddress = () => {
        if (!newAddr.title || !newAddr.neighborhood || !newAddr.street || !newAddr.building) return;

        const detail = `${newAddr.neighborhood} Mah. ${newAddr.street} No: ${newAddr.building} Kat: ${newAddr.floor} D: ${newAddr.apartment}`;
        const updated = [...addresses.map((a: Address) => ({ ...a, isActive: false })), {
            ...newAddr,
            detail,
            id: Date.now(),
            isActive: true
        } as unknown as Address];

        setAddresses(updated);
        localStorage.setItem('yemekya_addresses', JSON.stringify(updated));
        setShowAddrModal(false);
        setNewAddr({ title: '', neighborhood: '', street: '', building: '', floor: '', apartment: '', icon: '🏠' });
        window.dispatchEvent(new Event('storage'));
    };

    const deleteAddress = (id: string | number) => {
        const updated = addresses.filter((a: Address) => a.id !== id);
        if (updated.length > 0 && !updated.find((a: Address) => a.isActive)) {
            updated[0].isActive = true;
        }
        setAddresses(updated);
        localStorage.setItem('yemekya_addresses', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
    };

    const handleReorder = async (order: Order) => {
        const store = DataStore.getInstance();
        const allRes = await store.getRestaurants();

        let foundRes: Restaurant | null = null;
        if (order.restaurantId) {
            foundRes = await store.getRestaurant(order.restaurantId);
        } else if ((order as any).restaurantName) {
            foundRes = allRes.find((r: any) => r.name === (order as any).restaurantName) || null;
        }

        if (!foundRes) {
            setToast({ message: "Bu restoran artık hizmet vermiyor.", type: "error" });
            return;
        }

        const currentHour = new Date().getHours();
        const isOpen = currentHour >= (foundRes.openTime || 9) && currentHour < (foundRes.closeTime || 23);

        if (!isOpen) {
            setToast({ message: `Sipariş tekrarlanamadı. ${foundRes.name} şu an kapalı, lütfen daha sonra tekrar deneyin. 😴`, type: "error" });
            return;
        }

        const checkoutData = {
            restaurant: {
                id: foundRes.id,
                name: foundRes.name,
                img: foundRes.img,
                minBasket: foundRes.minBasket || 200
            },
            items: order.items,
            total: order.total
        };
        localStorage.setItem('yemekya_checkout', JSON.stringify(checkoutData));
        router.push(`/restaurant/${foundRes.id}`);
    };

    const handleUpdateSettings = async () => {
        if (!user) return;
        const store = DataStore.getInstance();

        const updates: Partial<User> = {
            name: settingsForm.name,
            surname: settingsForm.surname,
            phone: settingsForm.phone
        };

        if (settingsForm.newPassword) {
            updates.password = settingsForm.newPassword;
        }

        await store.updateUser(user.email, updates);
        setToast({ message: 'Profil başarıyla güncellendi.', type: 'success' });
        setShowSettingsModal(false);
        window.dispatchEvent(new Event('storage'));
    };

    const removeFavorite = async (restaurantId: string) => {
        if (!user) return;
        const store = DataStore.getInstance();
        const newFavorites = (user.favorites || []).filter(id => id !== restaurantId);
        await store.updateUser(user.email, { favorites: newFavorites });
        setToast({ message: 'Favorilerden kaldırıldı.', type: 'info' });
        window.dispatchEvent(new Event('storage'));
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background font-sans">
            {/* Header */}
            <header className="bg-surface border-b border-gray-100 shadow-sm h-16 md:h-20 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-full flex items-center justify-between">
                    <Link href="/" className="font-extrabold text-2xl text-primary tracking-tighter">YemekYa</Link>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end leading-none">
                            <span className="text-[10px] font-black text-text-light uppercase tracking-wider">Profilim</span>
                            <span className="text-xs font-black text-primary">{user.name} {user.surname}</span>
                        </div>
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="w-10 h-10 bg-background-alt border border-border rounded-full flex items-center justify-center text-lg hover:bg-primary/10 transition-colors"
                        >
                            ⚙️
                        </button>
                        <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                            {user.name[0]}
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Sidebar Tabs */}
                    <aside className="w-full lg:w-72 shrink-0">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden p-4 space-y-2 sticky top-28">
                            {[
                                { id: 'orders', label: 'Siparişlerim', icon: '🛍️' },
                                { id: 'favorites', label: 'Favorilerim', icon: '❤️' },
                                { id: 'addresses', label: 'Adreslerim', icon: '📍' },
                                { id: 'coupons', label: 'Kuponlarım', icon: '🎟️' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-black text-sm transition-all
                                        ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'text-text-light hover:bg-background-alt'}`}
                                >
                                    <span className="text-xl">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                            <button
                                onClick={() => { localStorage.removeItem('yemekya_user'); router.push('/'); }}
                                className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-black text-sm text-red-500 hover:bg-red-50 transition-all"
                            >
                                <span className="text-xl">🚪</span>
                                Çıkış Yap
                            </button>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <section className="flex-1">

                        {/* ORDERS TAB */}
                        {activeTab === 'orders' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h1 className="text-3xl font-black text-primary flex items-center gap-3">
                                    Siparişlerim
                                    <span className="bg-primary/5 text-primary text-xs px-3 py-1 rounded-full">{orders.length}</span>
                                </h1>
                                <div className="space-y-4">
                                    {orders.map((order: Order) => (
                                        <div key={order.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-6 overflow-hidden relative">
                                            <div className="absolute top-0 right-0 p-4 bg-green-50 text-green-600 font-black text-[10px] uppercase tracking-widest rounded-bl-2xl">
                                                {order.status}
                                            </div>
                                            <div className="space-y-4 flex-1">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-background-alt rounded-2xl flex items-center justify-center text-3xl">🍔</div>
                                                    <div>
                                                        <h3 className="font-black text-text text-lg leading-none">{order.restaurantName}</h3>
                                                        <span className="text-xs font-bold text-text-light">{new Date(order.date).toLocaleDateString('tr-TR')} • {order.id}</span>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-bold text-text-light italic">"{order.items.map(i => i.name).join(', ')}"</p>
                                            </div>
                                            <div className="flex flex-col md:items-end justify-center gap-2">
                                                <span className="text-2xl font-black text-primary">{order.total} TL</span>
                                                <button
                                                    onClick={() => handleReorder(order)}
                                                    className="bg-background-alt text-text font-black text-xs py-2 px-6 rounded-full hover:bg-primary hover:text-white transition-all"
                                                >
                                                    Siparişi Tekrarla
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FAVORITES TAB */}
                        {activeTab === 'favorites' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h1 className="text-3xl font-black text-primary">Favorilerim</h1>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {favorites.length > 0 ? favorites.map((res) => (
                                        <div key={res.id} className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
                                            <div className="h-40 relative">
                                                <img src={res.img} alt={res.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                                <button
                                                    onClick={() => removeFavorite(res.id)}
                                                    className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                                >
                                                    ❤️
                                                </button>
                                            </div>
                                            <div className="p-6">
                                                <h3 className="text-xl font-black text-text">{res.name}</h3>
                                                <p className="text-sm font-bold text-text-light">{Array.isArray(res.tags) ? res.tags.join(', ') : res.tags}</p>
                                                <div className="mt-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-orange-500 font-black">⭐ {res.rating}</span>
                                                        <span className="text-text-light text-xs font-bold">• {res.time}</span>
                                                    </div>
                                                    <Link href={`/restaurant/${res.id}`} className="bg-primary/10 text-primary px-6 py-2 rounded-full text-xs font-black hover:bg-primary hover:text-white transition-all">Sipariş Ver</Link>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-20 text-center col-span-full space-y-4 bg-background-alt rounded-[3rem] border-2 border-dashed border-border">
                                            <span className="text-6xl block">💔</span>
                                            <p className="text-sm font-black text-text-light uppercase tracking-widest">Henüz favori restoranınız bulunmuyor.</p>
                                            <Link href="/" className="inline-block bg-primary text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">Keşfetmeye Başla</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ADDRESSES TAB */}
                        {activeTab === 'addresses' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex justify-between items-center">
                                    <h1 className="text-3xl font-black text-primary">Adreslerim</h1>
                                    <button onClick={() => setShowAddrModal(true)} className="bg-primary text-white font-black text-xs px-6 py-3 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all">+ Yeni Adres</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {addresses.map((addr: Address, i: number) => (
                                        <div
                                            key={i}
                                            onClick={() => setActiveAddress(addr.id)}
                                            className={`bg-white border-2 rounded-[2rem] p-7 shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer
                                                ${addr.isActive ? 'border-primary' : 'border-gray-100'}`}
                                        >
                                            {addr.isActive && <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">Aktif Adres</div>}
                                            <div className="flex items-center gap-4 mb-3">
                                                <span className="text-3xl">{addr.icon}</span>
                                                <h3 className="font-black text-text text-lg">{addr.title}</h3>
                                            </div>
                                            <p className="text-sm font-bold text-text-light leading-relaxed">{addr.detail}</p>
                                            <div className="flex gap-4 mt-6">
                                                <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Düzenle</button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteAddress(addr.id); }}
                                                    className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                                >
                                                    Sil
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* COUPONS TAB */}
                        {activeTab === 'coupons' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h1 className="text-3xl font-black text-primary">Kuponlarım</h1>
                                <div className="grid grid-cols-1 gap-6">
                                    {userCoupons.length > 0 ? userCoupons.map((coupon, i) => (
                                        <div key={coupon.id} className={`bg-gradient-to-r ${coupon.isUsed ? 'from-slate-400 to-slate-500 opacity-60' : 'from-emerald-400 to-emerald-600'} rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group`}>
                                            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
                                            <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
                                                <div className="text-center md:text-left space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-2xl font-black uppercase tracking-tight">{coupon.name}</h3>
                                                        {coupon.isUsed && (
                                                            <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Kullanıldı</span>
                                                        )}
                                                    </div>
                                                    <p className="text-white/80 font-bold text-sm max-w-sm">
                                                        {new Date(coupon.date).toLocaleDateString('tr-TR')} tarihinde kazanıldı. Ödeme adımında sepetine uygulayabilirsin.
                                                    </p>
                                                </div>
                                                <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-4 text-center min-w-[180px]">
                                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1">Kupon ID</span>
                                                    <span className="text-2xl font-black tracking-widest">{coupon.id.split('-')[1] || coupon.id}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-20 text-center space-y-4 bg-background-alt rounded-[3rem] border-2 border-dashed border-border">
                                            <span className="text-6xl block">🎟️</span>
                                            <p className="text-sm font-black text-text-light uppercase tracking-widest">Henüz kuponunuz bulunmuyor.</p>
                                            <Link href="/market" className="inline-block bg-primary text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">Market'e Göz At</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </section>
                </div>
            </main>

            {/* NEW ADDRESS MODAL */}
            {showAddrModal && (
                <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg p-8 shadow-2xl animate-scaleIn">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-primary">Yeni Adres Ekle</h2>
                            <button onClick={() => setShowAddrModal(false)} className="w-10 h-10 bg-background-alt rounded-full flex items-center justify-center text-text-light hover:text-red-500 transition-colors">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3 mb-2">
                                {['🏠', '🏢', '📍'].map(icon => (
                                    <button
                                        key={icon}
                                        onClick={() => setNewAddr({ ...newAddr, icon })}
                                        className={`py-4 rounded-2xl text-2xl border-2 transition-all ${newAddr.icon === icon ? 'border-primary bg-primary/5' : 'border-background-alt hover:border-primary/20'}`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Adres Başlığı</label>
                                <input
                                    type="text"
                                    value={newAddr.title}
                                    onChange={(e) => setNewAddr({ ...newAddr, title: e.target.value })}
                                    placeholder="Örn: Evim, İş Yerim"
                                    className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Mahalle</label>
                                <select
                                    value={newAddr.neighborhood}
                                    onChange={(e) => setNewAddr({ ...newAddr, neighborhood: e.target.value })}
                                    className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none appearance-none transition-all"
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

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Sokak / Cadde</label>
                                <input
                                    type="text"
                                    value={newAddr.street}
                                    onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                                    placeholder="Örn: Atakan Sokak"
                                    className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Bina</label>
                                    <input
                                        type="text"
                                        value={newAddr.building}
                                        onChange={(e) => setNewAddr({ ...newAddr, building: e.target.value })}
                                        placeholder="No: 12"
                                        className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-4 text-sm font-bold focus:border-primary/20 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Kat</label>
                                    <input
                                        type="text"
                                        value={newAddr.floor}
                                        onChange={(e) => setNewAddr({ ...newAddr, floor: e.target.value })}
                                        placeholder="Kat: 3"
                                        className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-4 text-sm font-bold focus:border-primary/20 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Daire</label>
                                    <input
                                        type="text"
                                        value={newAddr.apartment}
                                        onChange={(e) => setNewAddr({ ...newAddr, apartment: e.target.value })}
                                        placeholder="D: 8"
                                        className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-4 text-sm font-bold focus:border-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={addAddress}
                                className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                            >
                                Adresi Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SETTINGS MODAL */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-primary/20 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-scaleUp">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-primary uppercase tracking-tighter">Profil Ayarları</h2>
                            <button onClick={() => setShowSettingsModal(false)} className="w-10 h-10 bg-background-alt rounded-full flex items-center justify-center text-text-light hover:text-red-500 transition-colors">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Ad</label>
                                    <input
                                        type="text"
                                        value={settingsForm.name}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                                        className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Soyad</label>
                                    <input
                                        type="text"
                                        value={settingsForm.surname}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, surname: e.target.value })}
                                        className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Telefon</label>
                                <input
                                    type="text"
                                    value={settingsForm.phone}
                                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                                    className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none"
                                />
                            </div>

                            <div className="border-t border-dashed border-border pt-6 mt-6">
                                <h4 className="text-xs font-black text-text uppercase tracking-widest mb-4">Şifre Değiştir</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Yeni Şifre</label>
                                        <input
                                            type="password"
                                            value={settingsForm.newPassword}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full bg-background-alt border-2 border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateSettings}
                                className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                            >
                                Değişiklikleri Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
