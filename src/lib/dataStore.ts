import { supabase, isSupabaseConfigured } from './supabase';

// Central Data Store for YemekYa Platform
// This file manages all platform data with LocalStorage persistence 
// Note: Methods are asynchronous to maintain compatibility with potential future DB migration 

export interface Restaurant {
    id: string;
    name: string;
    tags: string | string[];
    rating: string | number;
    time: string;
    minBasket: number;
    img: string;
    phone: string;
    address: string;
    openTime: number;
    closeTime: number;
    status: 'open' | 'busy' | 'closed';
    commission: number;
    deliveryFee: number;
    weeklyHours?: any;
    categories?: string[];
    menu: MenuItem[];
    reviews?: Review[];
    totalOrders?: number;
    revenue?: number;
    joinedAt?: string;
    category?: string;
    // Auth & Info
    managerEmail?: string;
    managerPassword?: string;
    authorizedPerson?: string;
    neighborhood?: string;
    // Live Overrides (Neighborhood specific)
    currentMinBasket?: number;
    currentDeliveryFee?: number;
    currentTime?: string;
}

export interface User {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone?: string;
    role: 'user' | 'restaurant_manager' | 'admin' | 'restaurant_pending';
    isLoggedIn: boolean;
    points?: number;
    restaurantId?: string; // For restaurant managers
    restaurantName?: string;
    favorites?: string[];
    password?: string;
}

export interface Address {
    id: number;
    title: string;
    detail: string;
    icon: string;
    isActive: boolean;
    name?: string;
    surname?: string;
    phone?: string;
    neighborhood?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    instructions?: string;
}

export interface MenuApproval {
    id: string;
    restaurantId: string;
    restaurantName: string;
    productId: string;
    productName: string;
    type: 'ADD' | 'EDIT' | 'PRICE_CHANGE';
    oldData?: any;
    newData: any;
    oldValue?: string;
    newValue?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    timestamp: string;
    adminNote?: string;
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    image: string;
    desc: string;
    category: string;
    stock?: number | boolean;
    oldPrice?: number | null;
    options?: MenuOption[];
    // Smart Savings Fields
    unitType?: 'gr' | 'ml' | 'portion' | 'piece';
    unitAmount?: number;
    isMenu?: boolean;
    baseCategory?: string;
}

export interface MenuOption {
    name: string;
    type: 'required' | 'optional';
    items: { name: string; price: number }[];
}

export interface MenuCategory {
    categoryId: string;
    items: MenuItem[];
}

export interface Review {
    id: string;
    userId: string;
    userName: string;
    restaurantId: string;
    orderId: string;
    scores: {
        lezzet: number;
        servis: number;
        teslimat: number;
    };
    comment: string;
    date: string;
    reply?: string;
    products?: string[];
    isHidden?: boolean;
}

export interface Order {
    id: string;
    restaurantId: string;
    restaurantName: string;
    restaurantImg: string;
    userId: string;
    userName: string;
    items: OrderItem[];
    total: number;
    originalTotal: number;
    couponDiscount: number;
    status: 'Yeni' | 'Hazırlanıyor' | 'Hazır' | 'Yolda' | 'Teslim Edildi' | 'İptal Edildi' | 'Teklif Gönderildi' | 'Teklif Edildi';
    date: string;
    address: string;
    neighborhood?: string;
    paymentMethod?: string;
    phone?: string;
    isCommissionPaid?: boolean;
    hasRated?: boolean;
    userScores?: any;
}

export interface Application {
    id: string;
    userId?: string;
    restaurantName: string;
    ownerName: string;
    email: string;
    phone: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    timestamp: string;
    cuisine?: string;
    address?: string;
}

export interface Campaign {
    id: string;
    restaurantId: string;
    title: string;
    description: string;
    type: 'Discount' | 'Gift';
    value: string;
    active: boolean;
    participationCount: number;
}

export interface Banner {
    id: string;
    image: string;
    title: string;
    link: string;
    active: boolean;
}



export interface MarketItem {
    id: string;
    name: string;
    points: number;
    icon: string;
    color: string;
    type: 'discount' | 'item';
}

export interface UserCoupon {
    id: string;
    itemId: string;
    name: string;
    value: number;
    isUsed: boolean;
    date: string;
}

export interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    options?: any[];
    note?: string;
}

