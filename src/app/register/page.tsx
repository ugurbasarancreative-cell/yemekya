'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '../components/Toast';
import { CUISINES } from '@/lib/cuisines';

export default function UserRegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [regType, setRegType] = useState<'user' | 'restaurant'>('user');
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        restaurantName: '',
        cuisine: CUISINES[0].name
    });

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setToast({ message: 'Şifreler eşleşmiyor!', type: 'error' });
            return;
        }

        setIsLoading(true);

        setTimeout(() => {
            const userId = Math.random().toString(36).substr(2, 9);
            const userData = {
                id: userId,
                name: formData.name,
                surname: formData.surname,
                email: formData.email,
                phone: formData.phone,
                role: regType === 'user' ? 'user' : 'restaurant_pending',
                isLoggedIn: regType === 'user', // Restaurant ise hemen giriş yapmasın
                restaurantName: formData.restaurantName,
                points: 0
            };

            // 1. Kullanıcıyı "Veritabanına" kaydet
            const USER_DB_KEY = 'YEMEKYA_USERS_DB';
            const rawUsers = localStorage.getItem(USER_DB_KEY);
            const users = rawUsers ? JSON.parse(rawUsers) : [];

            const newUser = {
                id: userId,
                name: formData.name,
                surname: formData.surname,
                email: formData.email,
                password: formData.password, // Mock şifre
                phone: formData.phone,
                role: regType === 'user' ? 'user' : 'restaurant_pending',
                restaurantName: formData.restaurantName,
                points: 0
            };

            users.push(newUser);
            localStorage.setItem(USER_DB_KEY, JSON.stringify(users));

            // 2. Mevcut oturumu ayarla (Müşteriyse direkt girsin)
            if (regType === 'user') {
                localStorage.setItem('yemekya_user', JSON.stringify({ ...newUser, isLoggedIn: true }));
            }

            // 3. Eğer restoransa başvuru listesine ekle
            if (regType === 'restaurant') {
                const existing = localStorage.getItem('yemekya_applications');
                const apps = existing ? JSON.parse(existing) : [];
                apps.push({
                    id: Math.random().toString(36).substr(2, 9),
                    userId: userId,
                    restaurantName: formData.restaurantName,
                    cuisine: formData.cuisine,
                    ownerName: `${formData.name} ${formData.surname}`,
                    email: formData.email,
                    phone: formData.phone,
                    status: 'PENDING',
                    timestamp: new Date().toLocaleString('tr-TR')
                });
                localStorage.setItem('yemekya_applications', JSON.stringify(apps));

                setToast({ message: 'Başvurunuz alındı! Admin onayından sonra giriş yapabileceksiniz.', type: 'success' });
                setTimeout(() => router.push('/login'), 2000);
            } else {
                router.push('/');
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-purple-600 to-indigo-700 flex items-center justify-center p-6 relative overflow-hidden font-sans">

            {/* Animated Background */}
            <div className="absolute inset-0 z-0 opacity-30">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="w-full max-w-2xl z-10">

                <div className="bg-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-3 mb-6">
                            <span className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-primary/30">🍽️</span>
                            <span className="text-4xl font-black text-primary tracking-tighter">YemekYa</span>
                        </Link>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Aramıza Katıl!</h1>
                        <p className="text-gray-500 font-bold mt-2 text-sm">{regType === 'user' ? 'Hemen üye ol, lezzetli fırsatları kaçırma' : 'İşletmeni dijital dünyaya taşı, kazancını artır'}</p>
                    </div>

                    {/* Registration Type Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
                        <button
                            onClick={() => setRegType('user')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${regType === 'user' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            😋 Bireysel (Müşteri)
                        </button>
                        <button
                            onClick={() => setRegType('restaurant')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${regType === 'restaurant' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            🏪 Kurumsal (Restoran)
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleRegister} className="space-y-5">

                        {regType === 'restaurant' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">Restoran Adı</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.restaurantName}
                                        onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                                        placeholder="Örn: Lezzet Durağı"
                                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">Mutfak Türü</label>
                                    <select
                                        required
                                        value={formData.cuisine}
                                        onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        {CUISINES.map(c => (
                                            <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">{regType === 'restaurant' ? 'Yetkili Adı' : 'Ad'}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ahmet"
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">{regType === 'restaurant' ? 'Yetkili Soyadı' : 'Soyad'}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.surname}
                                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                                    placeholder="Yılmaz"
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">E-posta</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="ornek@email.com"
                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">İletişim Numarası</label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="0555 123 45 67"
                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">Şifre Belirle</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">Şifre Tekrar</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                                />
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                            <input type="checkbox" required className="mt-1 w-6 h-6 border-2 border-gray-300 rounded-lg accent-primary" />
                            <p className="text-[11px] text-gray-500 font-bold leading-relaxed uppercase tracking-tighter">
                                <Link href="/terms" className="text-primary hover:underline">Ortaklık Sözleşmesini</Link> ve{' '}
                                <Link href="/privacy" className="text-primary hover:underline">KVKK Aydınlatma Metnini</Link> okudum, restoran sahibi/yetkilisi olarak şartları onaylıyorum.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    Bilgiler Kaydediliyor...
                                </div>
                            ) : (
                                regType === 'user' ? 'Üye Ol' : 'Ortağımız Ol & Başvur'
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="text-center mt-8">
                        <p className="text-sm text-gray-600 font-medium">
                            Zaten hesabın var mı?{' '}
                            <Link href="/login" className="text-primary font-black hover:underline">
                                Giriş Yap
                            </Link>
                        </p>
                    </div>

                </div>

                {/* Back to Home */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-white/80 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        Ana Sayfaya Dön
                    </Link>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
