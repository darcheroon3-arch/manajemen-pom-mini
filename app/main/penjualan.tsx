import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Sale, Settings } from '@/types/database';
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react-native';
import { getIndonesiaDateStr, getIndonesiaTimeStr, isValidDate } from '@/lib/date';

export default function Penjualan() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Sale | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [tanggal, setTanggal] = useState(getIndonesiaDateStr());
  const [jam, setJam] = useState(getIndonesiaTimeStr());
  const [literTerjual, setLiterTerjual] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = useCallback(async () => {
    setErrorMsg('');
    try {
      const [salesRes, settingsRes] = await Promise.all([
        supabase.from('sales').select('*').order('tanggal', { ascending: false }),
        supabase.from('settings').select('*').single(),
      ]);
      const { data: settingsData } = await supabase.from('settings').select('*').single();
      if (salesRes.data) setSales(salesRes.data);
      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setHargaJual(settingsRes.data.harga_jual_per_liter.toString());
      }
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Gagal memuat data: ' + err.message);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const addSale = async () => {
    setErrorMsg('');
    if (!isValidDate(tanggal)) { setErrorMsg('Tanggal tidak valid'); return; }
    if (!literTerjual || !hargaJual) { setErrorMsg('Liter terjual dan harga jual harus diisi'); return; }
    const liter = parseFloat(literTerjual);
    const harga = parseFloat(hargaJual);
    if (isNaN(liter) || liter <= 0 || isNaN(harga) || harga <= 0) { setErrorMsg('Input tidak valid'); return; }

    const { data: stockData } = await supabase.from('stock_entries').select('jumlah_liter');
    const totalStok = (stockData || []).reduce((sum, s) => sum + Number(s.jumlah_liter), 0);
    const { data: salesData } = await supabase.from('sales').select('liter_terjual');
    const totalSold = (salesData || []).reduce((sum, s) => sum + Number(s.liter_terjual), 0);
    const sisaBensin = totalStok - totalSold;
    if (liter > sisaBensin) { setErrorMsg(`Stok bensin tidak mencukupi. Sisa: ${sisaBensin.toFixed(2)} L`); return; }

    const profit = liter * (settings?.profit_per_liter || 2000);
    const omzet = liter * harga;

    try {
      const { error } = await supabase.from('sales').insert({
        tanggal, jam: jam || null, liter_terjual: liter, harga_jual_per_liter: harga, omzet, profit,
      });
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Penjualan', deskripsi: `Menjual ${liter} liter - Rp${omzet.toLocaleString('id-ID')} - ${tanggal}`,
      });
      resetForm();
      setModalVisible(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan: ' + err.message);
    }
  };

  const editSale = async () => {
    setErrorMsg('');
    if (!isValidDate(tanggal)) { setErrorMsg('Tanggal tidak valid'); return; }
    if (!selectedSale || !literTerjual || !hargaJual) { setErrorMsg('Data tidak lengkap'); return; }
    const liter = parseFloat(literTerjual);
    const harga = parseFloat(hargaJual);
    if (isNaN(liter) || liter <= 0 || isNaN(harga) || harga <= 0) { setErrorMsg('Input tidak valid'); return; }

    const { data: stockData } = await supabase.from('stock_entries').select('jumlah_liter');
    const totalStok = (stockData || []).reduce((sum, s) => sum + Number(s.jumlah_liter), 0);
    const { data: salesData } = await supabase.from('sales').select('liter_terjual').neq('id', selectedSale.id);
    const totalSold = (salesData || []).reduce((sum, s) => sum + Number(s.liter_terjual), 0);
    const sisaBensin = totalStok - totalSold;
    if (liter > sisaBensin) { setErrorMsg(`Stok bensin tidak mencukupi. Sisa: ${sisaBensin.toFixed(2)} L`); return; }

    const profit = liter * (settings?.profit_per_liter || 2000);
    const omzet = liter * harga;

    try {
      const { error } = await supabase.from('sales').update({
        tanggal, jam: jam || null, liter_terjual: liter, harga_jual_per_liter: harga, omzet, profit,
      }).eq('id', selectedSale.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Edit Penjualan', deskripsi: `Mengedit penjualan ${liter} liter - ${tanggal}`,
      });
      setEditModalVisible(false);
      setSelectedSale(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      setErrorMsg('Gagal update: ' + err.message);
    }
  };

  const confirmDelete = (sale: Sale) => {
    setItemToDelete(sale);
    setConfirmModalVisible(true);
  };

  const doDelete = async () => {
    if (!itemToDelete) return;
    setErrorMsg('');
    try {
      const { error } = await supabase.from('sales').delete().eq('id', itemToDelete.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        tipe: 'Hapus Penjualan', deskripsi: `Menghapus penjualan ${itemToDelete.liter_terjual} liter - ${itemToDelete.tanggal}`,
      });
      setConfirmModalVisible(false);
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      setErrorMsg('Gagal hapus: ' + err.message);
    }
  };

  const openEdit = (sale: Sale) => {
    setSelectedSale(sale);
    setTanggal(sale.tanggal);
    setJam(sale.jam || '');
    setLiterTerjual(sale.liter_terjual.toString());
    setHargaJual(sale.harga_jual_per_liter.toString());
    setErrorMsg('');
    setEditModalVisible(true);
  };

  const openAdd = () => {
    resetForm();
    setErrorMsg('');
    setModalVisible(true);
  };

  const resetForm = () => {
    setTanggal(getIndonesiaDateStr());
    setJam(getIndonesiaTimeStr());
    setLiterTerjual('');
    setHargaJual(settings?.harga_jual_per_liter.toString() || '10000');
  };

  const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Penjualan</Text>
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
        {sales.map(sale => (
          <View key={sale.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{sale.tanggal} {sale.jam ? '· ' + sale.jam : ''}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openEdit(sale)}>
                  <Edit2 size={16} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelete(sale)}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.cardValue}>{sale.liter_terjual.toLocaleString('id-ID', { minimumFractionDigits: 2 })} L</Text>
            <Text style={styles.cardSubtext}>Harga Jual: {formatRupiah(sale.harga_jual_per_liter)}/L</Text>
            <Text style={styles.cardProfit}>Omzet: {formatRupiah(sale.omzet)} | Profit: {formatRupiah(sale.profit)}</Text>
          </View>
        ))}
        {sales.length === 0 && <Text style={styles.emptyText}>Belum ada penjualan</Text>}
      </ScrollView>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Penjualan</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={tanggal} onChangeText={setTanggal} placeholder="2026-06-22" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Jam (HH:MM)</Text>
            <TextInput style={styles.input} value={jam} onChangeText={setJam} placeholder="08:30" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Liter Terjual</Text>
            <TextInput style={styles.input} value={literTerjual} onChangeText={setLiterTerjual} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Harga Jual per Liter</Text>
            <TextInput style={styles.input} value={hargaJual} onChangeText={setHargaJual} keyboardType="numeric" placeholder="10000" placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitButton} onPress={addSale}>
              <Text style={styles.submitButtonText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="fade" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Penjualan</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={tanggal} onChangeText={setTanggal} placeholder="2026-06-22" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Jam (HH:MM)</Text>
            <TextInput style={styles.input} value={jam} onChangeText={setJam} placeholder="08:30" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Liter Terjual</Text>
            <TextInput style={styles.input} value={literTerjual} onChangeText={setLiterTerjual} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#64748b" />
            <Text style={styles.label}>Harga Jual per Liter</Text>
            <TextInput style={styles.input} value={hargaJual} onChangeText={setHargaJual} keyboardType="numeric" placeholder="10000" placeholderTextColor="#64748b" />
            <TouchableOpacity style={styles.submitButton} onPress={editSale}>
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
            <Text style={styles.confirmText}>Hapus penjualan {itemToDelete?.liter_terjual} liter dari {itemToDelete?.tanggal}?</Text>
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
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#10b981' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { color: '#94a3b8', fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6, backgroundColor: '#334155', borderRadius: 6 },
  cardValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardSubtext: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  cardProfit: { color: '#22c55e', fontSize: 13, marginTop: 4, fontWeight: '600' },
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
