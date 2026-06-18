import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Settings } from '@/types/database';
import { Save, Moon } from 'lucide-react-native';

export default function Pengaturan() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hargaJual, setHargaJual] = useState('');
  const [profitPerLiter, setProfitPerLiter] = useState('');
  const [biayaIsi, setBiayaIsi] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select('*').single();
    if (!error && data) {
      setSettings(data);
      setHargaJual(data.harga_jual_per_liter.toString());
      setProfitPerLiter(data.profit_per_liter.toString());
      setBiayaIsi(data.biaya_isi_per_64_liter.toString());
      setDarkMode(data.dark_mode);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSettings();
    setRefreshing(false);
  }, [fetchSettings]);

  const saveSettings = async () => {
    const { error } = await supabase.from('settings').update({
      harga_jual_per_liter: parseFloat(hargaJual) || 10000,
      profit_per_liter: parseFloat(profitPerLiter) || 2000,
      biaya_isi_per_64_liter: parseFloat(biayaIsi) || 10000,
      dark_mode: darkMode,
    }).eq('id', 1);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Berhasil', 'Pengaturan berhasil disimpan');
    fetchSettings();
  };

  const exportCSV = async () => {
    const [salesRes, stockRes, expensesRes] = await Promise.all([
      supabase.from('sales').select('*'),
      supabase.from('stock_entries').select('*'),
      supabase.from('expenses').select('*'),
    ]);

    let csv = 'TIPE,TANGGAL,DETAIL,NOMINAL\n';
    (salesRes.data || []).forEach((s: any) => {
      csv += `PENJUALAN,${s.tanggal},${s.liter_terjual}L,${s.omzet}\n`;
    });
    (stockRes.data || []).forEach((s: any) => {
      csv += `STOK,${s.tanggal},${s.jumlah_liter}L,${s.harga_beli_total}\n`;
    });
    (expensesRes.data || []).forEach((e: any) => {
      csv += `PENGELUARAN,${e.tanggal},${e.nama_pengeluaran},${e.nominal}\n`;
    });

    Alert.alert('Export CSV', 'Data berhasil diekspor ke format CSV (simulasi)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
      <Text style={styles.title}>Pengaturan</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Harga & Profit</Text>
        <Text style={styles.label}>Harga Jual per Liter (Rp)</Text>
        <TextInput style={styles.input} value={hargaJual} onChangeText={setHargaJual} keyboardType="numeric" placeholder="10000" placeholderTextColor="#64748b" />
        <Text style={styles.label}>Profit per Liter (Rp)</Text>
        <TextInput style={styles.input} value={profitPerLiter} onChangeText={setProfitPerLiter} keyboardType="numeric" placeholder="2000" placeholderTextColor="#64748b" />
        <Text style={styles.label}>Biaya Isi per 64 Liter (Rp)</Text>
        <TextInput style={styles.input} value={biayaIsi} onChangeText={setBiayaIsi} keyboardType="numeric" placeholder="10000" placeholderTextColor="#64748b" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tampilan</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Moon size={20} color="#94a3b8" />
            <Text style={styles.toggleLabel}>Dark Mode</Text>
          </View>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: '#334155', true: '#3b82f6' }} thumbColor="#fff" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportCSV}>
          <Text style={styles.exportButtonText}>Export Data ke CSV</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Save size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.saveButtonText}>Simpan Pengaturan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  contentContainer: { padding: 16, paddingTop: 72, paddingBottom: 32 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  section: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 15 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { color: '#e2e8f0', fontSize: 15 },
  exportButton: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  exportButtonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  saveButton: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
