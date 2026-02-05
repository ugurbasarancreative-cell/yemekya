'use client';

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Toast from "./components/Toast";
import SupportMessage from "./components/SupportMessage";
import { useTheme } from "./components/ThemeProvider";
import DataStore, { Restaurant, User, Address, Order } from "@/lib/dataStore";
import HomeSlider from "./components/HomeSlider";
import { CUISINES } from "@/lib/cuisines";

export default function Home() {
  const { isDark, toggleTheme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeAddress, setActiveAddress] = useState<Address | null>(null);
  const [allAddresses, setAllAddresses] = useState<Address[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [basket, setBasket] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [orderToRate, setOrderToRate] = useState<Order | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState('Önerilen');
  const [ratings, setRatings] = useState({ Lezzet: 10, Servis: 10, Hız: 10 });
  const [userPoints, setUserPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [offerData, setOfferData] = useState<any>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [ignoringLocation, setIgnoringLocation] = useState(false);
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantStatuses, setRestaurantStatuses] = useState<Record<string, boolean>>({});
  const [penaltyLevels, setPenaltyLevels] = useState<Record<string, number>>({});

  const syncRestaurants = useCallback(async () => {
    setIsLoading(true);
    const dataStore = DataStore.getInstance();
    const data = await dataStore.getRestaurants();

    const penalties: Record<string, number> = {};
    for (const r of data) {
      const status = await dataStore.getRestaurantAccountingStatus(r.id);
      penalties[r.id] = status.penaltyLevel;
    }
    setPenaltyLevels(penalties);

    const mapped: Restaurant[] = data.map((r: Restaurant) => {
      const tagsStr = (Array.isArray(r.tags) ? r.tags.join(',') : r.tags || '').toLowerCase();
      let emoji = '🏪';
      if (tagsStr.includes('pizza')) emoji = '🍕';
      else if (tagsStr.includes('burger')) emoji = '🍔';
      else if (tagsStr.includes('kebap')) emoji = '🍢';
      else if (tagsStr.includes('tantuni')) emoji = '🥘';
      else if (tagsStr.includes('döner')) emoji = '🥙';
      else if (tagsStr.includes('tatlı')) emoji = '🍩';
      else if (tagsStr.includes('fast')) emoji = '🍟';
      else if (tagsStr.includes('italyan')) emoji = '🍝';

      return {
        ...r,
        img: r.img || emoji,
        status: r.status || 'open',
      };
    });

    setRestaurants(mapped);
    setIsLoading(false);
  }, []);

  const syncUser = useCallback(async () => {
    const storedUser = localStorage.getItem('yemekya_user');
    if (!storedUser) {
      setUser(null);
      setUserPoints(0);
      return;
    }

    const u = JSON.parse(storedUser);
    setUser(u);

    // RBAC Check
    if (u.role === 'admin') {
      router.push('/admin-panel');
      return;
    }
    if (u.role === 'restaurant_manager') {
      router.push('/restaurant-panel');
      return;
    }

    const ds = DataStore.getInstance();
    const points = await ds.getUserPoints(u.email || u.id);
    setUserPoints(points);
  }, [router]);

  useEffect(() => {
    syncRestaurants();
    syncUser();
    window.addEventListener('storage', syncRestaurants);
    window.addEventListener('restaurant-update', syncRestaurants);
    window.addEventListener('points-update', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('storage', syncRestaurants);
      window.removeEventListener('restaurant-update', syncRestaurants);
      window.removeEventListener('points-update', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, [syncRestaurants, syncUser]);

  useEffect(() => {
    const checkStatuses = () => {
      if (restaurants.length === 0) return;
      const statuses: Record<string, boolean> = {};
      restaurants.forEach(r => {
        let isOpen = r.status === 'open' || r.status === 'busy';
        const stored = localStorage.getItem(`yemekya_restaurant_status_${r.id}`);
        if (stored) {
          isOpen = JSON.parse(stored).isOpen;
        }
        statuses[r.id] = isOpen;
      });
      setRestaurantStatuses(statuses);
    };

    checkStatuses();
  }, [restaurants]);

  const allProducts = restaurants.flatMap(res =>
    (res.menu || [])
      .filter((item: any) => item.status !== 'pending') // Sadece onaylanmış ürünler
      .map((item: any) => ({ ...item, restaurantId: res.id, restaurantName: res.name }))
  );

  const currentHour = new Date().getHours();
  const normalizeNeighborhood = (name: string) => {
    if (!name) return "";
    let clean = name.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/mahallesi/g, '')
      .replace(/mahallesi\./g, '')
      .replace(/mah\./g, '')
      .replace(/mah/g, '')
      .replace(/\./g, '')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ğ/g, 'g')
      .replace(/ç/g, 'c')
      .trim();

    // Özel Karabük Varyasyonları (Örn: 5000 Evler = Beşbinevler)
    if (clean.includes('5000') || clean.includes('besbin')) {
      return 'besbinevler';
    }
    if (clean.includes('100 yil') || clean.includes('yuzuncu yil')) {
      return '100yil';
    }

    return clean;
  };

  const isRestaurantOpen = useCallback((openTime: string | number | undefined, closeTime: string | number | undefined, id: string) => {
    // 1. Manuel durum kontrolü (LocalStorage)
    const stored = localStorage.getItem(`yemekya_restaurant_status_${id}`);
    if (stored) {
      return JSON.parse(stored).isOpen;
    }

    // 2. Eğer saat bilgisi yoksa varsayılan olarak açık kabul et
    if (openTime === undefined || closeTime === undefined) return true;

    // Tip dönüşümü (Number gelirse HH:00 formatına çevir)
    const oStr = typeof openTime === 'number' ? `${openTime}:00` : openTime;
    const cStr = typeof closeTime === 'number' ? `${closeTime}:00` : closeTime;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openH, openM] = oStr.split(':').map(Number);
    const [closeH, closeM] = cStr.split(':').map(Number);

    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    // Gece yarısını geçen çalışma saatleri (Örn: 10:00 - 02:00)
    if (closeMinutes < openMinutes) {
      return currentTime >= openMinutes || currentTime <= closeMinutes;
    }

    return currentTime >= openMinutes && currentTime <= closeMinutes;
  }, []);

  const filteredRestaurants = restaurants
    .filter(res => {
      // 1. Arama Sorgusu Filtresi
      const tagsStr = (Array.isArray(res.tags) ? res.tags.join(',') : res.tags || '').toLowerCase();
      const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tagsStr.includes(searchQuery.toLowerCase());

      // 2. Kategori Filtresi
      const matchesCategory = !activeCategory || activeCategory === 'Tümü' ||
        tagsStr.includes(activeCategory.toLowerCase()) ||
        (res as any).category === activeCategory;

      // 3. Lokasyon Bazlı Filtrele (Şehir ve Mahalle)
      let matchesLocation = true;
      if (activeAddress && !ignoringLocation) {
        const userDetail = (activeAddress.detail || "").toLowerCase();
        const resAddress = (res.address || "").toLowerCase();

        // Temel Şehir/İlçe Kontrolü
        const commonLocations = ['karabük', 'karabuk', 'istanbul', 'kadıköy', 'kadikoy', 'beşiktaş', 'besiktas'];
        const userLocs = commonLocations.filter(loc => userDetail.includes(loc));
        const resLocs = commonLocations.filter(loc => resAddress.includes(loc));

        // Eğer her iki tarafta da lokasyon bilgisi varsa ve kesişmiyorlarsa gizle
        if (userLocs.length > 0 && resLocs.length > 0) {
          const hasCommon = userLocs.some(loc => resLocs.includes(loc)) ||
            resLocs.some(loc => userLocs.includes(loc));

          if (!hasCommon) {
            matchesLocation = false;
          }
        }

        // Mahalle Bazlı Detaylı Kontrol (Eğer bölgeler tanımlıysa)
        const zoneKey = `yemekya_delivery_zones_${res.id}`;
        const rawZones = localStorage.getItem(zoneKey);
        if (rawZones) {
          const zones = JSON.parse(rawZones);
          const normalizedActive = normalizeNeighborhood(activeAddress.neighborhood || "");
          const currentZone = zones.find((z: any) => normalizeNeighborhood(z.neighborhood) === normalizedActive);

          // Eğer bölgeler tanımlıysa ve kullanıcı bu bölgede değilse gizle
          if (!currentZone || currentZone.status === 'Kapalı') {
            matchesLocation = false;
          }
        } else if (resAddress.includes('karabük') && !userDetail.includes('karabük')) {
          // Fallback: Bölge tanımı yoksa ama şehirler bariz farklıysa (Karabük spesifik mockup koruması)
          matchesLocation = false;
        }
      }

      return matchesSearch && matchesCategory && matchesLocation;
    })
    .map(res => {
      // Enjekte edilen değerleri içeren yeni bir obje dön (immutability)
      const zoneKey = `yemekya_delivery_zones_${res.id}`;
      const rawZones = localStorage.getItem(zoneKey);
      let dynamicProps = {};

      if (rawZones && activeAddress && !ignoringLocation) {
        const zones = JSON.parse(rawZones);
        const normalizedActive = normalizeNeighborhood(activeAddress.neighborhood || "");
        const currentZone = zones.find((z: any) => normalizeNeighborhood(z.neighborhood) === normalizedActive);
        if (currentZone) {
          dynamicProps = {
            currentMinBasket: currentZone.minAmount,
            currentDeliveryFee: currentZone.deliveryFee,
            currentTime: currentZone.estimatedTime
          };
        }
      }

      return { ...res, ...dynamicProps };
    })
    .sort((a: any, b: any) => {
      const pA = penaltyLevels[a.id] || 0;
      const pB = penaltyLevels[b.id] || 0;

      // Seviye 2 ve üzeri her türlü en sona düşer (Kategori ve aramada geride kalma kuralı)
      if (pA >= 2 && pB < 2) return 1;
      if (pB >= 2 && pA < 2) return -1;

      // Önerilen sıralamasında Seviye 1 olanlar geriye düşer
      if (activeSort === 'Önerilen') {
        if (pA === 1 && pB === 0) return 1;
        if (pB === 1 && pA === 0) return -1;
      }

      if (activeSort === 'Restoran Puanı') return parseFloat(b.rating) || 0 - parseFloat(a.rating) || 0;
      if (activeSort === 'Teslimat Süresi') return parseInt(a.time) - parseInt(b.time);
      return 0;
    });

  const dynamicCategories = [
    { name: 'Tümü', img: '🍽️', color: 'bg-indigo-50' },
    ...CUISINES.filter(c => {
      // Sadece en az bir AÇIK restoranı olan mutfakları göster
      return restaurants.some(r => {
        const tagsStr = (Array.isArray(r.tags) ? r.tags.join(',') : r.tags || '').toLowerCase();
        const matchesCategory = tagsStr.includes(c.name.toLowerCase()) || (r as any).category === c.name;
        // Eğer restaurantStatuses henüz dolmadıysa (ilk yükleme) en azından varlığını kontrol et
        const isOpen = restaurantStatuses[r.id] ?? (r.status === 'open' || r.status === 'busy');
        return matchesCategory && isOpen;
      });
    }).map(c => ({
      name: c.name,
      img: c.emoji,
      color: 'bg-background-alt'
    }))
  ];

  const filteredProducts = searchQuery.length > 1 ? allProducts.filter(prod =>
    prod.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const addToBasket = (product: any) => {
    const res = restaurants.find(r => r.id === product.restaurantId);
    if (!res) return;

    // Geçici sepete ekle (Restaurant sayfasında okunacak)
    const preBasketData = {
      items: [{ name: product.name, price: product.price, image: product.image, quantity: 1 }]
    };
    localStorage.setItem('yemekya_pre_basket', JSON.stringify(preBasketData));

    router.push(`/restaurant/${product.restaurantId}`);
  };

  useEffect(() => {
    const syncAddress = () => {
      const storedAddresses = localStorage.getItem('yemekya_addresses');
      if (storedAddresses) {
        const parsed = JSON.parse(storedAddresses) as Address[];
        setAllAddresses(parsed);
        const active = parsed.find((a: Address) => a.isActive);
        if (active) setActiveAddress(active);
        else setActiveAddress(null);
      } else {
        setAllAddresses([]);
        setActiveAddress(null);
      }
    };

    const checkActiveOrder = () => {
      const storedUser = localStorage.getItem('yemekya_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const active = localStorage.getItem('yemekya_active_order');

      if (active && currentUser) {
        const parsed = JSON.parse(active) as Order;
        // Sadece mevcut kullanıcıya aitse göster
        if (parsed.userId === currentUser.id || parsed.userId === currentUser.email) {
          setActiveOrder(parsed);
          if (parsed.status === 'Teklif Gönderildi' || parsed.status.includes('Teklif')) {
            setOfferData({
              originalProduct: parsed.items[0]?.name || 'Ürün',
              offeredProduct: 'Big King (Alternatif)',
              priceDiff: 15
            });
          } else {
            setOfferData(null);
          }
        } else {
          setActiveOrder(null);
          setOfferData(null);
        }
      } else {
        setActiveOrder(null);
        setOfferData(null);
      }
    };

    const checkPendingReviews = () => {
      const storedUser = localStorage.getItem('yemekya_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      if (!currentUser) return;

      const storedOrders = localStorage.getItem('yemekya_orders');
      if (!storedOrders) return;

      const orders = JSON.parse(storedOrders) as Order[];
      const userId = currentUser.id || currentUser.email;

      // Sadece MEVCUT kullanıcıya ait, teslim edilmiş ve puanlanmamış siparişleri al
      const unratedOrders = orders.filter((o: Order) =>
        (o.userId === userId) && !o.hasRated && o.status === 'Teslim Edildi'
      );

      if (unratedOrders.length === 0) return;

      // Rate tracking verisini al
      let tracking: Record<string, { deliveredAt: number, nextShow: number, postponeCount: number }> = {};
      const storedTracking = localStorage.getItem('yemekya_rate_tracking');
      if (storedTracking) tracking = JSON.parse(storedTracking);
      else tracking = {};

      const now = Date.now();
      let orderToShow: Order | null = null;

      for (const order of unratedOrders) {
        let track = tracking[order.id];

        // Eğer tracking kaydı yoksa oluştur (İlk kez Teslim Edildi durumunu yakalıyoruz)
        if (!track) {
          track = {
            deliveredAt: now,
            nextShow: now + (10 * 60 * 1000), // İlk gösterim 10 dakika sonra
            postponeCount: 0
          };
          tracking[order.id] = track;
          localStorage.setItem('yemekya_rate_tracking', JSON.stringify(tracking));
        }

        // Zamanı geldiyse ve limit aşılmadıysa göster
        if (now >= track.nextShow && track.postponeCount < 4) {
          orderToShow = order;
          break; // Sadece bir tane göster
        }
      }

      setOrderToRate(orderToShow);
    };

    const syncBasket = () => {
      const storedBasket = localStorage.getItem('yemekya_checkout');
      if (storedBasket) {
        setBasket(JSON.parse(storedBasket));
      } else {
        setBasket(null);
      }
    };

    syncAddress();
    checkActiveOrder();
    checkPendingReviews();
    syncBasket();

    // 30 saniyede bir kontrol et (Review zamanı geldi mi diye)
    const globalSync = setInterval(() => {
      checkActiveOrder();
      checkPendingReviews();
    }, 30000);

    // Simulate initial loading for skeleton
    setTimeout(() => setIsLoading(false), 800);

    const simulationTimer = setInterval(() => {
      const active = localStorage.getItem('yemekya_active_order');
      if (active) {
        const order = JSON.parse(active) as Order;
        if (order.status === 'Hazırlanıyor') {
          // Demo: Otomatik Teslim Edildi yap
          order.status = 'Teslim Edildi';
          localStorage.setItem('yemekya_active_order', JSON.stringify(order));

          const history = localStorage.getItem('yemekya_orders');
          if (history) {
            const h = JSON.parse(history) as Order[];
            const updatedH = h.map((o: Order) => o.id === order.id ? { ...o, status: 'Teslim Edildi' } : o);
            localStorage.setItem('yemekya_orders', JSON.stringify(updatedH));
          }

          // Teslim edildiği an tracking kaydını oluştur
          const storedTracking = localStorage.getItem('yemekya_rate_tracking');
          const tracking: Record<string, { deliveredAt: number, nextShow: number, postponeCount: number }> = storedTracking ? JSON.parse(storedTracking) : {};
          const now = Date.now();
          tracking[order.id] = {
            deliveredAt: now,
            nextShow: now + (10 * 60 * 1000), // 10 dakika sonra
            postponeCount: 0
          };
          localStorage.setItem('yemekya_rate_tracking', JSON.stringify(tracking));

          checkActiveOrder();
        }
      }
    }, 10000);

    window.addEventListener('storage', () => {
      syncAddress();
      checkActiveOrder();
      checkPendingReviews();
      syncBasket();
    });

    // Load favorites
    const storedFavorites = localStorage.getItem('yemekya_favorites');
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
    }

    return () => {
      clearInterval(globalSync);
      clearInterval(simulationTimer);
      window.removeEventListener('storage', () => { });
    };
  }, []);

  const handleOfferResponse = (decision: 'ACCEPT' | 'REJECT') => {
    if (!activeOrder) return;

    let updatedOrder: Order;
    if (decision === 'ACCEPT' && activeOrder && offerData) {
      updatedOrder = {
        ...activeOrder,
        status: 'Hazırlanıyor',
        items: [{ ...activeOrder.items[0], name: offerData.offeredProduct }],
        total: activeOrder.total + offerData.priceDiff
      };
      setToast({ message: 'Teklifi kabul ettin! Siparişin güncellendi.', type: 'success' });
    } else if (activeOrder) {
      updatedOrder = { ...activeOrder, status: 'İptal Edildi' };
      setToast({ message: 'Sipariş teklifi reddedildi ve iptal oldu.', type: 'info' });
    } else {
      setOfferData(null);
      return;
    }

    localStorage.setItem('yemekya_active_order', JSON.stringify(updatedOrder));
    setActiveOrder(updatedOrder);
    setOfferData(null);
  };

  const handleRateOrder = (scores: any) => {
    const storedOrders = localStorage.getItem('yemekya_orders');
    if (storedOrders) {
      const orders = JSON.parse(storedOrders) as Order[];
      if (orderToRate) {
        const orderIdx = orders.findIndex((o: Order) => o.id === orderToRate.id);
        if (orderIdx !== -1) {
          orders[orderIdx].hasRated = true;
          orders[orderIdx].userScores = scores;
          localStorage.setItem('yemekya_orders', JSON.stringify(orders));
        }
      }
    }
    setOrderToRate(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('yemekya_user');
    setUser(null);
  };

  const SCROLL_AMOUNT = 300;

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
    }
  };

  const switchAddress = (id: number) => {
    const updated = allAddresses.map(a => ({ ...a, isActive: a.id === id }));
    localStorage.setItem('yemekya_addresses', JSON.stringify(updated));
    setAllAddresses(updated);
    const active = updated.find(a => a.isActive);
    setActiveAddress(active || null);
    setIgnoringLocation(false);
    setShowAddressDropdown(false);
  };

  const handleRateLater = () => {
    if (!orderToRate) return;

    setOrderToRate(null);

    const storedTracking = localStorage.getItem('yemekya_rate_tracking');
    if (!storedTracking) return;

    const tracking = JSON.parse(storedTracking);
    const track = tracking[orderToRate.id];

    if (track) {
      track.postponeCount += 1;
      const now = Date.now();
      let delay = 0;

      if (track.postponeCount === 1) delay = 5;
      else if (track.postponeCount === 2) delay = 15;
      else if (track.postponeCount === 3) delay = 30;
      else delay = 60 * 24;

      track.nextShow = now + (delay * 60 * 1000);
      tracking[orderToRate.id] = track;
      localStorage.setItem('yemekya_rate_tracking', JSON.stringify(tracking));
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background text-text font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 1. HEADER */}
      <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm border-b border-border h-20">
        <div className="container h-full grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8">

          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1 flex-shrink-0 select-none no-underline group">
              <span className="text-3xl font-extrabold text-primary tracking-tighter group-hover:text-secondary transition-colors">YemekYa</span>
            </Link>
          </div>

          <div className="hidden md:block w-full max-w-2xl justify-self-center px-2">
            <div className="flex items-center bg-background-alt/50 backdrop-blur-md rounded-full px-4 h-11 border border-border focus-within:bg-surface focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(124,58,237,0.05)] transition-all w-full">
              <svg className="text-primary flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Restoran, mutfak veya yemek ara..."
                className="bg-transparent border-none outline-none w-full ml-3 text-sm text-text placeholder-text-light/70"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 justify-self-end">
            {user && activeAddress && (
              <div className="relative">
                <button
                  onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                  className="hidden lg:flex items-center gap-2 cursor-pointer hover:bg-background-alt px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-border group"
                >
                  <div className="w-8 h-8 bg-primary/5 rounded-lg flex items-center justify-center text-lg group-hover:bg-primary group-hover:text-white transition-colors">
                    {activeAddress.icon}
                  </div>
                  <div className="flex flex-col leading-none text-left">
                    <span className="font-bold text-[10px] text-primary uppercase mb-0.5 tracking-wider">Teslimat Adresi</span>
                    <span className="font-extrabold text-xs text-text truncate max-w-[120px]">{activeAddress.title} - {activeAddress.detail.split(',')[0]}</span>
                  </div>
                  <svg className={`text-text-light group-hover:text-primary transition-all duration-300 ${showAddressDropdown ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
                </button>

                {showAddressDropdown && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowAddressDropdown(false)}></div>
                    <div className="absolute top-[calc(100%+10px)] left-0 w-80 bg-surface rounded-[2rem] shadow-premium border border-border py-4 z-[70] animate-fadeIn origin-top">
                      <div className="px-6 py-2 mb-2">
                        <h4 className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">Kayıtlı Adreslerin</h4>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto px-2 space-y-1">
                        {allAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            onClick={() => switchAddress(addr.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group/item
                              ${addr.isActive ? 'bg-primary/5 border border-primary/20' : 'hover:bg-background-alt border border-transparent'}`}
                          >
                            <span className="text-2xl">{addr.icon}</span>
                            <div className="flex-1 min-w-0">
                              <h5 className={`text-sm font-black ${addr.isActive ? 'text-primary' : 'text-text'}`}>{addr.title}</h5>
                              <p className="text-[11px] font-bold text-text-light truncate">{addr.detail}</p>
                            </div>
                            {addr.isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>}
                          </button>
                        ))}
                      </div>
                      <div className="px-4 pt-4 mt-2 border-t border-dashed border-border">
                        <Link href="/profile" onClick={() => setShowAddressDropdown(false)} className="flex items-center justify-center gap-2 w-full py-3 bg-background-alt rounded-xl text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                          Adres Yönetimi
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="h-6 w-px bg-gray-200 hidden lg:block mx-1"></div>

            {!user || !user.name ? (
              <div className="flex items-center gap-3">
                <Link href="/login" className="bg-accent text-primary font-bold rounded-full py-2 px-6 text-xs hover:bg-accent-hover transition-colors shadow-md whitespace-nowrap">Giriş Yap</Link>
                <Link href="/register" className="bg-surface text-primary border-2 border-accent hover:border-accent-hover font-bold rounded-full py-2 px-6 text-xs hover:bg-background-alt transition-colors whitespace-nowrap">Üye Ol</Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/market" className="hidden sm:flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10 hover:scale-105 transition-all group/points">
                  <span className="text-xl group-hover/points:rotate-12 transition-transform">💎</span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] font-black text-primary/60 uppercase tracking-tighter">Puanım</span>
                    <span className="text-sm font-black text-primary">{userPoints}</span>
                  </div>
                </Link>
                <div className="flex flex-col items-end leading-none">
                  <span className="text-[10px] font-black text-text-light uppercase tracking-wider">Hoş Geldin,</span>
                  <span className="text-xs font-black text-primary">{user.name} {user.surname}</span>
                </div>
                <div className="relative group">
                  <button className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all border border-primary/10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface rounded-2xl shadow-premium border border-border py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] animate-scaleUp">
                    <div className="px-4 py-2 border-b border-dashed border-border mb-1">
                      <span className="text-[9px] font-black text-text-light uppercase tracking-[0.15em]">Profilim</span>
                    </div>
                    <Link href="/profile" className="w-full text-left px-4 py-3 text-xs font-bold text-text hover:bg-background-alt flex items-center gap-3 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      Hesap Detaylarım
                    </Link>

                    <div className="px-4 py-2 border-y border-dashed border-border my-1 bg-background-alt/50">
                      <span className="text-[9px] font-black text-primary uppercase tracking-[0.15em]">Son Siparişlerim</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto no-scrollbar">
                      {localStorage.getItem('yemekya_orders') ? JSON.parse(localStorage.getItem('yemekya_orders')!).slice(0, 3).map((oldOrder: any, idx: number) => (
                        <div key={idx} className="px-4 py-3 hover:bg-background-alt transition-colors group/order flex items-center justify-between">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] font-black text-text truncate">{oldOrder.restaurantName}</span>
                            <span className="text-[9px] font-bold text-text-light">{oldOrder.total} TL • {oldOrder.date.split(' ')[0]}</span>
                          </div>
                          <button
                            onClick={() => {
                              let resId = oldOrder.restaurantId;
                              let foundRes = restaurants.find(r => r.id === resId);

                              if (!foundRes && oldOrder.restaurantName) {
                                foundRes = restaurants.find(r => r.name === oldOrder.restaurantName);
                              }

                              if (!foundRes) {
                                setToast({ message: "Bu restoran artık hizmet vermiyor.", type: 'error' });
                                return;
                              }

                              const isOpen = isRestaurantOpen(foundRes.openTime, foundRes.closeTime, foundRes.id);
                              if (!isOpen) {
                                setToast({ message: `${foundRes.name} şu an kapalı, siparişi tekrarlamak için restoranın açılmasını beklemelisin. 😴`, type: 'error' });
                                return;
                              }

                              const checkoutData = {
                                restaurant: { id: foundRes.id, name: foundRes.name, img: foundRes.img, minBasket: foundRes.minBasket || 200 },
                                items: oldOrder.items,
                                total: oldOrder.total
                              };
                              localStorage.setItem('yemekya_checkout', JSON.stringify(checkoutData));
                              router.push(`/restaurant/${foundRes.id}`);
                            }}
                            className="bg-primary/10 text-primary text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover/order:opacity-100 transition-opacity whitespace-nowrap"
                          >
                            TEKRARLA
                          </button>
                        </div>
                      )) : (
                        <div className="px-4 py-3 text-[10px] font-bold text-text-light italic">Henüz siparişin yok.</div>
                      )}
                    </div>

                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-dashed border-border mt-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                      Hesaptan Çıkış
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!user && (
          <div className="absolute top-20 left-0 w-full bg-purple-50 border-b border-purple-100 py-2 text-center text-[11px] font-semibold text-primary flex items-center justify-center gap-2 z-40">
            Şu anda temsili restoranları görüntülemektesiniz. Sipariş verebilmek için lütfen giriş yapın.
          </div>
        )}
      </header>

      {user && activeOrder && (
        <div className="bg-primary border-b border-primary-dark animate-slideDown overflow-hidden relative group">
          <div className="absolute inset-0 bg-surface/5 animate-pulse opacity-50"></div>

          <div className="container py-3 px-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface/20 rounded-xl flex items-center justify-center text-xl shadow-inner backdrop-blur-sm">
                {activeOrder.restaurantImg || '🥘'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">Aktif Sipariş</span>
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
                </div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {activeOrder.restaurantName} • <span className="text-accent">{activeOrder.status}</span>
                </h4>
              </div>
            </div>

            {offerData && activeOrder?.status === 'Teklif Gönderildi' && (
              <div className="flex-1 max-w-sm bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 mx-4 animate-fadeIn">
                <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Stok Hatası Bildirimi</p>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] font-bold text-white leading-tight">
                    Sipariş ettiğiniz ürün stoklarımızda kalmamıştır. Yerine <span className="text-accent">{offerData.offeredProduct}</span> (+{offerData.priceDiff} TL) ister misiniz?
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleOfferResponse('ACCEPT')} className="px-3 py-1.5 bg-accent text-primary text-[10px] font-black rounded-lg hover:scale-105 transition-all">EVET</button>
                    <button onClick={() => handleOfferResponse('REJECT')} className="px-3 py-1.5 bg-white/20 text-white text-[10px] font-black rounded-lg hover:bg-white/30 transition-all">HAYIR</button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              {activeOrder.status !== 'Teslim Edildi' && (
                <div className="hidden md:flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <svg className="text-accent" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  <span className="text-[11px] font-black text-white">Tahmini 25 dk</span>
                </div>
              )}
              <Link href="/profile" className="bg-surface text-primary px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:scale-105 transition-all">
                Takip Et
              </Link>
              <button
                onClick={() => setIsSupportOpen(true)}
                className="bg-surface/20 border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-surface/30 transition-all flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.8 8.35 8.35 0 0 1 1.8.2" /><path d="M21 15a2 2 0 1 1-2 2 2 2 0 0 1 2-2z" /></svg>
                Yardım mı Lazım?
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('yemekya_active_order');
                  setActiveOrder(null);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <SupportMessage isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {!isSupportOpen && (
        <button
          onClick={() => setIsSupportOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-2xl z-[90] flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:rotate-12 transition-transform"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </button>
      )}

      <div className="md:hidden container pt-4 px-4 sticky top-20 z-40 bg-background pb-2">
        <div className="flex items-center bg-surface rounded-full px-4 h-11 border border-border focus-within:border-primary focus-within:shadow-md transition-all w-full shadow-sm">
          <svg className="text-primary flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Restoran veya yemek ara..."
            className="bg-transparent border-none outline-none w-full ml-3 text-sm text-text placeholder-text-light/70"
          />
        </div>
      </div>

      <main className="container pt-6 md:pt-10">
        <HomeSlider />

        <section className="mt-12">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-xl md:text-2xl font-black text-primary">Mutfaklar</h2>
            <div className="flex gap-2">
              <button
                onClick={scrollLeft}
                className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-primary/5 hover:border-primary/20 transition-all text-text-light hover:text-primary active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                onClick={scrollRight}
                className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-primary/5 hover:border-primary/20 transition-all text-text-light hover:text-primary active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth px-1"
          >
            {dynamicCategories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex flex-col items-center gap-3 shrink-0 transition-all group ${activeCategory === cat.name ? 'scale-105' : 'hover:translate-y-[-4px]'}`}
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-sm border-2 transition-all 
                  ${activeCategory === cat.name ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-background-alt/50 border-transparent group-hover:bg-surface group-hover:border-primary/20'}`}>
                  {cat.img}
                </div>
                <span className={`text-[11px] md:text-[13px] font-black uppercase tracking-tight transition-colors ${activeCategory === cat.name ? 'text-primary' : 'text-text-light'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 px-1">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-black text-primary">En Yakın Restoranlar</h2>
                <span className="bg-primary/5 text-primary text-xs font-black px-3 py-1 rounded-full border border-primary/10">{filteredRestaurants.length}</span>
              </div>
              <p className="text-text-light text-sm font-bold opacity-70">En lezzetli seçimler senin için sıralandı.</p>
            </div>

            <div className="flex bg-background-alt/50 p-1.5 rounded-2xl border border-border backdrop-blur-sm self-start">
              {['Önerilen', 'Restoran Puanı', 'Teslimat Süresi'].map((sort) => (
                <button
                  key={sort}
                  onClick={() => setActiveSort(sort)}
                  className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all
                    ${activeSort === sort ? 'bg-surface text-primary shadow-premium scale-[1.02]' : 'text-text-light hover:text-text'}`}
                >
                  {sort}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse space-y-4">
                  <div className="aspect-[4/3] bg-background-alt rounded-[2rem]"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-background-alt rounded-lg w-2/3"></div>
                    <div className="h-4 bg-background-alt rounded-lg w-full"></div>
                  </div>
                </div>
              ))
            ) : filteredRestaurants.length > 0 ? (
              filteredRestaurants.map((res: any) => {
                const isOpen = isRestaurantOpen(res.openTime, res.closeTime, res.id);
                const isFav = favorites.includes(res.id);

                return (
                  <div
                    key={res.id}
                    className={`group relative bg-surface rounded-[2.5rem] border border-border overflow-hidden transition-all duration-500 hover:shadow-premium hover:translate-y-[-8px] cursor-pointer
                      ${!isOpen ? 'opacity-80 grayscale-[0.5]' : ''}`}
                    onClick={() => router.push(`/restaurant/${res.id}`)}
                  >
                    {!isOpen && (
                      <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6 transition-all duration-500 group-hover:bg-black/30">
                        <div className="bg-white/95 px-6 py-3 rounded-2xl shadow-xl transform -rotate-3 border-2 border-primary/50">
                          <span className="text-primary font-black text-sm uppercase tracking-[0.15em]">Şu an Kapalı 😴</span>
                        </div>
                      </div>
                    )}

                    <div className="aspect-[16/10] overflow-hidden relative">
                      {res.img.length > 3 ? (
                        <img src={res.img} alt={res.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-background-alt flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-700">{res.img}</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>

                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 border border-white">
                          <span className="text-primary text-[10px] font-black uppercase tracking-tight">{res.rating || 'New'}</span>
                          <svg className="text-yellow-400" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          let newFavs = [...favorites];
                          if (isFav) newFavs = newFavs.filter(id => id !== res.id);
                          else newFavs.push(res.id);
                          setFavorites(newFavs);
                          localStorage.setItem('yemekya_favorites', JSON.stringify(newFavs));
                        }}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-sm flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-90 border border-white"
                      >
                        <span className={isFav ? 'text-red-500 animate-heartbeat' : 'text-text-light opacity-50'}>
                          {isFav ? '❤️' : '🤍'}
                        </span>
                      </button>

                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <span className="bg-primary px-3 py-1.5 rounded-lg text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/30">{res.time || '30-45'} DK</span>
                      </div>
                    </div>

                    <div className="p-7 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-black text-text leading-tight group-hover:text-primary transition-colors">{res.name}</h3>
                          <p className="text-[11px] font-bold text-text-light uppercase tracking-tight mt-1 opacity-70">
                            {Array.isArray(res.tags) ? res.tags.slice(0, 3).join(' • ') : res.tags || 'Restoran'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-dashed border-border flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                        <div className="flex flex-col gap-1">
                          <span className="text-text-light opacity-60">Min. Paket</span>
                          <span className="text-primary">{res.currentMinBasket || res.minBasket || 100} TL</span>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <span className="text-text-light opacity-60">Gönderim</span>
                          <span className="text-secondary">{res.currentDeliveryFee === 0 ? 'ÜCRETSİZ' : `${res.currentDeliveryFee || res.deliveryFee || 0} TL`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 bg-background-alt rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-6xl animate-bounce">🍕</span>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-text">Burada Henüz Kimse Yok...</h3>
                  <p className="text-sm font-bold text-text-light">Arama kriterlerini değiştirerek daha fazla lezzet bulabilirsin.</p>
                </div>
                <button onClick={() => { setSearchQuery(''); setActiveCategory(null); }} className="bg-primary text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all">Tüm Restoranları Gör</button>
              </div>
            )}
          </div>
        </section>
      </main>

      {orderToRate && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-scaleIn relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-secondary"></div>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center text-5xl animate-bounce">🍕</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-primary">Lezzet Nasıldı?</h2>
                <p className="text-sm font-bold text-text-light italic">"{orderToRate.restaurantName}" siparişini değerlendir, hem restorana yardım et hem de bizi mutlu et! ✨</p>
              </div>

              <div className="w-full space-y-4 py-4">
                {Object.keys(ratings).map((key) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black text-text-light uppercase tracking-widest">{key}</span>
                      <span className="text-sm font-black text-primary">{(ratings as any)[key]} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={(ratings as any)[key]}
                      onChange={(e) => setRatings({ ...ratings, [key]: parseInt(e.target.value) })}
                      className="w-full h-2 bg-background-alt rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <button
                  onClick={handleRateLater}
                  className="py-4 rounded-2xl bg-background-alt text-text-light font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  Daha Sonra
                </button>
                <button
                  onClick={() => handleRateOrder(ratings)}
                  className="py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  Puanla & Bitir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
