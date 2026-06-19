import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { StockEntry } from '@/types/database';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react-native';

export default function StokBensin() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<StockEntry | null>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jam, setJam] = useState(() => {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  });
  const [jumlahLiter, setJumlahLiter] = useState('');
  const [hargaBeli, setHargaBeli] = useState('');
  const [catatan, setCatatan] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.from('stock_entries').select('*').order('tanggal', { ascending: false });
      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      setErrorMsg('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);

  const addEntry = async () => {
    setErrorMsg('');
    if (!jumlahLiter) { setErrorMsg('Jumlah liter harus diisi'); return; }
    const liter = parseFloat(jumlahLiter);
    const harga = hargaBeli ? parseFloat(hargaBeli) : 0;
    if (isNaN(liter) || liter <= 0) { setErrorMsg('Jumlah liter tidak valid'); return; }

    try {
      const { data, error } = await supabase.from('stock_entries').insert({
        tanggal, jam: jam || null, jumlah_liter: liter, harga_beli_total: harga, catatan: catatan || null,
      }).select().single();
      if (error) throw error;

      const { data: settingsData } = await supabase.from('settings').select('*').single();
      const biayaPer64 = settingsData?.biaya_isi_per_64_liter || 10000;
      const biayaIsi = Math.round((liter / 64) * biayaPer64);
      await supabase.from('expenses').insert({
        tanggal, nama_pengeluaran: `Isi Bensin - ${liter} Liter`,
        kategori: 'Isi Bensin', nominal: biayaIsi,
        catatan: `Otomatis: ${liter} Liter x Rp${biayaPer64.toLocaleString('id-ID')}/64L`,
      });
      await supabase.from('audit_logs').insert({
        tipe: 'Stok Masuk', deskripsi: `Menambah stok ${liter} liter - ${tanggal}`,
      });
      resetForm();
      setModalVisible(false);
      fetchEntries();
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan: ' + err.message);
    }
  };

  const editEntry = async () => {
    setErrorMsg('');
    if (!selectedEntry || !jumlahLiter) { setErrorMsg('Data tidak lengkap'); return; }
    const liter = parseFloat(jumlahLiter);
    const harga = hargaBeli ? parseFloat(hargaBeli) : 0;
    if (isNaN(liter) || liter <= 0) { setErrorMsg('Jumlah liter tidak valid'); return; }

    try {
      const { error } = await supabase.from('stock_entries').update({
        tanggal, jam: jam || null, jumlah_liter: liter, harga_beli_total: harga, catatan: catatan || null,
      }).eq('id', selectedEntry.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Edit Stok', deskripsi: `Mengedit stok ${liter} liter - ${tanggal}`,
      });
      setEditModalVisible(false);
      setSelectedEntry(null);
      resetForm();
      fetchEntries();
    } catch (err: any) {
      setErrorMsg('Gagal update: ' + err.message);
    }
  };

  const confirmDelete = (entry: StockEntry) => {
    setItemToDelete(entry);
    setConfirmModalVisible(true);
  };

  const doDelete = async () => {
    if (!itemToDelete) return;
    setErrorMsg('');
    try {
      const { error } = await supabase.from('stock_entries').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Hapus Stok', deskripsi: `Menghapus stok ${itemToDelete.jumlah_liter} liter - ${itemToDelete.tanggal}`,
      });
      setConfirmModalVisible(false);
      setItemToDelete(null);
      fetchEntries();
    } catch (err: any) {
      setErrorMsg('Gagal hapus: ' + err.message);
    }
  };

  const openEdit = (entry: StockEntry) => {
    setSelectedEntry(entry);
    setTanggal(entry.tanggal);
    setJam(entry.jam || '');
    setJumlahLiter(entry.jumlah_liter.toString());
    setHargaBeli(entry.harga_beli_total ? entry.harga_beli_total.toString() : '');
    setCatatan(entry.catatan || '');
    setErrorMsg('');
    setEditModalVisible(true);
  };

  const openAdd = () => {
    resetForm();
    setErrorMsg('');
    setModalVisible(true);
  };

  const resetForm = () => {
    setTanggal(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setJam(String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'));
    setJumlahLiter('');
    setHargaBeli('');
    setCatatan('');
  };

  const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stok Bensin</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAdd}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <AlertTriangle size={16} color="#f87171" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
        {entries.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{entry.tanggal} {entry.jam ? '· ' + entry.jam : ''}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openEdit(entry)}>
                  <Edit2 size={16} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelete(entry)}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.cardValue}>{entry.jumlah_liter.toLocaleString('id-ID', { minimumFractionDigits: 2 })} L</Text>
            {entry.harga_beli_total > 0 && (
              <Text style={styles.cardSubtext}>Harga Beli: {formatRupiah(entry.harga_beli_total)}</Text>
            )}
            {entry.catatan && <Text style={styles.cardSubtext}>{entry.catatan}</Text>}
          </View>
        ))}
        {entries.length === 0 && !loading && (
          <Text style={styles.emptyText}>Belum ada data stok</Text>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Stok</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Tanggal</Text>
            <TextInput style={styles.input} value={tanggal} onChangeText={setTanggal} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Jam (HH:MM)</Text>
            <TextInput style={styles.input} value={jam} onChangeText={setJam} placeholder="08:30" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Jumlah Liter</Text>
            <TextInput style={styles.input} value={jumlahLiter} onChangeText={setJumlahLiter} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Harga Beli Total (Opsional)</Text>
            <TextInput style={styles.input} value={hargaBeli} onChangeText={setHargaBeli} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Catatan</Text>
            <TextInput style={styles.input} value={catatan} onChangeText={setCatatan} placeholder="Catatan..." placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitButton} onPress={addEntry}>
              <Text style={styles.submitButtonText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="fade" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Stok</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Tanggal</Text>
            <TextInput style={styles.input} value={tanggal} onChangeText={setTanggal} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Jam (HH:MM)</Text>
            <TextInput style={styles.input} value={jam} onChangeText={setJam} placeholder="08:30" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Jumlah Liter</Text>
            <TextInput style={styles.input} value={jumlahLiter} onChangeText={setJumlahLiter} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Harga Beli Total</Text>
            <TextInput style={styles.input} value={hargaBeli} onChangeText={setHargaBeli} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Catatan</Text>
            <TextInput style={styles.input} value={catatan} onChangeText={setCatatan} placeholder="Catatan..." placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitButton} onPress={editEntry}>
              <Text style={styles.submitButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmModalVisible} animationType="fade" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Konfirmasi Hapus</Text>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.confirmText}>
              Hapus stok {itemToDelete?.jumlah_liter} liter dari {itemToDelete?.tanggal}?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={doDelete}>
                <Text style={styles.deleteButtonText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  addButton: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 10 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#450a0a', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8 },
  errorText: { color: '#f87171', fontSize: 14 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { color: '#94a3b8', fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6, backgroundColor: '#334155', borderRadius: 6 },
  cardValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardSubtext: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#64748b', fontSize: 16, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 15 },
  submitButton: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 12, marginTop: 20, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  confirmText: { color: '#e2e8f0', fontSize: 15, marginBottom: 20 },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#334155', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  deleteButton: { flex: 1, backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
