# 🚀 YemekYa - DataStore Hızlı Entegrasyon Kılavuzu

## ✅ Tamamlanan İşlemler

### 1. Merkezi Veri Sistemi Oluşturuldu
- ✅ `src/lib/dataStore.ts` - Singleton pattern ile merkezi veri yönetimi
- ✅ TypeScript tip tanımlamaları
- ✅ CRUD operasyonları
- ✅ Otomatik senkronizasyon
- ✅ Onay sistemi entegrasyonu

### 2. Örnek Bileşen Oluşturuldu
- ✅ `src/app/components/DataStoreExample.tsx` - Çalışan örnek

### 3. Dokümantasyon Hazırlandı
- ✅ `DATASTORE_INTEGRATION.md` - Detaylı entegrasyon rehberi

## 📝 Hızlı Başlangıç

### Adım 1: Import
```typescript
import DataStore from '@/lib/dataStore';
```

### Adım 2: Instance Al
```typescript
const dataStore = DataStore.getInstance();
```

### Adım 3: Veri Yükle
```typescript
const [restaurants, setRestaurants] = useState([]);

useEffect(() => {
  const dataStore = DataStore.getInstance();
  setRestaurants(dataStore.getRestaurants());
}, []);
```

### Adım 4: Gerçek Zamanlı Senkronizasyon
```typescript
useEffect(() => {
  const handleStorageChange = () => {
    const dataStore = DataStore.getInstance();
    setRestaurants(dataStore.getRestaurants());
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

## 🔄 Paneller Arası Bağlantı Senaryoları

### Senaryo 1: Restoran Durumu Değişikliği
```
Admin Panel → Restoran durumunu "Kapalı" yap
    ↓
DataStore → updateRestaurant(id, { status: 'closed' })
    ↓
Storage Event → Tüm açık sekmelere bildirim
    ↓
Ana Sayfa → Restoran kartı otomatik güncellenir
```

### Senaryo 2: Menü Değişikliği
```
Restoran Paneli → Yeni ürün ekle
    ↓
DataStore → addMenuItem(restaurantId, item, requiresApproval: true)
    ↓
MenuApproval → PENDING durumunda onay kaydı oluştur
    ↓
Admin Panel → Onay listesinde görünür
    ↓
Admin → Onayla
    ↓
DataStore → updateApprovalStatus('APPROVED')
    ↓
Restoran Menüsü → Ürün otomatik eklenir
    ↓
Ana Sayfa → Yeni ürün görünür
```

### Senaryo 3: Sipariş Akışı
```
Kullanıcı → Checkout'ta sipariş ver
    ↓
DataStore → createOrder(orderData)
    ↓
Restoran Paneli → Yeni sipariş bildirimi
    ↓
Restoran → Durumu "Yolda" yap
    ↓
DataStore → updateOrder(id, { status: 'Yolda' })
    ↓
