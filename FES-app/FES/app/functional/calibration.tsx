import { StyleSheet, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { calibrationService, CalibrationProgress, CalibrationResult } from '../../services/backend/calibration';

export default function CalibrationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
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

  // Dynamic colors based on color scheme
  const colors = {
    instructionCard: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
    warningCard: colorScheme === 'dark' ? '#1C3A5C' : '#E3F2FD',
    resultsContainer: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
    finalResultsContainer: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
    progressBar: colorScheme === 'dark' ? '#3A3A3C' : '#E0E0E0',
    borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
    headerBorder: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
  };

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
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.headerBorder }]}>
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

            <ThemedText type="subtitle" style={styles.stepTitle}>Foot Drop Calibration</ThemedText>
            <ThemedText style={styles.stepDescription}>
              We'll capture the angle when your foot gets "stuck" during walking to detect future foot drop episodes.
            </ThemedText>

            <View style={[styles.instructionCard, { backgroundColor: colors.instructionCard }]}>
              <Ionicons name="walk" size={24} color="#FF9500" style={styles.instructionIcon} />
              <ThemedText style={styles.instructionText}>
                Walk normally and let your foot get stuck at its natural "drop" position. We'll capture that angle 5 times for 5 seconds each.
              </ThemedText>
            </View>

            <View style={[styles.warningCard, { backgroundColor: colors.warningCard }]}>
              <Ionicons name="information-circle" size={24} color="#007AFF" style={styles.instructionIcon} />
              <ThemedText style={styles.instructionText}>
                The phone should be attached to your leg/foot to measure the angle when foot drop occurs.
              </ThemedText>
            </View>

            {isCalibrating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <ThemedText style={styles.loadingText}>
                  {calibrationProgress.validationMessage}
                </ThemedText>
                {calibrationProgress.currentAngle !== undefined && (
                  <ThemedText style={styles.angleText}>
                    Foot Angle: {calibrationProgress.currentAngle.toFixed(2)}°
                  </ThemedText>
                )}
                <ThemedText style={styles.progressText}>
                  Capturing foot angle {calibrationProgress.currentStep} of {calibrationProgress.totalSteps} ({progress.toFixed(0)}%)
                </ThemedText>
                <View style={[styles.progressBar, { backgroundColor: colors.progressBar }]}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                
                {/* Show results as they come in */}
                {calibrationResults.length > 0 && (
                  <View style={[styles.resultsContainer, { backgroundColor: colors.resultsContainer }]}>
                    <ThemedText style={styles.resultsTitle}>Foot Angles Captured:</ThemedText>
                    {calibrationResults.map((result, index) => (
                      <View key={index} style={styles.resultRow}>
                        <ThemedText style={styles.resultText}>
                          Capture {index + 1}: {result.angle.toFixed(2)}°
                        </ThemedText>
                      </View>
                    ))}
                    {calibrationResults.length > 0 && (
                      <ThemedText style={[styles.averageText, { borderTopColor: colors.borderColor }]}>
                        Target Foot Drop Angle: {calibrationService.getAverageCalibrationAngle().toFixed(2)}°
                      </ThemedText>
                    )}
                  </View>
                )}
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

            {calibrationResults.length > 0 && (
              <View style={[styles.finalResultsContainer, { backgroundColor: colors.finalResultsContainer }]}>
                <ThemedText style={styles.finalResultsTitle}>Final Calibration Results</ThemedText>
                <ThemedText style={styles.finalResultsText}>
                  Average Foot Drop Angle: {calibrationService.getAverageCalibrationAngle().toFixed(2)}°
                </ThemedText>
                <View style={styles.finalResultsList}>
                  {calibrationResults.map((result, index) => (
                    <View key={index} style={styles.finalResultRow}>
                      <ThemedText style={styles.finalResultText}>
                        Capture {index + 1}: {result.angle.toFixed(2)}°
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

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
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    width: '100%',
  },
  warningCard: {
    flexDirection: 'row',
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
    borderRadius: 5,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  angleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  resultsContainer: {
    marginTop: 20,
    width: '100%',
    borderRadius: 8,
    padding: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  averageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  finalResultsContainer: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    width: '100%',
  },
  finalResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  finalResultsText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  finalResultsList: {
    marginTop: 12,
  },
  finalResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  finalResultText: {
    fontSize: 14,
    flex: 1,
  },
  finalStatusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
});
