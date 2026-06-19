import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Sale, Expense } from '@/types/database';
import { BarChart3 } from 'lucide-react-native';

type ChartType = 'penjualan' | 'omzet' | 'profit' | 'pengeluaran' | 'balance';

interface DayData {
  date: string;
  label: string;
  value: number;
}

export default function Grafik() {
  const [chartType, setChartType] = useState<ChartType>('penjualan');
  const [data, setData] = useState<DayData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [salesRes, expensesRes] = await Promise.all([
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*'),
    ]);

    const sales = (salesRes.data || []) as Sale[];
    const expenses = (expensesRes.data || []) as Expense[];

    const dates = new Set<string>();
    [...sales, ...expenses].forEach(d => dates.add(d.tanggal));
    const sorted = Array.from(dates).sort().slice(-30);

    const result: DayData[] = sorted.map(date => {
      const daySales = sales.filter(s => s.tanggal === date);
      const dayExpenses = expenses.filter(e => e.tanggal === date);
      const dayProfit = daySales.reduce((sum, s) => sum + Number(s.profit), 0);
      const dayOmzet = daySales.reduce((sum, s) => sum + Number(s.omzet), 0);
      const dayLiter = daySales.reduce((sum, s) => sum + Number(s.liter_terjual), 0);
      const dayPengeluaran = dayExpenses.reduce((sum, e) => sum + Number(e.nominal), 0);
      const dayBalance = dayProfit - dayPengeluaran;

      let value = 0;
      if (chartType === 'penjualan') value = dayLiter;
      else if (chartType === 'omzet') value = dayOmzet;
      else if (chartType === 'profit') value = dayProfit;
      else if (chartType === 'pengeluaran') value = dayPengeluaran;
      else value = dayBalance;

      return { date, label: date.slice(5), value };
    });

    setData(result);
  }, [chartType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const chartColor =
    chartType === 'penjualan' ? '#10b981' :
    chartType === 'omzet' ? '#06b6d4' :
    chartType === 'profit' ? '#14b8a6' :
    chartType === 'pengeluaran' ? '#f97316' : '#8b5cf6';

  const formatValue = (val: number) => {
    if (chartType === 'penjualan') return val.toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' L';
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const chartTypes: { key: ChartType; label: string }[] = [
    { key: 'penjualan', label: 'Penjualan' },
    { key: 'omzet', label: 'Omzet' },
    { key: 'profit', label: 'Profit' },
    { key: 'pengeluaran', label: 'Pengeluaran' },
    { key: 'balance', label: 'Balance' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grafik</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll} contentContainerStyle={styles.typeScrollContent}>
        {chartTypes.map(t => (
          <TouchableOpacity key={t.key} style={[styles.typeButton, chartType === t.key && styles.typeButtonActive]} onPress={() => setChartType(t.key)}>
            <Text style={[styles.typeButtonText, chartType === t.key && styles.typeButtonTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.chartArea} contentContainerStyle={styles.chartContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
        {data.length === 0 && <Text style={styles.emptyText}>Belum ada data untuk grafik</Text>}
        {data.map((d, i) => {
          const barHeight = Math.max((Math.abs(d.value) / maxValue) * 200, 4);
          return (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel}>{d.label}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { height: barHeight, backgroundColor: d.value >= 0 ? chartColor : '#ef4444' }]} />
              </View>
              <Text style={[styles.barValue, { color: d.value >= 0 ? chartColor : '#ef4444' }]}>{formatValue(d.value)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 12 },
  typeScroll: { maxHeight: 44, marginBottom: 12 },
  typeScrollContent: { paddingHorizontal: 16, gap: 8 },
  typeButton: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  typeButtonActive: { backgroundColor: '#3b82f6' },
  typeButtonText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  typeButtonTextActive: { color: '#fff', fontWeight: '600' },
  chartArea: { flex: 1 },
  chartContent: { paddingHorizontal: 16, paddingBottom: 32 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { color: '#94a3b8', fontSize: 11, width: 40, textAlign: 'right', marginRight: 8 },
  barContainer: { flex: 1, height: 200, justifyContent: 'flex-end', backgroundColor: '#1e293b', borderRadius: 4, padding: 4 },
  bar: { borderRadius: 2, minHeight: 4 },
  barValue: { fontSize: 11, fontWeight: '600', marginLeft: 8, width: 80 },
  emptyText: { color: '#64748b', fontSize: 16, textAlign: 'center', marginTop: 40 },
});