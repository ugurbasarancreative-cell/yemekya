'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DataStore from '@/lib/dataStore';

const TIPS = [
    "Öğle saatlerinde 'Menü Kampanyası' yaparak bugün cironu %15 daha artırabilirsin!",
    "Müşteri yorumlarına cevap vermek, restoranının listede daha üstte çıkmasını sağlar.",
    "Hafta sonu akşamları kurye sayısını artırmak teslimat hızını %25 iyileştirir.",
    "En çok satan ürününü öne çıkarmak için 'Restoranın Seçimi' etiketini kullan.",
    "Yağmurlu havalarda minimum sepet tutarını biraz artırarak operasyonu rahatlatabilirsin.",
    "Fotoğraflı yorumlar güveni %40 artırır; müşterilerine fotoğraf paylaşmayı hatırlat.",
    "Mutfak yoğunluk modunu kullanarak stresli anlarda teslimat sürelerini otomatik uzatabilirsin.",
    "İçeceklerde kampanya yapmak yan ürün satışlarını ortalama %20 tetikler.",
    "Gece 22:00'den sonra 'Gece Fırsatı' tanımlayarak durgun saatleri canlandır.",
    "Müşterilerin en çok sipariş verdiği saatleri Analitik sayfasından takip et.",
    "Tükenen ürünleri anında 'Stokta Yok' olarak işaretlemek iptalleri %80 azaltır.",
    "Düzenli müşterilerine özel indirim kodları göndererek sadakati artır.",
    "Yemek görsellerini profesyonel çekimlerle güncellemek sipariş oranını %35 artırır.",
    "Minimum paket tutarını bölge bazlı optimize ederek daha karlı teslimatlar yap.",
    "Siparişlerin yanına eklediğin küçük bir not veya hediye, müşteri puanını hızla yükseltir.",
    "Yeni eklediğin ürünler için ilk haftaya özel 'Tanışma İndirimi' kurgula.",
    "Mutfak fişi yazıcısının rulosunu yoğun saatler başlamadan önce kontrol et.",
    "Analitik sayfasındaki 'Yoğunluk Radarı'na bakarak personel planlaması yap.",
    "Kampanyalarını sosyal medyada paylaşarak dışarıdan daha fazla trafik çek.",
    "Menünde 'Vegan' veya 'Glutensiz' gibi etiketler kullanmak müşteri kitleni genişletir.",
    "En çok iptal edilen ürününün nedenini inceleyerek menüden çıkarmayı veya reçeteyi güncellemeyi düşün.",
    "Siparişlerin hazırlanma süresini gerçekçi tutmak şikayetleri %50 önler.",
    "Restoran açıklama kısmına işletmenizin en sevilen özelliğini (Örn: Odun ateşi) mutlaka yaz.",
    "Komisyon ödemelerini takip ederek platformda 'Güvenilir İşletme' statüsünü koru.",
    "Dönemsel (Ramazan, Yılbaşı vb.) özel menüler oluşturarak ilgi çek.",
    "Müşteri adreslerini 'Yoğunluk Haritası' üzerinden inceleyip kurye rotalarını optimize et.",
    "Popüler olmayan ürünlerin porsiyonlarını veya fiyatlarını güncelleyerek deneme yap.",
    "Geri bildirimlerde sürekli 'tuz' veya 'sıcaklık' şikayeti geliyorsa mutfak ekibiyle görüş.",
    "Menü başlıklarını ilgi çekici hale getir, sade başlıklar yerine iştah kabartıcı isimler kullan.",
    "Dashboard'daki günlük ciro hedefini takip ederek ekibini motive et."
];

