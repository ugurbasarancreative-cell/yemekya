'use client';

import { useState, useEffect } from 'react';
import { ALL_LOCATIONS } from '@/lib/locations';

interface GlobalRegion {
    id: string;
    city: string;
    district: string;
    neighborhood: string;
    recommendedMin: number;
    remoteAdjustment: number;
    intensity: 'Düşük' | 'Orta' | 'Yüksek';
}

export default function AdminRegionsPage() {
    const [regions, setRegions] = useState<GlobalRegion[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<Partial<GlobalRegion>>({
        city: 'İstanbul',
        district: 'Kadıköy',
        neighborhood: '',
        recommendedMin: 200,
        remoteAdjustment: 0,
        intensity: 'Orta'
    });

    useEffect(() => {
        const initial: GlobalRegion[] = [
            { id: '1', city: 'İstanbul', district: 'Kadıköy', neighborhood: 'Caddebostan', recommendedMin: 150, remoteAdjustment: 0, intensity: 'Yüksek' },
            { id: '2', city: 'İstanbul', district: 'Kadıköy', neighborhood: 'Fenerbahçe', recommendedMin: 200, remoteAdjustment: 15, intensity: 'Yüksek' },
            { id: '3', city: 'İstanbul', district: 'Kadıköy', neighborhood: 'Suadiye', recommendedMin: 180, remoteAdjustment: 0, intensity: 'Orta' },
            { id: '4', city: 'İstanbul', district: 'Ataşehir', neighborhood: 'Batı Ataşehir', recommendedMin: 300, remoteAdjustment: 40, intensity: 'Düşük' },
        ];
        setRegions(initial);
    }, []);

    const handleSave = () => {
        if (!formData.neighborhood) return;
        const fresh: GlobalRegion = {
            id: Math.random().toString(36).substr(2, 9),
            city: formData.city || 'İstanbul',
            district: formData.district || 'Kadıköy',
            neighborhood: formData.neighborhood!,
            recommendedMin: formData.recommendedMin || 0,
            remoteAdjustment: formData.remoteAdjustment || 0,
            intensity: formData.intensity || 'Orta'
        };
        setRegions([...regions, fresh]);
        setShowModal(false);
    };

    return (
        <div className="space-y-10 animate-fadeIn pb-12">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase tracking-wider">Bölge & Limit Yönetimi</h1>
                    <p className="text-white/40 font-bold">Platform genelindeki minimum sepet tutarlarını ve uzaklık kurallarını belirle.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-8 py-4 bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all text-xs flex items-center gap-3"
                >
                    <span>🌍</span> Yeni Bölge Tanımla
                </button>
            </div>

            {/* SYSTEM SUGGESTION BOX */}
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[3rem] p-10 flex flex-col lg:flex-row items-center gap-10">
                <div className="w-24 h-24 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-4xl border border-indigo-500/20 shrink-0">💡</div>
                <div className="flex-1 space-y-3">
                    <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">Sistem Önerisi: Dinamik Limitler</h4>
                    <p className="text-sm font-medium text-white/50 leading-relaxed">
                        Analizlerimiz, <span className="text-indigo-400 font-black decoration-indigo-400 underline decoration-2 underline-offset-4">Fenerbahçe</span> bölgesinde akşam saatlerindeki yoğunluk nedeniyle minimum sepet tutarının geçici olarak <span className="text-indigo-400 font-bold">250 TL</span>'ye çekilmesini öneriyor. Bu, kurye verimliliğini %18 artırabilir.
                    </p>
                </div>
                <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all">Tüm Önerileri Uygula</button>
            </div>

            {/* REGIONS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regions.map((region) => (
                    <div key={region.id} className="bg-[#0c0c14] rounded-[3rem] border border-white/5 p-10 space-y-8 group hover:-translate-y-2 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${region.intensity === 'Yüksek' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                region.intensity === 'Orta' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                    'bg-green-500/10 text-green-500 border-green-500/20'
                                }`}>
                                {region.intensity} Yoğunluk
                            </span>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">{region.district} / {region.city}</p>
                            <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{region.neighborhood}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1">Önerilen Min.</span>
                                <span className="text-lg font-black text-white">{region.recommendedMin} TL</span>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1">Uzaklık Farkı</span>
                                <span className="text-lg font-black text-indigo-400">+{region.remoteAdjustment} TL</span>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                            <div className="flex gap-2">
                                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-sm">📍</div>
                                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-sm">🛰️</div>
                            </div>
                            <button className="text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors">Ayarları Düzenle</button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={() => setShowModal(true)}
                    className="border-4 border-dashed border-white/5 bg-transparent rounded-[3rem] p-10 flex flex-col items-center justify-center text-center group hover:border-indigo-500/30 transition-all opacity-40 hover:opacity-100 min-h-[300px]"
                >
                    <span className="text-5xl mb-6 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all">🌍</span>
                    <h4 className="text-lg font-black text-white uppercase tracking-tighter">Yeni Bölge Ekle</h4>
                    <p className="text-[11px] font-bold text-white/20 uppercase tracking-widest mt-2">Platform genişlemesi için yeni mahalle tanımla.</p>
                </button>
            </div>

            {/* ADD MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                    <div className="bg-[#0c0c14] w-full max-w-lg rounded-[3.5rem] border border-white/10 shadow-2xl p-12 animate-popIn">
                        <div className="text-center space-y-3 mb-10">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Yeni Bölge Tanımla</h3>
                            <p className="text-xs font-bold text-white/30 tracking-widest leading-relaxed">Şehir ve mahalle bazlı lojistik limitlerini belirleyin.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Mahalle Adı</label>
                                <select
                                    value={formData.neighborhood}
                                    onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                                    className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/30 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none transition-all"
                                >
                                    <option value="" className="bg-[#0c0c14]">Mahalle Seçiniz</option>
                                    {ALL_LOCATIONS.map(city => (
                                        <optgroup key={city.city} label={city.city} className="bg-[#0c0c14]">
                                            {city.neighborhoods.map(neighborhood => (
                                                <option key={neighborhood} value={neighborhood} className="bg-[#0c0c14]">{neighborhood}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Önerilen Min. (TL)</label>
                                    <input type="number" value={formData.recommendedMin} onChange={e => setFormData({ ...formData, recommendedMin: Number(e.target.value) })} className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/30 rounded-2xl py-4.5 px-6 text-sm font-bold text-white outline-none transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Uzaklık Farkı (TL)</label>
                                    <input type="number" value={formData.remoteAdjustment} onChange={e => setFormData({ ...formData, remoteAdjustment: Number(e.target.value) })} className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/30 rounded-2xl py-4.5 px-6 text-sm font-bold text-white outline-none transition-all" />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full mt-6 py-6 bg-indigo-500 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all outline-none"
                            >
                                Bölgeyi Aktivite Et
                            </button>
                            <button onClick={() => setShowModal(false)} className="w-full text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors py-2">Kapat</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
