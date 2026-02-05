'use client';

import { useState, useEffect } from 'react';
import Toast from '../../components/Toast';
import DataStore from '@/lib/dataStore';

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    image: string;
    stock: boolean;
    description: string;
    status?: 'approved' | 'pending' | 'rejected';
    // Akıllı Tasarruf Alanları
    unitType?: 'gr' | 'ml' | 'portion' | 'piece';
    unitAmount?: number;
    isMenu?: boolean;
    baseCategory?: string;
}

export default function MenuManagementPage() {
    const [categories, setCategories] = useState<string[]>(['Menüler', 'Burgerler', 'Yan Ürünler', 'İçecekler', 'Tatlılar']);
    const [activeCategory, setActiveCategory] = useState('Burgerler');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanningProgress, setScanningProgress] = useState(0);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [products, setProducts] = useState<Product[]>([]);
    const [pendingChanges, setPendingChanges] = useState<any[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const [currentRestaurantId, setCurrentRestaurantId] = useState<string>('');

    useEffect(() => {
        const userRaw = localStorage.getItem('yemekya_user');
        if (!userRaw) return;
        const user = JSON.parse(userRaw);
        const resId = user.restaurantId || '';
        setCurrentRestaurantId(resId);

        const syncMenu = async () => {
            const dataStore = DataStore.getInstance();
            const allApprovals = await dataStore.getMenuApprovals();
            setPendingChanges(allApprovals.filter((a: any) => a.restaurantId === resId));

            if (resId) {
                const currentRes = await dataStore.getRestaurant(resId);
                if (currentRes) {
                    if (currentRes.menu) setProducts(currentRes.menu as any);
                    if ((currentRes as any).categories) {
                        setCategories((currentRes as any).categories);
                    } else {
                        // Default categories for new restaurant
                        const defaults = ['Menüler', 'Ana Yemekler', 'İçecekler', 'Tatlılar'];
                        setCategories(defaults);
                        // Save defaults back through DataStore
                        await dataStore.updateRestaurant(resId, { categories: defaults } as any);
                    }
                }
            }
        };

        syncMenu();
        window.addEventListener('storage', syncMenu);
        window.addEventListener('restaurant-update', syncMenu);
        return () => {
            window.removeEventListener('storage', syncMenu);
            window.removeEventListener('restaurant-update', syncMenu);
        };
    }, []);

    const submitForApproval = async (type: 'ADD' | 'PRICE_CHANGE' | 'EDIT', productName: string, newValue: string, data: any, oldValue?: string, productId?: string) => {
        const userRaw = localStorage.getItem('yemekya_user');
        if (!userRaw) return;
        const user = JSON.parse(userRaw);

        const dataStore = DataStore.getInstance();
        await dataStore.submitMenuApproval({
            restaurantId: user.restaurantId || user.id,
            restaurantName: user.restaurantName || user.name,
            productId: productId,
            productName,
            type,
            oldValue,
            newValue,
            newData: data
        });

        window.dispatchEvent(new Event('restaurant-update'));
        setToast({ message: 'İsteğiniz yönetici onayına gönderildi. Onaylandıktan sonra yayına alınacaktır.', type: 'info' });
    };

    const toggleStock = async (id: string) => {
        const updated = products.map(p => p.id === id ? { ...p, stock: !p.stock } : p);
        setProducts(updated);

        // Update through DataStore
        if (currentRestaurantId) {
            const dataStore = DataStore.getInstance();
            await dataStore.updateRestaurant(currentRestaurantId, { menu: updated as any });
        }
    };

    // TOPLU FİYAT GÜNCELLEME
    const [bulkPriceData, setBulkPriceData] = useState({ category: 'Hepsi', type: 'percent', value: 10, mode: 'increase' });
    const handleBulkPriceUpdate = () => {
        const selectedProducts = products.filter(p => bulkPriceData.category === 'Hepsi' || p.category === bulkPriceData.category);

        selectedProducts.forEach(p => {
            let newPrice = p.price;
            const val = Number(bulkPriceData.value);
            if (bulkPriceData.type === 'percent') {
                const diff = (p.price * val) / 100;
                newPrice = bulkPriceData.mode === 'increase' ? p.price + diff : p.price - diff;
            } else {
                newPrice = bulkPriceData.mode === 'increase' ? p.price + val : p.price - val;
            }
            newPrice = Math.round(newPrice);
            submitForApproval('PRICE_CHANGE', p.name, newPrice.toString(), { price: newPrice }, p.price.toString(), p.id.toString());
        });

        setShowBulkPriceModal(false);
    };

    // AI FILE SYNC & BULK ADD
    const [bulkAddText, setBulkAddText] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanningProgress(0);

        // AI Scan simulation
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                finalizeScan(file.name);
            }
            setScanningProgress(progress);
        }, 600);
    };

    const finalizeScan = (fileName: string) => {
        setTimeout(() => {
            setIsScanning(false);
            const lowerFile = fileName.toLowerCase();
            const lowerCat = activeCategory.toLowerCase();

            let mockParsed = "";

            // Akıllı Kategori Eşleştirme Simülasyonu
            if (lowerCat.includes('burger') || lowerFile.includes('burger')) {
                mockParsed = [
                    `Klasik Burger Menü, 245, 150g dana köfte, marul, domates, özel sos ve patates kızartması ile`,
                    `Cheese Burger, 210, Bol cheddar peyniri, karamelize soğan ve turşu`,
                    `Tavuk Burger, 185, Panelenmiş tavuk filetosu, mayonez ve marul`,
                    `BBQ Burger, 260, Füme et, barbekü sos ve çıtır soğan halkaları`
                ].join('\n');
            } else if (lowerCat.includes('içecek') || lowerFile.includes('icecek') || lowerFile.includes('drink')) {
                mockParsed = [
                    `Coca-Cola 330ml, 45, Kutu`,
                    `Ayran 300ml, 30, Cam şişe`,
                    `Ev Yapımı Limonata, 65, Taze nane ve çilek parçacıkları ile`,
                    `Soda, 25, Sade`
                ].join('\n');
            } else if (lowerCat.includes('tatlı') || lowerFile.includes('dessert')) {
                mockParsed = [
                    `Sufle, 140, Belçika çikolatası ve vanilyalı dondurma ile`,
                    `Mozaik Pasta, 95, Klasik anne usulü`,
                    `Tiramisu, 115, Kahve aromalı özel krema ile`
                ].join('\n');
            } else {
                // Varsayılan / Genel Liste
                mockParsed = [
                    `${activeCategory} Özel Ürün 1, 150, Taze malzemelerle hazırlanan özel lezzet`,
                    `${activeCategory} Özel Ürün 2, 190, En çok tercih edilen seçeneklerden biri`,
                    `Popüler Yan Ürün, 85, Çıtır ve lezzetli`,
                ].join('\n');
            }

            setBulkAddText(mockParsed);
            setToast({ message: `'${fileName}' analizi tamamlandı. Aktif kategoriniz olan '${activeCategory}' ile uyumlu ürünler ayıklandı.`, type: 'success' });
        }, 800);
    };

    const handleBulkAdd = () => {
        const lines = bulkAddText.split('\n').filter(l => l.trim().includes(','));
        if (lines.length === 0) {
            setToast({ message: 'Lütfen ürünleri "İsim, Fiyat, Açıklama" formatında girin.', type: 'error' });
            return;
        }

        lines.forEach((line) => {
            const [name, price, desc] = line.split(',').map(s => s.trim());
            const newP = {
                name: name || 'Yeni Ürün',
                price: Number(price) || 0,
                description: desc || '',
                category: activeCategory,
                image: '🍱',
                stock: true,
                status: 'pending'
            };
            submitForApproval('ADD', newP.name, newP.price.toString(), newP);
        });
        setShowBulkAddModal(false);
        setBulkAddText('');
    };

    // SINGLE ADD/EDIT
    const [newItemData, setNewItemData] = useState({
        name: '',
        price: '',
        desc: '',
        image: '🍔',
        unitType: 'gr' as 'gr' | 'ml' | 'portion' | 'piece',
        unitAmount: '',
        isMenu: false,
        baseCategory: ''
    });

    // KATEGORİ YÖNETİMİ
    const [newCatName, setNewCatName] = useState('');
    const handleAddCategory = () => {
        if (!newCatName.trim() || categories.includes(newCatName)) return;
        const updated = [...categories, newCatName.trim()];
        saveCategories(updated);
        setNewCatName('');
    };

    const handleDeleteCategory = (cat: string) => {
        if (categories.length <= 1) {
            setToast({ message: 'En az bir kategori bulunmalıdır.', type: 'error' });
            return;
        }
        const updated = categories.filter(c => c !== cat);

        // Bu kategorideki ürünleri "Genel"e taşı
        const updatedProducts = products.map(p => p.category === cat ? { ...p, category: updated[0] } : p);

        saveCategories(updated, updatedProducts);
        if (activeCategory === cat) setActiveCategory(updated[0]);
    };

    const saveCategories = async (newCats: string[], newProds?: Product[]) => {
        setCategories(newCats);
        if (newProds) setProducts(newProds);

        if (currentRestaurantId) {
            const dataStore = DataStore.getInstance();
            const updates: any = { categories: newCats };
            if (newProds) updates.menu = newProds;
            await dataStore.updateRestaurant(currentRestaurantId, updates);
        }
    };

    const handleSaveProduct = () => {
        if (!newItemData.name || !newItemData.price) return;

        if (editingProduct) {
            submitForApproval('EDIT', newItemData.name, newItemData.price, {
                name: newItemData.name,
                price: Number(newItemData.price),
                description: newItemData.desc,
                image: newItemData.image,
                unitType: newItemData.unitType,
                unitAmount: Number(newItemData.unitAmount),
                isMenu: newItemData.isMenu,
                baseCategory: newItemData.baseCategory
            }, editingProduct.price.toString(), editingProduct.id.toString());
        } else {
            const newP = {
                name: newItemData.name,
                price: Number(newItemData.price),
                description: newItemData.desc,
                category: activeCategory,
                image: newItemData.image,
                stock: true,
                status: 'pending',
                unitType: newItemData.unitType,
                unitAmount: Number(newItemData.unitAmount),
                isMenu: newItemData.isMenu,
                baseCategory: newItemData.baseCategory
            };
            submitForApproval('ADD', newP.name, newP.price.toString(), newP);
        }

        setShowAddForm(false);
        setNewItemData({
            name: '',
            price: '',
            desc: '',
            image: '🍔',
            unitType: 'gr',
            unitAmount: '',
            isMenu: false,
            baseCategory: ''
        });
    };

    const startEdit = (prod: Product) => {
        setEditingProduct(prod);
        setNewItemData({
            name: prod.name,
            price: prod.price.toString(),
            desc: prod.description,
            image: prod.image,
            unitType: prod.unitType || 'gr',
            unitAmount: prod.unitAmount?.toString() || '',
            isMenu: prod.isMenu || false,
            baseCategory: prod.baseCategory || ''
        });
        setShowAddForm(true);
    };

    const filteredProducts = products.filter(p => p.category === activeCategory);

    return (
        <div className="space-y-8 animate-fadeIn pb-20">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-text tracking-tighter">Menü Yönetimi</h1>
                    <p className="text-text-light font-bold">Lezzetlerini buradan yönet. Değişiklikler admin onayından sonra yayınlanır.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => setShowCategoryManager(true)} className="px-5 py-3.5 bg-background-alt border border-border text-text font-black rounded-2xl hover:bg-surface transition-all text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <span>📂</span> Kategoriler
                    </button>
                    <button onClick={() => setShowBulkPriceModal(true)} className="px-5 py-3.5 bg-background-alt border border-border text-text font-black rounded-2xl hover:bg-surface transition-all text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <span>💰</span> Toplu Fiyat
                    </button>
                    <button onClick={() => { setEditingProduct(null); setNewItemData({ name: '', price: '', desc: '', image: '🍔', unitType: 'gr', unitAmount: '', isMenu: false, baseCategory: '' }); setShowAddForm(true); }} className="px-6 py-3.5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center gap-2">
                        <span>✨</span> Yeni Ürün
                    </button>
                </div>
            </div>

            {/* APPROVAL STATUS BANNER */}
            {pendingChanges.some(c => c.status === 'PENDING') && (
                <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-[2rem] flex items-center gap-6 animate-pulse">
                    <span className="text-2xl">⏳</span>
                    <div>
                        <p className="text-sm font-black text-amber-600 uppercase tracking-tighter">Bekleyen Onaylarınız Var</p>
                        <p className="text-[10px] font-bold text-amber-600/60 uppercase">Yönetici değişikliklerinizi inceledikten sonra menünüz güncellenecektir.</p>
                    </div>
                </div>
            )}

            {/* CATEGORIES */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-8 py-4 rounded-[1.5rem] text-xs font-black transition-all border shrink-0 ${activeCategory === cat ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-surface border-border text-text-light hover:bg-background-alt'}`}
                    >
                        {cat}
                        <span className="ml-2 opacity-50 text-[10px]">({products.filter(p => p.category === cat).length})</span>
                    </button>
                ))}
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((prod) => {
                    const hasPending = pendingChanges.some(c => c.productName === prod.name && c.status === 'PENDING');
                    return (
                        <div key={prod.id} className={`bg-surface rounded-3xl border border-border shadow-premium overflow-hidden flex flex-col group transition-all duration-300 relative ${!prod.stock ? 'opacity-60' : ''}`}>
                            {hasPending && (
                                <div className="absolute top-4 right-4 z-10 bg-amber-500 text-white text-[8px] font-black px-3 py-1.5 rounded-full shadow-lg">ONAY BEKLİYOR</div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => startEdit(prod)} className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white border border-primary/20 bg-white/80 backdrop-blur-sm">✏️</button>
                            </div>
                            <div className="h-40 bg-background-alt/30 flex items-center justify-center overflow-hidden">
                                {prod.image.startsWith('data:') ? <img src={prod.image} className="w-full h-full object-cover" /> : <span className="text-6xl">{prod.image}</span>}
                            </div>
                            <div className="p-6 space-y-3 flex-1 flex flex-col">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-black text-text tracking-tight w-2/3 truncate">{prod.name}</h3>
                                    <span className="text-sm font-black text-primary">{prod.price} TL</span>
                                </div>
                                <p className="text-[10px] font-medium text-text-light leading-relaxed line-clamp-2 italic">{prod.description}</p>
                                <div className="pt-4 border-t border-dashed border-border mt-auto flex items-center justify-between">
                                    <span className={`text-[10px] font-black uppercase ${prod.stock ? 'text-green-500' : 'text-red-500'}`}>{prod.stock ? '⚪ SATIŞTA' : '🔴 TÜKENDİ'}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={prod.stock} onChange={() => toggleStock(prod.id)} className="sr-only peer" />
                                        <div className="w-10 h-5 bg-background-alt rounded-full peer peer-checked:bg-primary border border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <button onClick={() => setShowBulkAddModal(true)} className="bg-background-alt/20 rounded-3xl border-2 border-dashed border-border p-10 flex flex-col items-center justify-center text-center group hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[250px]">
                    <div className="w-14 h-14 bg-surface border border-border rounded-full flex items-center justify-center text-2xl mb-4 group-hover:bg-primary group-hover:text-white transition-all">📋</div>
                    <h4 className="text-sm font-black text-text-light uppercase tracking-widest">Toplu Ürün Ekle</h4>
                </button>
            </div>

            {/* MODALS (Simplified for the demonstration) */}
            {showAddForm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40 animate-fadeIn">
                    <div className="bg-surface w-full max-w-2xl rounded-[2.5rem] border border-border shadow-2xl p-10 space-y-8 animate-scaleUp">
                        <h2 className="text-2xl font-black text-text tracking-tighter text-center">{editingProduct ? 'Düzenleme İsteği 📝' : 'Yeni Ürün İsteği 🍔'}</h2>
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Ürün Adı</label>
                                    <input type="text" value={newItemData.name} onChange={e => setNewItemData({ ...newItemData, name: e.target.value })} placeholder="Örn: Klasik Dürüm" className="w-full bg-background-alt border border-border rounded-xl py-4 px-6 font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Fiyat (TL)</label>
                                    <input type="number" value={newItemData.price} onChange={e => setNewItemData({ ...newItemData, price: e.target.value })} placeholder="150" className="w-full bg-background-alt border border-border rounded-xl py-4 px-6 font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Birim Tipi</label>
                                    <select value={newItemData.unitType} onChange={e => setNewItemData({ ...newItemData, unitType: e.target.value as any })} className="w-full bg-background-alt border border-border rounded-xl py-4 px-6 font-bold">
                                        <option value="gr">Gram (gr)</option>
                                        <option value="ml">Mililitre (ml)</option>
                                        <option value="portion">Porsiyon</option>
                                        <option value="piece">Adet</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Miktar</label>
                                    <input type="number" value={newItemData.unitAmount} onChange={e => setNewItemData({ ...newItemData, unitAmount: e.target.value })} placeholder="Örn: 100" className="w-full bg-background-alt border border-border rounded-xl py-4 px-6 font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Karşılaştırma Kategorisi</label>
                                    <input type="text" value={newItemData.baseCategory} onChange={e => setNewItemData({ ...newItemData, baseCategory: e.target.value })} placeholder="Örn: cigkofte, burger" className="w-full bg-background-alt border border-border rounded-xl py-4 px-6 font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Paket Tipi</label>
                                    <div className="flex gap-2 p-1 bg-background-alt border border-border rounded-xl h-[58px]">
                                        <button onClick={() => setNewItemData({ ...newItemData, isMenu: false })} className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${!newItemData.isMenu ? 'bg-white shadow-sm text-primary' : 'text-text-light'}`}>Tekil</button>
                                        <button onClick={() => setNewItemData({ ...newItemData, isMenu: true })} className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${newItemData.isMenu ? 'bg-white shadow-sm text-primary' : 'text-text-light'}`}>Menü</button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Açıklama</label>
                                <textarea value={newItemData.desc} onChange={e => setNewItemData({ ...newItemData, desc: e.target.value })} placeholder="Ürün içeriği ve detayları..." className="w-full bg-background-alt border border-border rounded-xl py-4 px-6 font-bold h-24 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowAddForm(false)} className="flex-1 py-5 bg-background-alt font-black rounded-2xl text-xs uppercase">Vazgeç</button>
                            <button onClick={handleSaveProduct} className="flex-1 py-5 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 text-xs uppercase tracking-widest">Onaya Gönder</button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkPriceModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40">
                    <div className="bg-surface w-full max-w-lg rounded-[2.5rem] p-10 border border-border shadow-2xl space-y-8">
                        <h2 className="text-2xl font-black text-text tracking-tighter">Fiyat Güncelleme İsteği</h2>
                        <div className="space-y-4">
                            <select value={bulkPriceData.mode} onChange={(e) => setBulkPriceData({ ...bulkPriceData, mode: e.target.value as any })} className="w-full bg-background-alt border border-border rounded-xl px-4 py-4 font-bold text-sm">
                                <option value="increase">Zam Yap (+)</option>
                                <option value="decrease">İndirim Yap (-)</option>
                            </select>
                            <input type="number" value={bulkPriceData.value} onChange={(e) => setBulkPriceData({ ...bulkPriceData, value: Number(e.target.value) })} className="w-full bg-background-alt border border-border rounded-xl px-4 py-4 font-bold text-lg" />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowBulkPriceModal(false)} className="flex-1 py-4 bg-background-alt font-black rounded-2xl text-xs uppercase">Vazgeç</button>
                            <button onClick={handleBulkPriceUpdate} className="flex-1 py-4 bg-primary text-white font-black rounded-2xl text-xs uppercase">Talebi Gönder</button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkPriceModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40">
                    <div className="bg-surface w-full max-w-lg rounded-[2.5rem] p-10 border border-border shadow-2xl space-y-8">
                        <h2 className="text-2xl font-black text-text tracking-tighter">Fiyat Güncelleme İsteği</h2>
                        <div className="space-y-4">
                            <select value={bulkPriceData.mode} onChange={(e) => setBulkPriceData({ ...bulkPriceData, mode: e.target.value as any })} className="w-full bg-background-alt border border-border rounded-xl px-4 py-4 font-bold text-sm">
                                <option value="increase">Zam Yap (+)</option>
                                <option value="decrease">İndirim Yap (-)</option>
                            </select>
                            <input type="number" value={bulkPriceData.value} onChange={(e) => setBulkPriceData({ ...bulkPriceData, value: Number(e.target.value) })} className="w-full bg-background-alt border border-border rounded-xl px-4 py-4 font-bold text-lg" />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowBulkPriceModal(false)} className="flex-1 py-4 bg-background-alt font-black rounded-2xl text-xs uppercase">Vazgeç</button>
                            <button onClick={handleBulkPriceUpdate} className="flex-1 py-4 bg-primary text-white font-black rounded-2xl text-xs uppercase">Talebi Gönder</button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK ADD MODAL WITH AI SCAN */}
            {showBulkAddModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40 animate-fadeIn">
                    <div className="bg-surface w-full max-w-3xl rounded-[2.5rem] p-10 border border-border shadow-2xl space-y-8 animate-scaleUp">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-text tracking-tighter uppercase flex items-center gap-3">
                                    <span>🧠</span> AI Menü Tarayıcı
                                </h2>
                                <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mt-1">PDF, Word veya Listeni anında menüye dönüştür.</p>
                            </div>
                            <button onClick={() => setShowBulkAddModal(false)} className="text-text-light hover:text-red-500 transition-colors">✕</button>
                        </div>

                        {isScanning ? (
                            <div className="py-20 flex flex-col items-center justify-center space-y-6">
                                <div className="relative w-24 h-24">
                                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">📄</div>
                                </div>
                                <div className="w-full max-w-xs space-y-2">
                                    <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-widest">
                                        <span>Dosya Analiz Ediliyor...</span>
                                        <span>%{Math.round(scanningProgress)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-background-alt rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${scanningProgress}%` }}></div>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-text-light animate-pulse italic">Yapay zeka ürünleri, fiyatları ve açıklamaları ayıklıyor...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* File Upload Zone */}
                                <div className="border-2 border-dashed border-border rounded-3xl p-10 flex flex-col items-center justify-center group hover:border-primary/50 transition-all bg-background-alt/30 cursor-pointer relative overflow-hidden">
                                    <input type="file" accept=".pdf,.doc,.docx,.txt,.jpg,.png" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                    <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">📁</div>
                                    <h4 className="text-sm font-black text-text tracking-tight uppercase">Menü Dosyasını Sürükle veya Seç</h4>
                                    <p className="text-[10px] font-bold text-text-light mt-2">PDF, Word, TXT veya Menü Fotoğrafı</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute -top-3 left-6 px-2 bg-surface text-[9px] font-black text-primary uppercase tracking-widest">Veya Manuel Giriş</div>
                                    <textarea
                                        value={bulkAddText}
                                        onChange={(e) => setBulkAddText(e.target.value)}
                                        placeholder="Ürün Adı, Fiyat, Açıklama (Her satıra bir ürün)"
                                        className="w-full bg-background-alt border border-border rounded-2xl p-6 font-bold text-xs h-48 focus:border-primary/50 outline-none transition-all no-scrollbar"
                                    />
                                </div>

                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                    <p className="text-[10px] font-bold text-primary flex items-center gap-2">
                                        <span>💡</span> İpucu: Ürünleri "Ad, Fiyat, Açıklama" şeklinde virgülle ayırarak yazabilirsiniz.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setShowBulkAddModal(false)} className="flex-1 py-5 bg-background-alt font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-surface transition-all">Vazgeç</button>
                                    <button
                                        onClick={handleBulkAdd}
                                        disabled={!bulkAddText.trim()}
                                        className="flex-3 py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        Ürünleri Menüye Aktar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CATEGORY MANAGER MODAL */}
            {showCategoryManager && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40 animate-fadeIn">
                    <div className="bg-surface w-full max-w-lg rounded-[2.5rem] p-10 border border-border shadow-2xl space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-text tracking-tighter uppercase">Kategorileri Yönet</h2>
                            <button onClick={() => setShowCategoryManager(false)} className="text-text-light hover:text-red-500">✕</button>
                        </div>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                            {categories.map(cat => (
                                <div key={cat} className="flex items-center justify-between p-4 bg-background-alt rounded-2xl border border-border group">
                                    <span className="font-bold text-sm tracking-tight">{cat}</span>
                                    <button
                                        onClick={() => handleDeleteCategory(cat)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white text-red-500/40 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                placeholder="Yeni kategori adı..."
                                className="flex-1 bg-background-alt border border-border rounded-xl px-4 py-4 font-bold text-sm"
                            />
                            <button
                                onClick={handleAddCategory}
                                className="px-6 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.05] transition-all"
                            >
                                Ekle
                            </button>
                        </div>

                        <button onClick={() => setShowCategoryManager(false)} className="w-full py-4 bg-background-alt font-black rounded-2xl text-[10px] uppercase tracking-widest">Kapat</button>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
