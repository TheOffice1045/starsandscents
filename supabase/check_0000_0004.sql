-- Read-only: which of migrations 0000-0004 are live in this database?
SELECT '0000 role_based_rls: is_store_admin()' AS migration,
       to_regprocedure('public.is_store_admin()') IS NOT NULL AS applied
UNION ALL SELECT '0000 role_based_rls: "Admins manage orders" policy',
       EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins manage orders')
UNION ALL SELECT '0001 scrub_payment_secrets: store_settings.payment_methods',
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'payment_methods')
UNION ALL SELECT '0002 order_refunds: orders.refunded_amount',
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'refunded_amount')
UNION ALL SELECT '0003 new_customer_notification: notify_admins_new_customer()',
       to_regprocedure('public.notify_admins_new_customer()') IS NOT NULL
UNION ALL SELECT '0004 store_shipping_methods: orders.shipping_method',
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_method');
