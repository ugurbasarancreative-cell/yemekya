-- YemekYa Muhasebe Otomasyonu - Gelişmiş Finansal Mimari

-- 1. Faturalar Tablosu (Resmi Takip İçin)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, -- INV-20240205 gibi
    restaurant_id TEXT REFERENCES restaurants(id),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    gross_revenue NUMERIC DEFAULT 0,
    net_commission NUMERIC DEFAULT 0,
    coupons_total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Ödeme Bekliyor', -- 'Ödendi', 'Ödeme Bekliyor', 'Gecikmiş'
    created_at TIMESTAMP DEFAULT now()
);

-- 2. Restoranların Ceza Seviyesini Gerçek Zamanlı Hesaplayan View
CREATE OR REPLACE VIEW v_restaurant_financial_status AS
WITH unpaid_invoices AS (
    SELECT 
        restaurant_id,
        COUNT(*) FILTER (WHERE status != 'Ödendi' AND period_end + INTERVAL '5 days' < now()) as expired_invoice_count,
        SUM(net_commission) FILTER (WHERE status != 'Ödendi') as total_debt
    FROM invoices
    GROUP BY restaurant_id
)
SELECT 
    r.id as restaurant_id,
    r.name,
    COALESCE(ui.expired_invoice_count, 0) as penalty_level,
    COALESCE(ui.total_debt, 0) as total_debt,
    CASE 
        WHEN COALESCE(ui.expired_invoice_count, 0) >= 3 THEN 'SUSPENDED'
        WHEN COALESCE(ui.expired_invoice_count, 0) > 0 THEN 'WARNING'
        ELSE 'HEALTHY'
    END as financial_health
FROM restaurants r
LEFT JOIN unpaid_invoices ui ON r.id = ui.restaurant_id;

-- 3. Otomatik Fatura Oluşturma Fonksiyonu (Haftalık Çalıştırılmak Üzere)
CREATE OR REPLACE FUNCTION generate_weekly_invoices()
RETURNS void AS $$
DECLARE
    v_last_monday TIMESTAMP;
    v_last_sunday TIMESTAMP;
    v_res RECORD;
BEGIN
    -- Geçen haftanın Pazartesi ve Pazar'ını bul
    v_last_monday := date_trunc('week', now() - INTERVAL '7 days');
    v_last_sunday := v_last_monday + INTERVAL '6 days 23 hours 59 minutes 59 seconds';

    FOR v_res IN SELECT id FROM restaurants LOOP
        -- O hafta için siparişleri kontrol et
        INSERT INTO invoices (id, restaurant_id, period_start, period_end, gross_revenue, net_commission, coupons_total, status)
        SELECT 
            'INV-' || to_char(v_last_monday, 'YYYYMMDD') || '-' || v_res.id,
            v_res.id,
            v_last_monday,
            v_last_sunday,
            SUM(total),
            SUM(total * 0.05 - "couponDiscount"),
            SUM("couponDiscount"),
            'Ödeme Bekliyor'
        FROM orders
        WHERE "restaurantId" = v_res.id
        AND date::TIMESTAMP BETWEEN v_last_monday AND v_last_sunday
        ON CONFLICT (id) DO NOTHING;
        
        -- 5. Kritik Gecikmede Restoranı Otomatik Askıya Al (Trigger)
CREATE OR REPLACE FUNCTION check_restaurant_suspension()
RETURNS trigger AS $$
DECLARE
    v_expired_count INT;
BEGIN
    -- Gecikmiş fatura sayısını say
    SELECT COUNT(*) INTO v_expired_count
    FROM invoices
    WHERE restaurant_id = NEW.restaurant_id
    AND status != 'Ödendi'
    AND period_end + INTERVAL '5 days' < now();

    -- Eğer 3 veya daha fazla gecikmiş fatura varsa restoranı kapat
    IF v_expired_count >= 3 THEN
        UPDATE restaurants SET status = 'closed' WHERE id = NEW.restaurant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_suspension ON invoices;
CREATE TRIGGER trg_check_suspension
AFTER INSERT OR UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION check_restaurant_suspension();

-- 4. Sipariş Tamamlandığında Komisyon Puanı ve Diğer İşlemler (Trigger)
CREATE OR REPLACE FUNCTION on_order_delivered()
RETURNS trigger AS $$
BEGIN
    -- Sadece 'Teslim Edildi' durumuna geçtiğinde
    IF (NEW.status = 'Teslim Edildi' AND (OLD.status IS NULL OR OLD.status != 'Teslim Edildi')) THEN
        -- Kullanıcıya puan ekle (Tutarın %10'u kadar)
        UPDATE users 
        SET points = COALESCE(points, 0) + FLOOR(NEW.total * 0.1)
        WHERE id = NEW."userId" OR email = NEW."userId";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_delivered ON orders;
CREATE TRIGGER trg_order_delivered
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION on_order_delivered();
