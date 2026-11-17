-- Notify store admins when someone creates an account. Signup happens in the
-- browser against Supabase Auth, so the app server never sees it; a trigger on
-- auth.users is the only reliable place to catch it.
--
-- The notification is best-effort: any failure here is downgraded to a warning
-- so it can never block a signup.

CREATE OR REPLACE FUNCTION public.notify_admins_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Team members being invited are not customers.
  IF EXISTS (
    SELECT 1 FROM store_users su WHERE lower(su.email) = lower(NEW.email)
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, message)
  SELECT DISTINCT su.user_id,
         'New Customer',
         COALESCE(NEW.email, 'A new customer') || ' created an account.'
  FROM store_users su
  JOIN store_roles sr ON sr.id = su.role_id
  WHERE su.status = 'active'
    AND su.user_id IS NOT NULL
    AND sr.name IN ('Owner', 'Admin', 'Manager');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admins_new_customer failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_new_customer() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created_notify_admins ON auth.users;
CREATE TRIGGER on_auth_user_created_notify_admins
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_customer();
