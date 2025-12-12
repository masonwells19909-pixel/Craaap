-- هذا التحديث يضمن أن العداد يزيد فعلياً مع كل إعلان
-- ويقوم بإصلاح منطق احتساب الـ VIP

CREATE OR REPLACE FUNCTION watch_ad()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_vip_level int;
  reward_amount decimal;
  current_ads_today int;
BEGIN
  -- 1. الحصول على بيانات المستخدم الحالية
  SELECT vip_level, ads_watched_today INTO user_vip_level, current_ads_today
  FROM profiles
  WHERE id = auth.uid();

  -- 2. التحقق من الحد اليومي
  IF current_ads_today >= 5000 THEN
    RAISE EXCEPTION 'Daily ad limit reached';
  END IF;

  -- 3. تحديد قيمة المكافأة بناءً على المستوى
  IF user_vip_level = 3 THEN
    reward_amount := 0.001;
  ELSIF user_vip_level = 2 THEN
    reward_amount := 0.0008;
  ELSIF user_vip_level = 1 THEN
    reward_amount := 0.0005;
  ELSE
    reward_amount := 0.00025;
  END IF;

  -- 4. تحديث البيانات (الرصيد + العدادات)
  UPDATE profiles
  SET 
    balance = balance + reward_amount,
    ads_watched = ads_watched + 1,        -- زيادة العداد الكلي (المهم للـ VIP)
    ads_watched_today = ads_watched_today + 1, -- زيادة عداد اليوم
    vip_level = CASE 
      WHEN (ads_watched + 1) >= 50000 THEN 3
      WHEN (ads_watched + 1) >= 30000 THEN 2
      WHEN (ads_watched + 1) >= 15000 THEN 1
      ELSE vip_level
    END
  WHERE id = auth.uid();
END;
$$;
