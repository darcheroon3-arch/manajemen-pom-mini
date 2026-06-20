import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu } from 'lucide-react-native';

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
  gift: 'Gift',
  pengaturan: 'Pengaturan',
  'ai-chat': 'AI Asisten',
};

export default function TopBar({ activeScreen }: TopBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{screenTitles[activeScreen] || 'Pom Mini'}</Text>
      <TouchableOpacity style={styles.menuButton}>
        <Menu size={24} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  menuButton: {
    padding: 4,
  },
});
