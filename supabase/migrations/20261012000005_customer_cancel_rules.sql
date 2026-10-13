-- Tighten what customers can cancel from their account page, and tell admins
-- when they do (a paid order that gets cancelled still needs a refund).
-- Replaces guard_customer_order_update() from 20261012000000_role_based_rls.sql.

-- Reusable: one notification row per active Owner/Admin/Manager.
CREATE OR REPLACE FUNCTION public.notify_store_admins(p_title text, p_message text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO notifications (user_id, title, message)
  SELECT DISTINCT su.user_id, p_title, p_message
  FROM store_users su
  JOIN store_roles sr ON sr.id = su.role_id
  WHERE su.status = 'active'
    AND su.user_id IS NOT NULL
    AND sr.name IN ('Owner', 'Admin', 'Manager');
$$;

REVOKE ALL ON FUNCTION public.notify_store_admins(text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.guard_customer_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent record;
  new_status text := to_jsonb(NEW) ->> 'status';
  old_status text := to_jsonb(OLD) ->> 'status';
BEGIN
  -- Service role / direct DB connections have no auth.uid(); admins are unrestricted.
  IF auth.uid() IS NULL OR public.is_store_admin() THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Customers may only change the status of their own orders';
  END IF;

  IF new_status IS NOT DISTINCT FROM old_status THEN
    RETURN NEW;
  END IF;

  IF new_status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'Customers may only cancel orders';
  END IF;

  -- Look at the order itself (or the item's parent order).
  IF TG_TABLE_NAME = 'orders' THEN
    SELECT OLD.id AS id, to_jsonb(OLD) ->> 'order_number' AS order_number,
           OLD.fulfillment_status AS fulfillment_status, OLD.payment_status AS payment_status
      INTO parent;
  ELSE
    SELECT o.id, o.order_number, o.fulfillment_status, o.payment_status
      INTO parent
      FROM orders o
     WHERE o.id = (to_jsonb(NEW) ->> 'order_id')::uuid;
  END IF;

  IF parent.fulfillment_status IS DISTINCT FROM 'unfulfilled' THEN
    RAISE EXCEPTION 'This order has already been shipped and can no longer be cancelled';
  END IF;

  IF parent.payment_status IN ('refunded', 'partially_refunded') THEN
    RAISE EXCEPTION 'This order has been refunded and can no longer be cancelled';
  END IF;

  PERFORM public.notify_store_admins(
    'Order Cancelled',
    CASE WHEN TG_TABLE_NAME = 'orders'
      THEN 'Customer cancelled order ' || COALESCE(parent.order_number, parent.id::text)
      ELSE 'Customer cancelled an item on order ' || COALESCE(parent.order_number, parent.id::text)
    END
    || CASE WHEN parent.payment_status = 'paid' THEN ' (paid: refund needed).' ELSE '.' END
  );

  RETURN NEW;
END;
$$;
