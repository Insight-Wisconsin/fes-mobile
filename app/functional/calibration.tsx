import { StyleSheet, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { calibrationService, CalibrationProgress, CalibrationResult } from '../../services/backend/calibration';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CalibrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState<CalibrationProgress>({
    currentStep: 0,
    totalSteps: 5,
    isValidating: false,
    validationMessage: ''
  });
  const [calibrationResults, setCalibrationResults] = useState<CalibrationResult[]>([]);
  const [calibrationComplete, setCalibrationComplete] = useState(false);

  const handleStartCalibration = async () => {
    try {
      setIsCalibrating(true);
      setCalibrationComplete(false);
      setCalibrationResults([]);
      
      await calibrationService.startCalibration(
        (progress) => {
          setCalibrationProgress(progress);
          setProgress((progress.currentStep / progress.totalSteps) * 100);
        },
        (results) => {
          setCalibrationResults(results);
          setCalibrationComplete(true);
          setIsCalibrating(false);
          setCurrentStep(2);
          
          Alert.alert(
            'Calibration Complete',
            `Calibration successful! All 5 foot angles captured.`,
            [{ text: 'OK' }]
          );
        }
      );
    } catch (error) {
      console.error('Calibration failed:', error);
      Alert.alert(
        'Calibration Failed',
        'An error occurred during calibration. Please try again.',
        [{ text: 'OK' }]
      );
      setIsCalibrating(false);
    }
  };


  const handleComplete = () => {
    // Navigate back to home after calibration
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#FFFFFF' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title} numberOfLines={1}>Calibration</ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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

            <ThemedText type="subtitle" style={styles.stepTitle}>Foot Drop Calibration</ThemedText>
            <ThemedText style={styles.stepDescription}>
              We'll capture the angle when your foot gets "stuck" during walking to detect future foot drop episodes.
            </ThemedText>

            <View style={styles.instructionCard}>
              <View style={styles.instructionHeader}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <ThemedText style={styles.instructionTitle}>How It Works</ThemedText>
              </View>
              <ThemedText style={styles.instructionText}>
                For each step: (1) Return your foot to the starting position, (2) Walk and let your foot drop, (3) Hold it at the stuck position. The app will automatically detect and capture the angle. We'll do this 5 times.
              </ThemedText>
            </View>

            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <Ionicons name="phone-portrait-outline" size={20} color="#FF9500" />
                <ThemedText style={styles.warningTitle}>Device Setup</ThemedText>
              </View>
              <ThemedText style={styles.warningText}>
                Make sure your phone is securely attached to your leg to measure foot movement accurately.
              </ThemedText>
            </View>

            {isCalibrating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <ThemedText style={styles.loadingText}>
                  {calibrationProgress.validationMessage}
                </ThemedText>
                <ThemedText style={styles.progressText}>
                  Step {calibrationProgress.currentStep} of {calibrationProgress.totalSteps}
                </ThemedText>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                
                {/* Show completion status */}
                {calibrationResults.length > 0 && (
                  <View style={styles.resultsContainer}>
                    <ThemedText style={styles.resultsTitle}>Progress</ThemedText>
                    {calibrationResults.map((result, index) => (
                      <View key={index} style={styles.resultRow}>
                        <Ionicons 
                          name={result.isValid ? "checkmark-circle" : "alert-circle"} 
                          size={20} 
                          color={result.isValid ? "#34C759" : "#FF9500"} 
                          style={styles.resultIcon}
                        />
                        <ThemedText style={styles.resultText}>
                          Step {index + 1} {result.isValid ? 'Complete' : 'Needs Retry'}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.primaryButton, isCalibrating && styles.buttonDisabled]}
                onPress={handleStartCalibration}
                disabled={isCalibrating}
                activeOpacity={0.7}
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

            <View style={styles.successCard}>
              <ThemedText style={styles.successCardTitle}>Calibration Complete</ThemedText>
              <ThemedText style={styles.successCardText}>
                Your device is now calibrated and ready to use. You can start a session to begin monitoring.
              </ThemedText>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.push('/functional/session' as any)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.primaryButtonText}>Start Session</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    marginHorizontal: 12,
    maxWidth: 100,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#000',
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  instructionCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '100%',
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
  warningCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#FFE082',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.4,
  },
  warningText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successText: {
    fontSize: 17,
    textAlign: 'center',
    color: '#000',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 17,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressBar: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    marginTop: 24,
    backgroundColor: '#E5E5EA',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
    fontWeight: '500',
  },
  resultsContainer: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  resultsTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
    letterSpacing: -0.4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  resultIcon: {
    marginRight: 4,
  },
  resultText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  successCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: '#C8E6C9',
  },
  successCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  successCardText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
});
