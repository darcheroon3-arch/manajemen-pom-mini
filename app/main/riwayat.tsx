import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AuditLog } from '@/types/database';
import { Search, Clock } from 'lucide-react-native';

export default function Riwayat() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filtered, setFiltered] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase.from('audit_logs').select('*').order('waktu', { ascending: false });
    if (!error) {
      setLogs(data || []);
      setFiltered(data || []);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (!search) {
      setFiltered(logs);
    } else {
      const q = search.toLowerCase();
      setFiltered(logs.filter(l => l.deskripsi.toLowerCase().includes(q) || l.tipe.toLowerCase().includes(q)));
    }
  }, [search, logs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }, [fetchLogs]);

  const getTypeColor = (tipe: string) => {
    const map: Record<string, string> = {
      'Penjualan': '#10b981', 'Stok Masuk': '#3b82f6', 'Pengeluaran': '#f97316',
      'Edit': '#eab308', 'Edit Stok': '#eab308', 'Edit Penjualan': '#eab308', 'Edit Pengeluaran': '#eab308',
      'Hapus': '#ef4444', 'Hapus Stok': '#ef4444', 'Hapus Penjualan': '#ef4444', 'Hapus Pengeluaran': '#ef4444',
    };
    return map[tipe] || '#64748b';
  };

  const formatDate = (waktu: string) => {
    const d = new Date(waktu);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatTime = (waktu: string) => {
    const d = new Date(waktu);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Riwayat Aktivitas</Text>
      <View style={styles.searchContainer}>
        <Search size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Cari riwayat..." placeholderTextColor="#64748b" />
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
        {filtered.map(log => (
          <View key={log.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(log.tipe) + '20' }]}>
                <Text style={[styles.typeText, { color: getTypeColor(log.tipe) }]}>{log.tipe}</Text>
              </View>
              <View style={styles.timeRow}>
                <Clock size={12} color="#64748b" />
                <Text style={styles.timeText}>{formatDate(log.waktu)} {formatTime(log.waktu)}</Text>
              </View>
            </View>
            <Text style={styles.description}>{log.deskripsi}</Text>
          </View>
        ))}
        {filtered.length === 0 && <Text style={styles.emptyText}>{search ? 'Tidak ada hasil pencarian' : 'Belum ada riwayat aktivitas'}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: '#64748b', fontSize: 11 },
  description: { color: '#e2e8f0', fontSize: 14 },
  emptyText: { color: '#64748b', fontSize: 16, textAlign: 'center', marginTop: 40 },
});