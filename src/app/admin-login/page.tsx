'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '../components/Toast';

export default function AdminLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Admin doğrulama
        setTimeout(() => {
            if (credentials.email === 'admin@yemekya.com' && credentials.password === 'admin123') {
                const userData = {
                    name: 'Platform',
                    surname: 'Admin',
                    email: credentials.email,
                    role: 'admin',
                    isLoggedIn: true
                };
                localStorage.setItem('yemekya_user', JSON.stringify(userData));
                router.push('/admin-panel');
            } else {
                setToast({ message: 'Hatalı e-posta veya şifre! (admin@yemekya.com / admin123)', type: 'error' });
                setIsLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-6 relative overflow-hidden font-sans">

            {/* Animated Background */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/20 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="w-full max-w-md z-10">

                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3.5rem] p-10 shadow-2xl">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-3 mb-6">
                            <span className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30">👑</span>
                            <span className="text-4xl font-black text-white tracking-tighter">YemekYa <span className="text-indigo-400">Admin</span></span>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Yönetim Merkezi</h1>
                        <p className="text-white/40 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Platform Kontrolü</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4">Admin E-posta</label>
                            <input
                                type="email"
                                required
                                value={credentials.email}
                                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                placeholder="admin@yemekya.com"
                                className="w-full bg-white/[0.05] border border-white/10 rounded-3xl py-5 px-8 text-white font-bold outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all placeholder:text-white/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4">Şifre</label>
                            <input
                                type="password"
                                required
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full bg-white/[0.05] border border-white/10 rounded-3xl py-5 px-8 text-white font-bold outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all placeholder:text-white/10"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-wider shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    Giriş Yapılıyor...
                                </div>
                            ) : (
                                'Admin Paneline Giriş'
                            )}
                        </button>
                    </form>

                    {/* Security Notice */}
                    <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🔐</span>
                            <div>
                                <p className="text-xs text-indigo-400 font-black uppercase tracking-wider">Güvenli Bağlantı</p>
                                <p className="text-[10px] text-white/40 font-bold mt-1">Tüm işlemler şifreli ve kayıt altında</p>
                            </div>
                        </div>
                    </div>

                    {/* Other Logins */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <div className="flex gap-3 text-xs">
                            <Link href="/login" className="flex-1 text-center py-3 bg-white/5 text-white/60 rounded-xl font-bold hover:bg-white/10 transition-all">
                                👤 Kullanıcı
                            </Link>
                            <Link href="/restaurant-login" className="flex-1 text-center py-3 bg-white/5 text-white/60 rounded-xl font-bold hover:bg-white/10 transition-all">
                                🏪 Restoran
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Back */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-white/60 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        Ana Sayfaya Dön
                    </Link>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
