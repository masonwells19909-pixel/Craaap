-- 1. حذف الدالة القديمة أولاً لتجنب خطأ تعارض الأنواع
DROP FUNCTION IF EXISTS get_my_referrals();

-- 2. التأكد من وجود العمود الصحيح (referred_by)
DO $$ 
BEGIN 
    -- إذا كان العمود referrer_id موجوداً والعمود referred_by غير موجود، نقوم بتغيير الاسم
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referrer_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referred_by') THEN
        ALTER TABLE profiles RENAME COLUMN referrer_id TO referred_by;
    
    -- إذا كان كلاهما غير موجود، نقوم بإنشاء referred_by
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referred_by') THEN
        ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. إعادة إنشاء الدالة بالشكل الصحيح
CREATE OR REPLACE FUNCTION get_my_referrals()
RETURNS TABLE (
  masked_email TEXT,
  joined_at TIMESTAMPTZ,
  friends_invited BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p.email IS NOT NULL AND length(p.email) > 4 THEN 
        substring(p.email from 1 for 2) || '***' || substring(p.email from position('@' in p.email))
      ELSE 'User ' || substring(p.id::text from 1 for 4)
    END as masked_email,
    p.created_at as joined_at,
    (SELECT count(*) FROM profiles sub WHERE sub.referred_by = p.id)::BIGINT as friends_invited
  FROM profiles p
  WHERE p.referred_by = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_my_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_referrals() TO service_role;
