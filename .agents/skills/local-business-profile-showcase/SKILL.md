---
name: local-business-profile-showcase
description: Build or improve a public, mobile-first commercial profile website for a local service business (shoe laundry, laundry, barbershop, workshop, salon, etc.) whose only jobs are to show store information and let customers check their order status. Use when asked to create, redesign, polish, or audit a public "beranda", landing page, store profile, pricelist page, or order-tracking page — especially when the site must be display-only (no cart/checkout) and visually consistent with an existing admin app.
metadata:
  author: soleful-soaks
  version: "1.0.0"
---

# Local Business Profile Showcase

A playbook for the public face of a local service business: **inform, build trust, and route to order tracking or WhatsApp**. Not an e-commerce store, not an app.

## When to use

- "Bikin/rapihin web publik / beranda / profil toko"
- "Halaman pricelist yang cuma informasi, gak bisa dipilih"
- "Cek pesanan / lacak status tanpa login"
- Audit tampilan publik untuk HP

Do NOT use for admin dashboards, POS flows, or checkout/cart features.

## Core principles

1. **Display-only.** Prices, perfumes, delivery tiers, and add-ons are information. No add-to-cart, quantity steppers, or selectable cards on the public home.
2. **Two primary actions only:** `Cek Pesanan` and `Chat WhatsApp`. Everything else is secondary.
3. **Mobile-first, website-not-app.** Sticky top navbar + burger menu; standard footer. No bottom tab bar on public pages.
4. **Same brand DNA as admin.** Reuse admin tokens (colors, radius, shadows, icons, font). Visitors and staff should feel it is one product.
5. **Trust over hype.** Real hours, real address, real prices, clear disclaimers. No fake reviews, counters, or urgency.
6. **No payment-method talk** unless the business explicitly wants it (records-only systems).

## Page architecture (top → bottom)

| # | Section | Purpose | Must contain |
|---|---------|---------|--------------|
| 1 | Header | Brand + nav | Logo (with `width`/`height`), links: Beranda, Cek Pesanan, Pengumuman, Kontak; mobile burger with `aria-expanded`; small WA icon on mobile |
| 2 | Hero | Who/what/when | Open-status badge with hours, `<h1>` brand name, 1-sentence value prop, 2 buttons (Lihat Harga ↓, WhatsApp) |
| 3 | Quick Track box | Fastest path to status | Labeled input (`name`, `autocomplete="off"`, `spellCheck={false}`, `autoCapitalize="characters"`), specific button label "Cek Pesanan", optional demo chips |
| 4 | Announcements | Timely info | Only render if non-empty; max 2–3 items, link to full page |
| 5 | Pricelist | Rates | Category filter tabs (buttons with `aria-pressed`), `<article>` rows: icon, `<h3>` name, duration, price with `tabular-nums`, footnote disclaimer |
| 6 | Track CTA banner | Re-route returning customers | Navy gradient, one red button to `/cek-pesanan` |
| 7 | Delivery tiers | Pickup rules | Each tier: title, condition (min items / radius), fee badge |
| 8 | Perks (e.g. free perfume) | Differentiator | Icon/emoji tile (`aria-hidden`), name, short note; 2-col grid on mobile |
| 9 | Other services | Upsell | 4 tiles (e.g. tas, topi, helm, repaint) with illustration |
| 10 | Contact strip | Location | Address, Detail Kontak + WhatsApp buttons |
| 11 | Footer | About & account | Store blurb, hours, public links, "Masuk Akun Staff", © year |

Order may shift slightly per business, but Hero → Track → Pricelist must stay near the top.

## Order tracking page (`/cek-pesanan`)

- Accept code via input **and** `?code=` query param (deep-linkable, shareable from WA).
- States: idle → loading ("Mencari…") → found / not found (with next step: "Periksa kode di nota atau hubungi CS").
- Found view: status stepper (Antrian → Cuci → Kering → Finishing → Siap Ambil), estimate date, item list, total, Lunas/Belum Lunas badge, download nota PDF, WhatsApp CS.
- Never expose customer phone or other customers' data. Public view is a reduced projection.

## Visual system

- Tokens: navy `#001b3a` (primary), red `#bf2f3b` (accent/CTA), slate text `#0f172a / #475569 / #64748b`, borders `#e2e8f0`, surfaces `#ffffff / #f8fafc`.
- Radius: cards 16px (14px mobile), inner rows 12–14px, pills 999px.
- Shadow: very soft (`0 1px 4px rgba(0,27,58,.03)`); hover lift ≤ 1px.
- Type: hero `clamp(1.5rem, 1.1rem + 2vw, 1.85rem)`, section `h2` ~1.25rem, body 0.86–0.9rem, meta 0.72–0.76rem. `text-wrap: balance` on headings.
- Spacing: 12–16px gaps between sections on mobile, 20–24px desktop. Container max ~1080px.
- Tap targets ≥ 44px on mobile.

## Accessibility & quality checklist

- [ ] One `<h1>`; sections use `<section>` with `<h2>`; rows use `<article>` + `<h3>`
- [ ] Icon-only buttons have `aria-label`; decorative icons `aria-hidden="true"`
- [ ] Images have `alt`, `width`, `height`; below-fold `loading="lazy"`
- [ ] Visible `:focus-visible` styles; never bare `outline: none`
- [ ] Transitions list properties (no `transition: all`), honor `prefers-reduced-motion`
- [ ] Flex text children have `min-width: 0` + ellipsis/wrap
- [ ] Prices via `Intl.NumberFormat('id-ID')`; dates via `Intl.DateTimeFormat`
- [ ] No `user-scalable=no`; `<meta name="theme-color">` matches header
- [ ] Empty states render cleanly (no announcements, no services in a category)
- [ ] Links are `<a>`/`<Link>`, actions are `<button>` — no `div onClick`

## Copywriting (Bahasa Indonesia)

- Friendly, direct, second person ("kamu"/"Anda" — pick one and stay consistent).
- Specific button labels: "Cek Pesanan", "Chat WhatsApp", "Lihat Daftar Harga" — not "Lanjut"/"Klik di sini".
- Avoid filler ("sangat", "banget mudah"); state concrete facts ("Selesai 2 hari", "Gratis antar jemput min. 2 sepatu, maks. 3 km").
- Error text includes the fix ("Kode tidak ditemukan. Cek lagi kode di nota atau hubungi CS.").

## Workflow

1. Read the admin styles/components to extract tokens and icons; reuse them.
2. Map business data (services, delivery tiers, perfumes, hours, address, WA) to the sections above. Pull from repo/settings, not hardcoded copies, when possible.
3. Build/refactor `PublicLayout` (header, mobile menu, footer) then `HomePage` sections in order.
4. Build/verify `TrackOrderPage` states and `?code=` deep link.
5. Run the checklist; fix findings.
6. `npm run build` and `npm test`; check at 360px, 390px, 768px, 1280px widths.
7. Commit with a scoped message.

## Anti-patterns

- Cart, qty steppers, or "Pilih" buttons on the public home
- App-style bottom nav on a public website
- Carousels/auto-sliders for core info
- Stock photos that don't match the business; giant hero images hurting LCP
- Multiple competing CTAs in one viewport
- Showing internal fields (staff names, cost, notes) in public tracking
