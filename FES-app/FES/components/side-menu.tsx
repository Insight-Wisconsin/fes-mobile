import React from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import { ThemedText } from './themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function SideMenu({ visible, onClose }: SideMenuProps) {
  const { logout, user } = useAuth();
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const slideAnim = React.useRef(new Animated.Value(screenWidth)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      // Show modal first, then animate
      setModalVisible(true);
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        slideAnim.setValue(screenWidth);
        backdropOpacity.setValue(0);
        
        // Animate both slide and backdrop together
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 10);
    } else {
      // Animate closing first, then hide modal
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenWidth,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide modal after animation completes
        setModalVisible(false);
      });
    }
  }, [visible]);

  const handleLogout = async () => {
    await logout();
    onClose();
    router.replace('/(auth)/login' as any);
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdropContainer}
        >
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
              },
            ]}
          />
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.menuContainer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.menuHeader}>
            <ThemedText type="title" style={styles.menuTitle}>Menu</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.menuContent}>
            {/* Profile Section */}
            {user && (
              <View style={styles.profileSection}>
                <View style={styles.profileIcon}>
                  <Ionicons name="person" size={32} color="#007AFF" />
                </View>
                <View style={styles.profileInfo}>
                  <ThemedText style={styles.profileName}>{user.name}</ThemedText>
                  <ThemedText style={styles.profileEmail}>{user.email || user.username}</ThemedText>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {/* Menu Items */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                onClose();
                router.push('/functional/settings' as any);
              }}
            >
              <Ionicons name="settings-outline" size={24} color="#000" />
              <ThemedText style={styles.menuItemText}>Settings</ThemedText>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
              <ThemedText style={[styles.menuItemText, styles.logoutText]}>Log Out</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdropContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    width: 300,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  menuContent: {
    flex: 1,
    paddingTop: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 17,
    color: '#000',
    marginLeft: 12,
  },
  logoutText: {
    color: '#FF3B30',
  },
});

