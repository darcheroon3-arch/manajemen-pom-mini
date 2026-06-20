export interface Settings {
  id: number;
  harga_jual_per_liter: number;
  profit_per_liter: number;
  biaya_isi_per_64_liter: number;
  dark_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockEntry {
  id: string;
  tanggal: string;
  jam: string | null;
  jumlah_liter: number;
  harga_beli_total: number;
  catatan: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  tanggal: string;
  jam: string | null;
  liter_terjual: number;
  harga_jual_per_liter: number;
  omzet: number;
  profit: number;
  created_at: string;
}

export interface Expense {
  id: string;
  tanggal: string;
  nama_pengeluaran: string;
  kategori: string;
  nominal: number;
  catatan: string | null;
  created_at: string;
}

export interface Gift {
  id: string;
  tanggal: string;
  nominal: number;
  keterangan: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tipe: string;
  deskripsi: string;
  waktu: string;
}

export interface DashboardStats {
  sisa_bensin: number;
  total_liter_terjual: number;
  total_omzet: number;
  total_profit: number;
  total_pengeluaran: number;
  total_balance: number;
  total_transaksi: number;
}
