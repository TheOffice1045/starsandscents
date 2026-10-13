# Admin hardening tracker

Branch: `admin-hardening` (local, uncommitted, not pushed; pushing `main` auto-deploys the live site).
Last updated: 2026-10-12. `next build` (with lint) passes on the branch.

Status key: ✅ done in code (not yet tested live) · 🙋 needs you · ⛔ blocked (reason given)

## 🙋 Needs you, in this order

| # | Item | Status |
|---|------|--------|
| U1 | **Apply migrations 0005–0009** (below), on a Supabase branch/staging first. 0000–0004 you reported applied | 🙋 |
| U2 | **Stripe dashboard → Webhooks → your endpoint → add events** `charge.refunded` and `checkout.session.expired` (refund sync + abandoned carts depend on them) | 🙋 |
| U3 | **Smoke test** (list at bottom) | 🙋 |
| U4 | Roll the Stripe secret key / PayPal client secret if a real one was ever saved in the old Payments form | 🙋 |
| U5 | `.env` (DATABASE_URL) was committed + pushed in the initial commit. It's now untracked (`git rm --cached`, file kept on disk) but still in git history → rotate the DB password if that URL had a real one | 🙋 |
| U6 | Supabase Auth → make sure **email confirmations are ON** (customers see orders matched by email) | 🙋 |
| U7 | Supabase Auth → make sure **MFA (TOTP) is enabled** (on by default on hosted projects) so the new 2FA works | 🙋 |
| U8 | Send a schema dump: `supabase db dump --schema public -f schema-live.sql` (CLI isn't linked here). Unblocks S4, F9, F10 | 🙋 |
| U9 | Delete stray/dead files. My delete was blocked by the permission guard: `app/account/.page.tsx.swp`, `app/indoorme/products/add/.page.tsx.swp`, `app/indoorme/settings/.page.tsx.swp`, `app/indoorme/products/page.tsx.backup`, `app/indoorme/orders/create/page1.tsx`, `app/indoorme/products/add/page2.tsx`, `app/checkout/page1.tsx`, `components/account/OrdersTab1.tsx`, `components/ui/use-toast copy.tsx`, `app/indoorme/components/sidebar.tsx`, `lib/auth.ts` (unused; hardcoded JWT secret) | 🙋 |
| U10 | Restart your local `next dev` (a build I ran collided with its `.next` folder) | 🙋 |
| U11 | Review, commit and push/merge `admin-hardening` | 🙋 |

## Security

| # | Item | Status |
|---|------|--------|
| S0 | API routes had no auth; role-based RLS; payment secrets out of public table (earlier rounds) | ✅ |
| S1 | Middleware fails closed on role-lookup errors; verifies token with `getUser()` instead of trusting the cookie | ✅ |
| S2 | Roles enforced: Managers can't reach Settings/Finance (middleware + hidden in menu); refunds and order deletes are Owner/Admin only | ✅ |
| S3 | Customers can only cancel unshipped, unrefunded orders (DB trigger + account page); admins notified on cancel | ✅ (migration 0005) |
| S4 | RLS for customers, discounts*, product_images, reviews, wishlist, store_settings, stores | ⛔ needs U8 |
| S5 | `/api/emails/send` now admin-only for every type; public contact form uses `/api/contact` (honeypot + 5/hour limit) | ✅ |

## Admin features

| # | Item | Status |
|---|------|--------|
| F1 | Revenue counts only paid orders, net of refunds (`lib/revenue.ts`, dashboard + finance) | ✅ |
| F2 | Dashboard "top products" was always fake sample data → now real best-sellers from paid orders; errors show empty + toast | ✅ |
| F3 | Manual order creation: discount (fixed/%), editable shipping, click-to-add search results; items now carry product_id and reduce stock | ✅ |
| F4 | Profile page: loads/saves name, phone, email (with confirmation), password change; linked from header menu | ✅ |
| F5 | Inventory page: low/out-of-stock view, adjustable threshold, inline stock editing | ✅ |
| F6 | Refunds made in the Stripe dashboard sync to the order (webhook `charge.refunded`) | ✅ (needs U2) |
| F7 | Order delete via server: blocks paid orders, restocks unshipped items once (`stock_restored`) | ✅ (migration 0009) |
| F8 | Venmo/Zelle configurable in Payment settings | ✅ (done by another session: `lib/payments.ts`) |
| F9 | Collections wired two ways (`products.collection_id` vs join table) | ⛔ needs U8 to see which is live |
| F10 | Review moderation | ⛔ needs U8 (reviews table shape unknown) |
| F11 | Contact-form inbox at /indoorme/messages (read/archive/reply) + "New Message" notifications | ✅ (migration 0006) |
| F12 | Abandoned carts at /indoorme/abandoned-carts (expired Stripe checkouts, email/dismiss) | ✅ (migration 0007, needs U2) |
| F13 | Activity log at /indoorme/activity (DB triggers record who changed what) | ✅ (migration 0008) |
| F14 | 2FA for admins: enrol on Profile, enforced by middleware via /indoorme/mfa | ✅ (needs U7) |
| F16 | Settings → Users rebuilt on a server API (`/api/admin/users`): invites email a set-password link and link the login so access actually works; unlinked rows auto-link by email; role/status/remove fixed (were keyed on the wrong id); guards for self-edits, last Owner, and Owner-only changes; roles that grant access can't be renamed/deleted, assigned roles can't be deleted | ✅ |
| F15 | Fulfilment overwrote the customer's chosen shipping option; now kept, and fulfilment is logged in order history | ✅ |

## Known limits / not built (decide if wanted)

- Role permission toggles (Roles tab) aren't enforced anywhere; access is by role name only (Owner/Admin = all, Manager = all but Settings/Finance, anything else = no admin).
- Team changes go through the service client, so the activity log records them as "system", not the admin who made them.

- Tax on manual orders is a hardcoded 8% (`orders/create/page.tsx`).
- Refund restock is all-or-nothing on a full refund (no per-item restock).
- Low-stock threshold is per-browser, not a store setting.
- Abandoned-cart emails open your mail app (no automated recovery emails).
- "New Customer" notification fires for every signup, including staff who sign up before being added to `store_users`.

## Migrations to apply (this round)

| File | What |
|------|------|
| `20261012000005_customer_cancel_rules.sql` | Customer cancel rules + `notify_store_admins()` |
| `20261012000006_contact_messages.sql` | Contact inbox table |
| `20261012000007_abandoned_checkouts.sql` | Abandoned checkouts table |
| `20261012000008_admin_activity_log.sql` | Activity log table + triggers |
| `20261012000009_order_stock_restored.sql` | `orders.stock_restored` |

## Smoke test (after U1–U2)

1. Admin loads at /indoorme; Manager account can't open Settings/Finance.
2. Storefront logged out shows products; customer sees only own orders.
3. Stripe test checkout → order + New Order notification + email.
4. Refund it from the order page → Stripe refund, status Refunded, negative row in Finance. Refund one from the Stripe dashboard → order updates.
5. Fulfil with tracking + notify → shipping email; order keeps its shipping option.
6. Customer cancel: allowed when unshipped, refused after fulfilment.
7. Contact form → appears in Messages + notification.
8. Start a Stripe checkout, abandon it → shows in Abandoned Carts after it expires (or expire it in Stripe dashboard).
9. Edit a product → appears in Activity.
10. Profile → turn on 2FA → sign out/in → asked for code.
11. Delete an unpaid unshipped Stripe order → stock goes back.
12. Manual order with discount + shipping → totals right, stock reduced.
