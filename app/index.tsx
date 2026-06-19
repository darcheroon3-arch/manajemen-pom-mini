import { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import Dashboard from '@/app/main/dashboard';
import StokBensin from '@/app/main/stok-bensin';
import Penjualan from '@/app/main/penjualan';
import Pengeluaran from '@/app/main/pengeluaran';
import Riwayat from '@/app/main/riwayat';
import Laporan from '@/app/main/laporan';
import Grafik from '@/app/main/grafik';
import Pengaturan from '@/app/main/pengaturan';
import AIChat from '@/app/main/ai-chat';

export default function MainLayout() {
  const [activeScreen, setActiveScreen] = useState('dashboard');

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard': return <Dashboard onNavigate={setActiveScreen} />;
      case 'stok-bensin': return <StokBensin />;
      case 'penjualan': return <Penjualan />;
      case 'pengeluaran': return <Pengeluaran />;
      case 'riwayat': return <Riwayat />;
      case 'laporan': return <Laporan />;
      case 'grafik': return <Grafik />;
      case 'pengaturan': return <Pengaturan />;
      case 'ai-chat': return <AIChat />;
      default: return <Dashboard onNavigate={setActiveScreen} />;
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <TopBar activeScreen={activeScreen} />
        <View style={styles.content}>
          {renderScreen()}
        </View>
        <BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
      </View>
    </GestureHandlerRootView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});