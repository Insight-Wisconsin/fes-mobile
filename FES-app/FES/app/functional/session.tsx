import { StyleSheet, View, TouchableOpacity, Alert, Animated, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { Gyroscope } from 'expo-sensors';
import { calibrationService } from '../../services/backend/calibration';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

export default function SessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [calibrationAngle, setCalibrationAngle] = useState(0);
  const [impulseCount, setImpulseCount] = useState(0);
  const [isImpulsing, setIsImpulsing] = useState(false);
  
  // Animation for screen flash
  const flashAnim = useRef(new Animated.Value(0)).current;
  const screenFlashOpacity = useRef(new Animated.Value(0)).current;
  
  // Data smoothing refs
  const angleHistory = useRef<number[]>([]);
  const lastImpulseTime = useRef<number>(0);
  const IMPULSE_COOLDOWN = 500; // Minimum 500ms between impulses
  const soundRef = useRef<Audio.Sound | null>(null);
  const previousAngle = useRef<number | null>(null);
  const hasTriggeredForDrop = useRef<boolean>(false);
  
  // Gyroscope tracking for yaw angle
  const integratedYaw = useRef<number>(0);
  const lastGyroTimestamp = useRef<number | null>(null);

  // Initialize audio on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch (error) {
        console.error('Failed to set audio mode:', error);
      }
    };
    setupAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Get calibration angle on mount (already absolute from calibration service)
  useEffect(() => {
    const avgAngle = calibrationService.getAverageCalibrationAngle();
    if (avgAngle === 0) {
      Alert.alert(
        'No Calibration Found',
        'Please calibrate your device before starting a session.',
        [
          {
            text: 'Go to Calibration',
            onPress: () => router.push('/functional/calibration' as any),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      setCalibrationAngle(Math.abs(avgAngle)); // Ensure absolute value
    }
  }, []);

  // Smooth angle data (using absolute values)
  const smoothAngle = (newAngle: number): number => {
    const absAngle = Math.abs(newAngle); // Use absolute value
    angleHistory.current.push(absAngle);
    if (angleHistory.current.length > 5) {
      angleHistory.current.shift();
    }
    const avg = angleHistory.current.reduce((a, b) => a + b, 0) / angleHistory.current.length;
    return avg;
  };

  // Play beep sound
  const playBeepSound = async () => {
    try {
      // Try Web Audio API for web platforms
      if (typeof window !== 'undefined' && (window as any).AudioContext) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // 800 Hz beep
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        return;
      }

      // For native platforms, generate a simple beep using expo-av
      // Create a WAV file data URI with a beep tone
      try {
        const sampleRate = 44100;
        const duration = 0.1; // 100ms
        const frequency = 800; // 800 Hz
        const numSamples = Math.floor(sampleRate * duration);
        
        // Create WAV file bytes
        const wavBytes = new Uint8Array(44 + numSamples * 2);
        
        // WAV header
        const writeString = (offset: number, str: string) => {
          for (let i = 0; i < str.length; i++) {
            wavBytes[offset + i] = str.charCodeAt(i);
          }
        };
        
        writeString(0, 'RIFF');
        new DataView(wavBytes.buffer).setUint32(4, 36 + numSamples * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        new DataView(wavBytes.buffer).setUint32(16, 16, true);
        new DataView(wavBytes.buffer).setUint16(20, 1, true);
        new DataView(wavBytes.buffer).setUint16(22, 1, true);
        new DataView(wavBytes.buffer).setUint32(24, sampleRate, true);
        new DataView(wavBytes.buffer).setUint32(28, sampleRate * 2, true);
        new DataView(wavBytes.buffer).setUint16(32, 2, true);
        new DataView(wavBytes.buffer).setUint16(34, 16, true);
        writeString(36, 'data');
        new DataView(wavBytes.buffer).setUint32(40, numSamples * 2, true);
        
        // Generate sine wave samples
        const view = new DataView(wavBytes.buffer);
        for (let i = 0; i < numSamples; i++) {
          const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
          const intSample = Math.max(-1, Math.min(1, sample)) * 0.3; // Volume
          view.setInt16(44 + i * 2, intSample * 0x7FFF, true);
        }
        
        // Convert to base64 - use btoa for web, skip for native if not available
        let base64: string;
        if (typeof btoa !== 'undefined') {
          let binary = '';
          for (let i = 0; i < wavBytes.length; i++) {
            binary += String.fromCharCode(wavBytes[i]);
          }
          base64 = btoa(binary);
          const dataUri = `data:audio/wav;base64,${base64}`;
          
          // Play using expo-av
          if (soundRef.current) {
            try {
              await soundRef.current.unloadAsync();
            } catch (e) {
              // Ignore unload errors
            }
          }
          
          const { sound } = await Audio.Sound.createAsync(
            { uri: dataUri },
            { shouldPlay: true, volume: 0.7 }
          );
          soundRef.current = sound;
          
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          });
        } else {
          // For native platforms without btoa, use a simpler approach
          // Try to use expo-av's notification sound or just skip audio
          // Haptics will still provide feedback
          console.log('Audio encoding not available on this platform, using haptics only');
        }
      } catch (nativeError) {
        // If audio generation fails, that's okay - haptics will still work
        console.log('Audio generation failed:', nativeError);
      }
    } catch (error) {
      console.log('Sound playback error:', error);
    }
  };

  // Trigger impulse (screen flash + sound + haptic)
  const triggerImpulse = async () => {
    const now = Date.now();
    if (now - lastImpulseTime.current < IMPULSE_COOLDOWN) {
      return; // Cooldown period
    }
    lastImpulseTime.current = now;
    
    setIsImpulsing(true);
    setImpulseCount(prev => prev + 1);

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Play beep sound
    playBeepSound();

    // Screen flash animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(screenFlashOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(screenFlashOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Reset impulse state after animation
    setTimeout(() => {
      setIsImpulsing(false);
    }, 300);
  };

  // Check if angle matches calibration angle (foot drop detected)
  // Only trigger when foot is dropping (absolute angle increasing toward calibration), not when returning
  // Note: Both angles are absolute values, so "dropping" means absolute angle is increasing
  const checkFootDrop = (angle: number) => {
    if (calibrationAngle === 0) return;
    
    // Ensure angle is absolute (should already be from smoothAngle, but double-check)
    const absAngle = Math.abs(angle);
    
    // Use a threshold of ±2 degrees for detection
    const threshold = 2;
    const angleDiff = Math.abs(absAngle - calibrationAngle);
    const isWithinThreshold = angleDiff <= threshold;
    
    // Check if we have a previous angle to compare
    if (previousAngle.current !== null) {
      // Both angles are absolute, so "dropping" means absolute angle is increasing toward calibration
      const angleChange = absAngle - previousAngle.current;
      
      // Only trigger if:
      // 1. We're within threshold of calibration angle
      // 2. The absolute angle is increasing (positive change = foot dropping toward stuck position)
      // 3. We haven't already triggered for this drop cycle
      // 4. The current angle is at or above the calibration angle (foot has dropped to stuck position)
      
      const isDropping = angleChange > 0; // Positive change = increasing absolute angle = dropping
      const isAtOrAboveTarget = absAngle >= calibrationAngle - threshold;
      const wasBelowTarget = previousAngle.current < calibrationAngle - threshold;
      
      // Reset trigger flag if foot has returned below threshold
      if (previousAngle.current < calibrationAngle - threshold * 2) {
        hasTriggeredForDrop.current = false;
      }
      
      // Trigger only when:
      // - Foot is dropping (absolute angle increasing toward calibration)
      // - We're within threshold
      // - We haven't triggered for this drop yet
      // - Foot was below target and is now at/above target
      if (isWithinThreshold && isDropping && !hasTriggeredForDrop.current && wasBelowTarget && isAtOrAboveTarget) {
        triggerImpulse();
        hasTriggeredForDrop.current = true;
      }
    } else {
      // First reading - just check if within threshold and at/above target
      if (isWithinThreshold && absAngle >= calibrationAngle - threshold) {
        triggerImpulse();
        hasTriggeredForDrop.current = true;
      }
    }
    
    // Update previous angle (store absolute value)
    previousAngle.current = absAngle;
  };

  // Gyroscope listener for monitoring yaw angle during session
  useEffect(() => {
    if (!isSessionActive || calibrationAngle === 0) return;

    let gyroSubscription: any = null;

    const startMonitoring = async () => {
      try {
        const isAvailable = await Gyroscope.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Gyroscope Not Available', 'Cannot start session without gyroscope.');
          setIsSessionActive(false);
          return;
        }

        // Reset integration when starting
        integratedYaw.current = 0;
        lastGyroTimestamp.current = null;

        Gyroscope.setUpdateInterval(20); // 50 Hz sampling (same as calibration)
        gyroSubscription = Gyroscope.addListener((data) => {
          if (data && typeof data === 'object') {
            const now = Date.now();

            if (lastGyroTimestamp.current !== null) {
              const dt = (now - lastGyroTimestamp.current) / 1000; // seconds
              const yawRate = data.z || 0; // rad/s

              // Integrate yaw angle
              integratedYaw.current += yawRate * dt * (180 / Math.PI);
            }

            lastGyroTimestamp.current = now;

            // Get absolute yaw angle (we don't care about direction)
            const rawAngle = Math.abs(integratedYaw.current);
            const smoothedAngle = smoothAngle(rawAngle);
            setCurrentAngle(smoothedAngle);

            // Check for foot drop (angle is already absolute)
            checkFootDrop(smoothedAngle);
          }
        });
      } catch (error) {
        console.error('Gyroscope error:', error);
        Alert.alert('Error', 'Failed to start monitoring. Please try again.');
        setIsSessionActive(false);
      }
    };

    startMonitoring();

    return () => {
      if (gyroSubscription) {
        gyroSubscription.remove();
      }
      // Reset integration when stopping
      integratedYaw.current = 0;
      lastGyroTimestamp.current = null;
    };
  }, [isSessionActive, calibrationAngle]);

  const handleStartSession = () => {
    if (calibrationAngle === 0) {
      Alert.alert(
        'No Calibration',
        'Please calibrate your device first.',
        [{ text: 'OK' }]
      );
      return;
    }
    setIsSessionActive(true);
    setImpulseCount(0);
    previousAngle.current = null; // Reset previous angle tracking
    hasTriggeredForDrop.current = false; // Reset trigger flag
    // Reset gyroscope integration
    integratedYaw.current = 0;
    lastGyroTimestamp.current = null;
  };

  const handleStopSession = () => {
    setIsSessionActive(false);
    setCurrentAngle(0);
    previousAngle.current = null;
    hasTriggeredForDrop.current = false;
    // Reset gyroscope integration
    integratedYaw.current = 0;
    lastGyroTimestamp.current = null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#FFFFFF' }]}>
      {/* Screen flash overlay */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: screenFlashOpacity,
            backgroundColor: flashAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.9)'],
            }),
          },
        ]}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title} numberOfLines={1}>Session</ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isSessionActive ? '#34C759' : '#8E8E93' },
                ]}
              />
              <ThemedText style={styles.statusText}>
                {isSessionActive ? 'Monitoring Active' : 'Ready to Start'}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.statusSubtext}>
            {isSessionActive 
              ? 'Device is monitoring for foot drop events'
              : 'Press start to begin monitoring your foot movement'}
          </ThemedText>
        </View>

        {/* Impulse Counter */}
        {isSessionActive && (
          <View style={styles.impulseCard}>
            <View style={styles.impulseHeader}>
              <Ionicons
                name="flash"
                size={28}
                color={isImpulsing ? '#FF3B30' : '#8E8E93'}
              />
              <ThemedText style={styles.impulseTitle}>Impulses Delivered</ThemedText>
            </View>
            <View style={styles.impulseCountContainer}>
              <ThemedText style={styles.impulseCount}>{impulseCount}</ThemedText>
            </View>
            {isImpulsing && (
              <View style={styles.impulseActiveBadge}>
                <ThemedText style={styles.impulseActiveText}>Active</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.buttonContainer}>
          {!isSessionActive ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartSession}
              activeOpacity={0.7}
            >
              <Ionicons name="play-circle" size={28} color="#fff" style={styles.buttonIcon} />
              <ThemedText style={styles.primaryButtonText}>Start Session</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopSession}
              activeOpacity={0.7}
            >
              <Ionicons name="stop-circle" size={28} color="#fff" style={styles.buttonIcon} />
              <ThemedText style={styles.primaryButtonText}>Stop Session</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionHeader}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <ThemedText style={styles.instructionTitle}>How It Works</ThemedText>
          </View>
          <ThemedText style={styles.instructionText}>
            {isSessionActive
              ? 'Walk normally. The device will automatically detect foot drop and send an electrical impulse to help lift your foot.'
              : 'When you start the session, the device will monitor your foot movement. If foot drop is detected, it will automatically send an electrical impulse to assist with lifting your foot.'}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
    marginLeft: -8,
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
    lineHeight: 34,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.4,
  },
  statusSubtext: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 22,
  },
  impulseCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    minHeight: 200,
  },
  impulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  impulseTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  impulseCountContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 80,
  },
  impulseCount: {
    fontSize: 64,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: -2,
    lineHeight: 72,
    textAlign: 'center',
  },
  impulseActiveBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 8,
  },
  impulseActiveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#34C759',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  buttonIcon: {
    marginRight: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  instructionCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  instructionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.4,
  },
  instructionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000',
  },
});

