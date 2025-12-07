import { StyleSheet, View, TouchableOpacity, ScrollView, Animated, PanResponder, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SideMenu } from '@/components/side-menu';
import { useState, useEffect, useRef } from 'react';

type IntensityDialProps = {
  value: number; // 1-10
  onValueChange: (value: number) => void;
};

type SessionsCardProps = {
  view: 'day' | 'month' | 'year';
  onViewChange: (view: 'day' | 'month' | 'year') => void;
};

const AnimatedIcon = ({ menuVisible }: { menuVisible: boolean }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(1)).current;
  const closeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animation immediately - no delay
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(rotation, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(closeOpacity, {
          toValue: 1,
          duration: 150,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(rotation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(closeOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 150,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuVisible]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [{ rotate: rotateInterpolate }],
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          opacity: menuOpacity,
        }}
      >
        <Ionicons name="menu" size={28} color="#000" />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          opacity: closeOpacity,
        }}
      >
        <Ionicons name="close" size={28} color="#000" />
      </Animated.View>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const [intensity, setIntensity] = useState(5); // 1-10 scale
  const [sessionView, setSessionView] = useState<'day' | 'month' | 'year'>('day');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <TouchableOpacity 
          onPress={() => setMenuVisible(true)} 
          style={styles.menuButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AnimatedIcon menuVisible={menuVisible} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainActions}>
          <TouchableOpacity 
            style={styles.primaryActionButton}
            onPress={() => router.push('/functional/session' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="play-circle" size={32} color="#34C759" />
              </View>
              <View style={styles.actionTextContainer}>
                <ThemedText style={styles.actionTitle}>Start Session</ThemedText>
                <ThemedText style={styles.actionSubtitle}>Begin monitoring for foot drop</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.primaryActionButton}
            onPress={() => router.push('/functional/calibration' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="settings" size={32} color="#FF9500" />
              </View>
              <View style={styles.actionTextContainer}>
                <ThemedText style={styles.actionTitle}>Calibrate Device</ThemedText>
                <ThemedText style={styles.actionSubtitle}>Set up your device</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Intensity</ThemedText>
          <IntensityDial value={intensity} onValueChange={setIntensity} />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Sessions</ThemedText>
          <SessionsCard view={sessionView} onViewChange={setSessionView} />
        </View>
      </ScrollView>

      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const SessionsCard = ({ view, onViewChange }: SessionsCardProps) => {
  // Simple mock data for proof of concept
  const getMockData = () => {
    if (view === 'day') {
      // Last 7 days
      return [
        { label: 'Mon', value: 3, displayLabel: 'Mon' },
        { label: 'Tue', value: 5, displayLabel: 'Tue' },
        { label: 'Wed', value: 4, displayLabel: 'Wed' },
        { label: 'Thu', value: 6, displayLabel: 'Thu' },
        { label: 'Fri', value: 5, displayLabel: 'Fri' },
        { label: 'Sat', value: 2, displayLabel: 'Sat' },
        { label: 'Sun', value: 3, displayLabel: 'Sun' },
      ];
    } else if (view === 'month') {
      // Last 4 weeks
      return [
        { label: 'W1', value: 15, displayLabel: 'W1' },
        { label: 'W2', value: 22, displayLabel: 'W2' },
        { label: 'W3', value: 18, displayLabel: 'W3' },
        { label: 'W4', value: 25, displayLabel: 'W4' },
      ];
    } else {
      // Last 12 months
      const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      const values = [45, 52, 58, 63, 71, 68, 75, 82, 78, 85, 90, 88];
      return months.map((month, i) => ({
        label: month,
        value: values[i],
        displayLabel: month,
      }));
    }
  };

  const data = getMockData();
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const totalSessions = Math.floor(data.reduce((sum, d) => sum + d.value, 0));

  return (
    <View style={styles.sessionsCard}>
      {/* Header with view selector */}
      <View style={styles.sessionsHeader}>
        <View style={styles.viewSelector}>
          <TouchableOpacity
            style={[styles.viewTab, view === 'day' && styles.viewTabActive]}
            onPress={() => onViewChange('day')}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.viewTabText, view === 'day' && styles.viewTabTextActive]}>
              Day
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewTab, view === 'month' && styles.viewTabActive]}
            onPress={() => onViewChange('month')}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.viewTabText, view === 'month' && styles.viewTabTextActive]}>
              Month
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewTab, view === 'year' && styles.viewTabActive]}
            onPress={() => onViewChange('year')}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.viewTabText, view === 'year' && styles.viewTabTextActive]}>
              Year
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{totalSessions}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Sessions</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{avgValue.toFixed(0)}</ThemedText>
          <ThemedText style={styles.statLabel}>Avg per {view === 'day' ? 'Day' : view === 'month' ? 'Week' : 'Month'}</ThemedText>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <View style={[styles.chart, { gap: view === 'day' ? 2 : view === 'month' ? 2 : 8 }]}>
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * 120 : 0;
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: item.value > avgValue ? '#007AFF' : '#C7C7CC',
                      },
                    ]}
                  />
                </View>
                {item.displayLabel && (
                  <ThemedText style={styles.barLabel}>{item.displayLabel}</ThemedText>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const IntensityDial = ({ value, onValueChange }: IntensityDialProps) => {
  const dialSize = 300;
  const arcThickness = 16;
  const radius = dialSize / 2 - arcThickness / 2 - 10;
  const centerX = dialSize / 2;
  const centerY = dialSize / 2;
  const numNotches = 10;
  
  // Arc from -180 to 0 degrees (top half of circle, left to right)
  const startAngle = -180; // Left
  const endAngle = 0; // Right
  const totalAngle = 180;
  
  // Convert value (1-10) to angle
  const normalizedValue = (value - 1) / 9; // 0 to 1
  const angle = useRef(new Animated.Value(normalizedValue * totalAngle + startAngle)).current;
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) {
      const targetAngle = normalizedValue * totalAngle + startAngle;
      Animated.spring(angle, {
        toValue: targetAngle,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [value, normalizedValue]);

  const handleTouch = (nativeEvent: any, gestureState?: any) => {
    const { locationX, locationY, pageX, pageY } = nativeEvent;
    
    // Get the container's position relative to screen
    const containerX = locationX;
    const containerY = locationY;
    
    const x = containerX - centerX;
    const y = containerY - centerY;
    const distance = Math.sqrt(x * x + y * y);
    
    // Expanded touch area for better responsiveness - allow touches anywhere near the arc
    const touchTolerance = 100;
    
    // Accept touches in a wider area around the semicircle
    if (distance < radius + touchTolerance && distance > radius - touchTolerance) {
      let touchAngle = Math.atan2(y, x) * (180 / Math.PI);
      
      // Normalize to our range (-180 to 0) for top semicircle
      if (touchAngle > 0) touchAngle -= 360;
      
      // Accept touches in the top half (y <= centerY or angle in range)
      if (touchAngle >= startAngle && touchAngle <= endAngle) {
        touchAngle = Math.max(startAngle, Math.min(endAngle, touchAngle));
        
        // Snap to nearest notch (1-10)
        const notchIndex = Math.round(((touchAngle - startAngle) / totalAngle) * (numNotches - 1));
        const newValue = Math.max(1, Math.min(10, notchIndex + 1));
        
        const snappedAngle = startAngle + ((newValue - 1) / (numNotches - 1)) * totalAngle;
        angle.setValue(snappedAngle);
        onValueChange(newValue);
        return true;
      }
    }
    return false;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Check if touch is in the dial area
        const { locationX, locationY } = evt.nativeEvent;
        const x = locationX - centerX;
        const y = locationY - centerY;
        const distance = Math.sqrt(x * x + y * y);
        return distance < radius + 100;
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        handleTouch(evt.nativeEvent);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isDragging.current) {
          // Use the current touch location
          const { locationX, locationY } = evt.nativeEvent;
          handleTouch({ ...evt.nativeEvent, locationX, locationY });
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  // Calculate indicator position directly from the current value for accurate positioning
  const getIndicatorPosition = () => {
    const currentAngle = (startAngle + ((value - 1) / (numNotches - 1)) * totalAngle) * (Math.PI / 180);
    const indicatorRadius = radius;
    const x = centerX + indicatorRadius * Math.cos(currentAngle);
    const y = centerY + indicatorRadius * Math.sin(currentAngle);
    return { x, y };
  };

  const indicatorPos = getIndicatorPosition();
  
  // Calculate progress as a fraction from 0 to 1
  const progress = (value - 1) / (numNotches - 1);
  
  // Color gradient from green (1) → yellow (5-6) → red (10)
  const getColor = (intensity: number) => {
    // intensity is 0-1 (normalized from 1-10)
    if (intensity < 0.5) {
      // Green to Yellow (first half: 1-5)
      const ratio = intensity * 2; // 0 to 1
      const r = Math.round(52 + ratio * 203); // 52 (green) to 255 (yellow)
      const g = Math.round(199); // Keep green constant at 199
      const b = Math.round(60 - ratio * 60); // 60 to 0
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to Red (second half: 6-10)
      const ratio = (intensity - 0.5) * 2; // 0 to 1
      const r = Math.round(255); // Keep red at max
      const g = Math.round(199 - ratio * 199); // 199 (yellow) to 0 (red)
      const b = Math.round(0); // Keep blue at 0
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const currentColor = getColor(progress);

  // Generate notch positions evenly spaced from -180 to 0 degrees
  // This gives us a perfect semicircle with value 5 very close to center
  const notches = Array.from({ length: numNotches }, (_, i) => {
    const notchAngle = startAngle + (i / (numNotches - 1)) * totalAngle;
    const rad = notchAngle * (Math.PI / 180);
    const x = centerX + radius * Math.cos(rad);
    const y = centerY + radius * Math.sin(rad);
    return { x, y, angle: notchAngle, value: i + 1 };
  });
  
  // Calculate active arc end angle
  const activeEndAngle = startAngle + progress * totalAngle;

  return (
    <View style={styles.intensityContainer}>
      {/* Semicircle Dial */}
      <View style={[styles.dialWrapper, { width: dialSize, height: dialSize / 2 + 60 }]} {...panResponder.panHandlers}>
        <View style={styles.dialSvgContainer}>
          {/* Background semicircle track (thick gray arc) */}
          <View style={[styles.arcBackground, {
            width: dialSize,
            height: dialSize / 2,
            borderTopLeftRadius: dialSize / 2,
            borderTopRightRadius: dialSize / 2,
            borderWidth: arcThickness,
            borderColor: '#E5E5EA',
            borderBottomWidth: 0,
            borderLeftWidth: arcThickness,
            borderRightWidth: arcThickness,
            borderTopWidth: arcThickness,
          }]} />
          
          {/* Active colored arc - using clip rect approach */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: dialSize * progress,
            height: dialSize / 2,
            overflow: 'hidden',
          }}>
            <View style={{
              width: dialSize,
              height: dialSize / 2,
              borderTopLeftRadius: dialSize / 2,
              borderTopRightRadius: dialSize / 2,
              borderWidth: arcThickness,
              borderColor: currentColor,
              borderBottomWidth: 0,
              borderLeftWidth: arcThickness,
              borderRightWidth: arcThickness,
              borderTopWidth: arcThickness,
              position: 'absolute',
              top: 0,
              left: 0,
            }} />
          </View>
          
          {/* Notches - clickable */}
          {notches.map((notch, index) => {
            const isActive = index < value;
            const notchColor = isActive ? currentColor : '#E5E5EA';
            
            return (
              <TouchableOpacity
                key={`notch-${index}`}
                activeOpacity={0.7}
                onPress={() => onValueChange(index + 1)}
                style={[
                  styles.notch,
                  {
                    left: notch.x - 6,
                    top: notch.y - 6,
                    backgroundColor: notchColor,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    borderWidth: 3,
                    borderColor: '#FFFFFF',
                    zIndex: 10,
                  },
                ]}
              />
            );
          })}
          
          {/* Indicator dot */}
          <Animated.View
            style={[
              styles.dialIndicator,
              {
                left: indicatorPos.x - 14,
                top: indicatorPos.y - 14,
                backgroundColor: currentColor,
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 4,
                borderColor: '#FFFFFF',
                zIndex: 20,
                shadowColor: currentColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 5,
              },
            ]}
          />
          
          {/* Value Display Inside Semicircle - positioned above everything */}
          <View style={styles.intensityValueContainer} pointerEvents="none">
            <ThemedText style={[styles.intensityValue, { color: currentColor }]}>
              {value}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
  },
  menuButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  mainActions: {
    marginBottom: 32,
    gap: 12,
  },
  primaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  actionSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  intensityContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  dialWrapper: {
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflow: 'visible',
  },
  dialSvgContainer: {
    position: 'relative',
    width: 300,
    height: 210,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  arcBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
  },
  arcSegment: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  notch: {
    position: 'absolute',
  },
  dialIndicator: {
    position: 'absolute',
  },
  intensityValueContainer: {
    position: 'absolute',
    top: 40,
    left: 110,
    width: 80,
    height: 100,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'transparent',
    paddingTop: 10,
  },
  intensityValue: {
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: -3,
    textAlign: 'center',
    lineHeight: 80,
    includeFontPadding: false,
  },
  sessionsCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  sessionsHeader: {
    marginBottom: 20,
  },
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    padding: 2,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewTabActive: {
    backgroundColor: '#FFFFFF',
  },
  viewTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  viewTabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -1,
    marginBottom: 4,
    lineHeight: 34,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  chartContainer: {
    paddingTop: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '500',
  },
});
