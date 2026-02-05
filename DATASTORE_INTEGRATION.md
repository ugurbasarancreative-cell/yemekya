# 🔄 YemekYa - Merkezi Veri Yönetimi Entegrasyonu

## ✅ Tamamlanan: Merkezi DataStore Sistemi

### 📦 Oluşturulan Dosya
**`src/lib/dataStore.ts`** - Merkezi veri yönetim sistemi

### 🎯 DataStore Özellikleri

#### 1. **Singleton Pattern**
- Tüm uygulama genelinde tek bir veri kaynağı
- Tutarlı veri erişimi garantisi

#### 2. **Yönetilen Veri Tipleri**
- ✅ **Restaurants** (Restoranlar)
- ✅ **Menu Items** (Menü Ürünleri)
- ✅ **Orders** (Siparişler)
- ✅ **Menu Approvals** (Menü Onayları)
- ✅ **Reviews** (Yorumlar)
- ✅ **Users** (Kullanıcılar)
- ✅ **Addresses** (Adresler)

#### 3. **Temel Fonksiyonlar**

```typescript
// Restoranlar
getRestaurants(): Restaurant[]
getRestaurant(id: string): Restaurant | null
updateRestaurant(id: string, updates: Partial<Restaurant>): void

// Menü Ürünleri
getMenuItems(restaurantId: string): MenuItem[]
addMenuItem(restaurantId, item, requiresApproval): void
updateMenuItem(restaurantId, itemId, updates, requiresApproval): void

// Siparişler
getOrders(): Order[]
getRestaurantOrders(restaurantId: string): Order[]
createOrder(order: Order): void
updateOrder(orderId: string, updates: Partial<Order>): void

// Menü Onayları
getMenuApprovals(): MenuApproval[]
getPendingApprovals(): MenuApproval[]
createMenuApproval(approval: MenuApproval): void
updateApprovalStatus(approvalId, status, adminNote?): void

// Yorumlar
getReviews(): Review[]
getRestaurantReviews(restaurantId: string): Review[]
createReview(review: Review): void

// İstatistikler
getPlatformStats(): PlatformStats
```

#### 4. **Otomatik Senkronizasyon**
- localStorage ile kalıcı veri saklama
- Cross-tab iletişim (storage events)
- Gerçek zamanlı güncellemeler

### 🔗 Entegrasyon Adımları

#### Adım 1: DataStore'u İçe Aktarma
```typescript
import DataStore from "@/lib/dataStore";
```

#### Adım 2: Instance Alma
```typescript
const dataStore = DataStore.getInstance();
```

#### Adım 3: Veri Kullanımı
```typescript
// Restoranları yükle
const restaurants = dataStore.getRestaurants();

// Sipariş oluştur
dataStore.createOrder({
  id: 'ORDER-123',
  restaurantId: 'pizza-house',
  // ... diğer alanlar
});

// Menü onayı iste
dataStore.addMenuItem(restaurantId, newItem, true); // true = onay gerekli
```

### 📋 Entegrasyon Gereken Sayfalar

#### ✅ Hazır (DataStore oluşturuldu)
- [x] Merkezi veri yapısı
- [x] TypeScript tipleri
- [x] CRUD operasyonları
- [x] Onay sistemi entegrasyonu

#### 🔄 Entegre Edilecek Sayfalar

1. **Ana Sayfa (`/page.tsx`)**
   ```typescript
   // Şu anki: Hardcoded restaurants array
   // Olması gereken:
   const [restaurants, setRestaurants] = useState([]);
   useEffect(() => {
     const dataStore = DataStore.getInstance();
     setRestaurants(dataStore.getRestaurants());
   }, []);
   ```

2. **Restoran Detay (`/restaurant/[id]/page.tsx`)**
   ```typescript
   const restaurant = dataStore.getRestaurant(params.id);
   const menu = dataStore.getMenuItems(params.id);
   ```

3. **Admin Panel - Restoranlar (`/admin-panel/restaurants/page.tsx`)**
   ```typescript
   const restaurants = dataStore.getRestaurants();
   // Durum değiştirme
   dataStore.updateRestaurant(id, { status: 'open' });
   ```

4. **Admin Panel - Onaylar (`/admin-panel/approvals/page.tsx`)**
   ```typescript
   const pending = dataStore.getPendingApprovals();
   // Onaylama
   dataStore.updateApprovalStatus(approvalId, 'APPROVED');
   ```

5. **Restoran Paneli - Menü (`/restaurant-panel/menu/page.tsx`)**
   ```typescript
   const menu = dataStore.getMenuItems(restaurantId);
   // Yeni ürün (onay gerekli)
   dataStore.addMenuItem(restaurantId, newItem, true);
   ```

6. **Restoran Paneli - Siparişler (`/restaurant-panel/orders/page.tsx`)**
   ```typescript
   const orders = dataStore.getRestaurantOrders(restaurantId);
   // Durum güncelle
   dataStore.updateOrder(orderId, { status: 'Yolda' });
   ```

7. **Checkout (`/checkout/page.tsx`)**
   ```typescript
   // Sipariş oluştur
   dataStore.createOrder({
     id: `YX-${Date.now()}`,
     restaurantId: checkoutData.restaurant.id,
     items: checkoutData.items,
     total: checkoutData.total,
     status: 'Hazırlanıyor',
     // ...
   });
   ```

### 🔄 Gerçek Zamanlı Senkronizasyon

```typescript
useEffect(() => {
  const handleStorageChange = () => {
    // Veri değiştiğinde yeniden yükle
    const dataStore = DataStore.getInstance();
    setRestaurants(dataStore.getRestaurants());
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

### 🎯 Faydaları

1. **Tek Kaynak Doğrusu (Single Source of Truth)**
   - Tüm veriler tek yerden yönetiliyor
   - Tutarsızlık riski yok

2. **Paneller Arası Senkronizasyon**
   - Admin panelde yapılan değişiklik → Ana sayfada anında görünür
   - Restoran panelde menü değişikliği → Onay sistemine düşer
   - Sipariş durumu değişir → Kullanıcı anında görür

3. **Tip Güvenliği**
   - TypeScript ile tam tip desteği
   - Hata riski minimize

4. **Kolay Bakım**
   - Merkezi kod tabanı
   - Değişiklikler tek yerden yapılır

### 🚀 Sonraki Adımlar

1. Tüm sayfalara DataStore import et
2. Hardcoded verileri DataStore çağrılarıyla değiştir
3. Storage event listener'ları ekle
4. Test et ve doğrula

---

**DataStore Sistemi Hazır!** 🎉  
Artık tüm sayfaları bu merkezi sisteme bağlamak için hazırız.
