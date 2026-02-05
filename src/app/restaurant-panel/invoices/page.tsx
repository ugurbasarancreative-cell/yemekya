'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import Toast from '../../components/Toast';

interface Invoice {
    id: string;
    period: string;
    totalAmount: number;
    commissionAmount: number;
    status: 'Ödendi' | 'Beklemede' | 'Gecikmiş';
    date: string;
}

import DataStore from '@/lib/dataStore';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const loadData = async () => {
        const userRaw = localStorage.getItem('yemekya_user');
        if (!userRaw) return;
        const resId = JSON.parse(userRaw).restaurantId;
        if (!resId) return;

        const ds = DataStore.getInstance();
        const history = await ds.getInvoiceHistory(resId);
        setInvoices(history);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
        window.addEventListener('commission-update', loadData);
        window.addEventListener('storage', loadData);
        return () => {
            window.removeEventListener('commission-update', loadData);
            window.removeEventListener('storage', loadData);
        };
    }, []);

    if (isLoading) {
        return <div className="p-12 text-center font-black text-primary animate-pulse uppercase tracking-widest text-xs">Hesaplamalar yapılıyor...</div>;
    }

    const totalDebt = invoices.filter(inv => inv.status !== 'Ödendi').reduce((acc, inv) => acc + inv.netCommission, 0);
    const totalRevenue = invoices.reduce((acc, inv) => acc + inv.grossRevenue, 0);
    const totalPaid = invoices.filter(inv => inv.status === 'Ödendi').reduce((acc, inv) => acc + inv.netCommission, 0);

    return (
        <div className="space-y-10 animate-fadeIn pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-text tracking-tighter">Finansal Takip</h1>
                    <p className="text-text-light font-bold">Haftalık bazda komisyon ve ciro durumunu izleyin.</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 px-6 py-4 rounded-2xl">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">Hizmet Bedeli</span>
                    <span className="text-xl font-black text-text">%5.0 <span className="text-[10px] text-text-light opacity-50">(Kupon Hariç)</span></span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-premium group hover:-translate-y-1 transition-all">
                    <span className="text-2xl mb-4 block">💳</span>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Ödenecek Toplam Borç</p>
                    <h3 className="text-2xl font-black text-red-500 mt-1">
                        {totalDebt.toLocaleString('tr-TR')} TL
                    </h3>
                </div>
                <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-premium group hover:-translate-y-1 transition-all">
                    <span className="text-2xl mb-4 block">🧾</span>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Toplam Brüt Ciro</p>
                    <h3 className="text-2xl font-black text-text mt-1">
                        {totalRevenue.toLocaleString('tr-TR')} TL
                    </h3>
                </div>
                <div className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-premium group hover:-translate-y-1 transition-all">
                    <span className="text-2xl mb-4 block">✅</span>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Ödenmiş Komisyonlar</p>
                    <h3 className="text-2xl font-black text-green-500 mt-1">
                        {totalPaid.toLocaleString('tr-TR')} TL
                    </h3>
                </div>
            </div>

            <div className="bg-surface rounded-[3rem] border border-border shadow-premium overflow-hidden">
                <div className="p-8 border-b border-border">
                    <h3 className="text-xl font-black text-text tracking-tight uppercase tracking-tighter">Haftalık Hizmet Bedeli Dökümü</h3>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-background-alt/50">
                                <th className="px-8 py-5 text-[10px] font-black text-text-light uppercase tracking-widest">Ödeme Dönemi</th>
                                <th className="px-8 py-5 text-[10px] font-black text-text-light uppercase tracking-widest">Brüt Ciro</th>
                                <th className="px-8 py-5 text-[10px] font-black text-text-light uppercase tracking-widest">Net Komisyon (%5)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-text-light uppercase tracking-widest">Vade / Durum</th>
                                <th className="px-8 py-5 text-[10px] font-black text-text-light uppercase tracking-widest">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {invoices.length > 0 ? invoices.map((inv) => (
                                <tr key={inv.id} className="group hover:bg-background-alt/30 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-text">{inv.period}</span>
                                            <span className="text-[10px] font-bold text-text-light lowercase">{inv.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-text-light">{inv.grossRevenue.toLocaleString('tr-TR')} TL</td>
                                    <td className="px-8 py-6 text-sm font-black text-primary">{inv.netCommission.toLocaleString('tr-TR')} TL</td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border w-fit ${inv.status === 'Ödendi' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                inv.status === 'Ödeme Bekliyor' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                    'bg-red-500/10 text-red-600 border-red-500/20'
                                                }`}>
                                                {inv.status.toUpperCase()}
                                            </span>
                                            <span className="text-[9px] font-bold text-text-light opacity-50 px-1">Bitiş: {inv.date}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {inv.status === 'Ödendi' ? (
                                            <button className="text-text-light font-black uppercase tracking-widest hover:text-text text-[9px] bg-background-alt px-4 py-2 rounded-xl transition-all">Makbuz</button>
                                        ) : (
                                            <button
                                                onClick={() => setToast({ message: 'Ödeme kanıtı için lütfen yönetime dekont iletiniz.', type: 'info' })}
                                                className="text-primary font-black uppercase tracking-widest hover:underline text-[9px]"
                                            >
                                                Nasıl Ödenir?
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-text-light italic font-bold opacity-30 uppercase tracking-widest text-xs">Henüz bir finansal veri oluşmadı.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-8 flex items-start gap-6 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <span className="text-3xl">⚠️</span>
                <div className="space-y-2">
                    <h4 className="text-sm font-black text-text uppercase tracking-widest">Ödeme ve Yaptırım Politikası</h4>
                    <p className="text-xs font-bold text-text-light leading-relaxed max-w-2xl">
                        Haftalık platform komisyonu (%5), ilgili haftanın bitiminden sonraki 5 iş günü içerisinde ödenmelidir. Ödemesi geciken haftalar için panel erişimi durdurulabilir ve restoran sıralamasında otomatik düşüşler uygulanır.
                    </p>
                </div>
            </div>

            {/* TOAST NOTIFICATION */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
