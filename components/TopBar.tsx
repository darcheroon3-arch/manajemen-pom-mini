import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, Fuel, Wifi, Sun } from 'lucide-react-native';
import { useState } from 'react';

interface TopBarProps {
  activeScreen: string;
}

const screenTitles: Record<string, string> = {
  dashboard: 'Pom Mini',
  'stok-bensin': 'Stok Bensin',
  penjualan: 'Penjualan',
  pengeluaran: 'Pengeluaran',
  riwayat: 'Riwayat',
  laporan: 'Laporan',
  grafik: 'Grafik',
  pengaturan: 'Pengaturan',
  'ai-chat': 'AI Asisten',
};

export default function TopBar({ activeScreen }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(!menuOpen)}>
        <Menu size={24} color="#fff" />
      </TouchableOpacity>
      <View style={styles.center}>
        <Fuel size={20} color="#3b82f6" />
        <Text style={styles.title}>{screenTitles[activeScreen] || 'Pom Mini'}</Text>
      </View>
      <View style={styles.right}>
        <View style={styles.onlineBadge}>
          <Wifi size={14} color="#22c55e" />
          <Text style={styles.onlineText}>Online</Text>
        </View>
        <TouchableOpacity style={styles.themeBtn}>
          <Sun size={20} color="#fbbf24" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#0f172a',
  },
  menuBtn: {
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#14532d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
  },
  themeBtn: {
    padding: 4,
  },
});