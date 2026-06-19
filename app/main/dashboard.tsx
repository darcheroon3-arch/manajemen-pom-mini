import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { StockEntry, Sale, Expense } from '@/types/database';
import {
  Fuel, Droplets, DollarSign, TrendingUp, TrendingDown, Wallet,
  Plus, Package, ShoppingCart, Receipt, FileText, Edit2, Trash2,
  ChevronDown, Calendar, X, CircleDollarSign
} from 'lucide-react-native';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

interface DashboardStats {
  sisaBensin: number;
  literTerjualHariIni: number;
  transaksiHariIni: number;
  omzetHariIni: number;
  profitHariIni: number;
  pengeluaranHariIni: number;
  labaBersihHariIni: number;
  totalBalance: number;
  totalProfit: number;
  totalPengeluaran: number;
}

interface RecentItem {
  id: string;
  type: 'sale' | 'stock' | 'expense';
  title: string;
  date: string;
  time: string;
  value: string;
  amount: number;
  color: string;
}

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    sisaBensin: 0, literTerjualHariIni: 0, transaksiHariIni: 0,
    omzetHariIni: 0, profitHariIni: 0, pengeluaranHariIni: 0,
    labaBersihHariIni: 0, totalBalance: 0, totalProfit: 0, totalPengeluaran: 0,
  });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickType, setQuickType] = useState<'sale' | 'stock' | 'expense'>('sale');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState('Operasional');
  const [settings, setSettings] = useState<any>(null);

  const todayStr = selectedDate.toISOString().split('T')[0];

  const formatDateIndo = (date: Date) => {
    const d = new Date(date);
    return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');
  const formatLiter = (value: number) => value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fetchStats = useCallback(async () => {
    const [stockRes, salesRes, expensesRes, settingsRes] = await Promise.all([
      supabase.from('stock_entries').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('settings').select('*').single(),
    ]);

    const stockEntries = (stockRes.data || []) as StockEntry[];
    const sales = (salesRes.data || []) as Sale[];
    const expenses = (expensesRes.data || []) as Expense[];
    const settingsData = settingsRes.data;
    setSettings(settingsData);

    const totalStokMasuk = stockEntries.reduce((sum, s) => sum + Number(s.jumlah_liter), 0);
    const totalLiterTerjual = sales.reduce((sum, s) => sum + Number(s.liter_terjual), 0);
    const sisaBensin = totalStokMasuk - totalLiterTerjual;

    const salesToday = sales.filter(s => s.tanggal === todayStr);
    const literTerjualHariIni = salesToday.reduce((sum, s) => sum + Number(s.liter_terjual), 0);
    const omzetHariIni = salesToday.reduce((sum, s) => sum + Number(s.omzet), 0);
    const profitHariIni = salesToday.reduce((sum, s) => sum + Number(s.profit), 0);

    const expensesToday = expenses.filter(e => e.tanggal === todayStr);
    const pengeluaranHariIni = expensesToday.reduce((sum, e) => sum + Number(e.nominal), 0);

    const totalProfit = sales.reduce((sum, s) => sum + Number(s.profit), 0);
    const totalPengeluaran = expenses.reduce((sum, e) => sum + Number(e.nominal), 0);
    const totalBalance = totalProfit - totalPengeluaran;
    const labaBersihHariIni = profitHariIni - pengeluaranHariIni;

    setStats({
      sisaBensin, literTerjualHariIni, transaksiHariIni: salesToday.length,
      omzetHariIni, profitHariIni, pengeluaranHariIni,
      labaBersihHariIni, totalBalance, totalProfit, totalPengeluaran,
    });

    // Build recent items
    const recent: RecentItem[] = [];
    sales.slice(0, 5).forEach(s => {
      recent.push({
        id: s.id, type: 'sale', title: 'Penjualan',
        date: s.tanggal, time: s.jam || '',
        value: `${formatLiter(s.liter_terjual)} L`, amount: s.omzet,
        color: '#22c55e',
      });
    });
    stockEntries.slice(0, 3).forEach(s => {
      recent.push({
        id: s.id, type: 'stock', title: 'Isi Stok',
        date: s.tanggal, time: s.jam || '',
        value: `${formatLiter(s.jumlah_liter)} L`, amount: s.harga_beli_total || 0,
        color: '#3b82f6',
      });
    });
    expenses.slice(0, 3).forEach(e => {
      recent.push({
        id: e.id, type: 'expense', title: 'Pengeluaran',
        date: e.tanggal, time: '',
        value: e.kategori, amount: e.nominal,
        color: '#f97316',
      });
    });
    recent.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    setRecentItems(recent.slice(0, 6));
  }, [todayStr]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const prevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const nextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const quickAdd = async () => {
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const dateStr = selectedDate.toISOString().split('T')[0];

    try {
      if (quickType === 'sale') {
        const liter = parseFloat(quickAmount);
        const harga = parseFloat(quickPrice) || (settings?.harga_jual_per_liter || 10000);
        const profit = liter * (settings?.profit_per_liter || 2000);
        const omzet = liter * harga;
        await supabase.from('sales').insert({
          tanggal: dateStr, jam: timeStr, liter_terjual: liter, harga_jual_per_liter: harga, omzet, profit,
        });
      } else if (quickType === 'stock') {
        const liter = parseFloat(quickAmount);
        const harga = parseFloat(quickPrice) || 0;
        await supabase.from('stock_entries').insert({
          tanggal: dateStr, jam: timeStr, jumlah_liter: liter, harga_beli_total: harga,
        });
      } else if (quickType === 'expense') {
        const nominal = parseFloat(quickAmount);
        await supabase.from('expenses').insert({
          tanggal: dateStr, nama_pengeluaran: quickName || 'Pengeluaran', kategori: quickCategory, nominal,
        });
      }
      setShowQuickAdd(false);
      setQuickAmount('');
      setQuickPrice('');
      setQuickName('');
      fetchStats();
    } catch (err: any) {
      // handle error
    }
  };

  const cardData = [
    { title: 'Sisa Bensin', value: formatLiter(stats.sisaBensin) + ' L', sub: 'dalam drum', icon: Fuel, bg: '#1d4ed8', color: '#3b82f6' },
    { title: 'Liter Terjual Hari Ini', value: formatLiter(stats.literTerjualHariIni) + ' L', sub: `${stats.transaksiHariIni} Transaksi`, icon: Droplets, bg: '#15803d', color: '#22c55e' },
    { title: 'Omzet Hari Ini', value: formatRupiah(stats.omzetHariIni), sub: 'Total Penjualan', icon: DollarSign, bg: '#0e7490', color: '#06b6d4' },
    { title: 'Profit Kotor Hari Ini', value: formatRupiah(stats.profitHariIni), sub: `@Rp ${(settings?.profit_per_liter || 2000).toLocaleString('id-ID')} / Liter`, icon: TrendingUp, bg: '#7c3aed', color: '#8b5cf6' },
    { title: 'Pengeluaran Hari Ini', value: formatRupiah(stats.pengeluaranHariIni), sub: 'Total Biaya', icon: TrendingDown, bg: '#c2410c', color: '#f97316' },
    { title: 'Profit Bersih Hari Ini', value: formatRupiah(stats.labaBersihHariIni), sub: 'Setelah Pengeluaran', icon: Wallet, bg: '#dc2626', color: '#ef4444' },
  ];

  const quickActions = [
    { label: 'Isi Stok', icon: Package, screen: 'stok-bensin', color: '#3b82f6' },
    { label: 'Penjualan', icon: ShoppingCart, screen: 'penjualan', color: '#22c55e' },
    { label: 'Pengeluaran', icon: Receipt, screen: 'pengeluaran', color: '#f97316' },
    { label: 'Laporan', icon: FileText, screen: 'laporan', color: '#8b5cf6' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <View>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <Text style={styles.dateText}>{formatDateIndo(selectedDate)}</Text>
          </View>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
            <Calendar size={14} color="#94a3b8" />
            <Text style={styles.datePickerText}>Hari Ini</Text>
            <ChevronDown size={14} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={prevDate} style={styles.dateNavBtn}>
            <Text style={styles.dateNavText}>← Kemarin</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextDate} style={styles.dateNavBtn}>
            <Text style={styles.dateNavText}>Besok →</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.grid}>
          {cardData.map((card, i) => {
            const Icon = card.icon;
            return (
              <View key={i} style={[styles.gridCard, { backgroundColor: card.bg }]}>
                <View style={styles.gridCardHeader}>
                  <Icon size={20} color={card.color} />
                  <Text style={styles.gridCardTitle}>{card.title}</Text>
                </View>
                <Text style={styles.gridCardValue}>{card.value}</Text>
                <Text style={styles.gridCardSub}>{card.sub}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <CircleDollarSign size={24} color="#22c55e" />
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Total Balance</Text>
              <Text style={styles.summaryValue}>{formatRupiah(stats.totalBalance)}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBottom}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Total Profit (Kotor)</Text>
              <Text style={[styles.summaryItemValue, { color: '#22c55e' }]}>{formatRupiah(stats.totalProfit)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Total Pengeluaran</Text>
              <Text style={[styles.summaryItemValue, { color: '#ef4444' }]}>{formatRupiah(stats.totalPengeluaran)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Profit Bersih</Text>
              <Text style={[styles.summaryItemValue, { color: '#3b82f6' }]}>{formatRupiah(stats.totalProfit - stats.totalPengeluaran)}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Aksi Cepat</Text>
        </View>
        <View style={styles.quickActions}>
          {quickActions.map((a, i) => {
            const Icon = a.icon;
            return (
              <TouchableOpacity key={i} style={styles.quickAction} onPress={() => onNavigate(a.screen)}>
                <View style={[styles.quickActionIcon, { backgroundColor: a.color + '20' }]}>
                  <Icon size={24} color={a.color} />
                </View>
                <Text style={styles.quickActionLabel}>{a.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Transaksi Terakhir</Text>
          <TouchableOpacity onPress={() => onNavigate('riwayat')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.recentList}>
          {recentItems.map((item, i) => (
            <View key={i} style={styles.recentItem}>
              <View style={[styles.recentIcon, { backgroundColor: item.color + '20' }]}>
                {item.type === 'sale' && <Fuel size={18} color={item.color} />}
                {item.type === 'stock' && <Package size={18} color={item.color} />}
                {item.type === 'expense' && <Receipt size={18} color={item.color} />}
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{item.title}</Text>
                <Text style={styles.recentMeta}>{item.date} {item.time ? '• ' + item.time : ''}</Text>
              </View>
              <View style={styles.recentValue}>
                <Text style={[styles.recentAmount, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.recentAmount2}>{formatRupiah(item.amount)}</Text>
              </View>
            </View>
          ))}
          {recentItems.length === 0 && (
            <Text style={styles.emptyText}>Belum ada transaksi</Text>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowQuickAdd(true)}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Tanggal</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerOptions}>
              {[
                { label: 'Hari Ini', days: 0 },
                { label: 'Kemarin', days: -1 },
                { label: '7 Hari Lalu', days: -7 },
                { label: '30 Hari Lalu', days: -30 },
              ].map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.datePickerOption}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + opt.days);
                    setSelectedDate(d);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Add Modal */}
      <Modal visible={showQuickAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.quickAddContent}>
            <View style={styles.quickAddHeader}>
              <Text style={styles.modalTitle}>Tambah Cepat</Text>
              <TouchableOpacity onPress={() => setShowQuickAdd(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={styles.quickTypeRow}>
              {[
                { id: 'sale' as const, label: 'Penjualan', icon: ShoppingCart },
                { id: 'stock' as const, label: 'Isi Stok', icon: Package },
                { id: 'expense' as const, label: 'Pengeluaran', icon: Receipt },
              ].map(t => {
                const Icon = t.icon;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.quickTypeBtn, quickType === t.id && styles.quickTypeBtnActive]}
                    onPress={() => setQuickType(t.id)}
                  >
                    <Icon size={18} color={quickType === t.id ? '#fff' : '#94a3b8'} />
                    <Text style={[styles.quickTypeText, quickType === t.id && styles.quickTypeTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {quickType === 'sale' && (
              <>
                <Text style={styles.label}>Liter Terjual</Text>
                <TextInput style={styles.input} value={quickAmount} onChangeText={setQuickAmount} keyboardType="numeric" placeholder="10.00" placeholderTextColor="#64748b" />
                <Text style={styles.label}>Harga Jual/Liter</Text>
                <TextInput style={styles.input} value={quickPrice} onChangeText={setQuickPrice} keyboardType="numeric" placeholder={String(settings?.harga_jual_per_liter || 10000)} placeholderTextColor="#64748b" />
              </>
            )}
            {quickType === 'stock' && (
              <>
                <Text style={styles.label}>Jumlah Liter</Text>
                <TextInput style={styles.input} value={quickAmount} onChangeText={setQuickAmount} keyboardType="numeric" placeholder="64.00" placeholderTextColor="#64748b" />
                <Text style={styles.label}>Harga Beli (Opsional)</Text>
                <TextInput style={styles.input} value={quickPrice} onChangeText={setQuickPrice} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
              </>
            )}
            {quickType === 'expense' && (
              <>
                <Text style={styles.label}>Nama Pengeluaran</Text>
                <TextInput style={styles.input} value={quickName} onChangeText={setQuickName} placeholder="Nama..." placeholderTextColor="#64748b" />
                <Text style={styles.label}>Nominal</Text>
                <TextInput style={styles.input} value={quickAmount} onChangeText={setQuickAmount} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
              </>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={quickAdd}>
              <Text style={styles.submitBtnText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1121' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 8, paddingBottom: 32 },

  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  dateText: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  datePicker: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  datePickerText: { color: '#94a3b8', fontSize: 12 },

  dateNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dateNavBtn: { paddingVertical: 4 },
  dateNavText: { color: '#64748b', fontSize: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  gridCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    minHeight: 100,
  },
  gridCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  gridCardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  gridCardValue: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  gridCardSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },

  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1 },
  summaryLabel: { color: '#94a3b8', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
  summaryBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryItemLabel: { color: '#94a3b8', fontSize: 10 },
  summaryItemValue: { fontSize: 13, fontWeight: '700', marginTop: 4 },

  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitleText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  seeAll: { color: '#3b82f6', fontSize: 13 },

  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quickAction: { alignItems: 'center', width: '22%' },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },

  recentList: { backgroundColor: '#1e293b', borderRadius: 16, padding: 12, marginBottom: 16 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentInfo: { flex: 1 },
  recentTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  recentMeta: { color: '#64748b', fontSize: 11, marginTop: 2 },
  recentValue: { alignItems: 'flex-end' },
  recentAmount: { fontSize: 14, fontWeight: '600' },
  recentAmount2: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, margin: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  datePickerOptions: { gap: 8 },
  datePickerOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  datePickerOptionText: { color: '#e2e8f0', fontSize: 15 },

  quickAddContent: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, margin: 20, marginBottom: 40 },
  quickAddHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  quickTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#334155', borderRadius: 10 },
  quickTypeBtnActive: { backgroundColor: '#3b82f6' },
  quickTypeText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  quickTypeTextActive: { color: '#fff', fontWeight: '600' },
  label: { color: '#94a3b8', fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15 },
  submitBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, marginTop: 20, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});