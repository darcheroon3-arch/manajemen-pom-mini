import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { StockEntry, Sale, Expense } from '@/types/database';
import {
  Fuel, Droplets, DollarSign, TrendingUp, TrendingDown, Wallet,
  Plus, Package, ShoppingCart, Receipt, FileText, Edit2, Trash2,
  ChevronDown, Calendar, X, CircleDollarSign, Gift
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
  giftHariIni: number;
  labaBersihHariIni: number;
  totalBalance: number;
  totalProfit: number;
  totalPengeluaran: number;
  totalGift: number;
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const offsetMs = 7 * 60 * 60 * 1000;
    const jakarta = new Date(now.getTime() + offsetMs);
    return jakarta;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    sisaBensin: 0, literTerjualHariIni: 0, transaksiHariIni: 0,
    omzetHariIni: 0, profitHariIni: 0, pengeluaranHariIni: 0, giftHariIni: 0,
    labaBersihHariIni: 0, totalBalance: 0, totalProfit: 0, totalPengeluaran: 0, totalGift: 0,
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

  const todayStr = `${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(selectedDate.getUTCDate()).padStart(2, '0')}`;

  const formatDateIndo = (date: Date) => {
    const d = new Date(date);
    return `${dayNames[d.getUTCDay()]}, ${d.getUTCDate()} ${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };

  const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');
  const formatLiter = (value: number) => value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fetchStats = useCallback(async () => {
    const [stockRes, salesRes, expensesRes, giftsRes, settingsRes] = await Promise.all([
      supabase.from('stock_entries').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('gifts').select('*'),
      supabase.from('settings').select('*').single(),
    ]);

    const stockEntries = (stockRes.data || []) as StockEntry[];
    const sales = (salesRes.data || []) as Sale[];
    const expenses = (expensesRes.data || []) as Expense[];
    const gifts = (giftsRes.data || []);
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
    const totalGift = gifts.reduce((sum, g) => sum + Number(g.nominal), 0);
    const totalBalance = totalProfit - totalPengeluaran + totalGift;
    const labaBersihHariIni = profitHariIni - pengeluaranHariIni;

    const giftsToday = gifts.filter(g => g.tanggal === todayStr);
    const giftHariIni = giftsToday.reduce((sum, g) => sum + Number(g.nominal), 0);

    setStats({
      sisaBensin, literTerjualHariIni, transaksiHariIni: salesToday.length,
      omzetHariIni, profitHariIni, pengeluaranHariIni, giftHariIni,
      labaBersihHariIni, totalBalance, totalProfit, totalPengeluaran, totalGift,
    });

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
    d.setUTCDate(d.getUTCDate() - 1);
    setSelectedDate(d);
  };
  const nextDate = () => {
    const d = new Date(selectedDate);
    d.setUTCDate(d.getUTCDate() + 1);
    setSelectedDate(d);
  };

  const quickAdd = async () => {
    const now = new Date();
    const offsetMs = 7 * 60 * 60 * 1000;
    const jakarta = new Date(now.getTime() + offsetMs);
    const timeStr = String(jakarta.getUTCHours()).padStart(2, '0') + ':' + String(jakarta.getUTCMinutes()).padStart(2, '0');
    const dateStr = todayStr;

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
    { title: 'Gift Hari Ini', value: formatRupiah(stats.giftHariIni), sub: 'Sumber Lain', icon: Gift, bg: '#166534', color: '#22c55e' },
    { title: 'Profit Bersih Hari Ini', value: formatRupiah(stats.labaBersihHariIni + stats.giftHariIni), sub: 'Setelah Pengeluaran + Gift', icon: Wallet, bg: '#dc2626', color: '#ef4444' },
  ];

  const quickActions = [
    { label: 'Isi Stok', icon: Package, screen: 'stok-bensin', color: '#3b82f6' },
    { label: 'Penjualan', icon: ShoppingCart, screen: 'penjualan', color: '#22c55e' },
    { label: 'Pengeluaran', icon: Receipt, screen: 'pengeluaran', color: '#f97316' },
    { label: 'Gift', icon: Gift, screen: 'gift', color: '#166534' },
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
            <Calendar size={18} color="#94a3b8" />
            <ChevronDown size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        <Modal visible={showDatePicker} animationType="fade" transparent onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Tanggal</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <X size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerRow}>
                <TouchableOpacity style={styles.dateNavBtn} onPress={prevDate}>
                  <Text style={styles.dateNavText}>Sebelumnya</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerText}>{formatDateIndo(selectedDate)}</Text>
                <TouchableOpacity style={styles.dateNavBtn} onPress={nextDate}>
                  <Text style={styles.dateNavText}>Selanjutnya</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.datePickerDone} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerDoneText}>Selesai</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <TouchableOpacity key={action.label} style={styles.quickAction} onPress={() => onNavigate(action.screen)}>
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                  <Icon size={20} color={action.color} />
                </View>
                <Text style={styles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {cardData.map(card => {
            const Icon = card.icon;
            return (
              <View key={card.title} style={[styles.statsCard, { backgroundColor: card.bg + '15', borderColor: card.bg + '40' }]}>
                <View style={[styles.statsIcon, { backgroundColor: card.bg + '20' }]}>
                  <Icon size={20} color={card.color} />
                </View>
                <Text style={styles.statsValue}>{card.value}</Text>
                <Text style={styles.statsTitle}>{card.title}</Text>
                <Text style={styles.statsSub}>{card.sub}</Text>
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
              <Text style={styles.summaryItemLabel}>Total Gift</Text>
              <Text style={[styles.summaryItemValue, { color: '#166534' }]}>{formatRupiah(stats.totalGift)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Profit Bersih</Text>
              <Text style={[styles.summaryItemValue, { color: '#3b82f6' }]}>{formatRupiah(stats.totalProfit - stats.totalPengeluaran + stats.totalGift)}</Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Aksi Cepat</Text>
        </View>

        {/* Quick Add Button */}
        <TouchableOpacity style={styles.fab} onPress={() => setShowQuickAdd(true)}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>

        {/* Quick Add Modal */}
        <Modal visible={showQuickAdd} animationType="fade" transparent onRequestClose={() => setShowQuickAdd(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tambah Cepat</Text>
                <TouchableOpacity onPress={() => setShowQuickAdd(false)}>
                  <X size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <View style={styles.quickTypeRow}>
                <TouchableOpacity style={[styles.quickTypeBtn, quickType === 'sale' && styles.quickTypeBtnActive]} onPress={() => setQuickType('sale')}>
                  <Text style={[styles.quickTypeText, quickType === 'sale' && styles.quickTypeTextActive]}>Penjualan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickTypeBtn, quickType === 'stock' && styles.quickTypeBtnActive]} onPress={() => setQuickType('stock')}>
                  <Text style={[styles.quickTypeText, quickType === 'stock' && styles.quickTypeTextActive]}>Stok</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickTypeBtn, quickType === 'expense' && styles.quickTypeBtnActive]} onPress={() => setQuickType('expense')}>
                  <Text style={[styles.quickTypeText, quickType === 'expense' && styles.quickTypeTextActive]}>Pengeluaran</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Jumlah / Nominal</Text>
              <TextInput style={styles.input} value={quickAmount} onChangeText={setQuickAmount} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
              {quickType === 'sale' && (
                <>
                  <Text style={styles.label}>Harga per Liter</Text>
                  <TextInput style={styles.input} value={quickPrice} onChangeText={setQuickPrice} keyboardType="numeric" placeholder={settings?.harga_jual_per_liter?.toString() || '10000'} placeholderTextColor="#64748b" />
                </>
              )}
              {quickType === 'expense' && (
                <>
                  <Text style={styles.label}>Nama Pengeluaran</Text>
                  <TextInput style={styles.input} value={quickName} onChangeText={setQuickName} placeholder="Nama..." placeholderTextColor="#64748b" />
                </>
              )}
              <TouchableOpacity style={styles.submitButton} onPress={quickAdd}>
                <Text style={styles.submitButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  dateText: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  datePicker: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e293b', padding: 8, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  datePickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dateNavBtn: { backgroundColor: '#334155', padding: 10, borderRadius: 8 },
  dateNavText: { color: '#94a3b8', fontSize: 12 },
  datePickerText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  datePickerDone: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  datePickerDoneText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quickAction: { alignItems: 'center', gap: 6 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statsCard: { width: '47%', borderRadius: 12, padding: 14, borderWidth: 1 },
  statsIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statsValue: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  statsTitle: { color: '#94a3b8', fontSize: 11 },
  statsSub: { color: '#64748b', fontSize: 10 },
  summaryCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  summaryText: { flex: 1 },
  summaryLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  summaryValue: { color: '#22c55e', fontSize: 22, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
  summaryBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryItem: { flex: 1, minWidth: 100 },
  summaryItemLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  summaryItemValue: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { marginBottom: 12 },
  sectionTitleText: { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#3b82f6', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  quickTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickTypeBtn: { flex: 1, backgroundColor: '#334155', borderRadius: 8, padding: 10, alignItems: 'center' },
  quickTypeBtnActive: { backgroundColor: '#3b82f6' },
  quickTypeText: { color: '#94a3b8', fontSize: 12 },
  quickTypeTextActive: { color: '#fff', fontWeight: '600' },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 15 },
  submitButton: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 12, marginTop: 20, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
