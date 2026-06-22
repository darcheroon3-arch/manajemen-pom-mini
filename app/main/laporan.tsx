import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { StockEntry, Sale, Expense } from '@/types/database';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getIndonesiaDateStr } from '@/lib/date';

type ReportType = 'harian' | 'bulanan' | 'tahunan';

export default function Laporan() {
  const [reportType, setReportType] = useState<ReportType>('harian');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    const offsetMs = 7 * 60 * 60 * 1000;
    const jakarta = new Date(d.getTime() + offsetMs);
    return jakarta;
  });
  const [stats, setStats] = useState({
    totalStokMasuk: 0, totalLiterTerjual: 0, totalOmzet: 0, totalProfit: 0, totalPengeluaran: 0, totalGift: 0, totalBalance: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const getPeriod = () => {
    const y = currentDate.getUTCFullYear();
    const m = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getUTCDate()).padStart(2, '0');
    if (reportType === 'harian') return { dateEq: `${y}-${m}-${d}`, dateLike: null };
    if (reportType === 'bulanan') return { dateEq: null, dateLike: `${y}-${m}-%` };
    return { dateEq: null, dateLike: `${y}-%` };
  };

  const fetchReport = useCallback(async () => {
    const [stockRes, salesRes, expensesRes, giftsRes] = await Promise.all([
      supabase.from('stock_entries').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('gifts').select('*'),
    ]);

    const stockEntries = (stockRes.data || []) as StockEntry[];
    const sales = (salesRes.data || []) as Sale[];
    const expenses = (expensesRes.data || []) as Expense[];
    const gifts = (giftsRes.data || []);
    const { dateEq, dateLike } = getPeriod();

    let filteredSales: Sale[];
    let filteredExpenses: Expense[];
    let filteredStock: StockEntry[];
    let filteredGifts: any[];

    if (dateEq) {
      filteredSales = sales.filter(s => s.tanggal === dateEq);
      filteredExpenses = expenses.filter(e => e.tanggal === dateEq);
      filteredStock = stockEntries.filter(s => s.tanggal === dateEq);
      filteredGifts = gifts.filter((g: any) => g.tanggal === dateEq);
    } else if (dateLike) {
      const prefix = dateLike.replace('%', '');
      filteredSales = sales.filter(s => s.tanggal.startsWith(prefix));
      filteredExpenses = expenses.filter(e => e.tanggal.startsWith(prefix));
      filteredStock = stockEntries.filter(s => s.tanggal.startsWith(prefix));
      filteredGifts = gifts.filter((g: any) => g.tanggal.startsWith(prefix));
    } else {
      filteredSales = sales;
      filteredExpenses = expenses;
      filteredStock = stockEntries;
      filteredGifts = gifts;
    }

    const totalStokMasuk = filteredStock.reduce((sum, s) => sum + Number(s.jumlah_liter), 0);
    const totalLiterTerjual = filteredSales.reduce((sum, s) => sum + Number(s.liter_terjual), 0);
    const totalOmzet = filteredSales.reduce((sum, s) => sum + Number(s.omzet), 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + Number(s.profit), 0);
    const totalPengeluaran = filteredExpenses.reduce((sum, e) => sum + Number(e.nominal), 0);
    const totalGift = filteredGifts.reduce((sum, g) => sum + Number(g.nominal), 0);
    const totalBalance = totalProfit - totalPengeluaran + totalGift;

    setStats({ totalStokMasuk, totalLiterTerjual, totalOmzet, totalProfit, totalPengeluaran, totalGift, totalBalance });
  }, [currentDate, reportType]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReport();
    setRefreshing(false);
  }, [fetchReport]);

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (reportType === 'harian') d.setUTCDate(d.getUTCDate() - 1);
    else if (reportType === 'bulanan') d.setUTCMonth(d.getUTCMonth() - 1);
    else d.setUTCFullYear(d.getUTCFullYear() - 1);
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (reportType === 'harian') d.setUTCDate(d.getUTCDate() + 1);
    else if (reportType === 'bulanan') d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCFullYear(d.getUTCFullYear() + 1);
    setCurrentDate(d);
  };

  const formatPeriodLabel = () => {
    const y = currentDate.getUTCFullYear();
    const m = currentDate.getUTCMonth() + 1;
    const d = currentDate.getUTCDate();
    if (reportType === 'harian') return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    if (reportType === 'bulanan') return `${String(m).padStart(2, '0')}/${y}`;
    return `${y}`;
  };

  const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');
  const formatLiter = (value: number) => value.toLocaleString('id-ID', { minimumFractionDigits: 2 }) + ' L';

  const reportCards = [
    { title: 'Total Stok Masuk', value: formatLiter(stats.totalStokMasuk), color: '#3b82f6' },
    { title: 'Total Liter Terjual', value: formatLiter(stats.totalLiterTerjual), color: '#10b981' },
    { title: 'Total Omzet', value: formatRupiah(stats.totalOmzet), color: '#06b6d4' },
    { title: 'Total Profit', value: formatRupiah(stats.totalProfit), color: '#14b8a6' },
    { title: 'Total Pengeluaran', value: formatRupiah(stats.totalPengeluaran), color: '#f97316' },
    { title: 'Total Gift', value: formatRupiah(stats.totalGift), color: '#22c55e' },
    { title: 'Total Balance', value: formatRupiah(stats.totalBalance), color: '#8b5cf6' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Laporan</Text>
      <View style={styles.tabContainer}>
        {(['harian', 'bulanan', 'tahunan'] as ReportType[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, reportType === t && styles.tabActive]} onPress={() => setReportType(t)}>
            <Text style={[styles.tabText, reportType === t && styles.tabTextActive]}>
              {t === 'harian' ? 'Harian' : t === 'bulanan' ? 'Bulanan' : 'Tahunan'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.periodSelector}>
        <TouchableOpacity onPress={prevPeriod} style={styles.navButton}>
          <ChevronLeft size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.periodLabel}>
          <Calendar size={16} color="#94a3b8" />
          <Text style={styles.periodText}>{formatPeriodLabel()}</Text>
        </View>
        <TouchableOpacity onPress={nextPeriod} style={styles.navButton}>
          <ChevronRight size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
        {reportCards.map((card, index) => (
          <View key={index} style={[styles.card, { borderLeftColor: card.color }]}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 12 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  periodSelector: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 16 },
  navButton: { backgroundColor: '#1e293b', borderRadius: 8, padding: 8 },
  periodLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  periodText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4 },
  cardTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700' },
});
