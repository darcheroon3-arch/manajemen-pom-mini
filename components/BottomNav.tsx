import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, Clock, BarChart3, Settings } from 'lucide-react-native';

interface BottomNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'riwayat', label: 'Riwayat', icon: Clock },
  { id: 'grafik', label: 'Grafik', icon: BarChart3 },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeScreen === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => onNavigate(item.id)}
          >
            <Icon size={22} color={isActive ? '#3b82f6' : '#64748b'} />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});