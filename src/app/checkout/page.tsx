'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '../components/ThemeProvider';
import Toast from '../components/Toast';
import { ALL_LOCATIONS } from '@/lib/locations';
import DataStore, { MarketItem, UserCoupon } from '@/lib/dataStore';

export default function CheckoutPage() {
    const { isDark, toggleTheme } = useTheme();
    const router = useRouter();
    const [step, setStep] = useState<'auth' | 'basket' | 'address' | 'payment' | 'success'>('auth');
    const [checkoutData, setCheckoutData] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [discount, setDiscount] = useState(0);
    const [appliedCoupon, setAppliedCoupon] = useState<UserCoupon | null>(null);
    const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);

    // Form States
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLocating, setIsLocating] = useState(false);
    const [addressInfo, setAddressInfo] = useState({
        name: '',
        surname: '',
        phone: '',
        neighborhood: '',
        street: '',
        building: '',
        floor: '',
        apartment: '',
        note: '',
        coords: null as { lat: number, lng: number } | null
    });

    // Address Selection States
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);

    // Auth States
    const [authData, setAuthData] = useState({
        name: '',
        surname: '',
        email: '',
        password: ''
    });

    const normalizeNeighborhood = (name: string) => {
        if (!name) return "";
        let clean = name.toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/mahallesi/g, '')
            .replace(/mahallesi\./g, '')
            .replace(/mah\./g, '')
            .replace(/mah/g, '')
            .replace(/\./g, '')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ü/g, 'u')
            .replace(/ğ/g, 'g')
            .replace(/ç/g, 'c')
            .trim();

        if (clean.includes('5000') || clean.includes('besbin')) return 'besbinevler';
        if (clean.includes('100 yil') || clean.includes('yuzuncu yil')) return '100yil';
        return clean;
    };

    useEffect(() => {
        const data = localStorage.getItem('yemekya_checkout');
        if (data) {
            setCheckoutData(JSON.parse(data));
        } else {
            router.push('/');
        }

        const storedUser = localStorage.getItem('yemekya_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setStep('basket');
            setAuthData(prev => ({ ...prev, ...user }));
            setAddressInfo(prev => ({ ...prev, name: user.name, surname: user.surname }));

            // Fetch user's coupons
            const loadCoupons = async () => {
                const ds = DataStore.getInstance();
                const coupons = await ds.getUserCoupons(user.name);
                setUserCoupons(coupons.filter(c => !c.isUsed));
            };
            loadCoupons();
        }

        const storedAddresses = localStorage.getItem('yemekya_addresses');
        if (storedAddresses) {
            const addrs = JSON.parse(storedAddresses);
            setSavedAddresses(addrs);
            const active = addrs.find((a: any) => a.isActive) || addrs[0];
            if (active) {
                setSelectedAddressId(active.id);
                setAddressInfo(prev => ({
                    ...prev,
                    neighborhood: active.neighborhood,
                    street: active.street,
                    building: active.building,
                    floor: active.floor,
                    apartment: active.apartment
                }));
            }
        } else {
            setShowNewAddressForm(true);
        }
    }, [router]);

    const selectSavedAddress = (addr: any) => {
        setSelectedAddressId(addr.id);
        setAddressInfo(prev => ({
            ...prev,
            neighborhood: addr.neighborhood,
            street: addr.street,
            building: addr.building,
            floor: addr.floor,
            apartment: addr.apartment
        }));
        setShowNewAddressForm(false);
    };

    const toggleCoupon = (coupon: UserCoupon) => {
        if (appliedCoupon?.id === coupon.id) {
            setAppliedCoupon(null);
            setDiscount(0);
            return;
        }

        if (checkoutData.total < 100) {
            setToast({ message: 'Kupon kullanabilmek için sepet tutarı en az 100 TL olmalıdır.', type: 'error' });
            return;
        }

        setAppliedCoupon(coupon);
        setDiscount(coupon.value);
        setToast({ message: `${coupon.value} TL indirim uygulandı!`, type: 'success' });
    };

    const handleNext = async () => {
        const newErrors: { [key: string]: string } = {};

        const finalTotal = Math.max(0, checkoutData.total - discount);

        // Minimum Sepet Tutarı Kontrolü
        const minAmount = checkoutData?.restaurant?.minBasket || 0;
        if (checkoutData.total < minAmount) {
            setToast({ message: `Üzgünüz, bu restoranın minimum paket tutarı ${minAmount} TL'dir. Sipariş vermek için sepetinize biraz daha lezzet eklemelisiniz.`, type: 'error' });
            return;
        }

        if (step === 'auth') {
            if (!authData.email.includes('@')) newErrors.email = 'Geçerli bir e-posta giriniz';
            if (authData.password.length < 6) newErrors.password = 'Şifre en az 6 karakter olmalı';
            if (authMode === 'signup') {
                if (!authData.name) newErrors.name = 'Ad gerekli';
                if (!authData.surname) newErrors.surname = 'Soyad gerekli';
            }

            if (Object.keys(newErrors).length === 0) {
                // Mock user for checkout session
                const newUser: any = {
                    id: `user_${Date.now()}`,
                    name: authData.name,
                    surname: authData.surname,
                    email: authData.email,
                    role: 'user',
                    isLoggedIn: true,
                    points: 0
                };
                localStorage.setItem('yemekya_user', JSON.stringify(newUser));
                setAddressInfo(prev => ({ ...prev, name: newUser.name, surname: newUser.surname }));
                window.dispatchEvent(new Event('storage'));
            }
        }
        else if (step === 'address') {
            // Otomatik kurtarma: Eğer ad/soyad state'te yoksa localStorage'dan çekmeye çalış
            if (!addressInfo.name || !addressInfo.surname) {
                const storedUser = localStorage.getItem('yemekya_user');
                if (storedUser) {
                    const u = JSON.parse(storedUser);
                    if (!addressInfo.name) addressInfo.name = u.name;
                    if (!addressInfo.surname) addressInfo.surname = u.surname;
                }
            }

            if (!addressInfo.name) newErrors.addr_name = 'Ad gerekli';
            if (!addressInfo.surname) newErrors.addr_surname = 'Soyad gerekli';
            if (!addressInfo.phone || addressInfo.phone.trim().length < 10) newErrors.addr_phone = 'Geçerli bir telefon giriniz';

            // Eğer yeni adres formu açıksa veya hiç kayıtlı adres yoksa detayları da kontrol et
            if (showNewAddressForm || savedAddresses.length === 0) {
                if (!addressInfo.neighborhood) newErrors.addr_neigh = 'Mahalle seçiniz';
                if (!addressInfo.street) newErrors.addr_street = 'Sokak giriniz';
                if (!addressInfo.building) newErrors.addr_build = 'Bina giriniz';
            } else if (!selectedAddressId) {
                newErrors.addr_select = 'Lütfen bir adres seçin';
            }

            // RESTORAN TESLİMAT BÖLGESİ KONTROLÜ
            if (addressInfo.neighborhood && checkoutData?.restaurant?.id) {
                const zoneKey = `yemekya_delivery_zones_${checkoutData.restaurant.id}`;
                const rawZones = localStorage.getItem(zoneKey);
                if (rawZones) {
                    const zones = JSON.parse(rawZones);
                    const normalizedUser = normalizeNeighborhood(addressInfo.neighborhood);
                    const currentZone = zones.find((z: any) => normalizeNeighborhood(z.neighborhood) === normalizedUser);

                    if (!currentZone || currentZone.status === 'Kapalı') {
                        newErrors.addr_neigh = `Üzgünüz, ${checkoutData.restaurant.name} şu an ${addressInfo.neighborhood} için hizmet vermiyor.`;
                    }
                }
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            const firstError = Object.values(newErrors)[0];
            setToast({ message: firstError, type: 'error' });
            return;
        }

        setErrors({});
        if (step === 'auth') setStep('basket');
        else if (step === 'basket') setStep('address');
        else if (step === 'address') setStep('payment');
        else if (step === 'payment') {
            const ds = DataStore.getInstance();
            const storedUser = localStorage.getItem('yemekya_user');
            const userObj = storedUser ? JSON.parse(storedUser) : null;

            const newOrder: any = {
                restaurantName: checkoutData.restaurant.name,
                restaurantId: checkoutData.restaurant.id,
                restaurantImg: checkoutData.restaurant.img,
                userId: userObj?.id || userObj?.email || 'guest',
                userName: `${addressInfo.name} ${addressInfo.surname}`,
                total: Math.max(0, checkoutData.total - discount),
                originalTotal: checkoutData.total,
                couponDiscount: discount,
                status: 'Yeni',
                isCommissionPaid: false,
                phone: addressInfo.phone,
                neighborhood: addressInfo.neighborhood,
                address: `${addressInfo.street} No:${addressInfo.building} Kat:${addressInfo.floor} D:${addressInfo.apartment}`,
                note: addressInfo.note,
                paymentMethod: paymentMethod === 'card' ? 'Kredi Kartı' : 'Nakit',
                items: checkoutData.items.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    note: item.note,
                    options: item.options
                }))
            };

            await ds.createOrder(newOrder);

            // 2. Ana sayfa için aktif sipariş olarak belirle
            localStorage.setItem('yemekya_active_order', JSON.stringify(newOrder));

            if (userObj) {
                const earnedPoints = Math.floor(checkoutData.total * 0.1);
                await ds.addUserPoint(userObj.email, earnedPoints);
            }

            // 4. Diğer tabların ve aynı tabdaki listenerların haberdar olması için EVENT tetikle
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('points-update'));

            // 5. Kuponu kullanıldı olarak işaretle
            if (appliedCoupon) {
                const store = DataStore.getInstance();
                const storedUser = localStorage.getItem('yemekya_user');
                const user = JSON.parse(storedUser || '{}');
                await store.markCouponAsUsed(user.name, appliedCoupon.id);
            }

            setStep('success');
            localStorage.removeItem('yemekya_checkout');
        }
    };

    if (!checkoutData) return null;

    return (
        <div className="min-h-screen bg-background font-sans">
            {/* Header */}
            <header className="bg-surface/80 backdrop-blur-xl border-b border-border shadow-sm h-16 md:h-20 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="font-extrabold text-2xl text-primary tracking-tighter">YemekYa</Link>

                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-background-alt border border-transparent hover:border-primary/20 transition-all ml-2"
                        >
                            {isDark ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                            )}
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        {[
                            { id: 'auth', label: 'Üyelik' },
                            { id: 'basket', label: 'Sepet' },
                            { id: 'address', label: 'Adres' },
                            { id: 'payment', label: 'Ödeme' }
                        ].map((s, i) => (
                            <div key={s.id} className="flex items-center gap-4">
                                <div className={`flex items-center gap-2 ${step === s.id ? 'text-primary' : 'text-text-light'}`}>
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-colors ${step === s.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'border-border'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="text-xs font-bold">{s.label}</span>
                                </div>
                                {i < 3 && <div className="w-8 h-px bg-border"></div>}
                            </div>
                        ))}
                    </div>

                    <div className="w-24"></div> {/* Balance spacer */}
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
                <div className="bg-surface rounded-[2.5rem] border border-border shadow-premium overflow-hidden min-h-[600px] flex flex-col lg:flex-row">

                    {/* Left Side: Dynamic Flow */}
                    <div className="flex-1 p-6 md:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-border">

                        {/* STEP 1: AUTH */}
                        {step === 'auth' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-black text-primary">Lezzet Kapında!</h1>
                                    <p className="text-text-light font-bold">Devam etmek için üye olman veya giriş yapman gerekiyor.</p>
                                </div>

                                <div className="flex bg-background-alt p-1.5 rounded-2xl border border-border">
                                    <button onClick={() => setAuthMode('login')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${authMode === 'login' ? 'bg-surface text-primary shadow-premium' : 'text-text-light hover:text-text'}`}>Giriş Yap</button>
                                    <button onClick={() => setAuthMode('signup')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${authMode === 'signup' ? 'bg-surface text-primary shadow-premium' : 'text-text-light hover:text-text'}`}>Üye Ol</button>
                                </div>

                                <div className="space-y-4">
                                    {authMode === 'signup' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Adın</label>
                                                <input type="text" value={authData.name} onChange={(e) => setAuthData({ ...authData, name: e.target.value })} placeholder="Can" className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.name ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Soyadın</label>
                                                <input type="text" value={authData.surname} onChange={(e) => setAuthData({ ...authData, surname: e.target.value })} placeholder="Yılmaz" className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.surname ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">E-posta Adresin</label>
                                        <input type="email" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} placeholder="can@yemekya.com" className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.email ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                        {errors.email && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Şifren</label>
                                        <input type="password" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} placeholder="••••••••" className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.password ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                        {errors.password && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.password}</p>}
                                    </div>
                                </div>

                                <button onClick={handleNext} className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    {authMode === 'login' ? 'Giriş Yap ve Devam Et' : 'Hesabımı Oluştur'}
                                </button>
                            </div>
                        )}

                        {/* STEP 2: BASKET REVIEW */}
                        {step === 'basket' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setStep('auth')} className="w-10 h-10 rounded-full bg-background-alt flex items-center justify-center hover:bg-primary/10 transition-all">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
                                    </button>
                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-black text-primary">Sipariş Özeti</h1>
                                        <p className="text-text-light font-bold">Lezzetlerin burada, her şey yolunda mı?</p>
                                    </div>
                                </div>

                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                    {checkoutData.items.map((item: any, i: number) => {
                                        const optionsTotal = item.options?.reduce((oa: any, oi: any) => oa + oi.price, 0) || 0;
                                        const unitPrice = item.price + optionsTotal;

                                        return (
                                            <div key={i} className="flex flex-col gap-2 p-4 bg-background-alt/50 rounded-2xl border border-border animate-fadeIn">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-3xl">{item.image}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-black text-text truncate">{item.name}</h4>
                                                        <span className="text-[10px] font-bold text-text-light uppercase tracking-wider">{item.quantity} Adet • Birim: {unitPrice} TL</span>
                                                        {item.options && item.options.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {item.options.map((opt: any, idx: number) => (
                                                                    <span key={idx} className="bg-primary/5 text-primary text-[9px] font-black px-1.5 py-0.5 rounded-md border border-primary/10">
                                                                        +{opt.name} ({opt.price} TL)
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {item.note && (
                                                            <p className="text-[9px] font-bold text-orange-500 mt-1">📝 {item.note}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-black text-primary">{unitPrice * item.quantity} TL</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {checkoutData.total < (checkoutData.restaurant.minBasket || 0) && (
                                    <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Minimum Tutara Ulaşılmadı</span>
                                            <span className="text-xs font-black text-orange-600">{checkoutData.total} / {checkoutData.restaurant.minBasket} TL</span>
                                        </div>
                                        <div className="h-1.5 bg-orange-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-500 transition-all duration-500"
                                                style={{ width: `${(checkoutData.total / checkoutData.restaurant.minBasket) * 100}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] font-bold text-orange-600/70 text-center uppercase">Devam etmek için {checkoutData.restaurant.minBasket - checkoutData.total} TL daha eklemelisiniz.</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Kuponlarımı Gör ({userCoupons.length})</label>
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {userCoupons.length > 0 ? (
                                            userCoupons.map((coupon) => (
                                                <button
                                                    key={coupon.id}
                                                    onClick={() => toggleCoupon(coupon)}
                                                    className={`shrink-0 min-w-[200px] p-4 rounded-2xl border-2 transition-all text-left ${appliedCoupon?.id === coupon.id ? 'border-primary bg-primary/5 shadow-premium' : 'border-background-alt bg-surface hover:border-primary/20'}`}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{coupon.name}</span>
                                                        <span className="text-[9px] font-bold text-text-light">{coupon.date} - Kullanıma Hazır</span>
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <span className="text-sm font-black text-text">{appliedCoupon?.id === coupon.id ? 'Uygulandı ✅' : 'Kullan'}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="w-full p-4 bg-background-alt rounded-2xl border-2 border-dashed border-border text-center">
                                                <p className="text-[10px] font-bold text-text-light uppercase tracking-widest">Kullanılabilir kuponunuz bulunmuyor.</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[9px] font-bold text-text-light italic">Market'ten kazandığın indirimleri burada görebilir ve tek tıkla kullanabilirsin. (Min: 100 TL)</p>
                                </div>

                                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                                    <p className="text-xs font-bold text-primary italic">“{checkoutData.restaurant.name}” hazırlamak için sabırsızlanıyor!</p>
                                </div>

                                <button onClick={handleNext} className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    Adres Bilgilerine Geç
                                </button>
                            </div>
                        )}

                        {/* STEP 3: ADDRESS */}
                        {step === 'address' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setStep('basket')} className="w-10 h-10 rounded-full bg-background-alt flex items-center justify-center hover:bg-primary/10 transition-all">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
                                    </button>
                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-black text-primary">Nereye Gönderelim?</h1>
                                        <p className="text-text-light font-bold">Kayıtlı adreslerinden birini seç veya yeni ekle.</p>
                                    </div>
                                </div>

                                {savedAddresses.length > 0 && !showNewAddressForm ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-3">
                                            {savedAddresses.map((addr) => (
                                                <button
                                                    key={addr.id}
                                                    onClick={() => selectSavedAddress(addr)}
                                                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${selectedAddressId === addr.id ? 'border-primary bg-primary/5 shadow-premium' : 'border-border bg-surface hover:border-primary/20 hover:shadow-premium'}`}
                                                >
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${selectedAddressId === addr.id ? 'bg-primary text-white' : 'bg-background-alt'}`}>
                                                        {addr.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`text-sm font-black ${selectedAddressId === addr.id ? 'text-primary' : 'text-text'}`}>{addr.title}</h4>
                                                        <p className="text-[11px] font-medium text-text-light truncate">
                                                            {addr.neighborhood} {addr.street} No:{addr.building} Kat:{addr.floor} D:{addr.apartment}
                                                        </p>
                                                    </div>
                                                    {selectedAddressId === addr.id && (
                                                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5" /></svg>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {errors.addr_select && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.addr_select}</p>}

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">İletişim Numarası (Teslimat için)</label>
                                            <input
                                                type="tel"
                                                value={addressInfo.phone}
                                                onChange={(e) => setAddressInfo({ ...addressInfo, phone: e.target.value })}
                                                placeholder="05XX XXX XX XX"
                                                className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.addr_phone ? 'border-red-200 bg-red-50' : 'border-background-alt'}`}
                                            />
                                            {errors.addr_phone && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.addr_phone}</p>}
                                        </div>

                                        <button
                                            onClick={() => setShowNewAddressForm(true)}
                                            className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-border text-text-light font-black text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                            Farklı Bir Adres Kullan
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Location Button */}
                                        <button
                                            onClick={() => {
                                                setIsLocating(true);
                                                navigator.geolocation.getCurrentPosition(
                                                    (pos) => {
                                                        setAddressInfo({ ...addressInfo, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
                                                        setIsLocating(false);
                                                        setToast({ message: "Konumunuz başarıyla alındı!", type: 'success' });
                                                    },
                                                    () => {
                                                        setIsLocating(false);
                                                        setToast({ message: "Konum izni verilmedi veya bir hata oluştu.", type: 'error' });
                                                    }
                                                );
                                            }}
                                            className={`w-full py-4 px-6 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${addressInfo.coords ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-text-light hover:border-primary/40'}`}
                                        >
                                            <span className="text-xl">{isLocating ? '⏳' : addressInfo.coords ? '📍' : '🎯'}</span>
                                            <span className="text-sm font-black">{isLocating ? 'Konum Alınıyor...' : addressInfo.coords ? 'Konum Kaydedildi' : 'Mevcut Konumu Kullan'}</span>
                                        </button>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Adın</label>
                                                <input type="text" value={addressInfo.name} onChange={(e) => setAddressInfo({ ...addressInfo, name: e.target.value })} placeholder="Adın" className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.addr_name ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Soyadın</label>
                                                <input type="text" value={addressInfo.surname} onChange={(e) => setAddressInfo({ ...addressInfo, surname: e.target.value })} placeholder="Soyadın" className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.addr_surname ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Telefon Numaran</label>
                                            <input type="tel" value={addressInfo.phone} onChange={(e) => setAddressInfo({ ...addressInfo, phone: e.target.value })} placeholder="05XX XXX XX XX" className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.addr_phone ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Mahalle</label>
                                            <select
                                                value={addressInfo.neighborhood}
                                                onChange={(e) => setAddressInfo({ ...addressInfo, neighborhood: e.target.value })}
                                                className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none appearance-none transition-all ${errors.addr_neigh ? 'border-red-200 bg-red-50' : 'border-background-alt'}`}
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

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Sokak / Cadde</label>
                                            <input type="text" value={addressInfo.street} onChange={(e) => setAddressInfo({ ...addressInfo, street: e.target.value })} placeholder="Örn: Atakan Sokak" className={`w-full bg-surface border-2 rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.addr_street ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Bina / No</label>
                                                <input type="text" value={addressInfo.building} onChange={(e) => setAddressInfo({ ...addressInfo, building: e.target.value })} placeholder="No: 12" className={`w-full bg-surface border-2 rounded-2xl py-4 px-5 text-sm font-bold focus:border-primary/20 outline-none transition-all ${errors.addr_build ? 'border-red-200 bg-red-50' : 'border-background-alt'}`} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Kat</label>
                                                <input type="text" value={addressInfo.floor} onChange={(e) => setAddressInfo({ ...addressInfo, floor: e.target.value })} placeholder="Kat: 3" className="w-full bg-surface border-2 border-background-alt rounded-2xl py-4 px-5 text-sm font-bold focus:border-primary/20 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Daire</label>
                                                <input type="text" value={addressInfo.apartment} onChange={(e) => setAddressInfo({ ...addressInfo, apartment: e.target.value })} placeholder="D: 8" className="w-full bg-surface border-2 border-background-alt rounded-2xl py-4 px-5 text-sm font-bold focus:border-primary/20 outline-none transition-all" />
                                            </div>
                                        </div>

                                        {savedAddresses.length > 0 && (
                                            <button
                                                onClick={() => setShowNewAddressForm(false)}
                                                className="w-full text-xs font-black text-text-light hover:text-primary transition-colors py-2"
                                            >
                                                Vazgeç ve Kayıtlı Adresimden Seç
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-wider ml-1">Restoran Notu (Opsiyonel)</label>
                                    <input type="text" value={addressInfo.note} onChange={(e) => setAddressInfo({ ...addressInfo, note: e.target.value })} placeholder="Kapıyı sert çalmayın, bebek uyuyor..." className="w-full bg-surface border-2 border-background-alt rounded-2xl py-4 px-6 text-sm font-bold focus:border-primary/20 outline-none transition-all" />
                                </div>

                                <button onClick={handleNext} className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    Ödeme Yöntemine Geç
                                </button>
                            </div>
                        )}

                        {/* STEP 4: PAYMENT */}
                        {step === 'payment' && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setStep('address')} className="w-10 h-10 rounded-full bg-background-alt flex items-center justify-center hover:bg-primary/10 transition-all">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
                                    </button>
                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-black text-primary">Nasıl Ödeyeceksin?</h1>
                                        <p className="text-text-light font-bold">Girişte ödeme kolaylığı seni bekliyor.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={`flex items-center justify-between p-6 border-2 rounded-3xl transition-all ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-background-alt hover:border-primary/20'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-3xl">💳</span>
                                            <div className="text-left">
                                                <h4 className="text-sm font-black text-text">Kapıda Kredi Kartı</h4>
                                                <p className="text-[10px] font-bold text-text-light uppercase">Temassız ödeme seçeneği mevcut</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'card' ? 'border-primary bg-primary' : 'border-gray-200'}`}>
                                            {paymentMethod === 'card' && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`flex items-center justify-between p-6 border-2 rounded-3xl transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-background-alt hover:border-primary/20'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-3xl">💵</span>
                                            <div className="text-left">
                                                <h4 className="text-sm font-black text-text">Kapıda Nakit</h4>
                                                <p className="text-[10px] font-bold text-text-light uppercase">Lütfen bozuk parayı hazır ediniz</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cash' ? 'border-primary bg-primary' : 'border-gray-200'}`}>
                                            {paymentMethod === 'cash' && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                        </div>
                                    </button>
                                </div>

                                <button onClick={handleNext} className="w-full bg-primary text-white py-6 rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                                    Siparişi Tamamla • {Math.max(0, checkoutData.total - discount)} TL
                                </button>
                            </div>
                        )}

                        {/* STEP 5: SUCCESS */}
                        {step === 'success' && (
                            <div className="space-y-10 animate-scaleUp text-center py-12">
                                <div className="w-32 h-32 bg-green-500 rounded-[2.5rem] flex items-center justify-center text-6xl mx-auto shadow-2xl shadow-green-200 animate-bounce">
                                    ✅
                                </div>

                                <div className="space-y-3">
                                    <h1 className="text-4xl font-black text-primary">Lezzet Yolda!</h1>
                                    <p className="text-text-light font-bold text-lg">Siparişin başarıyla alındı. Şimdiden afiyet olsun!</p>
                                </div>

                                <div className="bg-background-alt rounded-3xl p-8 space-y-4 max-w-sm mx-auto border border-border shadow-inner">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-text-light text-xs uppercase tracking-widest">Restoran</span>
                                        <span className="font-black text-text">{checkoutData.restaurant.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-text-light text-xs uppercase tracking-widest">Ödeme</span>
                                        <span className="font-black text-text">{paymentMethod === 'card' ? 'Kapıda Kredi Kartı' : 'Kapıda Nakit'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-4 border-t border-dashed border-border">
                                        <span className="font-black text-text">Toplam</span>
                                        <span className="text-2xl font-black text-primary">{Math.max(0, checkoutData.total - discount)} TL</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 max-w-sm mx-auto">
                                    <Link href="/" className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        Ana Sayfaya Dön
                                    </Link>
                                    <p className="text-[10px] font-bold text-text-light uppercase tracking-widest">Sipariş No: #{checkoutData.orderId || 'YX-' + Date.now()}</p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Right Side: Constant Info (Except Success) */}
                    {step !== 'success' && (
                        <div className="w-full lg:w-[380px] bg-background-alt p-8 md:p-10 flex flex-col justify-between">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100">
                                        {checkoutData.restaurant.img || '🥘'}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-text truncate">{checkoutData.restaurant.name}</h3>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{checkoutData.restaurant.deliveryTime} Teslimat</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-text-light">
                                        <span>Ara Toplam</span>
                                        <span>{checkoutData.total} TL</span>
                                    </div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-xs font-bold text-green-500">
                                            <span>İndirim</span>
                                            <span>-{discount} TL</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-xs font-bold text-green-500">
                                        <span>Gönderim Ücreti</span>
                                        <span>Ücretsiz</span>
                                    </div>
                                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                                        <span className="font-black text-text">Toplam</span>
                                        <span className="text-xl font-black text-primary">{Math.max(0, checkoutData.total - discount)} TL</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white mt-12 hidden md:block">
                                <p className="text-[10px] font-bold text-text-light leading-relaxed">
                                    🔒 Güvenliğiniz bizim için önemli. Ödemeleriniz kapıda, bizzat size ulaştığımızda gerçekleşir.
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
