-- ==============================================================================
-- SOLEFUL SOAKS! SHOES CARE — SKEMA DATABASE LENGKAP & ROW LEVEL SECURITY (RLS)
-- File ini digunakan saat migrasi ke Supabase Cloud atau Supabase Local (Docker).
-- ==============================================================================

-- 1. ENUMERASI STATUS & KATEGORI
CREATE TYPE service_category AS ENUM ('main', 'express', 'additional', 'other');
CREATE TYPE order_status AS ENUM ('menunggu', 'pencucian', 'pengeringan', 'finishing', 'selesai', 'diambil');
CREATE TYPE payment_method AS ENUM ('tunai', 'qris');
CREATE TYPE payment_status AS ENUM ('lunas', 'belum_lunas');
CREATE TYPE staff_role AS ENUM ('admin', 'staff');
CREATE TYPE announcement_category AS ENUM ('kendala', 'keterlambatan', 'jam_operasional', 'libur', 'promosi', 'lainnya');
CREATE TYPE photo_status AS ENUM ('active', 'deleted', 'delete_failed');

-- 2. TABEL PENGATURAN TOKO (SINGLE ROW)
CREATE TABLE settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'Soleful Soaks! Shoes Care',
  tagline TEXT NOT NULL DEFAULT 'Jasa perawatan & pembersihan sepatu, tas, topi, dan helm',
  address TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  whatsapp_template TEXT NOT NULL DEFAULT 'Halo Soleful Soaks!, saya ingin bertanya tentang pesanan dengan kode {kode}.',
  daily_capacity INT NOT NULL DEFAULT 20,
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '18:00',
  public_hours_text TEXT NOT NULL DEFAULT '',
  closed_weekdays INT[] NOT NULL DEFAULT '{}',
  holidays DATE[] NOT NULL DEFAULT '{}',
  estimate_horizon_days INT NOT NULL DEFAULT 60,
  price_disclaimer TEXT NOT NULL DEFAULT 'Harga merupakan referensi. Harga akhir dapat berubah berdasarkan kondisi barang setelah pengecekan di toko.',
  retention_months INT NOT NULL DEFAULT 6,
  retention_basis TEXT NOT NULL DEFAULT 'picked_up_or_completed',
  collage_labels TEXT[] NOT NULL DEFAULT ARRAY['Foto 1', 'Foto 2', 'Foto 3', 'Foto 4'],
  tracking_require_phone_suffix BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROFIL PEGAWAI / ADMIN (TERHUBUNG KE auth.users)
CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role staff_role NOT NULL DEFAULT 'staff',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. KATALOG LAYANAN
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category service_category NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  price_min NUMERIC NOT NULL CHECK (price_min >= 0),
  price_max NUMERIC NULL CHECK (price_max IS NULL OR price_max >= price_min),
  duration_min_days INT NOT NULL DEFAULT 2,
  duration_max_days INT NOT NULL DEFAULT 2,
  workload_weight NUMERIC NOT NULL DEFAULT 1,
  express_hours INT NULL,
  express_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUK TAMBAHAN & PEWANGI
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL CHECK (price >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fragrances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PELANGGAN
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PESANAN
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- Kode pelacakan acak 10 karakter non-sekuensial
  customer_id UUID NOT NULL REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  item_type TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  condition_notes TEXT NOT NULL DEFAULT '',
  services_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb, -- Snapshot layanan saat transaksi
  products_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb, -- Snapshot add-on produk
  fragrance_id UUID NULL REFERENCES fragrances(id),
  fragrance_name TEXT NOT NULL DEFAULT '',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_earliest_at TIMESTAMPTZ NULL,
  estimated_at TIMESTAMPTZ NULL,
  estimate_source TEXT NOT NULL DEFAULT 'auto',
  completed_at TIMESTAMPTZ NULL,
  picked_up_at TIMESTAMPTZ NULL,
  status order_status NOT NULL DEFAULT 'menunggu',
  total NUMERIC NOT NULL CHECK (total >= 0),
  payment_method payment_method NOT NULL DEFAULT 'qris',
  payment_status payment_status NOT NULL DEFAULT 'lunas',
  paid_at TIMESTAMPTZ NULL,
  payment_recorded_by UUID NULL REFERENCES staff_profiles(id),
  payment_recorded_name TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  created_by UUID NULL REFERENCES staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RIWAYAT PERUBAHAN STATUS & ESTIMASI
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status NULL,
  to_status order_status NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by UUID NULL REFERENCES staff_profiles(id),
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE estimate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_at TIMESTAMPTZ NULL,
  new_at TIMESTAMPTZ NULL,
  source TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_by UUID NULL REFERENCES staff_profiles(id),
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. DOKUMENTASI FOTO
CREATE TABLE order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gdrive',
  file_id TEXT NOT NULL,
  folder_id TEXT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes INT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  labels TEXT[] NOT NULL DEFAULT '{}',
  caption TEXT NOT NULL DEFAULT '',
  status photo_status NOT NULL DEFAULT 'active',
  uploaded_by UUID NULL REFERENCES staff_profiles(id),
  uploaded_by_name TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  delete_note TEXT NOT NULL DEFAULT ''
);

