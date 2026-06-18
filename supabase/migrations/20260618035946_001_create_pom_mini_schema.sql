/*
# Create Pom Mini Management Schema

1. New Tables
- `settings`: Application configuration (harga jual, profit per liter, biaya isi)
- `stock_entries`: Fuel stock entries (tanggal, jumlah liter, harga beli, catatan)
- `sales`: Sales transactions (tanggal, liter terjual, harga jual, omzet, profit)
- `expenses`: Expenses (tanggal, nama, kategori, nominal, catatan)
- `audit_logs`: Activity history log (tipe, deskripsi, waktu)

2. Security
- Enable RLS on all tables.
- Single-tenant: allow anon + authenticated CRUD.
*/

CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1,
  harga_jual_per_liter numeric NOT NULL DEFAULT 10000,
  profit_per_liter numeric NOT NULL DEFAULT 2000,
  biaya_isi_per_64_liter numeric NOT NULL DEFAULT 10000,
  dark_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO settings (id, harga_jual_per_liter, profit_per_liter, biaya_isi_per_64_liter, dark_mode)
VALUES (1, 10000, 2000, 10000, false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS stock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  jumlah_liter numeric NOT NULL,
  harga_beli_total numeric DEFAULT 0,
  catatan text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  liter_terjual numeric NOT NULL,
  harga_jual_per_liter numeric NOT NULL DEFAULT 10000,
  omzet numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  nama_pengeluaran text NOT NULL,
  kategori text NOT NULL DEFAULT 'Lainnya',
  nominal numeric NOT NULL DEFAULT 0,
  catatan text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe text NOT NULL,
  deskripsi text NOT NULL,
  waktu timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_stock" ON stock_entries;
CREATE POLICY "anon_select_stock" ON stock_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stock" ON stock_entries;
CREATE POLICY "anon_insert_stock" ON stock_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stock" ON stock_entries;
CREATE POLICY "anon_update_stock" ON stock_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stock" ON stock_entries;
CREATE POLICY "anon_delete_stock" ON stock_entries FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_sales" ON sales;
CREATE POLICY "anon_select_sales" ON sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sales" ON sales;
CREATE POLICY "anon_insert_sales" ON sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sales" ON sales;
CREATE POLICY "anon_update_sales" ON sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sales" ON sales;
CREATE POLICY "anon_delete_sales" ON sales FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_logs" ON audit_logs;
CREATE POLICY "anon_select_logs" ON audit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_logs" ON audit_logs;
CREATE POLICY "anon_insert_logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_logs" ON audit_logs;
CREATE POLICY "anon_delete_logs" ON audit_logs FOR DELETE TO anon, authenticated USING (true);
