'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/components/ThemeProvider';
import DataStore, { Restaurant, MenuItem, MenuCategory, OrderItem, Review, Address, Order, User } from '@/lib/dataStore';

interface ExtendedRestaurant extends Omit<Restaurant, 'tags' | 'categories' | 'rating'> {
    tags: string[];
    rating: number;
    isSuper: boolean;
    reviewCount: string;
    categories: { id: string, name: string }[];
    products: MenuCategory[];
    isZoneClosed?: boolean;
    dynamicDeliveryFee?: number;
    deliveryTime: string;
}

const StarRating = ({ rating, size = 16, activeColor = "text-orange-500" }: { rating: number, size?: number, activeColor?: string }) => {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill={star <= Math.round(rating) ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    className={star <= Math.round(rating) ? activeColor : "text-gray-300"}
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    );
};

export default function RestaurantDetailClient({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const { isDark, toggleTheme } = useTheme();
    const params = use(paramsPromise);
    const router = useRouter();
    const [restaurant, setRestaurant] = useState<ExtendedRestaurant | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'menu' | 'reviews'>('menu');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [isOrderSuccess, setIsOrderSuccess] = useState(false);
    const [basket, setBasket] = useState<OrderItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
    const [customOptions, setCustomOptions] = useState<any[]>([]);
    const [isProductFavorite, setIsProductFavorite] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [productNote, setProductNote] = useState("");
    const [reviews, setReviews] = useState<any[]>([]);
    const [newReview, setNewReview] = useState({ lezzet: 5, servis: 5, teslimat: 5, comment: "" });
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [pendingItem, setPendingItem] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [statusOverride, setStatusOverride] = useState<boolean | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [user, setUser] = useState<User | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [priceAnalysis, setPriceAnalysis] = useState<any>(null);
    const [showSavingsModal, setShowSavingsModal] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('yemekya_user');
        if (stored) {
            const u = JSON.parse(stored);
            setUser(u);
            setIsFavorite(u.favorites?.includes(params.id) || false);
        }
    }, [params.id]);

    const toggleFavorite = async () => {
        if (!user) {
            setToast({ message: "Favorilere eklemek için lütfen giriş yapın.", type: "error" });
            return;
        }
        const store = DataStore.getInstance();
        const currentFavorites = user.favorites || [];
        const newFavorites = isFavorite
            ? currentFavorites.filter(id => id !== params.id)
            : [...currentFavorites, params.id];

        await store.updateUser(user.email, { favorites: newFavorites });
        setIsFavorite(!isFavorite);
        setToast({ message: isFavorite ? "Favorilerden kaldırıldı." : "Favorilere eklendi!", type: "success" });
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('restaurant-update'));
    };

    useEffect(() => {
        const fetchRestaurant = async () => {
            const dataStore = DataStore.getInstance();
            const found = await dataStore.getRestaurant(params.id);

            if (found) {
                const rawCategories = (found as any).categories || ['Menüler'];
                const mappedCategories = rawCategories.map((c: string) => ({
                    id: c.toLowerCase().replace(/\s+/g, '-'),
                    name: c
                }));

                const menuItems = found.menu || [];
                const groupedProducts = mappedCategories.map((cat: any) => ({
                    categoryId: cat.id,
                    items: menuItems
                        .filter((m: any) => m.category === cat.name || (!m.category && cat.name === 'Menüler'))
                        .map((m: any) => ({
                            ...m,
                            name: m.name,
                            desc: m.desc || m.description || "Özel lezzet seçeneği",
                            price: m.price,
                            oldPrice: null,
                            image: m.image || "🥘",
                            stock: (m as any).stock !== undefined ? (m as any).stock : true
                        }))
                })).filter((group: any) => group.items.length > 0);

                if (groupedProducts.length === 0 && menuItems.length > 0) {
                    groupedProducts.push({
                        categoryId: mappedCategories[0].id,
                        items: menuItems.map((m: any) => ({
                            ...m,
                            name: m.name,
                            desc: m.desc || m.description || "Özel lezzet seçeneği",
                            price: m.price,
                            oldPrice: null,
                            image: m.image || "🥘",
                            stock: (m as any).stock !== undefined ? (m as any).stock : true
                        }))
                    });
                }

                let dynamicMinBasket = found.minBasket || 200;
                let dynamicDeliveryFee = found.deliveryFee || 0;
                let zoneStatus = 'Aktif';

                const storedAddresses = localStorage.getItem('yemekya_addresses');
                const activeAddr = storedAddresses ? JSON.parse(storedAddresses).find((a: any) => a.isActive) : null;

                if (activeAddr?.neighborhood) {
                    const zoneKey = `yemekya_delivery_zones_${found.id}`;
                    const rawZones = localStorage.getItem(zoneKey);
                    if (rawZones) {
                        const zones = JSON.parse(rawZones);
                        const currentZone = zones.find((z: any) => z.neighborhood === activeAddr.neighborhood);
                        if (currentZone) {
                            dynamicMinBasket = currentZone.minAmount;
                            dynamicDeliveryFee = currentZone.deliveryFee;
                            zoneStatus = currentZone.status;
                        }
                    }
                }

                const mapped: ExtendedRestaurant = {
                    ...found,
                    tags: ((found as any).tags || "Restoran").toString().split(',').map((s: string) => s.trim()),
                    rating: Number((found as any).rating) || 0,
                    reviewCount: (found as any).totalOrders ? `${(found as any).totalOrders}+` : "Yeni",
                    minBasket: dynamicMinBasket,
                    deliveryTime: (found as any).time || "30-45 dk",
                    isSuper: (Number((found as any).rating) || 0) > 9.0,
                    phone: (found as any).phone || "0212 000 00 00",
                    address: (found as any).address || "Adres bilgisi girilmemiş.",
                    openTime: (found as any).openTime || 9,
                    closeTime: (found as any).closeTime || 23,
                    categories: mappedCategories,
                    isZoneClosed: zoneStatus === 'Kapalı',
                    dynamicDeliveryFee: dynamicDeliveryFee,
                    products: groupedProducts.length > 0 ? groupedProducts : [
                        {
                            categoryId: mappedCategories[0]?.id || 'genel',
                            items: []
                        }
                    ]
                };
                setRestaurant(mapped);
                if (mappedCategories.length > 0) setActiveCategory(mappedCategories[0].id);
            }
        };
        fetchRestaurant();
    }, [params.id]);

    useEffect(() => {
        const checkStatus = () => {
            const stored = localStorage.getItem(`yemekya_restaurant_status_${params.id}`);
            if (stored) {
                setStatusOverride(JSON.parse(stored).isOpen);
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, [params.id]);

    useEffect(() => {
        const existingCheckout = localStorage.getItem('yemekya_checkout');
        if (existingCheckout) {
            const data = JSON.parse(existingCheckout);
            if (data?.restaurant?.id === params.id) {
                setBasket(data.items || []);
            }
        }

        const preBasket = localStorage.getItem('yemekya_pre_basket');
        if (preBasket) {
            const data = JSON.parse(preBasket);
            if (existingCheckout) {
                const checkout = JSON.parse(existingCheckout);
                if (checkout?.restaurant?.id !== params.id && (checkout?.items?.length || 0) > 0) {
                    setPendingItem(data.items[0]);
                    setShowConflictModal(true);
                    localStorage.removeItem('yemekya_pre_basket');
                    return;
                }
            }

            setBasket(prev => {
                const items = [...prev];
                data.items.forEach((newItem: any) => {
                    const existing = items.find(i => i.name === newItem.name && JSON.stringify(i.options) === JSON.stringify(newItem.options || []));
                    if (existing) existing.quantity += (newItem.quantity || 1);
                    else items.push({ ...newItem, id: newItem.id || Date.now().toString() });
                });
                return items;
            });
            localStorage.removeItem('yemekya_pre_basket');
        }
        setIsLoaded(true);
    }, [params.id]);

    const basketTotal = basket.reduce((acc, item) => {
        const itemOptionsPrice = item.options?.reduce((oa: any, oi: any) => oa + oi.price, 0) || 0;
        return acc + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);

    useEffect(() => {
        if (!isLoaded || !restaurant) return;
        const checkoutData = {
            restaurant: restaurant,
            items: basket,
            total: basketTotal
        };
        localStorage.setItem('yemekya_checkout', JSON.stringify(checkoutData));
    }, [basket, basketTotal, isLoaded, restaurant]);

    useEffect(() => {
        const storedReviews = localStorage.getItem(`yemekya_reviews_${params.id}`);
        if (storedReviews) {
            setReviews(JSON.parse(storedReviews));
        } else {
            const defaultReviews = [
                { id: 1, user: "Ahmet Y.", scores: { lezzet: 5, servis: 5, teslimat: 5 }, date: "2 gün önce", comment: "Tantunisi harika, etler lokum gibi. Sıcak geldi. Teşekkürler!", likes: 12, likedBy: [], reply: "Afiyet olsun Ahmet Bey, her zaman bekleriz!", products: ["Tavuk Tantuni Dürüm", "Somun Ekmek Arası Et Tantuni"] },
                { id: 2, user: "Merve K.", scores: { lezzet: 4, servis: 3, teslimat: 5 }, date: "1 hafta önce", comment: "Lezzet güzeldi ama yoğunluktan dolayı servis biraz yavaştı. Yine de tercih edilir.", likes: 5, likedBy: [], reply: null, products: ["Et Tantuni"] },
                { id: 3, user: "Can S.", scores: { lezzet: 5, servis: 4, teslimat: 4 }, date: "2 hafta önce", comment: "Sürekli sipariş verdiğim bir yer. Yoğurtlu tantunisi favorim.", likes: 8, likedBy: [], reply: null, products: ["Yoğurtlu Tavuk Tantuni"] },
            ];
            setReviews(defaultReviews);
            localStorage.setItem(`yemekya_reviews_${params.id}`, JSON.stringify(defaultReviews));
        }
    }, [params.id]);

    if (!restaurant) return <div className="min-h-screen bg-background flex items-center justify-center font-black text-2xl animate-pulse text-primary">Yükleniyor...</div>;

    const categories = restaurant.categories;
    const products = restaurant.products;

    const currentHour = new Date().getHours();
    const isScheduleOpen = currentHour >= (restaurant.openTime || 9) && currentHour < (restaurant.closeTime || 23);
    const isOpen = statusOverride !== null ? statusOverride : isScheduleOpen;
    const minBasketRemaining = Math.max(0, restaurant.minBasket - basketTotal);

    const handleCompleteOrder = () => {
        const checkoutData = {
            restaurant: restaurant,
            items: basket,
            total: basketTotal
        };
        localStorage.setItem('yemekya_checkout', JSON.stringify(checkoutData));
        router.push('/checkout');
    };

    const scrollToCategory = (id: string) => {
        setActiveCategory(id);
        const element = document.getElementById(id);
        if (element) {
            const headerOffset = 180;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
    };

    const onMouseDown = (e: React.MouseEvent) => {
        const el = document.getElementById('filter-container');
        if (!el) return;
        setIsDragging(true);
        setStartX(e.pageX - el.offsetLeft);
        setScrollLeft(el.scrollLeft);
    };

    const onMouseStop = () => setIsDragging(false);

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const el = document.getElementById('filter-container');
        if (!el) return;
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 2;
        el.scrollLeft = scrollLeft - walk;
    };

    const closeReviewModal = () => {
        setIsReviewOpen(false);
        setActiveTab('menu');
    };

    const addToBasket = async (item: MenuItem) => {
        if (!isOpen) return;

        // Akıllı Tasarruf Kontrolü
        const store = DataStore.getInstance();
        const analysis = await store.getPriceIntelligence(item, params.id);

        if (analysis && analysis.isExpensive) {
            setPriceAnalysis({ ...analysis, targetItem: item });
            setShowSavingsModal(true);
            return;
        }

        if (item.options && item.options.length > 0) {
            setSelectedProduct(item);
            setCustomOptions([]);
            setProductNote("");
            return;
        }
        performAdd(item);
    };

    const performAdd = (item: MenuItem, options: any[] = [], note: string = "") => {
        const existingCheckout = localStorage.getItem('yemekya_checkout');
        if (existingCheckout) {
            const data = JSON.parse(existingCheckout);
            if (data.restaurant.id !== params.id && (data.items?.length || 0) > 0) {
                setPendingItem({ ...item, options, note });
                setShowConflictModal(true);
                return;
            }
        }
        setBasket(prev => {
            const optionString = JSON.stringify(options);
            const existing = prev.find(i => i.name === item.name && JSON.stringify(i.options) === optionString && i.note === note);
            if (existing) {
                return prev.map(i => (i.name === item.name && JSON.stringify(i.options) === optionString && i.note === note) ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { id: item.id || Date.now().toString(), name: item.name, price: item.price, image: item.image, quantity: 1, options, note } as OrderItem];
        });
        setSelectedProduct(null);
    };

    const clearBasketAndAdd = () => {
        if (!pendingItem) return;
        setBasket([{ id: pendingItem.id || Date.now().toString(), name: pendingItem.name, price: pendingItem.price, image: pendingItem.image, quantity: 1, options: pendingItem.options || [], note: pendingItem.note || "" } as OrderItem]);
        setShowConflictModal(false);
        setPendingItem(null);
    };

    const updateQuantity = (name: string, delta: number) => {
        setBasket(prev => {
            return prev.map(item => {
                if (item.name === name) {
                    const newQty = Math.max(0, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    };

    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <header className="bg-surface sticky top-0 z-50 border-b border-gray-100 shadow-sm h-16 md:h-20">
                <div className="container h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="bg-background-alt p-2 rounded-xl group-hover:bg-primary/10 transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text group-hover:text-primary"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            </div>
                            <span className="font-bold text-sm hidden md:block text-text group-hover:text-primary transition-colors">YemekYa</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center bg-background-alt rounded-full px-4 py-2 border border-transparent focus-within:border-primary focus-within:shadow-[0_0_0_2px_rgba(124,58,237,0.1)] transition-all w-64">
                            <svg className="text-text-light" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                            <input type="text" placeholder="Menüde ara..." className="bg-transparent border-none outline-none text-sm ml-2 w-full text-text placeholder:text-text-light/40" />
                        </div>
                        <button
                            onClick={() => {
                                setIsProductFavorite(!isProductFavorite);
                                if (!isProductFavorite) {
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                }
                            }}
                            className={`p-2 rounded-full transition-all ${isProductFavorite ? 'bg-red-50 text-red-500' : 'hover:bg-background-alt text-text-light hover:text-primary'}`}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={isProductFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="bg-surface border-b border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative z-10 pb-4">
                <div className="relative h-[200px] md:h-[280px] w-full bg-gray-200 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-9xl select-none opacity-30">{restaurant.img || '🌯'}</div>
                    {restaurant.isSuper && (
                        <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-extrabold px-3 py-1.5 rounded shadow-md flex items-center gap-1 z-20">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-accent"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" /></svg>
                            YEMEKYA SÜPER
                        </div>
                    )}
                </div>

                <div className="container relative z-20 -mt-16 md:-mt-20">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white p-1 shadow-lg shrink-0 relative group md:ml-4">
                            <div className="w-full h-full rounded-xl bg-background-alt border border-gray-100 flex items-center justify-center text-4xl overflow-hidden relative">
                                <span className="group-hover:scale-110 transition-transform duration-500">{restaurant.img || '🥙'}</span>
                                <div className="absolute bottom-2 right-2 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center pt-20 md:pt-24">
                            <div className="flex items-center gap-2 mb-1 text-text-light text-xs font-semibold uppercase tracking-wide">
                                {restaurant.tags?.join(" • ")}
                            </div>
                            <h1 className="text-2xl md:text-4xl font-extrabold text-primary mb-3 flex items-center gap-3">
                                {restaurant.name}
                                <div className="flex items-center gap-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-accent hidden md:block w-6 h-6"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                                    <button
                                        onClick={toggleFavorite}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all bg-background-alt border border-border hover:scale-110 active:scale-95 ${isFavorite ? 'text-red-500 bg-red-50 border-red-200' : 'text-text-light hover:text-red-500'}`}
                                    >
                                        {isFavorite ? '❤️' : '🤍'}
                                    </button>
                                </div>
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                <div className="flex items-center gap-1.5 bg-primary text-white px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm shadow-primary/30 cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsReviewOpen(true)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                    <span>{restaurant.rating}</span>
                                    <span className="bg-white/20 px-1.5 rounded text-[10px] ml-1 opacity-90">({restaurant.reviewCount})</span>
                                </div>
                                <div className="h-4 w-px bg-gray-200"></div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] text-text-light font-bold uppercase">Teslimat</span>
                                    <span className="text-sm font-bold text-text">{restaurant.deliveryTime}</span>
                                </div>
                                <div className="h-4 w-px bg-gray-200"></div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] text-text-light font-bold uppercase">Min. Tutar</span>
                                    <span className="text-sm font-bold text-text">{restaurant.minBasket} TL</span>
                                </div>
                                <div className="h-4 w-px bg-gray-200"></div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] text-text-light font-bold uppercase tracking-wider">Durum</span>
                                    <span className={`text-sm font-black ${isOpen ? 'text-green-500' : 'text-red-500'}`}>{isOpen ? 'Açık' : 'Şu An Kapalı'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {restaurant.isZoneClosed && (
                <div className="container mt-6">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 flex items-center gap-6 animate-shake">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-3xl">🚫</div>
                        <div>
                            <h4 className="font-black text-red-600 text-lg uppercase tracking-tight">Bu Mahalle Gönderim Alanı Dışında</h4>
                            <p className="text-sm font-bold text-red-500 opacity-80 mt-1">Maalesef bu restoran şu an bulunduğunuz bölgeye teslimat yapmamaktadır.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="container mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
                {/* Fixed Category Sidebar */}
                <aside className="lg:col-span-3 shrink-0 pb-4 lg:sticky lg:top-24 z-30">
                    <div className="bg-surface lg:rounded-2xl lg:border border-gray-100 lg:shadow-sm overflow-hidden sticky top-[64px] lg:static">
                        <div className="p-4 bg-surface lg:bg-transparent border-b border-gray-100 lg:border-none">
                            <h3 className="font-extrabold text-primary text-sm uppercase tracking-wider mb-2 hidden lg:block text-center">Menü Kategorileri</h3>
                            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible no-scrollbar pb-1 lg:pb-0 px-1 lg:px-0">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => scrollToCategory(cat.id)}
                                        className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center justify-between group
                                            ${activeCategory === cat.id ? 'bg-primary text-white shadow-md' : 'bg-background-alt lg:bg-transparent text-text-light hover:bg-background-alt hover:text-primary'}
                                        `}
                                    >
                                        {cat.name}
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`ml-2 transition-transform ${activeCategory === cat.id ? 'rotate-90' : 'group-hover:translate-x-1'}`}><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Product List */}
                <main className="lg:col-span-6 w-full min-w-0">
                    <div className="space-y-12">
                        {products.map((catProducts, index) => (
                            <section key={index} id={catProducts.categoryId} className="scroll-mt-32">
                                <h2 className="text-xl font-extrabold text-text mb-5 flex items-center gap-3">
                                    {categories.find(c => c.id === catProducts.categoryId)?.name || 'Kategori'}
                                    <span className="text-xs font-normal text-text-light bg-gray-100 px-2 py-0.5 rounded-full">{catProducts.items.length} Ürün</span>
                                </h2>
                                <div className="grid grid-cols-1 gap-4">
                                    {catProducts.items.map((product, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => isOpen && addToBasket(product)}
                                            className={`bg-surface p-4 rounded-2xl border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group cursor-pointer flex gap-4 h-full relative overflow-hidden ${!isOpen ? 'opacity-70 grayscale-[0.5]' : ''}`}
                                        >
                                            <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-background-alt rounded-lg flex items-center justify-center text-5xl group-hover:scale-105 transition-transform duration-500">
                                                {product.image}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-bold text-text group-hover:text-primary transition-colors line-clamp-2 leading-tight">{product.name}</h3>
                                                    <span className="text-base font-black text-primary whitespace-nowrap">{product.price} TL</span>
                                                </div>
                                                <p className="text-xs text-text-light line-clamp-2 leading-relaxed mt-1 mb-auto">{product.desc}</p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex items-center gap-2">
                                                        {product.oldPrice && <span className="text-xs text-text-light line-through opacity-50">{product.oldPrice} TL</span>}
                                                        {product.oldPrice && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">%{(100 - (product.price / product.oldPrice * 100)).toFixed(0)} İndirim</span>}
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-primary text-white shadow-lg shadow-primary/20 group-hover:scale-110 active:scale-90' : 'bg-gray-200 text-text-light cursor-not-allowed'}`}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </main>

                {/* Basket Sidebar */}
                <aside className="lg:col-span-3 lg:sticky lg:top-24 hidden lg:block z-30">
                    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-surface-alt">
                            <h3 className="font-extrabold text-sm uppercase tracking-wider text-primary">Sepetim</h3>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black">{basket.reduce((a, b) => a + b.quantity, 0)} Ürün</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-200">
                            {basket.length === 0 ? (
                                <div className="text-center py-10 space-y-4">
                                    <div className="text-4xl opacity-20">🛒</div>
                                    <p className="text-xs font-bold text-text-light">Sepetiniz şu an boş. Hemen bir şeyler ekleyin!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {basket.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 p-3 bg-background-alt rounded-xl border border-transparent hover:border-gray-200 transition-all group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-bold text-text truncate">{item.name}</h4>
                                                    <p className="text-[10px] font-medium text-text-light mt-0.5">
                                                        {(item.price + (item.options?.reduce((oa: any, oi: any) => oa + oi.price, 0) || 0))} TL
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
                                                    <button onClick={() => updateQuantity(item.name, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-red-50 hover:text-red-500 rounded transition-colors">-</button>
                                                    <span className="text-[11px] font-black min-w-[20px] text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.name, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-green-50 hover:text-green-500 rounded transition-colors">+</button>
                                                </div>
                                            </div>
                                            {item.options && item.options.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.options.map((opt: any, oi: number) => (
                                                        <span key={oi} className="text-[8px] font-bold bg-white px-1.5 py-0.5 rounded border border-gray-100 text-text-light uppercase tracking-tighter">
                                                            {opt.name} {opt.price > 0 && `(+${opt.price} TL)`}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {item.note && (
                                                <p className="text-[9px] font-bold text-primary/60 italic flex items-center gap-1">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                    {item.note}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {basket.length > 0 && (
                            <div className="p-5 bg-surface border-t border-gray-100 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-text-light">Ara Toplam</span>
                                        <span className="font-black text-text">{basketTotal} TL</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-text-light">Teslimat Ücreti</span>
                                        <span className={`font-black ${(restaurant as any).dynamicDeliveryFee > 0 ? 'text-text' : 'text-green-500 uppercase text-[10px]'}`}>
                                            {(restaurant as any).dynamicDeliveryFee > 0 ? `${(restaurant as any).dynamicDeliveryFee} TL` : 'Ücretsiz'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
                                        <span className="font-black text-text">Toplam</span>
                                        <span className="text-xl font-black text-primary">{basketTotal + ((restaurant as any).dynamicDeliveryFee || 0)} TL</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCompleteOrder}
                                    disabled={minBasketRemaining > 0}
                                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg
                                        ${minBasketRemaining > 0
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed grayscale'
                                            : 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95'}`}
                                >
                                    Siparişi Tamamla
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                </aside >

                {/* Mobile Floating Basket Button */}
                {
                    basket.length > 0 && (
                        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[60] animate-bounceUp">
                            <button
                                onClick={handleCompleteOrder}
                                disabled={minBasketRemaining > 0}
                                className={`w-full p-4 rounded-3xl shadow-2xl flex items-center justify-between transition-all border-4 border-white
                                ${minBasketRemaining > 0 ? 'bg-gray-400 grayscale shadow-none' : 'bg-primary text-white shadow-primary/40 active:scale-95'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black">{basket.reduce((a, b: any) => a + b.quantity, 0)}</span>
                                    <span className="font-black text-sm">Siparişi Tamamla</span>
                                </div>
                                <span className="font-black text-lg">{basketTotal} TL</span>
                            </button>
                        </div>
                    )
                }
            </div >

            {/* --- ORDER SUCCESS MODAL --- */}
            {
                isOrderSuccess && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-xl animate-fadeIn"></div>
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl text-center animate-scaleUp overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
                            <div className="relative space-y-6">
                                <div className="w-24 h-24 bg-green-500 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-2xl shadow-green-200 animate-bounce">
                                    ✅
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-primary">Sipariş Alındı!</h2>
                                    <p className="text-text-light font-bold text-sm leading-relaxed px-4">Lezzet yolculuğu başladı, şimdiden afiyet olsun!</p>
                                </div>
                                <div className="bg-background-alt rounded-2xl p-6 space-y-3">
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="font-bold text-text-light text-[10px] uppercase tracking-wider">Restoran</span>
                                        <span className="font-black text-text truncate max-w-[180px]">{restaurant.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="font-bold text-text-light text-[10px] uppercase tracking-wider">Tahmini Süre</span>
                                        <span className="font-black text-primary">25-35 dk</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => {
                                            setIsOrderSuccess(false);
                                            setBasket([]);
                                        }}
                                        className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Harika!
                                    </button>
                                    <Link href="/" className="text-primary font-black text-xs uppercase tracking-widest hover:underline pt-2">Siparişi Takip Et</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- REVIEW MODAL --- */}
            {
                isReviewOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeReviewModal}></div>
                        <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] overflow-hidden relative shadow-2xl animate-scaleUp flex flex-col">
                            <div className="flex items-center justify-between p-7 border-b border-gray-100 bg-surface/50 backdrop-blur-md">
                                <h2 className="text-2xl font-black text-primary flex items-center gap-3">
                                    <span className="p-2 bg-primary/5 rounded-xl">💬</span>
                                    Yorumlar
                                </h2>
                                <button onClick={closeReviewModal} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all duration-300">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-7 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-gradient-to-br from-background-alt to-white border border-gray-100 rounded-[1.5rem] p-6 shadow-inner relative overflow-hidden">
                                    <div className="md:col-span-12 lg:col-span-5 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100 pb-6 lg:pb-0 lg:pr-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                                            <div className="relative flex items-center justify-center bg-primary text-white w-24 h-24 rounded-3xl text-4xl font-black shadow-xl shadow-primary/20">{restaurant.rating}</div>
                                        </div>
                                        <div className="mt-4 flex flex-col items-center">
                                            <StarRating rating={restaurant.rating} size={20} activeColor="text-accent" />
                                            <span className="mt-2 text-[10px] font-black text-text-light uppercase tracking-[0.2em] text-center">{restaurant.reviewCount} Değerlendirme</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-12 lg:col-span-7 flex flex-col justify-center space-y-4">
                                        {[
                                            { label: 'Lezzet', score: 4.8, color: 'text-accent' },
                                            { label: 'Servis', score: 4.7, color: 'text-primary' },
                                            { label: 'Hız', score: 4.6, color: 'text-primary' }
                                        ].map((stat, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <span className="text-sm font-extrabold text-text uppercase tracking-wider">{stat.label}</span>
                                                <div className="flex items-center gap-4 flex-1 justify-end">
                                                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                                                        <div className={`h-full ${stat.color === 'text-primary' ? 'bg-primary' : 'bg-accent'} rounded-full`} style={{ width: `${(stat.score / 5) * 100}%` }}></div>
                                                    </div>
                                                    <span className={`text-base font-black ${stat.color}`}>: {stat.score}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    {reviews.map((rev) => (
                                        <div key={rev.id} className="relative group p-6 rounded-[1.5rem] hover:bg-background-alt/50 transition-colors border border-transparent hover:border-gray-100">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gradient-to-tr from-primary to-primary-light rounded-[1rem] flex items-center justify-center font-black text-white text-xl shadow-lg shadow-primary/20">{rev.user[0]}</div>
                                                    <div className="flex flex-col">
                                                        <h4 className="font-bold text-text">{rev.user}</h4>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                            <span className="text-[10px] font-black text-accent uppercase bg-accent/5 px-2 py-0.5 rounded-lg border border-accent/10">Lezzet {rev.scores.lezzet}</span>
                                                            <span className="text-[10px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">Servis {rev.scores.servis}</span>
                                                            <span className="text-[10px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">Hız {rev.scores.teslimat}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-text-light font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100">{rev.date}</span>
                                            </div>
                                            <p className="text-sm font-medium text-text-light leading-relaxed mb-6 pl-1 pr-4">"{rev.comment}"</p>
                                            {rev.reply && (
                                                <div className="mt-6 bg-primary/5 rounded-[1.25rem] p-5 border-l-4 border-primary relative overflow-hidden">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Restoran Yanıtı</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-text-light italic leading-relaxed">"{rev.reply}"</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- CUSTOMIZATION MODAL --- */}
            {
                selectedProduct && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp flex flex-col max-h-[90vh]">
                            <div className="p-6 md:p-8 bg-surface border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl">{selectedProduct.image}</span>
                                    <div>
                                        <h3 className="text-lg font-black text-primary leading-tight">{selectedProduct.name}</h3>
                                        <p className="text-xs font-bold text-text-light">{selectedProduct.price} TL</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedProduct(null)} className="w-10 h-10 bg-background-alt rounded-full flex items-center justify-center text-text-light hover:text-red-500 transition-all">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide">
                                {selectedProduct.options?.map((group, gIdx) => (
                                    <div key={gIdx} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black text-text uppercase tracking-wider">{group.name}</h4>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-md ${group.type === 'required' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-text-light'}`}>{group.type === 'required' ? 'Zorunlu' : 'İsteğe Bağlı'}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {group.items.map((opt, oIdx) => (
                                                <button
                                                    key={oIdx}
                                                    onClick={() => {
                                                        const exists = customOptions.find(o => o.name === opt.name);
                                                        if (exists) setCustomOptions(customOptions.filter(o => o.name !== opt.name));
                                                        else setCustomOptions([...customOptions, opt]);
                                                    }}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${customOptions.find(o => o.name === opt.name) ? 'border-primary bg-primary/5' : 'border-background-alt hover:border-gray-200'}`}
                                                >
                                                    <span className="text-sm font-bold text-text">{opt.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        {opt.price > 0 && <span className="text-[11px] font-black text-primary">+{opt.price} TL</span>}
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${customOptions.find(o => o.name === opt.name) ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                                                            {customOptions.find(o => o.name === opt.name) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5" /></svg>}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black text-text uppercase tracking-wider">Sipariş Notu</h4>
                                    <textarea value={productNote} onChange={(e) => setProductNote(e.target.value)} placeholder="Ketçap olmasın, acı bol olsun..." className="w-full bg-background-alt border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 text-sm font-bold outline-none h-24 transition-all" />
                                </div>
                            </div>
                            <div className="p-6 md:p-8 bg-surface border-t border-gray-100">
                                <button onClick={() => performAdd(selectedProduct, customOptions, productNote)} className="w-full bg-primary text-white py-5 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-lg">
                                    Sepete Ekle - {selectedProduct.price + customOptions.reduce((a, b) => a + b.price, 0)} TL
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- CART CONFLICT MODAL --- */}
            {
                showConflictModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-scaleUp">
                            <div className="bg-red-500 p-8 text-white text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-black/5 flex items-center justify-center text-9xl opacity-20 pointer-events-none">⚠️</div>
                                <div className="relative z-10 space-y-2">
                                    <h3 className="text-2xl font-black">Sepetini Değiştir?</h3>
                                    <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Sadece bir restorandan sipariş verilebilir</p>
                                </div>
                            </div>
                            <div className="p-8 text-center space-y-6">
                                <p className="text-sm font-bold text-text-light leading-relaxed">Sepetinde zaten başka bir restorandan ürünler bulunuyor. Mevcut sepeti temizleyip <span className="text-primary font-black">"{restaurant.name}"</span> ürünlerini eklemek ister misin?</p>
                                <div className="flex flex-col gap-3">
                                    <button onClick={clearBasketAndAdd} className="w-full bg-primary text-white py-5 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Evet, Sepeti Temizle ve Ekle</button>
                                    <button onClick={() => { setShowConflictModal(false); setPendingItem(null); }} className="w-full bg-background-alt text-text-light py-5 rounded-2xl font-black hover:bg-gray-200 transition-all text-sm">Fikrimi Değiştirdim, Vazgeç</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- SMART SAVINGS MODAL --- */}
            {showSavingsModal && priceAnalysis && (
                <div className="fixed inset-0 bg-primary/20 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col">
                        <div className="p-8 bg-gradient-to-br from-orange-400 to-red-500 text-white relative">
                            <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <span>💡</span> Akıllı Tasarruf Önerisi
                            </h2>
                            <p className="text-white/80 font-bold text-sm mt-2">
                                Bu ürünün fiyatı platform ortalamasının <span className="text-white underline">%{priceAnalysis.savingsPercent}</span> üzerinde görünüyor.
                            </p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-background-alt rounded-2xl border border-dashed border-gray-200">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{priceAnalysis.targetItem.image}</span>
                                    <div>
                                        <h4 className="font-black text-text text-sm">{priceAnalysis.targetItem.name}</h4>
                                        <span className="text-xs font-bold text-text-light">Sektör Ortalaması: ~{priceAnalysis.avgPrice} TL</span>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-red-500">{priceAnalysis.currentPrice} TL</span>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-text-light uppercase tracking-widest px-1">Daha Uygun Alternatifler</h3>
                                {priceAnalysis.bestOptions.map((opt: any, i: number) => (
                                    <div key={i} className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/restaurant/${opt.restaurantId}`)}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-background-alt rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                {opt.image || '🥘'}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-text text-sm group-hover:text-primary transition-colors">{opt.restaurantName}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">{opt.name}</span>
                                                    <span className="text-[10px] font-black text-primary">{opt.price} TL</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-primary/5 text-primary p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={() => setShowSavingsModal(false)}
                                    className="py-4 rounded-2xl font-black text-xs text-text-light hover:bg-background-alt transition-all"
                                >
                                    Fikrimi Değiştirdim
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSavingsModal(false);
                                        const item = priceAnalysis.targetItem;
                                        if (item.options && item.options.length > 0) {
                                            setSelectedProduct(item);
                                            setCustomOptions([]);
                                            setProductNote("");
                                        } else {
                                            performAdd(item);
                                        }
                                    }}
                                    className="py-4 bg-primary text-white rounded-2xl font-black text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Yine de Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST NOTIFICATION */}
            {
                showToast && (
                    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-surface border-2 border-primary border-b-4 px-6 py-4 rounded-2xl shadow-2xl z-[300] animate-bounceIn flex items-center gap-3">
                        <span className="text-2xl">❤️</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-primary uppercase leading-none">Favorilere Eklendi!</span>
                            <span className="text-[10px] font-bold text-text-light">Bu restoran artık seninle her yerde.</span>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