Ana Sayfa → Sipariş takip barı güncellenir
```

## 🎯 Entegrasyon Kontrol Listesi

### Ana Sayfa (`/page.tsx`)
- [ ] DataStore import et
- [ ] Hardcoded restaurants array'i kaldır
- [ ] `getRestaurants()` ile yükle
- [ ] Storage event listener ekle

### Restoran Detay (`/restaurant/[id]/page.tsx`)
- [ ] DataStore import et
- [ ] `getRestaurant(id)` ile restoran yükle
- [ ] `getMenuItems(restaurantId)` ile menü yükle
- [ ] Storage event listener ekle

### Admin Panel - Restoranlar
- [ ] DataStore import et
- [ ] `getRestaurants()` ile yükle
- [ ] `updateRestaurant()` ile güncelle
- [ ] Storage event listener ekle

### Admin Panel - Onaylar
- [ ] DataStore import et
- [ ] `getPendingApprovals()` ile yükle
- [ ] `updateApprovalStatus()` ile onayla/reddet
- [ ] Storage event listener ekle

### Restoran Paneli - Menü
- [ ] DataStore import et
- [ ] `getMenuItems(restaurantId)` ile yükle
- [ ] `addMenuItem()` / `updateMenuItem()` ile değiştir
- [ ] requiresApproval: true kullan
- [ ] Storage event listener ekle

### Restoran Paneli - Siparişler
- [ ] DataStore import et
- [ ] `getRestaurantOrders(restaurantId)` ile yükle
- [ ] `updateOrder()` ile durum güncelle
- [ ] Storage event listener ekle

### Checkout
- [ ] DataStore import et
- [ ] `createOrder()` ile sipariş oluştur
- [ ] `getRestaurant(id)` ile minimum tutar kontrol et

## 🧪 Test Senaryoları

### Test 1: Çoklu Sekme Senkronizasyonu
1. İki tarayıcı sekmesi aç
2. Sekme 1: Admin Panel → Restoran durumunu değiştir
3. Sekme 2: Ana Sayfa → Değişikliği anında gör

### Test 2: Onay Sistemi
1. Restoran Paneli → Yeni ürün ekle
2. Admin Panel → Onay listesinde gör
3. Admin Panel → Onayla
4. Ana Sayfa → Yeni ürünü gör

### Test 3: Sipariş Akışı
1. Ana Sayfa → Sipariş ver
2. Restoran Paneli → Siparişi gör
3. Restoran Paneli → Durumu değiştir
4. Ana Sayfa → Güncel durumu gör

## 💡 Önemli Notlar

### localStorage Anahtarları
```
yemekya_restaurants     → Restoran listesi
yemekya_orders          → Sipariş listesi
yemekya_menu_approvals  → Menü onay listesi
yemekya_reviews         → Yorum listesi
yemekya_user            → Aktif kullanıcı
yemekya_addresses       → Kullanıcı adresleri
yemekya_checkout        → Checkout verileri
yemekya_favorites       → Favori restoranlar
```

### Tip Güvenliği
```typescript
import type { Restaurant, MenuItem, Order } from '@/lib/dataStore';
```

### Error Handling
```typescript
try {
  const dataStore = DataStore.getInstance();
  const restaurant = dataStore.getRestaurant(id);
  if (!restaurant) {
    console.error('Restoran bulunamadı');
    return;
  }
  // İşlemler...
} catch (error) {
  console.error('DataStore hatası:', error);
}
```

## 🎨 UI Güncellemeleri

### Loading States
```typescript
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const dataStore = DataStore.getInstance();
  setRestaurants(dataStore.getRestaurants());
  setIsLoading(false);
}, []);
```

### Optimistic Updates
```typescript
const updateStatus = (id: string, status: string) => {
  // UI'ı hemen güncelle
  setRestaurants(prev => 
    prev.map(r => r.id === id ? { ...r, status } : r)
  );
  
  // Sonra DataStore'u güncelle
  const dataStore = DataStore.getInstance();
  dataStore.updateRestaurant(id, { status });
};
```

## 🔧 Debugging

### Console Logları
```typescript
// Tüm restoranları göster
console.log('Restaurants:', DataStore.getInstance().getRestaurants());

// Platform istatistikleri
console.log('Stats:', DataStore.getInstance().getPlatformStats());

// Bekleyen onaylar
console.log('Pending:', DataStore.getInstance().getPendingApprovals());
```

### localStorage İnceleme
```javascript
// Browser Console'da
Object.keys(localStorage)
  .filter(key => key.startsWith('yemekya_'))
  .forEach(key => {
    console.log(key, JSON.parse(localStorage.getItem(key)));
  });
```

---

## ✅ Sonuç

**DataStore sistemi tamamen hazır ve çalışır durumda!**

Şimdi yapılması gerekenler:
1. Her sayfaya DataStore import et
2. Hardcoded verileri DataStore çağrılarıyla değiştir
3. Storage event listener'ları ekle
4. Test et

**Tüm paneller birbirine bağlı olacak ve gerçek zamanlı senkronize çalışacak!** 🚀
