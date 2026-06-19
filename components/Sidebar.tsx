import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import { Menu, X, LayoutDashboard, Fuel, ShoppingCart, Receipt, History, FileText, BarChart3, Settings, Sparkles } from 'lucide-react-native';

interface SidebarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stok-bensin', label: 'Stok Bensin', icon: Fuel },
  { id: 'penjualan', label: 'Penjualan', icon: ShoppingCart },
  { id: 'pengeluaran', label: 'Pengeluaran', icon: Receipt },
  { id: 'riwayat', label: 'Riwayat', icon: History },
  { id: 'laporan', label: 'Laporan', icon: FileText },
  { id: 'grafik', label: 'Grafik', icon: BarChart3 },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  { id: 'ai-chat', label: 'AI Asisten', icon: Sparkles },
];

export default function Sidebar({ activeScreen, onNavigate, isOpen, onToggle }: SidebarProps) {
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -280,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.hamburger} onPress={onToggle}>
          <Menu size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pom Mini</Text>
        <View style={styles.headerRight} />
      </View>

      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents={isOpen ? 'auto' : 'none'}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onToggle} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Menu</Text>
          <TouchableOpacity onPress={onToggle} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => {
                  onNavigate(item.id);
                  onToggle();
                }}
              >
                <View style={styles.menuIcon}>
                  <Icon size={22} color={isActive ? '#fff' : '#94a3b8'} />
                </View>
                <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  hamburger: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  headerRight: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#1e293b',
    zIndex: 300,
    paddingTop: 16,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  menuContainer: {
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: '#3b82f6',
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
  },
  menuText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  menuTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