-- 10. PENGUMUMAN PUBLIK
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category announcement_category NOT NULL DEFAULT 'promosi',
  publish_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'published',
  important BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUDIT LOG
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NULL REFERENCES staff_profiles(id),
  actor_name TEXT NOT NULL DEFAULT 'Sistem',
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NULL,
  detail TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user login adalah staff aktif
CREATE OR REPLACE FUNCTION is_active_staff() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = auth.uid() AND active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Settings: Publik bisa baca, hanya staff yang bisa edit
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (TRUE);
CREATE POLICY "Staff update settings" ON settings FOR UPDATE USING (is_active_staff());

-- Katalog: Publik bisa baca yang aktif, staff full CRUD
CREATE POLICY "Public read active services" ON services FOR SELECT USING (active = TRUE OR is_active_staff());
CREATE POLICY "Staff all services" ON services FOR ALL USING (is_active_staff());

CREATE POLICY "Public read active products" ON products FOR SELECT USING (active = TRUE OR is_active_staff());
CREATE POLICY "Staff all products" ON products FOR ALL USING (is_active_staff());

CREATE POLICY "Public read active fragrances" ON fragrances FOR SELECT USING (active = TRUE OR is_active_staff());
CREATE POLICY "Staff all fragrances" ON fragrances FOR ALL USING (is_active_staff());

-- Announcements: Publik hanya baca yang published dan masih berlaku
CREATE POLICY "Public read published announcements" ON announcements FOR SELECT USING (
  (status = 'published' AND publish_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW()))
  OR is_active_staff()
);
CREATE POLICY "Staff all announcements" ON announcements FOR ALL USING (is_active_staff());

-- Orders, Customers, History, Photos, Audit: HANYA STAFF YANG BISA AKSES LANGSUNG
CREATE POLICY "Staff only customers" ON customers FOR ALL USING (is_active_staff());
CREATE POLICY "Staff only orders" ON orders FOR ALL USING (is_active_staff());
CREATE POLICY "Staff only status_history" ON status_history FOR ALL USING (is_active_staff());
CREATE POLICY "Staff only estimate_history" ON estimate_history FOR ALL USING (is_active_staff());
CREATE POLICY "Staff only order_photos" ON order_photos FOR ALL USING (is_active_staff());
CREATE POLICY "Staff only audit_logs" ON audit_logs FOR ALL USING (is_active_staff());

-- ==============================================================================
-- RPC SECURE FUNCTION UNTUK PELACAKAN PUBLIK (TANPA MEMBOCORKAN DATA LAIN)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public_track_order(p_code TEXT, p_phone_suffix TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_settings settings%ROWTYPE;
  v_timeline JSONB;
  v_photos JSONB;
  v_masked_name TEXT;
BEGIN
  SELECT * INTO v_settings FROM settings WHERE id = 1;
  SELECT * INTO v_order FROM orders WHERE UPPER(code) = UPPER(p_code);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'not_found', 'message', 'Pesanan tidak ditemukan.');
  END IF;

  -- Validasi opsional 4 digit nomor WA
  IF v_settings.tracking_require_phone_suffix THEN
    IF RIGHT(v_order.customer_phone, 4) != RIGHT(p_phone_suffix, 4) THEN
      RETURN jsonb_build_object('ok', FALSE, 'error', 'not_found', 'message', 'Pesanan tidak ditemukan atau nomor WA tidak cocok.');
    END IF;
  END IF;

  -- Sensor nama pelanggan (Budi Santoso -> Bu*** S.)
  v_masked_name := LEFT(v_order.customer_name, 2) || '***';

  -- Ambil riwayat timeline
  SELECT jsonb_agg(jsonb_build_object('status', to_status, 'at', created_at) ORDER BY created_at ASC)
  INTO v_timeline
  FROM status_history WHERE order_id = v_order.id;

  -- Ambil foto kolase
  SELECT jsonb_agg(jsonb_build_object('id', id, 'labels', labels, 'caption', caption, 'uploadedAt', uploaded_at, 'available', status = 'active'))
  INTO v_photos
  FROM order_photos WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'order', jsonb_build_object(
      'code', v_order.code,
      'customerDisplayName', v_masked_name,
      'itemType', v_order.item_type,
      'brand', v_order.brand,
      'model', v_order.model,
      'color', v_order.color,
      'services', v_order.services_snapshot,
      'products', v_order.products_snapshot,
      'fragranceName', v_order.fragrance_name,
      'receivedAt', v_order.received_at,
      'estimatedEarliestAt', v_order.estimated_earliest_at,
      'estimatedAt', v_order.estimated_at,
      'completedAt', v_order.completed_at,
      'pickedUpAt', v_order.picked_up_at,
      'status', v_order.status,
      'timeline', COALESCE(v_timeline, '[]'::jsonb),
      'total', v_order.total,
      'paymentMethod', v_order.payment_method,
      'paymentStatus', v_order.payment_status,
      'paidAt', v_order.paid_at,
      'photos', COALESCE(v_photos, '[]'::jsonb)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
