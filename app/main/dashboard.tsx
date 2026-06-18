import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { StockEntry, Sale, Expense } from '@/types/database';
import { Fuel, Droplets, DollarSign, TrendingUp, TrendingDown, Wallet, PiggyBank, Receipt } from 'lucide-react-native';

interface DashboardStats {
  sisaBensin: number;
  literTerjualHariIni: number;
  omzetHariIni: number;
  profitHariIni: number;
  pengeluaranHariIni: number;
  labaBersihHariIni: number;
  totalBalance: number;
  totalProfit: number;
  totalPengeluaran: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    sisaBensin: 0,
    literTerjualHariIni: 0,
    omzetHariIni: 0,
    profitHariIni: 0,
    pengeluaranHariIni: 0,
    labaBersihHariIni: 0,
    totalBalance: 0,
    totalProfit: 0,
    totalPengeluaran: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const [stockRes, salesRes, expensesRes] = await Promise.all([
      supabase.from('stock_entries').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*'),
    ]);

    const stockEntries = (stockRes.data || []) as StockEntry[];
    const sales = (salesRes.data || []) as Sale[];
    const expenses = (expensesRes.data || []) as Expense[];

    const totalStokMasuk = stockEntries.reduce((sum, s) => sum + Number(s.jumlah_liter), 0);
    const totalLiterTerjual = sales.reduce((sum, s) => sum + Number(s.liter_terjual), 0);
    const sisaBensin = totalStokMasuk - totalLiterTerjual;

    const salesToday = sales.filter(s => s.tanggal === today);
    const literTerjualHariIni = salesToday.reduce((sum, s) => sum + Number(s.liter_terjual), 0);
    const omzetHariIni = salesToday.reduce((sum, s) => sum + Number(s.omzet), 0);
    const profitHariIni = salesToday.reduce((sum, s) => sum + Number(s.profit), 0);

    const expensesToday = expenses.filter(e => e.tanggal === today);
    const pengeluaranHariIni = expensesToday.reduce((sum, e) => sum + Number(e.nominal), 0);

    const totalProfit = sales.reduce((sum, s) => sum + Number(s.profit), 0);
    const totalPengeluaran = expenses.reduce((sum, e) => sum + Number(e.nominal), 0);
    const totalBalance = totalProfit - totalPengeluaran;
    const labaBersihHariIni = profitHariIni - pengeluaranHariIni;

    setStats({
      sisaBensin,
      literTerjualHariIni,
      omzetHariIni,
      profitHariIni,
      pengeluaranHariIni,
      labaBersihHariIni,
      totalBalance,
      totalProfit,
      totalPengeluaran,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const formatRupiah = (value: number) => {
    return 'Rp ' + value.toLocaleString('id-ID');
  };

  const formatLiter = (value: number) => {
    return value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
  };

  const cards = [
    {
      title: 'Sisa Bensin',
      value: formatLiter(stats.sisaBensin),
      icon: Fuel,
      color: '#3b82f6',
      bgColor: '#1e3a5f',
      warning: stats.sisaBensin < 50,
    },
    {
      title: 'Liter Terjual Hari Ini',
      value: formatLiter(stats.literTerjualHariIni),
      icon: Droplets,
      color: '#10b981',
      bgColor: '#064e3b',
    },
    {
      title: 'Omzet Hari Ini',
      value: formatRupiah(stats.omzetHariIni),
      icon: DollarSign,
      color: '#06b6d4',
      bgColor: '#083344',
    },
    {
      title: 'Profit Hari Ini',
      value: formatRupiah(stats.profitHariIni),
      icon: TrendingUp,
      color: '#14b8a6',
      bgColor: '#0f3a36',
    },
    {
      title: 'Pengeluaran Hari Ini',
      value: formatRupiah(stats.pengeluaranHariIni),
      icon: TrendingDown,
      color: '#f97316',
      bgColor: '#451a03',
    },
    {
      title: 'Laba Bersih Hari Ini',
      value: formatRupiah(stats.labaBersihHariIni),
      icon: Wallet,
      color: '#ef4444',
      bgColor: '#450a0a',
    },
    {
      title: 'Total Balance',
      value: formatRupiah(stats.totalBalance),
      icon: PiggyBank,
      color: '#8b5cf6',
      bgColor: '#2e1065',
    },
    {
      title: 'Total Profit Keseluruhan',
      value: formatRupiah(stats.totalProfit),
      icon: TrendingUp,
      color: '#22c55e',
      bgColor: '#052e16',
    },
    {
      title: 'Total Pengeluaran Keseluruhan',
      value: formatRupiah(stats.totalPengeluaran),
      icon: Receipt,
      color: '#eab308',
      bgColor: '#422006',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
      }
    >
      <Text style={styles.title}>Dashboard</Text>
      {stats.sisaBensin < 50 && stats.sisaBensin > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Stok bensin menipis! Sisa: {formatLiter(stats.sisaBensin)}</Text>
        </View>
      )}
      <View style={styles.cardsContainer}>
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <View key={index} style={[styles.card, { backgroundColor: card.bgColor, borderColor: card.color }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <View style={[styles.iconContainer, { backgroundColor: card.color + '20' }]}>
                  <Icon size={20} color={card.color} />
                </View>
              </View>
              <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 72,
    paddingBottom: 32,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  warningBanner: {
    backgroundColor: '#7c2d12',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  warningText: {
    color: '#fdba74',
    fontSize: 14,
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
  },
});
