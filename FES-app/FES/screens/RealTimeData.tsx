import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Gyroscope, DeviceMotion, Accelerometer } from 'expo-sensors';
import { useEffect, useState, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Safe number formatter
const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.000';
  }
  return value.toFixed(3);
};

// Safe object property getter
const getSafeValue = (obj: any, prop: string): number => {
  if (!obj || typeof obj !== 'object' || obj[prop] === undefined || obj[prop] === null) {
    return 0;
  }
  return typeof obj[prop] === 'number' ? obj[prop] : 0;
};

export default function RealTimeData() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Raw sensor data state
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [angleData, setAngleData] = useState({ x: 0, y: 0, z: 0 });
  
  // Data smoothing refs
  const gyroHistory = useRef<Array<{x: number, y: number, z: number}>>([]);
  const accelHistory = useRef<Array<{x: number, y: number, z: number}>>([]);
  const angleHistory = useRef<Array<{x: number, y: number, z: number}>>([]);

  // Data smoothing function
  const smoothSensorData = (newData: {x: number, y: number, z: number}, history: React.MutableRefObject<Array<{x: number, y: number, z: number}>>, maxHistory: number = 5) => {
    // Add new data to history
    history.current.push(newData);
    
    // Keep only recent history
    if (history.current.length > maxHistory) {
      history.current.shift();
    }
    
    // Calculate average
    const avg = history.current.reduce((acc, curr) => ({
      x: acc.x + curr.x,
      y: acc.y + curr.y,
      z: acc.z + curr.z
    }), { x: 0, y: 0, z: 0 });
    
    return {
      x: avg.x / history.current.length,
      y: avg.y / history.current.length,
      z: avg.z / history.current.length
    };
  };

  // Convert accelerometer data to angles (degrees)
  const convertAccelToAngles = (accelData: {x: number, y: number, z: number}) => {
    // Calculate angles from accelerometer data
    const toDegrees = (radians: number) => radians * (180 / Math.PI);
    
    // Calculate pitch (X-axis rotation) - forward/back tilt
    const pitch = Math.atan2(accelData.y, accelData.z);
    
    // Calculate roll (Y-axis rotation) - left/right tilt
    const roll = Math.atan2(-accelData.x, Math.sqrt(accelData.y * accelData.y + accelData.z * accelData.z));
    
    // Calculate yaw (Z-axis rotation) - rotation around vertical axis
    const yaw = Math.atan2(accelData.x, accelData.y);
    
    return {
      x: toDegrees(pitch),
      y: toDegrees(roll),
      z: toDegrees(yaw)
    };
  };

  // Gyroscope listener (for rotation rate only)
  useEffect(() => {
    let gyroSubscription: any = null;
    
    const startGyroscope = async () => {
      try {
        console.log('Starting gyroscope...');
        const isAvailable = await Gyroscope.isAvailableAsync();
        console.log('Gyroscope available:', isAvailable);
        
        if (isAvailable) {
          Gyroscope.setUpdateInterval(50); // Very fast updates
          gyroSubscription = Gyroscope.addListener((data) => {
            if (data && typeof data === 'object') {
              const rawData = {
                x: getSafeValue(data, 'x'),
                y: getSafeValue(data, 'y'),
                z: getSafeValue(data, 'z')
              };
              
              // Apply smoothing
              const smoothedData = smoothSensorData(rawData, gyroHistory, 3);
              setGyroData(smoothedData);
            }
          });
          console.log('Gyroscope listener added');
        } else {
          Alert.alert('Gyroscope Not Available', 'This device does not have a gyroscope or it is not accessible.');
        }
      } catch (error) {
        console.error('Gyroscope error:', error);
        Alert.alert('Gyroscope Error', `Failed to access gyroscope: ${error}`);
      }
    };

    startGyroscope();

    return () => {
      if (gyroSubscription) {
        gyroSubscription.remove();
        console.log('Gyroscope listener removed');
      }
    };
  }, []);

  // Accelerometer listener
  useEffect(() => {
    let accelSubscription: any = null;
    
    const startAccelerometer = async () => {
      try {
        console.log('Starting accelerometer...');
        const isAvailable = await Accelerometer.isAvailableAsync();
        console.log('Accelerometer available:', isAvailable);
        
        if (isAvailable) {
          Accelerometer.setUpdateInterval(50); // Very fast updates
          accelSubscription = Accelerometer.addListener((data) => {
            if (data && typeof data === 'object') {
              const rawData = {
                x: getSafeValue(data, 'x'),
                y: getSafeValue(data, 'y'),
                z: getSafeValue(data, 'z')
              };
              
              // Apply smoothing
              const smoothedData = smoothSensorData(rawData, accelHistory, 3);
              setAccelData(smoothedData);
              
              // Convert accelerometer to angles
              const angleData = convertAccelToAngles(smoothedData);
              const smoothedAngles = smoothSensorData(angleData, angleHistory, 3);
              setAngleData(smoothedAngles);
            }
          });
          console.log('Accelerometer listener added');
        } else {
          Alert.alert('Accelerometer Not Available', 'This device does not have an accelerometer or it is not accessible.');
        }
      } catch (error) {
        console.error('Accelerometer error:', error);
        Alert.alert('Accelerometer Error', `Failed to access accelerometer: ${error}`);
      }
    };

    startAccelerometer();

    return () => {
      if (accelSubscription) {
        accelSubscription.remove();
        console.log('Accelerometer listener removed');
      }
    };
  }, []);

  // Calculate magnitudes
  const gyroMagnitude = Math.sqrt(gyroData.x * gyroData.x + gyroData.y * gyroData.y + gyroData.z * gyroData.z);
  const accelMagnitude = Math.sqrt(accelData.x * accelData.x + accelData.y * accelData.y + accelData.z * accelData.z);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type='title' style={styles.sectionTitle}>Phone Angle (Degrees) - From Accelerometer</ThemedText>
        <View style={styles.dataCard}>
          <View style={styles.dataRow}>
            <ThemedText style={styles.dataLabel}>X-Axis (Forward/Back Tilt): {formatNumber(angleData.x)}°</ThemedText>
            <View style={[styles.indicator, { backgroundColor: Math.abs(angleData.x) > 10 ? '#FF3B30' : '#34C759' }]} />
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={styles.dataLabel}>Y-Axis (Left/Right Tilt): {formatNumber(angleData.y)}°</ThemedText>
            <View style={[styles.indicator, { backgroundColor: Math.abs(angleData.y) > 10 ? '#FF3B30' : '#34C759' }]} />
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={styles.dataLabel}>Z-Axis (Rotation): {formatNumber(angleData.z)}°</ThemedText>
            <View style={[styles.indicator, { backgroundColor: Math.abs(angleData.z) > 10 ? '#FF3B30' : '#34C759' }]} />
          </View>
          <View style={styles.magnitudeContainer}>
            <ThemedText style={styles.magnitudeLabel}>
              Total Tilt: {formatNumber(Math.sqrt(angleData.x * angleData.x + angleData.y * angleData.y))}°
            </ThemedText>
          </View>
        </View>

        <ThemedText type='title' style={styles.sectionTitle}>Accelerometer Data (Movement)</ThemedText>
        <View style={styles.dataCard}>
          <View style={styles.dataRow}>
            <ThemedText style={styles.dataLabel}>X (Forward/Back): {formatNumber(accelData.x)}</ThemedText>
            <View style={[styles.indicator, { backgroundColor: Math.abs(accelData.x) > 0.5 ? '#FF3B30' : '#34C759' }]} />
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={styles.dataLabel}>Y (Up/Down): {formatNumber(accelData.y)}</ThemedText>
            <View style={[styles.indicator, { backgroundColor: Math.abs(accelData.y) > 0.5 ? '#FF3B30' : '#34C759' }]} />
          </View>
          <View style={styles.dataRow}>
            <ThemedText style={styles.dataLabel}>Z (Side/Side): {formatNumber(accelData.z)}</ThemedText>
            <View style={[styles.indicator, { backgroundColor: Math.abs(accelData.z) > 0.5 ? '#FF3B30' : '#34C759' }]} />
          </View>
          <View style={styles.magnitudeContainer}>
            <ThemedText style={styles.magnitudeLabel}>
              Movement Magnitude: {formatNumber(accelMagnitude)}
            </ThemedText>
          </View>
        </View>

        <ThemedText type='title' style={styles.sectionTitle}>Instructions</ThemedText>
        <View style={styles.dataCard}>
          <ThemedText style={styles.dataLabel}>
            • Tilt phone FORWARD/BACK - X-axis should change
          </ThemedText>
          <ThemedText style={styles.dataLabel}>
            • Tilt phone LEFT/RIGHT - Y-axis should change
          </ThemedText>
          <ThemedText style={styles.dataLabel}>
            • Rotate phone clockwise/counterclockwise - Z-axis should change
          </ThemedText>
          <ThemedText style={styles.dataLabel}>
            • 0° = phone perfectly vertical
          </ThemedText>
          <ThemedText style={styles.dataLabel}>
            • 45° = phone tilted 45 degrees
          </ThemedText>
          <ThemedText style={styles.dataLabel}>
            • 90° = phone horizontal
          </ThemedText>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            router.replace('/functional/home');
          }}
        >
          <ThemedText style={styles.homeButtonText}>Back to Home</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 15,
    marginTop: 20,
  },
  dataCard: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  dataLabel: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  magnitudeContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  magnitudeLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  homeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});