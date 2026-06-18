import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Expense } from '@/types/database';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react-native';

const categories = ['Isi Bensin', 'Gaji', 'Listrik', 'Transportasi', 'Perawatan Mesin', 'Operasional', 'Lainnya'];

export default function Pengeluaran() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('Lainnya');
  const [nominal, setNominal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchExpenses = useCallback(async () => {
    setErrorMsg('');
    try {
      const { data, error } = await supabase.from('expenses').select('*').order('tanggal', { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
    } catch (err: any) {
      setErrorMsg('Gagal memuat data: ' + err.message);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  }, [fetchExpenses]);

  const addExpense = async () => {
    setErrorMsg('');
    if (!nama || !nominal) { setErrorMsg('Nama dan nominal harus diisi'); return; }
    const n = parseFloat(nominal);
    if (isNaN(n) || n < 0) { setErrorMsg('Nominal tidak valid'); return; }
    try {
      const { error } = await supabase.from('expenses').insert({
        tanggal, nama_pengeluaran: nama, kategori, nominal: n, catatan: catatan || null,
      });
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Pengeluaran', deskripsi: `${nama} - ${kategori} - Rp${n.toLocaleString('id-ID')} - ${tanggal}`,
      });
      resetForm();
      setModalVisible(false);
      fetchExpenses();
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan: ' + err.message);
    }
  };

  const editExpense = async () => {
    setErrorMsg('');
    if (!selectedExpense || !nama || !nominal) { setErrorMsg('Data tidak lengkap'); return; }
    const n = parseFloat(nominal);
    if (isNaN(n) || n < 0) { setErrorMsg('Nominal tidak valid'); return; }
    try {
      const { error } = await supabase.from('expenses').update({
        tanggal, nama_pengeluaran: nama, kategori, nominal: n, catatan: catatan || null,
      }).eq('id', selectedExpense.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Edit Pengeluaran', deskripsi: `Mengedit pengeluaran ${nama} - ${tanggal}`,
      });
      setEditModalVisible(false);
      setSelectedExpense(null);
      resetForm();
      fetchExpenses();
    } catch (err: any) {
      setErrorMsg('Gagal update: ' + err.message);
    }
  };

  const confirmDelete = (exp: Expense) => {
    setItemToDelete(exp);
    setConfirmModalVisible(true);
  };

  const doDelete = async () => {
    if (!itemToDelete) return;
    setErrorMsg('');
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Hapus Pengeluaran', deskripsi: `Menghapus pengeluaran ${itemToDelete.nama_pengeluaran} - ${itemToDelete.tanggal}`,
      });
      setConfirmModalVisible(false);
      setItemToDelete(null);
      fetchExpenses();
    } catch (err: any) {
      setErrorMsg('Gagal hapus: ' + err.message);
    }
  };

  const openEdit = (exp: Expense) => {
    setSelectedExpense(exp);
    setTanggal(exp.tanggal);
    setNama(exp.nama_pengeluaran);
    setKategori(exp.kategori);
    setNominal(exp.nominal.toString());
    setCatatan(exp.catatan || '');
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
    setNama('');
    setKategori('Lainnya');
    setNominal('');
    setCatatan('');
  };

  const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');
  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = { 'Isi Bensin': '#3b82f6', 'Gaji': '#8b5cf6', 'Listrik': '#eab308', 'Transportasi': '#f97316', 'Perawatan Mesin': '#ef4444', 'Operasional': '#14b8a6', 'Lainnya': '#64748b' };
    return colors[cat] || '#64748b';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pengeluaran</Text>
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
        {expenses.map(exp => (
          <View key={exp.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{exp.tanggal}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openEdit(exp)}>
                  <Edit2 size={16} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelete(exp)}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.cardName}>{exp.nama_pengeluaran}</Text>
            <Text style={styles.cardNominal}>{formatRupiah(exp.nominal)}</Text>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(exp.kategori) + '20' }]}>
              <Text style={[styles.categoryText, { color: getCategoryColor(exp.kategori) }]}>{exp.kategori}</Text>
            </View>
            {exp.catatan && <Text style={styles.cardSubtext}>{exp.catatan}</Text>}
          </View>
        ))}
        {expenses.length === 0 && <Text style={styles.emptyText}>Belum ada pengeluaran</Text>}
      </ScrollView>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Pengeluaran</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Tanggal</Text>
            <TextInput style={styles.input} value={tanggal} onChangeText={setTanggal} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Nama Pengeluaran</Text>
            <TextInput style={styles.input} value={nama} onChangeText={setNama} placeholder="Nama pengeluaran..." placeholderTextColor="#64748b" />
            <Text style={styles.label}>Kategori</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryPicker(true)}>
              <Text style={styles.pickerText}>{kategori}</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Nominal</Text>
            <TextInput style={styles.input} value={nominal} onChangeText={setNominal} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Catatan</Text>
            <TextInput style={styles.input} value={catatan} onChangeText={setCatatan} placeholder="Catatan..." placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitButton} onPress={addExpense}>
              <Text style={styles.submitButtonText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="fade" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Pengeluaran</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Tanggal</Text>
            <TextInput style={styles.input} value={tanggal} onChangeText={setTanggal} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Nama Pengeluaran</Text>
            <TextInput style={styles.input} value={nama} onChangeText={setNama} placeholder="Nama pengeluaran..." placeholderTextColor="#64748b" />
            <Text style={styles.label}>Kategori</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryPicker(true)}>
              <Text style={styles.pickerText}>{kategori}</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Nominal</Text>
            <TextInput style={styles.input} value={nominal} onChangeText={setNominal} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Catatan</Text>
            <TextInput style={styles.input} value={catatan} onChangeText={setCatatan} placeholder="Catatan..." placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitButton} onPress={editExpense}>
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
            <Text style={styles.confirmText}>Hapus pengeluaran "{itemToDelete?.nama_pengeluaran}"?</Text>
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

      <Modal visible={showCategoryPicker} animationType="fade" transparent onRequestClose={() => setShowCategoryPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 300 }]}>
            <Text style={[styles.modalTitle, { marginBottom: 16 }]}>Pilih Kategori</Text>
            {categories.map(cat => (
              <TouchableOpacity key={cat} style={styles.categoryOption} onPress={() => { setKategori(cat); setShowCategoryPicker(false); }}>
                <Text style={[styles.categoryOptionText, kategori === cat && styles.categoryOptionTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
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
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#f97316' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { color: '#94a3b8', fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6, backgroundColor: '#334155', borderRadius: 6 },
  cardName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardNominal: { color: '#f97316', fontSize: 18, fontWeight: '700', marginTop: 4 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  categoryText: { fontSize: 11, fontWeight: '600' },
  cardSubtext: { color: '#64748b', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#64748b', fontSize: 16, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 15 },
  picker: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  pickerText: { color: '#fff', fontSize: 15 },
  submitButton: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 12, marginTop: 20, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  confirmText: { color: '#e2e8f0', fontSize: 15, marginBottom: 20 },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#334155', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  deleteButton: { flex: 1, backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  categoryOption: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  categoryOptionText: { color: '#94a3b8', fontSize: 15 },
  categoryOptionTextActive: { color: '#3b82f6', fontWeight: '600' },
});
