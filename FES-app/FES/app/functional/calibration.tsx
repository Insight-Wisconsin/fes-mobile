import { StyleSheet, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

export default function CalibrationScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isCalibrating) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setCurrentStep(2);
            setIsCalibrating(false);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    }
    
    return () => clearInterval(interval);
  }, [isCalibrating]);

  const handleStartCalibration = () => {
    setProgress(0);
    setIsCalibrating(true);
  };

  const handleComplete = () => {
    // Navigate back to home after calibration
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Device Calibration</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <ThemedText style={styles.stepNumber}>1</ThemedText>
              </View>
              <View style={styles.stepLine} />
              <View style={[styles.stepCircle, currentStep > 1 && styles.stepActive]}>
                <ThemedText style={styles.stepNumber}>2</ThemedText>
              </View>
            </View>

            <ThemedText type="subtitle" style={styles.stepTitle}>Prepare for Calibration</ThemedText>
            <ThemedText style={styles.stepDescription}>
              Please make sure the device is properly attached and you're in a comfortable position.
            </ThemedText>

            <View style={styles.instructionCard}>
              <Ionicons name="alert-circle" size={24} color="#FF9500" style={styles.instructionIcon} />
              <ThemedText style={styles.instructionText}>
                Ensure the electrodes are properly placed on your skin and the device is turned on.
              </ThemedText>
            </View>

            {isCalibrating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <ThemedText style={styles.loadingText}>
                  Calibrating... {progress}%
                </ThemedText>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.primaryButton, isCalibrating && styles.buttonDisabled]}
                onPress={handleStartCalibration}
                disabled={isCalibrating}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isCalibrating ? 'Calibrating...' : 'Start Calibration'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepCircle, styles.stepComplete]}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </View>
              <View style={[styles.stepLine, styles.stepComplete]} />
              <View style={[styles.stepCircle, styles.stepActive]}>
                <ThemedText style={styles.stepNumber}>2</ThemedText>
              </View>
            </View>

            <ThemedText type="subtitle" style={styles.stepTitle}>Calibration Complete</ThemedText>
            <ThemedText style={styles.stepDescription}>
              Your device has been successfully calibrated and is ready to use.
            </ThemedText>

            <View style={styles.successContainer}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={48} color="#34C759" />
              </View>
              <ThemedText style={styles.successText}>Calibration Successful!</ThemedText>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleComplete}
            >
              <ThemedText style={styles.primaryButtonText}>Start Session</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  stepComplete: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 10,
  },
  stepNumber: {
    color: '#8E8E93',
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    width: '100%',
  },
  instructionIcon: {
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  progressBar: {
    height: 10,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
});
