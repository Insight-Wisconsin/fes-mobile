import { StyleSheet, View, TouchableOpacity, Image ,ScrollView} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
type DeviceStatusCardProps = {
  title: string;
  isConnected: boolean;
  batteryLevel: number;
};

type ActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
};

type QuickActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  return (
    <ScrollView>
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.title}>FES Device Control</ThemedText>
          {user && (
            <ThemedText style={styles.welcomeText}>Welcome, {user.name}!</ThemedText>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <DeviceStatusCard 
          title="Device Status"
          isConnected={true}
          batteryLevel={85}
        />
        
        <View style={styles.buttonRow}>
          <ActionButton 
            icon="pulse"
            label="Start Session"
            onPress={() => 
              //router.push('/(app)/calibration' as any)
              console.log('Start Session Pressed')
            }
            color="#34C759"
          />
          <ActionButton 
            icon="settings"
            label="Calibrate"
            onPress={() => router.push('/RealTimeData' as any)}
            color="#FF9500"
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.quickActions}>
            <QuickAction 
              icon="speedometer"
              label="Intensity"
              value="50%"
            />
            <QuickAction 
              icon="time"
              label="Duration"
              value="10 min"
            />
            <QuickAction 
              icon="pulse"
              label="Pulse Width"
              value="200μs"
            />
            <QuickAction 
              icon="sync"
              label="Frequency"
              value="50Hz"
            />
          </View>
        </View>
      </View>
    </ThemedView>
    </ScrollView>
  );
}

const DeviceStatusCard = ({ title, isConnected, batteryLevel }: DeviceStatusCardProps) => (
  <View style={styles.statusCard}>
    <ThemedText type="subtitle" style={styles.statusTitle}>{title}</ThemedText>
    <View style={styles.statusRow}>
      <View style={styles.statusItem}>
        <Ionicons 
          name={isConnected ? 'bluetooth' : 'bluetooth-outline'} 
          size={24} 
          color={isConnected ? '#34C759' : '#FF3B30'} 
        />
        <ThemedText style={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </ThemedText>
      </View>
      <View style={styles.statusItem}>
        <Ionicons 
          name="battery-charging" 
          size={24} 
          color={batteryLevel > 20 ? '#34C759' : '#FF9500'} 
        />
        <ThemedText style={styles.statusText}>
          {batteryLevel}%
        </ThemedText>
      </View>
    </View>
  </View>
);

const ActionButton = ({ icon, label, onPress, color }: ActionButtonProps) => (
  <TouchableOpacity 
    style={[styles.actionButton, { backgroundColor: color + '20', borderColor: color }]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={32} color={color} />
    <ThemedText style={[styles.actionButtonText, { color }]}>{label}</ThemedText>
  </TouchableOpacity>
);

const QuickAction = ({ icon, label, value }: QuickActionProps) => (
  <View style={styles.quickAction}>
    <Ionicons name={icon} size={24} color="#007AFF" />
    <ThemedText style={styles.quickActionLabel}>{label}</ThemedText>
    <ThemedText style={styles.quickActionValue}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    marginBottom: 15,
    fontWeight: '600',
    color: '#000000',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#000000',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  quickAction: {
    width: 165, // Two items per row with 15px gap
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  quickActionLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  quickActionValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});
