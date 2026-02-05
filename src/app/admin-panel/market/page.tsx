'use client';

import { useState, useEffect } from 'react';
import DataStore, { MarketItem } from '@/lib/dataStore';
import Toast from '@/app/components/Toast';

export default function AdminMarketPage() {
    const [items, setItems] = useState<MarketItem[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState<Partial<MarketItem>>({
        name: '',
        points: 10,
        icon: '🎁',
        color: 'bg-primary',
        type: 'discount'
    });

    const ds = DataStore.getInstance();

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        const data = await ds.getMarketItems();
        setItems(data);
    };

    const handleSave = async () => {
        await ds.saveMarketItems(items);
        setToast({ message: 'Değişiklikler başarıyla kaydedildi!', type: 'success' });
    };

    const updateItem = (id: string, field: keyof MarketItem, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const deleteItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const addItem = () => {
        const item: MarketItem = {
            id: Date.now().toString(),
            name: newItem.name || 'Yeni Ürün',
            points: newItem.points || 10,
            icon: newItem.icon || '🎁',
            color: newItem.color || 'bg-primary',
            type: newItem.type as any || 'discount'
        };
        setItems([...items, item]);
        setIsAdding(false);
        setNewItem({ name: '', points: 10, icon: '🎁', color: 'bg-primary', type: 'discount' });
    };

    return (
        <div className="space-y-12 animate-fadeIn pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-text uppercase tracking-tighter italic">Market Yönetimi</h2>
                    <p className="text-sm font-bold text-text-light uppercase tracking-widest mt-1">Puan ve ödül kartlarını düzenleyin</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-8 py-4 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                    >
                        Yeni Kart Ekle
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-4 bg-emerald-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                    >
                        Tümünü Kaydet
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.map((item) => (
                    <div key={item.id} className="bg-white rounded-[3rem] border border-border p-10 shadow-premium group relative overflow-hidden transition-all hover:border-primary/30">
                        <div className="flex justify-between items-start mb-8">
                            <input
                                value={item.icon}
                                onChange={(e) => updateItem(item.id, 'icon', e.target.value)}
                                className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-3xl text-center outline-none focus:border-primary transition-all"
                            />
                            <button
                                onClick={() => deleteItem(item.id)}
                                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kart İsmi</label>
                                <input
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-sm text-slate-900 outline-none focus:border-primary transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gereken Puan</label>
                                <input
                                    type="number"
                                    value={item.points}
                                    onChange={(e) => updateItem(item.id, 'points', parseInt(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-xl text-primary outline-none focus:border-primary transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tür</label>
                                <select
                                    value={item.type}
                                    onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-[10px] uppercase tracking-widest text-slate-600 outline-none focus:border-primary transition-all"
                                >
                                    <option value="discount">İndirim Kuponu</option>
                                    <option value="digital">Dijital Kod (Steam, vb.)</option>
                                    <option value="other">Diğer</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}

                {isAdding && (
                    <div className="bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 p-10 flex flex-col justify-center gap-6 animate-fadeIn">
                        <div className="text-center space-y-2 mb-4">
                            <h4 className="text-lg font-black text-slate-400 uppercase tracking-tight">Yeni Kart</h4>
                        </div>
                        <div className="space-y-4">
                            <input
                                placeholder="İkon (Emoji)"
                                value={newItem.icon}
                                onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-black text-center text-3xl outline-none focus:border-primary"
                            />
                            <input
                                placeholder="Kart Adı"
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-black text-sm outline-none focus:border-primary"
                            />
                            <input
                                type="number"
                                placeholder="Puan"
                                value={newItem.points}
                                onChange={(e) => setNewItem({ ...newItem, points: parseInt(e.target.value) })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-black text-sm outline-none focus:border-primary"
                            />
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 py-4 bg-white text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest border border-slate-200"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={addItem}
                                    className="flex-1 py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg"
                                >
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
