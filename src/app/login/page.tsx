'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '../components/Toast';

export default function UserLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const dataStore = (await import('../../lib/dataStore')).default.getInstance();
            const users = await dataStore.getUsers();

            // Şifre kontrolü ile kullanıcıyı bul
            const foundUser = users.find((u: any) => u.email === credentials.email && u.password === credentials.password);

            if (foundUser) {
                if (foundUser.role === 'restaurant_pending') {
                    setToast({ message: 'Hesabınız şu an onay sürecindedir. Lütfen daha sonra tekrar deneyiniz.', type: 'info' });
                    setIsLoading(false);
                    return;
                }
                localStorage.setItem('yemekya_user', JSON.stringify({ ...foundUser, isLoggedIn: true }));
                router.push(foundUser.role === 'admin' ? '/admin-panel' : (foundUser.role === 'restaurant_manager' ? '/restaurant-panel' : '/'));
            } else {
                // Fallback statik hesaplar (supabasede yoksa)
                if (credentials.email === 'admin@yemekya.com' && credentials.password === 'admin123') {
                    const userData = { name: 'Platform Admin', email: credentials.email, role: 'admin', isLoggedIn: true };
                    localStorage.setItem('yemekya_user', JSON.stringify(userData));
                    router.push('/admin-panel');
                } else if (credentials.email === 'restoran@yemekya.com' && credentials.password === 'restoran123') {
                    const userData = { name: 'Mersin Yaprak Tantuni', email: credentials.email, role: 'restaurant_manager', isLoggedIn: true, restaurantId: 'mersin-yaprak-tantuni' };
                    localStorage.setItem('yemekya_user', JSON.stringify(userData));
                    router.push('/restaurant-panel');
                } else {
                    setToast({ message: 'Hatalı e-posta veya şifre!', type: 'error' });
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            setToast({ message: 'Giriş yapılırken bir hata oluştu.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-purple-600 to-indigo-700 flex items-center justify-center p-6 relative overflow-hidden font-sans">

            {/* Animated Background */}
            <div className="absolute inset-0 z-0 opacity-30">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="w-full max-w-md z-10">

                <div className="bg-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-3 mb-6">
                            <span className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-primary/30">🍽️</span>
                            <span className="text-4xl font-black text-primary tracking-tighter">YemekYa</span>
                        </Link>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Hoş Geldin!</h1>
                        <p className="text-gray-500 font-bold mt-2 text-sm">Lezzetli bir yolculuğa hazır mısın?</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-600 uppercase tracking-wider ml-4">E-posta</label>
                            <input
                                type="email"
                                required
                                value={credentials.email}
                                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                placeholder="ornek@email.com"
                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-4">
                                <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Şifre</label>
                                <button type="button" className="text-xs font-bold text-primary hover:underline">Unuttun mu?</button>
                            </div>
                            <input
                                type="password"
                                required
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 px-6 text-gray-900 font-bold outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    Giriş Yapılıyor...
                                </div>
                            ) : (
                                'Giriş Yap'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-4 bg-white text-gray-400 font-bold uppercase tracking-widest">veya</span>
                        </div>
                    </div>

                    {/* Social Login */}
                    <div className="space-y-3">
                        <button className="w-full bg-white border-2 border-gray-200 py-4 rounded-2xl font-bold text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Google ile Devam Et
                        </button>
                    </div>

                    {/* Register Link */}
                    <div className="text-center mt-8">
                        <p className="text-sm text-gray-600 font-medium">
                            Hesabın yok mu?{' '}
                            <Link href="/register" className="text-primary font-black hover:underline">
                                Üye Ol
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
