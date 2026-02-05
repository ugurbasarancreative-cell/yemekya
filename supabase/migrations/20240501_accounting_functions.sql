-- YemekYa Platform Accounting Functions

-- 1. Haftalık Komisyon Hesaplama (RPC)
-- Bu fonksiyon belirli bir restoranın haftalık (Pazartesi'den bugüne) finansal verilerini döner.
CREATE OR REPLACE FUNCTION get_weekly_commission_stats(p_restaurant_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_start_of_week TIMESTAMP;
    v_stats RECORD;
BEGIN
    -- Pazartesi 00:00:00
    v_start_of_week := date_trunc('week', now());
    
    SELECT 
        COUNT(*)::INT as total_orders,
        COALESCE(SUM(total), 0)::NUMERIC as gross_revenue,
        COALESCE(SUM(total * 0.05), 0)::NUMERIC as commission_amount,
        COALESCE(SUM("couponDiscount"), 0)::NUMERIC as coupons_used
    INTO v_stats
    FROM orders
    WHERE "restaurantId" = p_restaurant_id
    AND date::TIMESTAMP >= v_start_of_week;

    RETURN jsonb_build_object(
        'totalOrders', v_stats.total_orders,
        'grossRevenue', v_stats.gross_revenue,
        'commissionAmount', v_stats.commission_amount,
        'couponsUsed', v_stats.coupons_used,
        'netCommission', v_stats.commission_amount - v_stats.coupons_used
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ödenmemiş Dönemler ve Ceza Durumu
-- Bu fonksiyon restoranın ödenmemiş haftalarını ve gün farklarını hesaplayarak ceza seviyesini (penaltyLevel) döner.
CREATE OR REPLACE FUNCTION get_restaurant_accounting_summary(p_restaurant_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_unpaid_periods JSONB;
    v_penalty_level INT := 0;
    v_expired_count INT := 0;
    v_total_pending NUMERIC := 0;
BEGIN
    WITH unpaid_weeks AS (
        SELECT 
            date_trunc('week', date::TIMESTAMP)::DATE as week_monday,
            SUM((total * 0.05) - "couponDiscount") as net_commission
        FROM orders
        WHERE "restaurantId" = p_restaurant_id 
        AND "isCommissionPaid" = false
        GROUP BY 1
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'start', week_monday,
                'end', week_monday + 6,
                'netCommission', net_commission,
                'graceExpired', (now() > (week_monday + 6 + INTERVAL '5 days'))
            )
        ),
        COUNT(*) FILTER (WHERE (now() > (week_monday + 6 + INTERVAL '5 days'))),
        SUM(net_commission)
    INTO v_unpaid_periods, v_expired_count, v_total_pending
    FROM unpaid_weeks;

    -- Ceza Seviyesi Belirleme
    IF v_expired_count >= 3 THEN v_penalty_level := 3;
    ELSIF v_expired_count = 2 THEN v_penalty_level := 2;
    ELSIF v_expired_count = 1 THEN v_penalty_level := 1;
    END IF;

    RETURN jsonb_build_object(
        'penaltyLevel', v_penalty_level,
        'unpaidPeriods', COALESCE(v_unpaid_periods, '[]'::JSONB),
        'totalPending', COALESCE(v_total_pending, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
