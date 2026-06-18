import { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/app/main/dashboard';
import StokBensin from '@/app/main/stok-bensin';
import Penjualan from '@/app/main/penjualan';
import Pengeluaran from '@/app/main/pengeluaran';
import Riwayat from '@/app/main/riwayat';
import Laporan from '@/app/main/laporan';
import Grafik from '@/app/main/grafik';
import Pengaturan from '@/app/main/pengaturan';

export default function MainLayout() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard': return <Dashboard />;
      case 'stok-bensin': return <StokBensin />;
      case 'penjualan': return <Penjualan />;
      case 'pengeluaran': return <Pengeluaran />;
      case 'riwayat': return <Riwayat />;
      case 'laporan': return <Laporan />;
      case 'grafik': return <Grafik />;
      case 'pengaturan': return <Pengaturan />;
      default: return <Dashboard />;
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <Sidebar
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <View style={styles.content}>
          {renderScreen()}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
