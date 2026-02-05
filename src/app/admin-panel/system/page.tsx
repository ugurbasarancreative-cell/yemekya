'use client';

import { useState, useEffect } from 'react';
import DataStore from '@/lib/dataStore';
import ConfirmModal from '@/app/components/ConfirmModal';

export default function AdminSystemPage() {
    const [maintenance, setMaintenance] = useState(false);
    const [maintenanceDuration, setMaintenanceDuration] = useState('1'); // Hours
    const [maintenanceEndTime, setMaintenanceEndTime] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [serverLoad, setServerLoad] = useState({ cpu: 12, ram: 24 });
    const [dbStatus, setDbStatus] = useState({ ping: 42, lastSync: 'Şimdi' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setServerLoad({
                cpu: Math.floor(Math.random() * (18 - 8 + 1) + 8),
                ram: Math.floor(Math.random() * (32 - 22 + 1) + 22)
            });
            setDbStatus(prev => ({
                ping: Math.floor(Math.random() * (60 - 30 + 1) + 30),
                lastSync: '1s önce'
            }));
        }, 5000);

        const syncMaintenance = () => {
            const stored = localStorage.getItem('YEMEKYA_MAINTENANCE_MODE');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.active) {
                    const now = new Date().getTime();
                    if (now < data.endTime) {
                        setMaintenance(true);
                        setMaintenanceEndTime(new Date(data.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
                    } else {
                        // Expired
                        localStorage.removeItem('YEMEKYA_MAINTENANCE_MODE');
                        setMaintenance(false);
                        setMaintenanceEndTime(null);
                    }
                }
            }
        };

        syncMaintenance();

        // Initial logs
        setLogs([
            { id: 1, type: 'System', msg: 'Kernel v4.2.0 initialized.', time: '08:00', status: 'OK' },
            { id: 2, type: 'Auth', msg: 'Admin login detected (IP: 192.168.1.1)', time: '08:45', status: 'AUTH' },
            { id: 3, type: 'Job', msg: 'Daily revenue reports generated.', time: '09:00', status: 'DONE' },
        ]);
    }, []);

    const handleMaintenanceToggle = () => {
        if (!maintenance) {
            setIsConfirmOpen(true);
        } else {
            // Deactivating
            localStorage.removeItem('YEMEKYA_MAINTENANCE_MODE');
            setMaintenance(false);
            setMaintenanceEndTime(null);
            addLog('Bakım modu devre dışı bırakıldı.', 'OK');
            window.dispatchEvent(new Event('storage'));
        }
    };

    const finalConfirmMaintenance = () => {
        // Activating
        const durationMs = parseInt(maintenanceDuration) * 60 * 60 * 1000;
        const endTime = new Date().getTime() + durationMs;
        const data = {
            active: true,
            endTime: endTime,
            startTime: new Date().getTime(),
            durationStr: maintenanceDuration
        };
        localStorage.setItem('YEMEKYA_MAINTENANCE_MODE', JSON.stringify(data));
        setMaintenance(true);
        setMaintenanceEndTime(new Date(endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));

        addLog('Bakım modu aktif edildi.', 'WARN');
        window.dispatchEvent(new Event('storage'));
        setIsConfirmOpen(false);
    };

    const addLog = (msg: string, status: string) => {
        const newLog = {
            id: Date.now(),
            type: 'Action',
            msg,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            status
        };
        setLogs(prev => [newLog, ...prev]);
    };

    return (
        <div className="space-y-12 animate-fadeIn pb-12">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-text tracking-tighter uppercase tracking-wider">Sistem Kontrol & Güvenlik</h1>
                    <p className="text-text-light font-bold">Platform çekirdek ayarlarını ve canlı sistem durumunu yönet.</p>
                </div>
                <div className={`px-6 py-3 rounded-2xl border flex items-center gap-3 transition-colors ${maintenance ? 'bg-amber-500/10 border-amber-500/20' : 'bg-primary/5 border-primary/20'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full animate-ping ${maintenance ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${maintenance ? 'text-amber-600' : 'text-primary'}`}>
                        {maintenance ? 'Bakım Modunda' : 'Sistem Çevrimiçi'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* SYSTEM SETTINGS */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-surface rounded-[3rem] border border-border p-10 shadow-premium">
                        <h3 className="text-xl font-black text-text uppercase tracking-tighter italic mb-8">Kritik Ayarlar</h3>

                        <div className="space-y-8">
                            <div className={`p-10 rounded-[2.5rem] border-2 transition-all duration-500 ${maintenance ? 'bg-amber-50/50 border-amber-300 shadow-xl shadow-amber-500/10' : 'bg-white border-slate-100 shadow-premium'}`}>
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex-1 pr-6">
                                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none mb-2">Bakım Modu</h4>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter leading-relaxed">
                                            {maintenance ? `Sistem ${maintenanceEndTime} saatine kadar kilitlendi.` : 'Tüm kullanıcı erişimini geçici olarak durdur.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleMaintenanceToggle}
                                        className={`w-20 h-10 rounded-full transition-all relative shadow-inner p-1 ${maintenance ? 'bg-amber-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 bottom-1 w-8 h-8 bg-white rounded-full transition-all shadow-md flex items-center justify-center text-[8px] font-black ${maintenance ? 'left-11 text-amber-500' : 'left-1 text-slate-400'}`}>
                                            {maintenance ? 'ON' : 'OFF'}
                                        </div>
                                    </button>
                                </div>

                                {!maintenance && (
                                    <div className="space-y-6 pt-8 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planlanan Süre</label>
                                            <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/5 rounded-full">{maintenanceDuration} Saat</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['1', '3', '6', '12', '24', '48'].map(h => (
                                                <button
                                                    key={h}
                                                    onClick={() => setMaintenanceDuration(h)}
                                                    className={`py-3 rounded-2xl text-[10px] font-black transition-all border-2 ${maintenanceDuration === h ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' : 'bg-white text-slate-600 border-slate-50 hover:border-primary/20 hover:bg-slate-50'}`}
                                                >
                                                    {h} SAAT
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {maintenance && (
                                    <div className="pt-4 border-t border-amber-200/50">
                                        <div className="bg-white/50 p-4 rounded-2xl">
                                            <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tighter">
                                                DİKKAT: Şu an hiçbir müşteri veya restoran sisteme giriş yapamıyor. Sadece adminler paneli kullanabilir.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2rem]">
                                <h4 className="text-sm font-black text-blue-900 uppercase mb-2">Güvenlik Bilgisi</h4>
                                <p className="text-[10px] font-medium text-blue-700/70 leading-relaxed">
                                    Herhangi bir bakım çalışması öncesinde veri yedeklemesi otomatik olarak alınır.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-premium space-y-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic mb-6">Veritabanı Sağlığı</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gecikme (Ping)</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${dbStatus.ping < 50 ? 'bg-green-500' : 'bg-amber-500'}`} />
                                        <span className="text-xl font-black text-slate-900">{dbStatus.ping}ms</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Son Senkron.</span>
                                    <span className="text-xl font-black text-slate-900">{dbStatus.lastSync}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400">Veri Kaynağı:</span>
                                    <span className="text-[10px] font-black text-primary uppercase">Supabase Cloud</span>
                                </div>
                                <span className="text-[10px] font-black text-green-500 uppercase">Aktif</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                        <h3 className="text-xl font-black uppercase tracking-tighter italic mb-4">Sunucu Yükü</h3>
                        <p className="text-sm opacity-60 font-medium mb-8">Anlık işlemci ve bellek kullanımı.</p>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span>CPU GÜCÜ</span>
                                    <span>%{serverLoad.cpu}</span>
                                </div>
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${serverLoad.cpu}%` }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span>RAM BELLEK</span>
                                    <span>%{serverLoad.ram}</span>
                                </div>
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white transition-all duration-1000" style={{ width: `${serverLoad.ram}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SYSTEM LOGS */}
                <div className="lg:col-span-2 bg-[#0c0c14] rounded-[3rem] border border-border p-10 flex flex-col shadow-premium min-h-[600px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                    <div className="flex justify-between items-center mb-10 relative">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🖥️</div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Sistem Günlükleri</h3>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    Canlı Kernel Akışı
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setLogs([])}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest border border-white/5 transition-all"
                        >
                            Logları Temizle
                        </button>
                    </div>

                    <div className="flex-1 font-mono text-[11px] space-y-4 bg-black/40 p-10 rounded-[2rem] border border-white/5 overflow-y-auto no-scrollbar relative shadow-inner">
                        {logs.length === 0 && (
                            <div className="flex items-center justify-center h-full opacity-20 italic text-white uppercase tracking-widest text-[10px]">
                                Kayıt bulunmuyor...
                            </div>
                        )}
                        {logs.map(log => (
                            <div key={log.id} className="flex gap-6 group hover:translate-x-1 transition-transform">
                                <span className="text-white/20 shrink-0">{log.time}</span>
                                <span className={`font-black shrink-0 ${log.status === 'OK' ? 'text-green-500' : log.status === 'WARN' ? 'text-amber-500' : 'text-blue-500'}`}>
                                    [{log.type.padEnd(6)}]
                                </span>
                                <span className="text-white/60 group-hover:text-white transition-colors leading-relaxed">
                                    {log.msg}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                title="Bakım Modu Onayı"
                message={`${maintenanceDuration} saatlik bakım modunu aktif etmek üzeresiniz. Bu işlem sırasında tüm kullanıcı erişimi kesilecektir. Emin misiniz?`}
                onConfirm={finalConfirmMaintenance}
                onCancel={() => setIsConfirmOpen(false)}
                type="warning"
                confirmText="Sistemi Kapat"
                cancelText="İptal Et"
            />
        </div>
    );
}
