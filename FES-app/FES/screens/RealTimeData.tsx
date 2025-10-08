import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Gyroscope, DeviceMotion } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function RealTimeData() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [data, setData] = useState({ x: 0, y: 0, z: 0 });
    const [motionData, setMotionData] = useState({});

  useEffect(() => {
    const subscription = Gyroscope.addListener(setData);
    Gyroscope.setUpdateInterval(100); // update every 100ms
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    // Subscribe to device motion updates
    const subscription = DeviceMotion.addListener((data) => {
      setMotionData(data);
    });
     DeviceMotion.setUpdateInterval(100); // every 100ms

    return () => subscription.remove();
  }, []);
    const { acceleration, accelerationIncludingGravity, rotation, rotationRate, orientation } = motionData;
    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText type='title' style={styles.sectionTitle}>Gyroscope Data</ThemedText>
            <View style={styles.dataCard}>
              <ThemedText style={styles.dataLabel}>X: {data.x.toFixed(2)}</ThemedText>
              <ThemedText style={styles.dataLabel}>Y: {data.y.toFixed(2)}</ThemedText>
              <ThemedText style={styles.dataLabel}>Z: {data.z.toFixed(2)}</ThemedText>
            </View>

            <ThemedText type='title' style={styles.sectionTitle}>Device Motion Data</ThemedText>
            <View style={styles.dataCard}>
              <ThemedText style={styles.dataLabel}>Orientation: {orientation || 'N/A'}</ThemedText>

              <ThemedText style={styles.dataLabel}>
                Acceleration (no gravity):{" "}
                {acceleration ? `${acceleration.x.toFixed(2)}, ${acceleration.y.toFixed(2)}, ${acceleration.z.toFixed(2)}` : "N/A"}
              </ThemedText>

              <ThemedText style={styles.dataLabel}>
                Acceleration (with gravity):{" "}
                {accelerationIncludingGravity ? `${accelerationIncludingGravity.x.toFixed(2)}, ${accelerationIncludingGravity.y.toFixed(2)}, ${accelerationIncludingGravity.z.toFixed(2)}` : "N/A"}
              </ThemedText>

              <ThemedText style={styles.dataLabel}>
                Rotation (quaternion):{" "}
                {rotation ? `${rotation.alpha.toFixed(2)}, ${rotation.beta.toFixed(2)}, ${rotation.gamma.toFixed(2)}` : "N/A"}
              </ThemedText>

              <ThemedText style={styles.dataLabel}>
                Rotation rate:{" "}
                {rotationRate ? `${rotationRate.alpha.toFixed(2)}, ${rotationRate.beta.toFixed(2)}, ${rotationRate.gamma.toFixed(2)}` : "N/A"}
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
  },
  dataLabel: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
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