export default function RestaurantDashboard() {
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [commission, setCommission] = useState({
        totalOrders: 0,
        grossRevenue: 0,
        commissionAmount: 0,
        couponsUsed: 0,
        netCommission: 0,
        pendingCommission: 0
    });
    const [accountingStatus, setAccountingStatus] = useState<any>(null);
    const [stats, setStats] = useState({
        todayOrders: 0,
        todayRevenue: '0',
        newReviews: 0,
        averageTime: '24 dk'
    });
    const [randomTip, setRandomTip] = useState(TIPS[0]);
    const [isStoreOpen, setIsStoreOpen] = useState(true);
    const [activeSound, setActiveSound] = useState('bell');
    const [prevOrderCount, setPrevOrderCount] = useState(0);
    const [restaurantInfo, setRestaurantInfo] = useState({ name: 'Restoran', id: '' });
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(1);

    // Sound Assets
    const SOUNDS: Record<string, { name: string, url: string }> = {
        'bell': { name: 'Klasik Zil 🔔', url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
        'cash': { name: 'Yazar Kasa 💰', url: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3' },
        'modern': { name: 'Modern Uyarı ✨', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
        'positive': { name: 'Başarılı ✅', url: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3' },
        'soft': { name: 'Yumuşak Uyarı 🎵', url: 'https://assets.mixkit.co/active_storage/sfx/2361/2361-preview.mp3' }
    };

    const playNotificationSound = (type: string) => {
        const sound = SOUNDS[type];
        if (!sound) return;

        const audio = new Audio(sound.url);
        audio.play().catch(err => console.warn('Ses çalınamadı (Kullanıcı etkileşimi gerekebilir):', err));
    };

    const toggleStore = () => {
        if (!restaurantInfo.id) return;
        const newState = !isStoreOpen;
        setIsStoreOpen(newState);
        localStorage.setItem(`yemekya_restaurant_status_${restaurantInfo.id}`, JSON.stringify({ isOpen: newState }));

        // Update core data status through DataStore
        const dataStore = DataStore.getInstance();
        dataStore.updateRestaurant(restaurantInfo.id, { status: newState ? 'open' : 'closed' });
    };

    useEffect(() => {
        // Tutorial Check
        if (!localStorage.getItem('yemekya_tutorial_complete')) {
            setShowTutorial(true);
        }

        const loadInitial = async () => {
            // Load Authentication and Info
            const userRaw = localStorage.getItem('yemekya_user');
            let currentId = '';
            if (userRaw) {
                const user = JSON.parse(userRaw);
                currentId = user.restaurantId || '';

                // Import DataStore and find full name
                const dataStore = DataStore.getInstance();
                const found = await dataStore.getRestaurant(currentId);
                if (found) {
                    setRestaurantInfo({ name: found.name, id: found.id });
                    setIsStoreOpen(found.status === 'open' || found.status === 'busy');
                } else {
                    setRestaurantInfo({
                        name: user.restaurantName || user.name || 'Restoran',
                        id: currentId
                    });
                }
            }

            // Load initial settings
            const randomIndex = Math.floor(Math.random() * TIPS.length);
            setRandomTip(TIPS[randomIndex]);

            const soundStored = localStorage.getItem('yemekya_sound_pref');
            if (soundStored) setActiveSound(soundStored);

            const syncData = async () => {
                const dataStore = DataStore.getInstance();
                if (!currentId) return;

                // 1. Order Stats
                const allOrders = await dataStore.getOrders();
                const myOrders = allOrders.filter((o: any) => o.restaurant_id === currentId || o.restaurantId === currentId);
                setRecentOrders(myOrders.slice(-4).reverse());

                // Check for new orders
                if (myOrders.length > prevOrderCount && prevOrderCount !== 0) {
                    playNotificationSound(activeSound);
                }
                setPrevOrderCount(myOrders.length);

                // 2. Financial & Accounting Stats
                const commData = await dataStore.getRestaurantCommission(currentId);
                setCommission(commData);

                const accStatus = await dataStore.getRestaurantAccountingStatus(currentId);
                setAccountingStatus(accStatus);

                // 3. Overall Performance Stats
                const resStats = await dataStore.getRestaurantStats(currentId);
                setStats({
                    todayOrders: resStats.todayOrders,
                    todayRevenue: resStats.todayRevenue.toLocaleString('tr-TR'),
                    newReviews: resStats.reviewCount,
                    averageTime: resStats.totalOrders > 0 ? '22 dk' : '-',
                    ...resStats // merge for satisfactionRate etc.
                });
            };

            await syncData();
            window.addEventListener('storage', syncData);
            window.addEventListener('restaurant-update', syncData);
            window.addEventListener('commission-update', syncData);
            // Poll for quick updates
            const interval = setInterval(syncData, 5000);

            return () => {
                window.removeEventListener('storage', syncData);
                window.removeEventListener('restaurant-update', syncData);
                window.removeEventListener('commission-update', syncData);
                clearInterval(interval);
            };
        };

        loadInitial();
    }, [activeSound, prevOrderCount]);

    const changeSound = (sound: string) => {
        setActiveSound(sound);
        localStorage.setItem('yemekya_sound_pref', sound);
        playNotificationSound(sound);
    };

    const completeTutorial = () => {
        localStorage.setItem('yemekya_tutorial_complete', 'true');
        setShowTutorial(false);
    };

    return (
        <div className="space-y-8 animate-fadeIn">

            {/* ACCOUNTING WARNING BANNERS */}
            {accountingStatus && accountingStatus.penaltyLevel > 0 && accountingStatus.penaltyLevel < 3 && (
                <div className="space-y-4">
                    {accountingStatus.unpaidPeriods.filter((p: any) => p.graceExpired).map((period: any, idx: number) => (
                        <div key={idx} className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex items-center gap-6 animate-pulse">
                            <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-red-500/20">⌛</div>
                            <div className="flex-1">
                                <h4 className="text-red-500 font-black uppercase text-xs tracking-widest mb-1">Hizmet Bedeli Ödeme Bildirimi</h4>
                                <p className="text-sm font-bold text-red-500/80">
                                    {period.start} - {period.end} tarihlerine ait hizmet bedeli ödemeniz bulunmaktadır.
                                    Lütfen 5 iş günü içinde ödeme yapınız, aksi halde sipariş alımınız durdurulabilir.
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* LEVEL 3 LOCKOUT OVERLAY */}
            {accountingStatus && accountingStatus.penaltyLevel >= 3 && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/90 animate-fadeIn">
                    <div className="bg-surface w-full max-w-2xl rounded-[3.5rem] p-12 border border-red-500/30 shadow-[0_0_100px_rgba(239,68,68,0.2)] text-center space-y-8">
                        <div className="w-24 h-24 bg-red-500 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto shadow-2xl shadow-red-500/40 animate-bounce">🚫</div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Panel Erişimi Durduruldu</h2>
                            <p className="text-lg font-bold text-red-500">Kritik Ödeme Gecikmesi!</p>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                                {accountingStatus.unpaidPeriods.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm font-bold text-white/60">
                                        <span>{p.start} - {p.end}</span>
                                        <span className="text-red-400">{p.netCommission.toFixed(2)} TL</span>
                                    </div>
                                ))}
                                <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xl font-black text-white">
                                    <span>Toplam Borç:</span>
                                    <span className="text-red-500">{accountingStatus.totalPending.toFixed(2)} TL</span>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-white/40 uppercase tracking-widest leading-relaxed mt-4">
                                "5 iş günü içinde ödeme yapmadığınız takdirde sipariş alımınız durdurulacak."
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.href = 'mailto:destek@yemekya.com'}
                            className="w-full py-6 bg-red-500 text-white font-black rounded-3xl text-sm uppercase tracking-widest shadow-2xl shadow-red-500/40 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            YÖNETİME YAZ (DESTEK)
                        </button>
                    </div>
                </div>
            )}

            {/* TUTORIAL MODAL */}
            {showTutorial && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40 animate-fadeIn">
                    <div className="bg-surface w-full max-w-lg rounded-[3rem] p-10 border border-border shadow-2xl relative overflow-hidden">
                        {/* Tutorial Progress */}
                        <div className="flex gap-2 mb-8">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= tutorialStep ? 'bg-primary' : 'bg-background-alt'}`} />
                            ))}
                        </div>

                        {tutorialStep === 1 && (
                            <div className="space-y-6 animate-slideUp">
                                <div className="text-6xl text-center">🚀</div>
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-black text-text italic">YemekYa Dünyasına Hoş Geldin!</h2>
                                    <p className="text-sm font-bold text-text-light">İşletmeni büyütmek için ihtiyacın olan her şey bu panelde. Kısa bir gezintiye ne dersin?</p>
                                </div>
                                <button onClick={() => setTutorialStep(2)} className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 text-xs uppercase tracking-widest">Başlayalım</button>
                            </div>
                        )}

                        {tutorialStep === 2 && (
                            <div className="space-y-6 animate-slideUp">
                                <div className="text-6xl text-center">🍱</div>
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-black text-text italic">Menünü Yönet</h2>
                                    <p className="text-sm font-bold text-text-light">Sol menüdeki "Menü Yönetimi" kısmından ürünlerini ekleyebilir, fiyatlarını güncelleyebilir ve stok durumunu kontrol edebilirsin.</p>
                                </div>
                                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-[10px] font-black text-primary uppercase text-center italic">
                                    💡 İPUCU: Yeni ürünlerin admin tarafından onaylanması gerekir.
                                </div>
                                <button onClick={() => setTutorialStep(3)} className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 text-xs uppercase tracking-widest">Sıradaki</button>
                            </div>
                        )}

                        {tutorialStep === 3 && (
                            <div className="space-y-6 animate-slideUp">
                                <div className="text-6xl text-center">📊</div>
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-black text-text italic">Sipariş & Analiz</h2>
                                    <p className="text-sm font-bold text-text-light">Dashboard üzerinden anlık cironu takip et. "Siparişler" sekmesinden gelen talepleri hazırla ve kuryeye teslim et.</p>
                                </div>
                                <button onClick={completeTutorial} className="w-full py-5 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-500/20 text-xs uppercase tracking-widest">Kullanmaya Başla!</button>
                            </div>
                        )}

                        <button onClick={completeTutorial} className="absolute top-6 right-6 text-text-light hover:text-primary transition-colors">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* WELCOME SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-text tracking-tighter">Hoş Geldin, {restaurantInfo.name}! 👋</h1>
                    <p className="text-text-light font-bold">Bugün restoranında işler harika gidiyor. İşte son durum:</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleStore}
                        className={`px-6 py-3 rounded-2xl font-black text-white shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95 ${isStoreOpen ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'}`}
                    >
                        <span className="text-xl">{isStoreOpen ? '🔓' : '🔒'}</span>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[9px] uppercase tracking-widest opacity-80">Restoran Durumu</span>
                            <span className="text-sm">{isStoreOpen ? 'AÇIK' : 'KAPALI'}</span>
                        </div>
                    </button>

                    <Link href="/restaurant-panel/menu" className="px-6 py-3 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center gap-2">
                        <span>➕</span><span className="hidden sm:inline">Yeni Ürün</span>
                    </Link>
                </div>
            </div>

            {/* FINANCIAL SUMMARY BAR */}
            <div className="bg-gradient-to-r from-primary to-secondary p-8 rounded-[2.5rem] text-white shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/20">💰</div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Haftalık Biriken Net Komisyon</p>
                            <h2 className="text-4xl font-black italic tracking-tighter">
                                {commission.pendingCommission.toFixed(2)} TL
                            </h2>
                            <p className="text-[10px] font-bold opacity-60 mt-1 uppercase">Pazartesi 00:00'dan itibaren biriken tutar (%5 Komisyon - Kuponlar)</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Kupon Kullanımı</p>
                            <p className="text-xl font-black text-accent">{commission.couponsUsed.toFixed(2)} TL</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Brüt Ciro</p>
                            <p className="text-xl font-black">{commission.grossRevenue.toFixed(2)} TL</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SOUND SETTINGS (Mini) */}
            <div className="bg-surface p-4 rounded-2xl border border-border flex flex-col md:flex-row items-center gap-4 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xl">🔔</span>
                    <span className="text-xs font-black uppercase tracking-widest text-text-light">Bildirim Sesi Seçimi:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {Object.keys(SOUNDS).map(key => (
                        <button
                            key={key}
                            onClick={() => changeSound(key)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${activeSound === key ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-background-alt text-text-light border-transparent hover:border-primary/30'}`}
                        >
                            {SOUNDS[key].name}
                        </button>
                    ))}
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Bugünkü Sipariş', value: stats.todayOrders, icon: '📦', color: 'bg-blue-500/10 text-blue-500' },
                    { label: 'Günlük Ciro', value: `${stats.todayRevenue} TL`, icon: '💰', color: 'bg-green-500/10 text-green-500' },
                    { label: 'Yeni Yorumlar', value: stats.newReviews, icon: '⭐', color: 'bg-amber-500/10 text-amber-500' },
                    { label: 'Hazırlama Hızı', value: stats.averageTime, icon: '⏱️', color: 'bg-purple-500/10 text-purple-500' },
                ].map((item, i) => (
                    <div key={i} className="bg-surface p-6 rounded-[2.5rem] border border-border shadow-premium group hover:-translate-y-1 transition-all duration-300">
                        <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                            {item.icon}
                        </div>
                        <p className="text-[10px] font-black text-text-light uppercase tracking-widest">{item.label}</p>
                        <h3 className="text-2xl font-black text-text mt-1">{item.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* RECENT ORDERS TABLE */}
                <div className="lg:col-span-2 bg-surface rounded-[2.5rem] border border-border shadow-premium overflow-hidden">
                    <div className="p-8 border-b border-border flex items-center justify-between">
                        <h3 className="text-xl font-black text-text tracking-tight">Son Siparişler</h3>
                        <Link href="/restaurant-panel/orders" className="text-xs font-black text-primary hover:underline uppercase tracking-widest">Tümünü Gör</Link>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-background-alt/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-text-light uppercase tracking-widest">Sipariş ID</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-text-light uppercase tracking-widest">Müşteri</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-text-light uppercase tracking-widest">Tutar</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-text-light uppercase tracking-widest">Durum</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-text-light uppercase tracking-widest"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {recentOrders.map((order) => {
                                    const getStatusColor = (status: string) => {
                                        switch (status) {
                                            case 'Yeni': return 'bg-blue-500';
                                            case 'Hazırlanıyor': return 'bg-amber-500';
                                            case 'Hazır': return 'bg-purple-500';
                                            case 'Yolda': return 'bg-indigo-500';
                                            case 'Teslim Edildi': return 'bg-green-500';
                                            default: return 'bg-gray-500';
                                        }
                                    };
                                    return (
                                        <tr key={order.id} className="group hover:bg-background-alt/30 transition-colors">
                                            <td className="px-8 py-5 text-sm font-black text-primary">{order.id.startsWith('#') ? order.id : `#${order.id}`}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-text">{order.customer || 'Misafir'}</span>
                                                    <span className="text-[10px] text-text-light font-medium truncate w-32">{order.items?.map((i: any) => `${i.qty || i.quantity}x ${i.name}`).join(', ') || 'Ürün bilgisi yok'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-black text-text">{(Number(order.total) || 0).toFixed(2)} TL</td>
                                            <td className="px-8 py-5 text-[10px]">
                                                <span className={`px-3 py-1 rounded-full text-white font-black uppercase tracking-tighter shadow-sm ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <Link href="/restaurant-panel/orders" className="w-8 h-8 bg-background-alt rounded-lg flex items-center justify-center text-text-light hover:bg-primary hover:text-white transition-all">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PERFORMANCE / TIPS */}
                <div className="bg-surface rounded-[2.5rem] border border-border shadow-premium p-8 space-y-8">
                    <h3 className="text-xl font-black text-text tracking-tight uppercase tracking-tighter">Performans Özeti</h3>

                    <div className="space-y-6">
                        {/* Satisfaction Rate */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-black text-text-light uppercase tracking-widest">Müşteri Memnuniyeti</span>
                                <span className="text-sm font-black text-primary">
                                    {stats.newReviews > 0 ? `%${(stats as any).satisfactionRate}` : '%100'}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-background-alt rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-1000"
                                    style={{ width: stats.newReviews > 0 ? `${(stats as any).satisfactionRate}%` : '100%' }}
                                />
                            </div>
                        </div>

                        {/* Prep Performance */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-black text-text-light uppercase tracking-widest">Sipariş Hazırlama</span>
                                <span className="text-sm font-black text-amber-500">{stats.todayOrders > 0 ? '%92' : '%100'}</span>
                            </div>
                            <div className="h-2 w-full bg-background-alt rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-1000"
                                    style={{ width: stats.todayOrders > 0 ? '92%' : '100%' }}
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-dashed border-border mt-6">
                            <div className="bg-primary/5 rounded-3xl p-6 relative overflow-hidden group min-h-[160px] flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                                <div>
                                    <span className="text-2xl mb-2 block">💡</span>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Süper İpucu!</h4>
                                    <p className="text-[11px] font-bold text-text-light leading-relaxed animate-fadeIn">
                                        {randomTip}
                                    </p>
                                </div>
                                <Link href="/restaurant-panel/campaigns" className="mt-4 text-[9px] font-black text-primary underline uppercase tracking-widest block">Aksiyon Al</Link>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
