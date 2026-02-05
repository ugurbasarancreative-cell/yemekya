# 🛡️ YemekYa Enterprise Architecture & Security Guide

Bu belge, YemekYa platformunun üretime (production) hazır hale getirilmesi için gereken kurumsal düzeydeki güvenlik, performans ve altyapı standartlarını tanımlar.

## 1. Güvenlik ve Veri Korunması (Cybersecurity)
*   **İletişim Güvenliği (TLS/HTTPS):** Tüm veri trafiği TLS 1.3 protokolü ile şifrelenmelidir. Güvenli olmayan (HTTP) istekler HSTS (HTTP Strict Transport Security) ile HTTPS'e yönlendirilmelidir.
*   **API Güvenliği (XSS/SQLi/CSRF):**
    *   **SQL Injection:** TypeORM veya Prisma gibi bir ORM kullanılarak "Parameterized Queries" zorunlu tutulmalıdır. Raw SQL kullanımından kaçınılmalıdır.
    *   **XSS (Cross-Site Scripting):** React'in yerleşik escape mekanizması kullanılmalı, `dangerouslySetInnerHTML` sadece sanitize edildikten sonra (DOMPurify vb.) kullanılmalıdır.
    *   **CSRF:** Next.js Server Actions veya API rotalarında CSRF Token doğrulaması yapılmalıdır.
*   **Rol Tabanlı Erişim (RBAC):** Kullanıcılar `USER`, `RESTAURANT_MANAGER` ve `PLATFORM_ADMIN` olarak ayrılmalı. JWT (JSON Web Token) içinde `scope` veya `role` alanı barındırılarak her API isteği bu yetkiye göre authorize edilmelidir.

## 2. Veri Yedekleme ve Kurtarma (Backup & Recovery)
*   **Point-in-Time Recovery (PITR):** Veritabanı (PostgreSQL önerilir) anlık yedekleme modunda çalışmalıdır. Herhangi bir saniyeye geri dönme imkanı olmalıdır.
*   **Multi-Region Redundancy:** Yedekler AWS S3 veya Azure Blob Storage gibi farklı coğrafi bölgelerde (Dual-region) saklanmalıdır.
*   **Felaket Kurtarma (DR) Planı:** Sunucu arızası durumunda en geç 5 dakika içinde yedek sunucuların devreye girmesi için "Blue-Green Deployment" veya "Auto-scaling groups" yapılandırılmalıdır.

## 3. Performans ve Ölçeklenebilirlik (Scalability)
*   **Caching Stratejisi:**
    *   **Edge Caching (CDN):** Görseller ve statik dosyalar Cloudflare/Akamai üzerinden sunulmalıdır.
    *   **Server-Side Caching (Redis):** Popüler restoranlar, aktif teklifler ve oturum verileri Redis üzerinde cache'lenerek veritabanı yükü %80 azaltılmalıdır.
*   **Veritabanı İyileştirme:** Read/Write ayrımı (Read Replicas) yapılmalı, restoran ve sipariş sayıları milyonlara ulaştığında "Database Sharding" mimarisine geçilmelidir.

## 4. Ödeme ve Dolandırıcılık Önleme (Anti-Fraud)
*   **Spam Filtresi:** Aynı IP üzerinden kısa sürede gelen teklif/siparişler Rate Limiting (Redis tabanlı) ile engellenmelidir.
*   **Bot Koruması:** Giriş ve ödeme ekranlarında Google reCAPTCHA v3 (görünmez) kullanılmalıdır.
*   **Ödeme Güvenliği:** Kredi kartı verileri asla YemekYa sunucularında tutulmamalı, PCI-DSS uyumlu (Iyzico, Stripe vb.) iFrame/Tokenization yöntemleri kullanılmalıdır.

## 5. İzleme (Monitoring) & Loglama
*   **Log Management:** Winston veya Pino kütüphaneleri kullanılmalı. Tüm error ve security logları ELK (Elasticsearch, Logstash, Kibana) yığınına veya Datadog'a aktarılmalıdır.
*   **Uptime Monitoring:** Sentry üzerinden hata takibi, Grafana üzerinden sistem kaynak (CPU/RAM) takibi yapılmalıdır.

## 6. Hukuki ve KVKK Uyumu
*   **KVKK/GDPR:** Kullanıcı verileri şifrelenmiş (AES-256) şekilde saklanmalı. Kayıt sırasında "Açık Rıza Beyanı" ve "Çerez Politikası" onayı alınmalıdır.
*   **Veri Silme Talebi:** Kullanıcılara "Hesabımı ve verilerimi sil" (Unutulma Hakkı) butonu sunulmalıdır.

---
*YemekYa Pro - v2.4.1 Yazılım Mimari Standartları*
