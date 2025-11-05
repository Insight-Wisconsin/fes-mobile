import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';

export interface CalibrationResult {
  angle: number;
  timestamp: number;
  isValid: boolean;
}

export interface CalibrationProgress {
  currentStep: number;
  totalSteps: number;
  currentAngle?: number;
  isValidating: boolean;
  validationMessage: string;
}

export class CalibrationService {
  private static instance: CalibrationService;
  private currentAngle: number = 0;
  private isMonitoring = false;
  private calibrationResults: CalibrationResult[] = [];
  private progressCallback?: (progress: CalibrationProgress) => void;
  private completionCallback?: (results: CalibrationResult[]) => void;

  private constructor() {}

  static getInstance(): CalibrationService {
    if (!CalibrationService.instance) {
      CalibrationService.instance = new CalibrationService();
    }
    return CalibrationService.instance;
  }

  // Method to update the current y angle from RealTimeData component
  updateAngleData(yAngle: number) {
    this.currentAngle = yAngle;
  }

  // Start the calibration process
  async startCalibration(
    onProgress?: (progress: CalibrationProgress) => void,
    onComplete?: (results: CalibrationResult[]) => void
  ): Promise<void> {
    this.progressCallback = onProgress;
    this.completionCallback = onComplete;
    this.calibrationResults = [];
    this.isMonitoring = true;

    try {
      // Start accelerometer monitoring
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Accelerometer not available');
      }

      Accelerometer.setUpdateInterval(50); // Fast updates for real-time monitoring

      // Start accelerometer listener to get real-time data
      let hasReceivedData = false;
      let dataCount = 0;
      const accelSubscription = Accelerometer.addListener((data) => {
        if (data && typeof data === 'object' && data.x !== undefined && data.y !== undefined && data.z !== undefined) {
          // Convert accelerometer data to angles (same as RealTimeData)
          const angleData = this.convertAccelToAngles({
            x: data.x,
            y: data.y,
            z: data.z
          });
          
          // Update the current angle
          this.currentAngle = angleData.y;
          hasReceivedData = true;
          dataCount++;
        }
      });

      // Wait for initial accelerometer data to arrive
      let waitCount = 0;
      while (!hasReceivedData && waitCount < 20) {
        await this.delay(50);
        waitCount++;
      }

      if (!hasReceivedData) {
        // No accelerometer data received - continue anyway
      }

      // Initial vibration: Signal to get ready for first step
      await this.triggerHaptic();
      this.updateProgress({
        currentStep: 0,
        totalSteps: 5,
        isValidating: false,
        validationMessage: 'Get ready! Calibration starting...'
      });
      await this.delay(1000); // Brief pause before starting

      // Perform 5 calibration steps with haptic feedback
      for (let step = 1; step <= 5; step++) {
        if (!this.isMonitoring) break; // Allow cancellation

        // Vibration 1: Signal to start step
        await this.triggerHaptic();
        this.updateProgress({
          currentStep: step,
          totalSteps: 5,
          isValidating: true,
          validationMessage: `Step ${step}/5 - Start walking now! Capture in progress...`
        });

        // Capture angle for 5 seconds
        const result = await this.performCalibrationStep(step);
        this.calibrationResults.push(result);

        // Vibration 2: Signal step is done
        await this.triggerHaptic();
        this.updateProgress({
          currentStep: step,
          totalSteps: 5,
          isValidating: false,
          validationMessage: `Step ${step} complete! Captured: ${result.angle.toFixed(1)}°`
        });

        // Grace period: 3 seconds to return foot to normal position (only if not last step)
        if (step < 5) {
          await this.delay(3000);
          
          // Vibration 3: Signal to start next step
          await this.triggerHaptic();
          this.updateProgress({
            currentStep: step,
            totalSteps: 5,
            isValidating: false,
            validationMessage: `Get ready for step ${step + 1}/5...`
          });
        }
      }

      // Clean up accelerometer listener
      accelSubscription.remove();

      // Calibration complete
      this.isMonitoring = false;
      this.completionCallback?.(this.calibrationResults);

    } catch (error) {
      console.error('Calibration error:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  private async performCalibrationStep(stepNumber: number): Promise<CalibrationResult> {
    const monitoringDuration = 5000; // 5 seconds
    const threshold = -15; // degrees - only capture angles less than -15 degrees (foot drop)
    const startTime = Date.now();
    
    let angleSum = 0;
    let sampleCount = 0;
    let lastDisplayedAngle = 0;

    // Monitor for 5 seconds and collect ONLY angle readings less than -15 degrees (foot drop)
    while (Date.now() - startTime < monitoringDuration) {
      const currentAngle = this.currentAngle;
      
      // Always show current angle in UI (even if above threshold)
      if (Math.abs(currentAngle - lastDisplayedAngle) > 0.5 || sampleCount === 0) {
        const remainingTime = Math.max(0, Math.ceil((monitoringDuration - (Date.now() - startTime)) / 1000));
        this.updateProgress({
          currentStep: stepNumber,
          totalSteps: 5,
          currentAngle: currentAngle,
          isValidating: true,
          validationMessage: currentAngle < threshold 
            ? `Capturing foot drop... ${remainingTime}s remaining - Current: ${currentAngle.toFixed(1)}°`
            : `Walking... ${remainingTime}s remaining - Current: ${currentAngle.toFixed(1)}° (waiting for foot drop)`
        });
        lastDisplayedAngle = currentAngle;
      }
      
      // Only include angles less than -15 degrees in the calculation (foot drop)
      if (currentAngle < threshold) {
        angleSum += currentAngle;
        sampleCount++;
      }

      await this.delay(50); // Check every 50ms
    }

    // Calculate average only from angles below threshold
    const averageAngle = sampleCount > 0 ? angleSum / sampleCount : 0;

    return {
      angle: averageAngle,
      timestamp: Date.now(),
      isValid: sampleCount > 0 // Valid only if we captured some data below threshold
    };
  }

  // Convert accelerometer data to angles (same as RealTimeData)
  private convertAccelToAngles(accelData: {x: number, y: number, z: number}) {
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
  }

  private updateProgress(progress: CalibrationProgress) {
    this.progressCallback?.(progress);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Trigger haptic feedback with fallback to vibration - 1 second, one long buzz
  private async triggerHaptic(): Promise<void> {
    try {
      // Use heavy impact for more noticeable feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      // One long continuous vibration for 1 second
      Vibration.vibrate(1000);
      await this.delay(1000);
    } catch (error) {
      // Fallback to vibration if haptics not available - 1 second continuous
      Vibration.vibrate(1000);
      await this.delay(1000);
    }
  }

  // Stop calibration process
  stopCalibration(): void {
    this.isMonitoring = false;
  }

  // Get calibration results
  getCalibrationResults(): CalibrationResult[] {
    return [...this.calibrationResults];
  }

  // Get valid calibration results only
  getValidCalibrationResults(): CalibrationResult[] {
    return this.calibrationResults.filter(result => result.isValid);
  }

  // Calculate average of all valid calibration angles
  getAverageCalibrationAngle(): number {
    const validResults = this.getValidCalibrationResults();
    if (validResults.length === 0) return 0;
    
    const sum = validResults.reduce((acc, result) => acc + result.angle, 0);
    return sum / validResults.length;
  }

  // Check if calibration is complete and valid
  isCalibrationComplete(): boolean {
    return this.calibrationResults.length >= 5;
  }

  // Check if calibration has enough valid results
  hasValidCalibration(): boolean {
    return this.getValidCalibrationResults().length >= 4; // At least 4 out of 5 should be valid
  }
}

// Export singleton instance
export const calibrationService = CalibrationService.getInstance();
