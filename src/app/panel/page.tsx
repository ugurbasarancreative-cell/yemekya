import Link from 'next/link';

export default function PanelLogin() {
    return (
        <div className="min-h-screen flex-center bg-[var(--color-background)] relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[var(--color-primary)] opacity-5 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--color-accent)] opacity-5 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-md p-4 relative z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="text-3xl font-bold text-[var(--color-primary)]">
                        YemekYa
                    </Link>
                    <p className="mt-2 text-[var(--color-text-muted)]">Restoran Yönetim Paneli</p>
                </div>

                <div className="card glass">
                    <h2 className="text-2xl mb-6 text-center">Giriş Yap</h2>
                    <form className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-[var(--color-text-main)]">E-Posta Adresi</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] outline-none focus:border-[var(--color-primary)] bg-white/50"
                                placeholder="restoran@ornek.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-[var(--color-text-main)]">Şifre</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] outline-none focus:border-[var(--color-primary)] bg-white/50"
                                placeholder="••••••••"
                            />
                        </div>

                        <button type="button" className="btn btn-primary w-full mt-2">
                            Panele Gir
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
                        Henüz üye değil misiniz? <br />
                        <Link href="#" className="font-semibold text-[var(--color-primary)] hover:underline">
                            Restoran Başvurusu Yap
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