export class DataStore {
    private static instance: DataStore;

    private constructor() { }

    static getInstance(): DataStore {
        if (!DataStore.instance) {
            DataStore.instance = new DataStore();
        }
        return DataStore.instance;
    }

    // Keys for LocalStorage
    private readonly KEYS = {
        RESTAURANTS: 'yemekya_restaurants_db',
        ORDERS: 'yemekya_orders',
        REVIEWS: 'yemekya_reviews',
        APPROVALS: 'yemekya_approvals',
        APPLICATIONS: 'yemekya_applications',
        USERS: 'yemekya_users',
        MARKET: 'yemekya_market_items',
        BANNERS: 'yemekya_banners',
        CAMPAIGNS: 'yemekya_campaigns'
    };


    private getItem<T>(key: string): T[] {
        if (typeof window === 'undefined') return [];
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    }

    private setItem<T>(key: string, data: T[]) {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, JSON.stringify(data));
    }

    private parseDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        if (dateStr.includes('.')) {
            // Convert DD.MM.YYYY to YYYY-MM-DD
            const parts = dateStr.split('.');
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }
        return new Date(dateStr);
    }

    // --- RESTAURANTS ---
    async getRestaurants(): Promise<Restaurant[]> {
        if (!isSupabaseConfigured) {
            return this.getItem<Restaurant>(this.KEYS.RESTAURANTS);
        }

        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .order('name');

            if (error) throw error;

            if (data && data.length > 0) {
                this.setItem(this.KEYS.RESTAURANTS, data);
                return data as Restaurant[];
            }
        } catch (err) {
            console.error("DataStore: getRestaurants failed", err);
        }
        return this.getItem<Restaurant>(this.KEYS.RESTAURANTS);
    }

    async getRestaurant(id: string): Promise<Restaurant | null> {
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) return data as Restaurant;
        } catch (err) {
            // Sessizce fallback'e geç
        }

        const all = await this.getRestaurants();
        return all.find(r => r.id === id) || null;
    }

    async addRestaurant(restaurant: Partial<Restaurant>): Promise<string | null> {
        const id = restaurant.id || Math.random().toString(36).substr(2, 9);
        const newRestaurant: Restaurant = {
            id,
            name: restaurant.name || '',
            tags: restaurant.tags || [],
            rating: restaurant.rating || '0.0',
            time: restaurant.time || '30-40 dk',
            minBasket: restaurant.minBasket || 0,
            img: restaurant.img || '🏪',
            phone: restaurant.phone || '',
            address: restaurant.address || '',
            openTime: restaurant.openTime || 9,
            closeTime: restaurant.closeTime || 23,
            status: (restaurant.status as 'open' | 'busy' | 'closed') || 'closed',
            commission: restaurant.commission || 15,
            deliveryFee: restaurant.deliveryFee || 0,
            menu: restaurant.menu || [],
            joinedAt: new Date().toISOString().split('T')[0],
            ...restaurant,
        } as Restaurant;

        if (isSupabaseConfigured) {
            try {
                const { error } = await supabase
                    .from('restaurants')
                    .insert([newRestaurant]);

                if (error) throw error;
            } catch (err) {
                console.error('DataStore: addRestaurant database error:', err);
            }
        }

        const all = await this.getRestaurants();
        const exists = all.findIndex(r => r.id === id);
        if (exists === -1) {
            all.push(newRestaurant);
        } else {
            all[exists] = { ...all[exists], ...newRestaurant };
        }
        this.setItem(this.KEYS.RESTAURANTS, all);
        window.dispatchEvent(new Event('restaurant-update'));
        return id;
    }

    async updateRestaurant(id: string, updates: any): Promise<void> {
        try {
            const { error } = await supabase
                .from('restaurants')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Supabase updateRestaurant error:', err);
        }

        const all = await this.getRestaurants();
        const idx = all.findIndex(r => r.id === id);
        if (idx !== -1) {
            all[idx] = { ...all[idx], ...updates };
            this.setItem(this.KEYS.RESTAURANTS, all);
            window.dispatchEvent(new Event('restaurant-update'));
        }
    }

    // --- ORDERS ---
    async getOrders(): Promise<Order[]> {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;
            if (data) {
                this.setItem(this.KEYS.ORDERS, data);
                return data as Order[];
            }
        } catch (err) {
            // Sessizce fallback'e geç
        }
        return this.getItem<Order>(this.KEYS.ORDERS);
    }

    async createOrder(order: Partial<Order>): Promise<void> {
        const newOrder = {
            id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            date: new Date().toISOString(),
            status: 'Yeni',
            isCommissionPaid: false,
            ...order
        } as Order;

        try {
            const { error } = await supabase
                .from('orders')
                .insert([newOrder]);

            if (error) throw error;
        } catch (err) {
            console.error('Supabase createOrder error:', err);
        }

        const all = await this.getOrders();
        all.push(newOrder);
        this.setItem(this.KEYS.ORDERS, all);
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('new-order'));

        // Note: Points are now automatically handled by the Supabase trigger 'trg_order_delivered' 
        // when the order status is updated to 'Teslim Edildi'.
    }

    async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
        try {
            const { error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Supabase updateOrder error:', err);
        }

        const all = await this.getOrders();
        const idx = all.findIndex(o => o.id === id);
        if (idx !== -1) {
            all[idx] = { ...all[idx], ...updates };
            this.setItem(this.KEYS.ORDERS, all);
            window.dispatchEvent(new Event('storage'));
        }
    }

    async getOrdersByUserId(userId: string): Promise<Order[]> {
        const all = await this.getOrders();
        return all.filter(o => o.userId === userId || o.userName === userId);
    }

    // --- USERS ---
    async getUsers(): Promise<User[]> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*');

            if (error) {
                // Sadece kritik hatalarda (tablo eksikliği değil) log bas
                if (error.code !== 'PGRST116' && error.code !== '42P01') {
                    console.warn('Supabase getUsers notice:', error.message);
                }
                throw error;
            }
            if (data) {
                this.setItem(this.KEYS.USERS, data);
                return data as User[];
            }
        } catch (err) {
            // Sessizce devam et, fallback LocalStorage'da var
        }
        return this.getItem<User>(this.KEYS.USERS);
    }

    async updateUser(email: string, updates: Partial<User>): Promise<void> {
        try {
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('email', email);

            if (error) throw error;
        } catch (err) {
            console.error('Supabase updateUser error:', err);
        }

        // Sync local storage
        const all = await this.getUsers();
        const idx = all.findIndex(u => u.email === email);
        if (idx !== -1) {
            all[idx] = { ...all[idx], ...updates };
            this.setItem(this.KEYS.USERS, all);
        }

        // Check if current user is the one being updated
        const currentRaw = localStorage.getItem('yemekya_user');
        if (currentRaw) {
            const current = JSON.parse(currentRaw);
            if (current.email === email) {
                localStorage.setItem('yemekya_user', JSON.stringify({ ...current, ...updates }));
            }
        }
    }

    // --- MENU ITEMS ---
    async addMenuItem(restaurantId: string, item: any): Promise<void> {
        const all = await this.getRestaurants();
        const idx = all.findIndex(r => r.id === restaurantId);
        if (idx !== -1) {
            if (!all[idx].menu) all[idx].menu = [];
            const newItem = {
                id: Math.random().toString(36).substr(2, 9),
                ...item
            };
            all[idx].menu.push(newItem);
            await this.updateRestaurant(restaurantId, { menu: all[idx].menu });
        }
    }

    // --- REVIEWS ---
    async getReviews(restaurantId?: string): Promise<Review[]> {
        try {
            let query = supabase.from('reviews').select('*');
            if (restaurantId) {
                query = query.eq('restaurantId', restaurantId);
            }
            const { data, error } = await query.order('date', { ascending: false });

            if (error) throw error;
            if (data) {
                this.setItem(this.KEYS.REVIEWS, data);
                return data as Review[];
            }
        } catch (err) {
            console.error('Supabase getReviews error:', err);
        }
        const all = this.getItem<Review>(this.KEYS.REVIEWS);
        if (restaurantId) return all.filter(r => r.restaurantId === restaurantId);
        return all;
    }

    async createReview(review: any): Promise<void> {
        const newReview = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            ...review
        };

        try {
            const { error } = await supabase
                .from('reviews')
                .insert([newReview]);
            if (error) throw error;
        } catch (err) {
            console.error('Supabase createReview error:', err);
        }

        const all = await this.getReviews();
        all.push(newReview);
        this.setItem(this.KEYS.REVIEWS, all);
    }

    async updateReview(id: string, updates: Partial<Review>): Promise<void> {
        try {
            const { error } = await supabase
                .from('reviews')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error('Supabase updateReview error:', err);
        }

        const all = await this.getReviews();
        const idx = all.findIndex(r => r.id === id);
        if (idx !== -1) {
            all[idx] = { ...all[idx], ...updates };
            this.setItem(this.KEYS.REVIEWS, all);
        }
    }

    // --- MENU APPROVALS ---
    async getMenuApprovals(): Promise<MenuApproval[]> {
        try {
            const { data, error } = await supabase
                .from('menu_approvals')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) throw error;
            if (data) {
                this.setItem(this.KEYS.APPROVALS, data);
                return data as MenuApproval[];
            }
        } catch (err) {
            console.error('Supabase getMenuApprovals error:', err);
        }
        return this.getItem<MenuApproval>(this.KEYS.APPROVALS);
    }

    async submitMenuApproval(approval: Partial<MenuApproval>): Promise<void> {
        const newApproval = {
            id: Math.random().toString(36).substr(2, 9),
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            ...approval
        } as MenuApproval;

        try {
            const { error } = await supabase
                .from('menu_approvals')
                .insert([newApproval]);
            if (error) throw error;
        } catch (err) {
            console.error('Supabase submitMenuApproval error:', err);
        }

        const all = await this.getMenuApprovals();
        all.push(newApproval);
        this.setItem(this.KEYS.APPROVALS, all);
    }

    async updateMenuApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED'): Promise<void> {
        try {
            const { error: updateError } = await supabase
                .from('menu_approvals')
                .update({ status: decision })
                .eq('id', approvalId);

            if (updateError) throw updateError;

            if (decision === 'APPROVED') {
                const { data: approval } = await supabase
                    .from('menu_approvals')
                    .select('*')
                    .eq('id', approvalId)
                    .single();

                if (approval) {
                    const res = await this.getRestaurant(approval.restaurantId);
                    if (res) {
                        let updatedMenu = [...(res.menu || [])];
                        if (approval.type === 'ADD') {
                            updatedMenu.push({
                                id: Math.random().toString(36).substr(2, 9),
                                ...approval.newData
                            });
                        } else if (approval.type === 'EDIT' || approval.type === 'PRICE_CHANGE') {
                            const idx = updatedMenu.findIndex(m => m.id === approval.productId);
                            if (idx !== -1) {
                                updatedMenu[idx] = { ...updatedMenu[idx], ...approval.newData };
                            }
                        }
                        await this.updateRestaurant(approval.restaurantId, { menu: updatedMenu });
                    }
                }
            }
        } catch (err) {
            console.error('Supabase updateMenuApproval error:', err);
        }
        window.dispatchEvent(new Event('restaurant-update'));
    }

    // --- APPLICATIONS ---
    async getApplications(): Promise<Application[]> {
        try {
            const { data, error } = await supabase
                .from('applications')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) throw error;
            if (data) {
                this.setItem(this.KEYS.APPLICATIONS, data);
                return data as Application[];
            }
        } catch (err) {
            console.error('Supabase getApplications error:', err);
        }
        return this.getItem<Application>(this.KEYS.APPLICATIONS);
    }

    async submitApplication(app: Partial<Application>): Promise<void> {
        const newApp = {
            id: Math.random().toString(36).substr(2, 9),
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            ...app
        } as Application;

        try {
            const { error } = await supabase
                .from('applications')
                .insert([newApp]);
            if (error) throw error;
        } catch (err) {
            console.error('Supabase submitApplication error:', err);
        }

        const all = await this.getApplications();
        all.push(newApp);
        this.setItem(this.KEYS.APPLICATIONS, all);
    }

    async updateApplicationStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
        try {
            const { error } = await supabase
                .from('applications')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error('Supabase updateApplicationStatus error:', err);
        }
    }

    // --- ADMIN STATS ---
    async getAdminStats(): Promise<any> {
        const restaurants = await this.getRestaurants();
        const orders = await this.getOrders();
        const approvals = await this.getMenuApprovals();

        return {
            totalRestaurants: restaurants.length,
            activeRestaurants: restaurants.filter(r => r.status === 'open').length,
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
            avgOrderValue: orders.length > 0 ? (orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) / orders.length) : 0,
            pendingApprovals: approvals.filter(a => a.status === 'PENDING').length
        };
    }

    async getRestaurantStats(restaurantId: string): Promise<any> {
        const allOrders = await this.getOrders();
        const resOrders = allOrders.filter(o => o.restaurantId === restaurantId);
        const allReviews = await this.getReviews(restaurantId);
        const restaurant = await this.getRestaurant(restaurantId);

        const today = new Date().toISOString().split('T')[0];
        const todayOrders = resOrders.filter(o => o.date.startsWith(today));

        const totalRating = allReviews.reduce((sum, r) => sum + (r.scores.lezzet + r.scores.servis + r.scores.teslimat) / 3, 0);
        const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 5;

        // Success rate calculation
        const totalCount = resOrders.length;
        const cancelledCount = resOrders.filter(o => o.status === 'İptal Edildi').length;
        const successRate = totalCount > 0 ? ((totalCount - cancelledCount) / totalCount) * 100 : 100;

        return {
            totalOrders: resOrders.length,
            todayOrders: todayOrders.length,
            todayRevenue: todayOrders.reduce((sum, o) => sum + Number(o.total), 0),
            avgRating: avgRating.toFixed(1),
            satisfactionRate: Math.round(avgRating * 20),
            reviewCount: allReviews.length,
            prepPerformance: Math.round(successRate * 0.95), // Weight success rate
            averageTime: restaurant?.time || '25-35 dk'
        };
    }

    // --- BANNERS ---
    async getBanners(): Promise<Banner[]> {
        const raw = localStorage.getItem(this.KEYS.BANNERS);
        if (!raw) {
            const defaults: Banner[] = [
                { id: '1', title: 'Hoş Geldin Sürprizi', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=400&fit=crop', link: '#', active: true },
                { id: '2', title: 'Gece Fırsatları', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&h=400&fit=crop', link: '#', active: true }
            ];
            this.setItem(this.KEYS.BANNERS, defaults);
            return defaults;
        }
        return JSON.parse(raw);
    }

    async saveBanners(banners: Banner[]) {
        this.setItem(this.KEYS.BANNERS, banners);
        window.dispatchEvent(new Event('banner-update'));
    }

    // --- CAMPAIGNS ---
    async getCampaigns(restaurantId?: string): Promise<Campaign[]> {
        const raw = localStorage.getItem(this.KEYS.CAMPAIGNS);
        const all: Campaign[] = raw ? JSON.parse(raw) : [];
        if (restaurantId) return all.filter(c => c.restaurantId === restaurantId);
        return all;
    }

    async saveCampaigns(campaigns: Campaign[]) {
        this.setItem(this.KEYS.CAMPAIGNS, campaigns);
        window.dispatchEvent(new Event('campaign-update'));
    }


    // --- MARKET & LOYALTY ---
    async getMarketItems(): Promise<MarketItem[]> {
        const raw = localStorage.getItem(this.KEYS.MARKET);
        if (!raw) {
            const defaults: MarketItem[] = [
                { id: '1', name: '50 TL YemekYa İndirimi', points: 6, icon: '🥡', color: 'bg-primary', type: 'discount' },
                { id: '2', name: '100 TL YemekYa İndirimi', points: 9, icon: '🥡', color: 'bg-primary/80', type: 'discount' },
                { id: '3', name: '150 TL YemekYa İndirimi', points: 14, icon: '🥡', color: 'bg-primary/60', type: 'discount' },
                { id: '4', name: '200 TL YemekYa İndirimi', points: 18, icon: '🥡', color: 'bg-primary/40', type: 'discount' },
                { id: '5', name: '250 TL YemekYa İndirimi', points: 22, icon: '🥡', color: 'bg-primary/20', type: 'discount' },
            ];
            this.setItem(this.KEYS.MARKET, defaults);
            return defaults;
        }
        return JSON.parse(raw);
    }

    async saveMarketItems(items: MarketItem[]) {
        this.setItem(this.KEYS.MARKET, items);
    }

    async addUserPoint(email: string, points: number = 1) {
        try {
            const all = await this.getUsers();
            const user = all.find(u => u.email === email || u.id === email);
            if (user) {
                const newPoints = (user.points || 0) + points;
                await this.updateUser(user.email, { points: newPoints });

                // Legacy LocalStorage support for backward compatibility if needed by other components
                localStorage.setItem(`YEMEKYA_POINTS_${user.email}`, newPoints.toString());
                window.dispatchEvent(new Event('points-update'));
            }
        } catch (err) {
            console.error('addUserPoint error:', err);
        }
    }

    async getUserPoints(email: string): Promise<number> {
        const all = await this.getUsers();
        const user = all.find(u => u.email === email || u.id === email);
        if (user) return user.points || 0;

        // Fallback to legacy
        const raw = localStorage.getItem(`YEMEKYA_POINTS_${email}`);
        return parseInt(raw || '0');
    }

    async redeemReward(email: string, itemId: string): Promise<{ success: boolean, message: string }> {
        const item = (await this.getMarketItems()).find(i => i.id === itemId);
        if (!item) return { success: false, message: 'Ürün bulunamadı.' };

        const points = await this.getUserPoints(email);
        if (points < item.points) return { success: false, message: 'Yetersiz puan.' };

        await this.addUserPoint(email, -item.points);
        await this.addCouponToUser(email, item);

        return { success: true, message: `${item.name} başarıyla alındı! Kuponlarım sekmesinden kullanabilirsin.` };
    }

    async getUserCoupons(email: string): Promise<UserCoupon[]> {
        const key = `YEMEKYA_COUPONS_${email}`;
        return this.getItem<UserCoupon>(key);
    }

    private async addCouponToUser(email: string, item: MarketItem) {
        const coupons = await this.getUserCoupons(email);
        const newCoupon: UserCoupon = {
            id: 'CP-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            itemId: item.id,
            name: item.name,
            value: item.type === 'discount' ? item.points / 10 : 0, // Örnek mantık
            isUsed: false,
            date: new Date().toLocaleDateString('tr-TR')
        };
        coupons.push(newCoupon);
        this.setItem(`YEMEKYA_COUPONS_${email}`, coupons);
        window.dispatchEvent(new Event('coupons-update'));
    }

    async markCouponAsUsed(email: string, couponId: string) {
        const coupons = await this.getUserCoupons(email);
        const idx = coupons.findIndex(c => c.id === couponId);
        if (idx !== -1) {
            coupons[idx].isUsed = true;
            this.setItem(`YEMEKYA_COUPONS_${email}`, coupons);
            window.dispatchEvent(new Event('coupons-update'));
        }
    }

    // --- COMMISSION & ACCOUNTING ---
    async getRestaurantCommission(restaurantId: string): Promise<{
        totalOrders: number,
        grossRevenue: number,
        commissionAmount: number,
        couponsUsed: number,
        netCommission: number,
        pendingCommission: number
    }> {
        try {
            const { data, error } = await supabase.rpc('get_weekly_commission_stats', { p_restaurant_id: restaurantId });
            if (error) throw error;
            if (data) {
                return {
                    ...data,
                    pendingCommission: data.netCommission
                };
            }
        } catch (err) {
            // Sessizce fallback'e geç
        }

        // Fallback Logic
        const orders = await this.getOrders();
        const startOfWeek = new Date();
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const resOrders = orders.filter(o =>
            o.restaurantId === restaurantId &&
            this.parseDate(o.date).getTime() >= startOfWeek.getTime()
        );

        const grossRevenue = resOrders.reduce((sum, o) => sum + (o.originalTotal || o.total), 0);
        const couponsUsed = resOrders.reduce((sum, o) => sum + (o.couponDiscount || 0), 0);
        const commissionAmount = grossRevenue * 0.05;
        const netCommission = commissionAmount - couponsUsed;

        const unpaidOrders = resOrders.filter(o => !o.isCommissionPaid);
        const unpaidGross = unpaidOrders.reduce((sum, o) => sum + (o.originalTotal || o.total), 0);
        const unpaidCoupons = unpaidOrders.reduce((sum, o) => sum + (o.couponDiscount || 0), 0);
        const pendingCommission = (unpaidGross * 0.05) - unpaidCoupons;

        return { totalOrders: resOrders.length, grossRevenue, commissionAmount, couponsUsed, netCommission, pendingCommission };
    }

    async getRestaurantAccountingStatus(restaurantId: string): Promise<{
        penaltyLevel: number,
        unpaidPeriods: { start: string, end: string, netCommission: number, graceExpired: boolean }[],
        totalPending: number
    }> {
        try {
            const { data, error } = await supabase.rpc('get_restaurant_accounting_summary', { p_restaurant_id: restaurantId });
            if (error) throw error;
            if (data) return data;
        } catch (err) {
            // Sessizce fallback'e geç
        }

        // Fallback Logic
        const orders = await this.getOrders();
        const resOrders = orders.filter(o => o.restaurantId === restaurantId && !o.isCommissionPaid);

        if (resOrders.length === 0) return { penaltyLevel: 0, unpaidPeriods: [], totalPending: 0 };

        const weeks: Record<string, Order[]> = {};
        resOrders.forEach(o => {
            const date = this.parseDate(o.date);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(new Date(date).setDate(diff));
            monday.setHours(0, 0, 0, 0);
            const key = monday.toISOString().split('T')[0];
            if (!weeks[key]) weeks[key] = [];
            weeks[key].push(o);
        });

        const now = new Date();
        const unpaidPeriods = Object.keys(weeks).map(mondayKey => {
            const monday = new Date(mondayKey);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const weekOrders = weeks[mondayKey];
            const gross = weekOrders.reduce((sum, o) => sum + (o.originalTotal || o.total), 0);
            const coupons = weekOrders.reduce((sum, o) => sum + (o.couponDiscount || 0), 0);
            const net = (gross * 0.05) - coupons;

            const graceDate = new Date(sunday);
            graceDate.setDate(sunday.getDate() + 5);
            graceDate.setHours(23, 59, 59, 999);

            return {
                start: monday.toLocaleDateString('tr-TR'),
                end: sunday.toLocaleDateString('tr-TR'),
                netCommission: net,
                graceExpired: now > graceDate
            };
        }).sort((a, b) => this.parseDate(a.start).getTime() - this.parseDate(b.start).getTime());

        const expiredCount = unpaidPeriods.filter(p => p.graceExpired).length;
        const totalPending = unpaidPeriods.reduce((sum, p) => sum + p.netCommission, 0);

        let penaltyLevel = 0;
        if (expiredCount >= 3) penaltyLevel = 3;
        else if (expiredCount === 2) penaltyLevel = 2;
        else if (expiredCount === 1) penaltyLevel = 1;

        return { penaltyLevel, unpaidPeriods, totalPending };
    }

    async getInvoiceHistory(restaurantId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('period_start', { ascending: false });

            if (error) throw error;
            if (data && data.length > 0) {
                return data.map(inv => ({
                    id: inv.id,
                    period: `${new Date(inv.period_start).toLocaleDateString('tr-TR')} - ${new Date(inv.period_end).toLocaleDateString('tr-TR')}`,
                    start: inv.period_start,
                    end: inv.period_end,
                    grossRevenue: inv.gross_revenue,
                    netCommission: inv.net_commission,
                    status: inv.status,
                    date: inv.period_end
                }));
            }
        } catch (err) {
            // Sessizce fallback'e geç
        }

        // Legacy Fallback
        const orders = await this.getOrders();
        const resOrders = orders.filter(o => o.restaurantId === restaurantId);

        if (resOrders.length === 0) return [];

        const weeks: Record<string, Order[]> = {};
        resOrders.forEach(o => {
            const date = this.parseDate(o.date);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(new Date(date).setDate(diff));
            monday.setHours(0, 0, 0, 0);
            const key = monday.toISOString().split('T')[0];
            if (!weeks[key]) weeks[key] = [];
            weeks[key].push(o);
        });

        const now = new Date();
        return Object.keys(weeks).map(mondayKey => {
            const monday = new Date(mondayKey);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const weekOrders = weeks[mondayKey];
            const gross = weekOrders.reduce((sum, o) => sum + (o.originalTotal || o.total), 0);
            const coupons = weekOrders.reduce((sum, o) => sum + (o.couponDiscount || 0), 0);
            const net = (gross * 0.05) - coupons;
            const isAllPaid = weekOrders.every(o => o.isCommissionPaid);

            const graceDate = new Date(sunday);
            graceDate.setDate(sunday.getDate() + 5);
            graceDate.setHours(23, 59, 59, 999);

            let status: 'Ödendi' | 'Ödeme Bekliyor' | 'Gecikmiş' = 'Ödendi';
            if (!isAllPaid) {
                status = now > graceDate ? 'Gecikmiş' : 'Ödeme Bekliyor';
            }

            return {
                id: `INV-${mondayKey.replace(/-/g, '')}`,
                period: `${monday.toLocaleDateString('tr-TR')} - ${sunday.toLocaleDateString('tr-TR')}`,
                start: monday.toLocaleDateString('tr-TR'),
                end: sunday.toLocaleDateString('tr-TR'),
                grossRevenue: gross,
                netCommission: net,
                status,
                date: sunday.toLocaleDateString('tr-TR')
            };
        }).sort((a, b) => this.parseDate(b.date).getTime() - this.parseDate(a.date).getTime());
    }

    async markInvoicePaid(restaurantId: string, mondayKey: string) {
        try {
            // 1. Supabase 'invoices' tablosunu güncelle
            // mondayKey formatı Admin panelinden YYYY-MM-DD olarak gelir
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'Ödendi' })
                .eq('restaurant_id', restaurantId)
                .eq('period_start', mondayKey);

            if (error) console.error('Supabase markInvoicePaid error:', error);
        } catch (err) {
            console.error('markInvoicePaid execution error:', err);
        }

        // 2. Legacy / Sipariş Bazlı Güncelleme (Geriye dönük uyumluluk için)
        const monday = new Date(mondayKey);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const orders = await this.getOrders();
        const periodOrders = orders.filter(o => {
            const d = this.parseDate(o.date);
            return o.restaurantId === restaurantId && d >= monday && d <= sunday;
        });

        for (const order of periodOrders) {
            await this.updateOrder(order.id, { isCommissionPaid: true });
        }
    }

    async markRestaurantCommissionsPaid(restaurantId: string) {
        const orders = await this.getOrders();
        const unpaid = orders.filter(o => o.restaurantId === restaurantId && !o.isCommissionPaid);
        for (const order of unpaid) {
            await this.updateOrder(order.id, { isCommissionPaid: true });
        }
    }

    async getRestaurantName(id: string): Promise<string> {
        const all = await this.getRestaurants();
        const found = all.find(r => r.id === id);
        return found ? found.name : id;
    }

    // --- SMART SAVINGS (PRICE INTELLIGENCE) ---
    async getPriceIntelligence(product: MenuItem, currentRestaurantId: string) {
        const allRestaurants = await this.getRestaurants();
        const currentHour = new Date().getHours();

        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9ğüşıöç\s]/g, '').trim();
        const productKeywords = normalize(product.name).split(' ');

        const alternatives: any[] = [];

        allRestaurants.forEach(res => {
            if (res.id === currentRestaurantId) return;

            const isOpen = currentHour >= (res.openTime || 9) && currentHour < (res.closeTime || 23);
            if (!isOpen) return;

            res.menu?.forEach(item => {
                const isSameBaseCategory = item.baseCategory && product.baseCategory && item.baseCategory === product.baseCategory;
                const itemNameNormalized = normalize(item.name);

                const matchCount = productKeywords.filter(k => itemNameNormalized.includes(k)).length;
                const isSimilarName = matchCount >= 2;

                if (isSameBaseCategory || isSimilarName) {
                    if (item.isMenu === product.isMenu) {
                        alternatives.push({
                            ...item,
                            restaurantId: res.id,
                            restaurantName: res.name,
                            restaurantImg: res.img,
                            score: item.unitAmount ? (item.price / item.unitAmount) : item.price
                        });
                    }
                }
            });
        });

        if (alternatives.length === 0) return null;

        const currentScore = product.unitAmount ? (product.price / product.unitAmount) : product.price;
        const avgScore = alternatives.reduce((sum, a) => sum + a.score, 0) / alternatives.length;

        const sortedAlternatives = alternatives.sort((a, b) => a.score - b.score);
        const bestOptions = sortedAlternatives.slice(0, 3);

        const isExpensive = currentScore > avgScore * 1.15;

        return {
            isExpensive,
            avgPrice: Math.round(avgScore * (product.unitAmount || 1)),
            currentPrice: product.price,
            savingsPercent: Math.round(((currentScore - avgScore) / currentScore) * 100),
            bestOptions
        };
    }
}

export default DataStore;
