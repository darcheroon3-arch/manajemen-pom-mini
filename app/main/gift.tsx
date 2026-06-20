import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Gift as GiftType } from '@/types/database';
import { Plus, Edit2, Trash2, X, AlertTriangle, Gift } from 'lucide-react-native';

export default function GiftScreen() {
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GiftType | null>(null);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchGifts = useCallback(async () => {
    setErrorMsg('');
    try {
      const { data, error } = await supabase.from('gifts').select('*').order('tanggal', { ascending: false });
      if (error) throw error;
      setGifts(data || []);
    } catch (err: any) {
      setErrorMsg('Gagal memuat data: ' + err.message);
    }
  }, []);

  useEffect(() => { fetchGifts(); }, [fetchGifts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGifts();
    setRefreshing(false);
  }, [fetchGifts]);

  const addGift = async () => {
    setErrorMsg('');
    if (!nominal) { setErrorMsg('Nominal harus diisi'); return; }
    const n = parseFloat(nominal);
    if (isNaN(n) || n < 0) { setErrorMsg('Nominal tidak valid'); return; }
    try {
      const { error } = await supabase.from('gifts').insert({
        tanggal, nominal: n, keterangan: keterangan || null,
      });
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Gift', deskripsi: `Gift ${keterangan || 'Tanpa keterangan'} - Rp${n.toLocaleString('id-ID')} - ${tanggal}`,
      });
      resetForm();
      setModalVisible(false);
      fetchGifts();
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan: ' + err.message);
    }
  };

  const editGift = async () => {
    setErrorMsg('');
    if (!selectedGift || !nominal) { setErrorMsg('Data tidak lengkap'); return; }
    const n = parseFloat(nominal);
    if (isNaN(n) || n < 0) { setErrorMsg('Nominal tidak valid'); return; }
    try {
      const { error } = await supabase.from('gifts').update({
        tanggal, nominal: n, keterangan: keterangan || null,
      }).eq('id', selectedGift.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Edit Gift', deskripsi: `Mengedit gift ${keterangan || 'Tanpa keterangan'} - ${tanggal}`,
      });
      setEditModalVisible(false);
      setSelectedGift(null);
      resetForm();
      fetchGifts();
    } catch (err: any) {
      setErrorMsg('Gagal update: ' + err.message);
    }
  };

  const confirmDelete = (gift: GiftType) => {
    setItemToDelete(gift);
    setConfirmModalVisible(true);
  };

  const doDelete = async () => {
    if (!itemToDelete) return;
    setErrorMsg('');
    try {
      const { error } = await supabase.from('gifts').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Hapus Gift', deskripsi: `Menghapus gift ${itemToDelete.keterangan || 'Tanpa keterangan'} - ${itemToDelete.tanggal}`,
      });
      setConfirmModalVisible(false);
      setItemToDelete(null);
      fetchGifts();
    } catch (err: any) {
      setErrorMsg('Gagal hapus: ' + err.message);
    }
  };

  const openEdit = (gift: GiftType) => {
    setSelectedGift(gift);
    setTanggal(gift.tanggal);
    setNominal(gift.nominal.toString());
    setKeterangan(gift.keterangan || '');
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
    setNominal('');
    setKeterangan('');
  };

  const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');

  const totalGift = gifts.reduce((sum, g) => sum + Number(g.nominal), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Gift size={24} color="#22c55e" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Gift</Text>
            <Text style={styles.subtitle}>{formatRupiah(totalGift)}</Text>
          </View>
        </View>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}>
        {gifts.map(gift => (
          <View key={gift.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{gift.tanggal}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openEdit(gift)}>
                  <Edit2 size={16} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelete(gift)}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.cardNominal}>{formatRupiah(gift.nominal)}</Text>
            {gift.keterangan && <Text style={styles.cardSubtext}>{gift.keterangan}</Text>}
          </View>
        ))}
        {gifts.length === 0 && <Text style={styles.emptyText}>Belum ada gift</Text>}
      </ScrollView>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Gift</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Tanggal</Text>
            <TextInput style={styles.input} value={tanggal} onChangeText={setTanggal} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Nominal</Text>
            <TextInput style={styles.input} value={nominal} onChangeText={setNominal} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Keterangan</Text>
            <TextInput style={styles.input} value={keterangan} onChangeText={setKeterangan} placeholder="Keterangan..." placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitButton} onPress={addGift}>
              <Text style={styles.submitButtonText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="fade" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Gift</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Tanggal</Text>
            <TextInput style={styles.input} value={tanggal} onChangeText={setTanggal} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Nominal</Text>
            <TextInput style={styles.input} value={nominal} onChangeText={setNominal} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Keterangan</Text>
            <TextInput style={styles.input} value={keterangan} onChangeText={setKeterangan} placeholder="Keterangan..." placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitButton} onPress={editGift}>
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
            <Text style={styles.confirmText}>Hapus gift "{itemToDelete?.keterangan || 'Tanpa keterangan'}"?</Text>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: {},
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#22c55e', fontSize: 14, fontWeight: '600', marginTop: 2 },
  addButton: { backgroundColor: '#22c55e', padding: 10, borderRadius: 10 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#450a0a', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8 },
  errorText: { color: '#f87171', fontSize: 14 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#22c55e' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { color: '#94a3b8', fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6, backgroundColor: '#334155', borderRadius: 6 },
  cardNominal: { color: '#22c55e', fontSize: 18, fontWeight: '700', marginTop: 4 },
  cardSubtext: { color: '#64748b', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#64748b', fontSize: 16, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 15 },
  submitButton: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 12, marginTop: 20, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  confirmText: { color: '#e2e8f0', fontSize: 15, marginBottom: 20 },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#334155', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  deleteButton: { flex: 1, backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
