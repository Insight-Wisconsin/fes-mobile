import { Gyroscope } from 'expo-sensors';
import React from 'react';
import * as Speech from 'expo-speech';

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

  // Angle reference — only yaw in degrees
  private angleDataRef: React.MutableRefObject<number>;

  private isMonitoring = false;
  private calibrationResults: CalibrationResult[] = [];
  private progressCallback?: (progress: CalibrationProgress) => void;
  private completionCallback?: (results: CalibrationResult[]) => void;

  // Gyroscope tracking
  private gyroSubscription: any = null;
  private lastTimestamp: number | null = null;
  private integratedYaw = 0; // Degrees

  private constructor() {
    this.angleDataRef = { current: 0 };
  }

  // Helper to speak instructions
  private async speak(text: string, waitForCompletion: boolean = false): Promise<void> {
    try {
      // Stop any ongoing speech
      await Speech.stop();
      
      if (waitForCompletion) {
        return new Promise((resolve) => {
          Speech.speak(text, {
            language: 'en-US',
            pitch: 1.0,
            rate: 0.9, // Slightly slower for clarity
            onDone: () => resolve(),
            onError: () => resolve(), // Resolve even on error to not block flow
          });
        });
      } else {
        Speech.speak(text, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.9,
        });
      }
    } catch (error) {
      console.log('Speech error:', error);
    }
  }

  static getInstance(): CalibrationService {
    if (!CalibrationService.instance) {
      CalibrationService.instance = new CalibrationService();
    }
    return CalibrationService.instance;
  }

  // --- NEW: Reset yaw integration ---
  private resetYaw() {
    this.integratedYaw = 0;
    this.lastTimestamp = null;
  }

  // --- NEW: Gyroscope-based yaw integration ---
  private startGyroMonitoring() {
    this.resetYaw();

    Gyroscope.setUpdateInterval(20); // 50 Hz sampling

    this.gyroSubscription = Gyroscope.addListener((data) => {
      const now = Date.now();

      if (this.lastTimestamp !== null) {
        const dt = (now - this.lastTimestamp) / 1000; // seconds
        const yawRate = data.z || 0; // rad/s

        // integrate yaw angle
        this.integratedYaw += yawRate * dt * (180 / Math.PI);
      }

      this.lastTimestamp = now;

      // store ABS yaw (we do not care about direction)
      this.angleDataRef.current = Math.abs(this.integratedYaw);
    });
  }

  private stopGyroMonitoring() {
    if (this.gyroSubscription) {
      this.gyroSubscription.remove();
      this.gyroSubscription = null;
    }
  }

  // ---------------- START CALIBRATION ----------------
  async startCalibration(
    onProgress?: (progress: CalibrationProgress) => void,
    onComplete?: (results: CalibrationResult[]) => void
  ): Promise<void> {

    this.progressCallback = onProgress;
    this.completionCallback = onComplete;
    this.calibrationResults = [];
    this.isMonitoring = true;

    try {
      // Start gyro
      this.startGyroMonitoring();

      // Initial instruction
      await this.speak('Starting calibration. You will perform 5 steps.', true);
      await this.delay(500);

      // Perform 5 calibration steps
      for (let step = 1; step <= 5; step++) {
        if (!this.isMonitoring) break;

        await this.speak(`Step ${step} of 5. Beginning now.`, true);

        this.updateProgress({
          currentStep: step,
          totalSteps: 5,
          isValidating: true,
          validationMessage: `Step ${step}/5: Starting calibration...`
        });

        const result = await this.performCalibrationStep(step);
        this.calibrationResults.push(result);

        this.updateProgress({
          currentStep: step,
          totalSteps: 5,
          isValidating: false,
          validationMessage: result.isValid
            ? `✓ Step ${step} captured: ${result.angle.toFixed(1)}°`
            : `⚠ Step ${step} invalid — please repeat motion.`
        });

        if (result.isValid) {
          await this.speak(`Step ${step} complete. Good job.`, true);
        } else {
          await this.speak(`Step ${step} invalid. Please try again on the next step.`, true);
        }

        await this.delay(1000);
      }

      // Stop gyro listener
      this.stopGyroMonitoring();

      // Final announcement
      const validSteps = this.getValidCalibrationResults().length;
      await this.speak(`Calibration complete. ${validSteps} out of 5 steps successful.`, true);

      this.isMonitoring = false;
      this.completionCallback?.(this.calibrationResults);

    } catch (error) {
      console.error("Calibration error:", error);
      this.isMonitoring = false;
      this.stopGyroMonitoring();
      throw error;
    }
  }

  // ---------------- PERFORM EACH STEP ----------------
  private async performCalibrationStep(stepNumber: number): Promise<CalibrationResult> {
    const maxMonitoringDuration = 25000;
    const stabilityWindowSize = 15;
    const stabilityThreshold = 3.0;
    const minStableDuration = 800;
    const baselineThreshold = 5.0;
    const dropThreshold = 8.0;

    const startTime = Date.now();
    const angleHistory: number[] = [];

    let baselineAngle: number | null = null;
    let hasReturnedToBaseline = false;
    let hasDetectedDrop = false;
    let stableAngle: number | null = null;
    let stableStartTime: number | null = null;

    // --------- PHASE 1: INSTRUCT TO TAKE A STEP ----------
    await this.speak('Take a step and hold your foot in position.', true);
    await this.delay(500);
    
    this.updateProgress({
      currentStep: stepNumber,
      totalSteps: 5,
      isValidating: true,
      validationMessage: `Step ${stepNumber}/5: Waiting for foot movement...`
    });

    // Record initial/baseline angle
    baselineAngle = this.angleDataRef.current;
    await this.delay(1000);

    // --------- PHASE 2: DETECT FOOT DROP ----------
    this.updateProgress({
      currentStep: stepNumber,
      totalSteps: 5,
      isValidating: true,
      validationMessage: `Step ${stepNumber}/5: Detecting foot drop...`
    });

    const dropStartTime = Date.now();
    while (Date.now() - dropStartTime < 12000) {
      const currentAngle = this.angleDataRef.current;
      const angleChange = Math.abs(currentAngle - baselineAngle!);

      this.updateProgress({
        currentStep: stepNumber,
        totalSteps: 5,
        currentAngle,
        isValidating: true,
        validationMessage: `Step ${stepNumber}/5: Current angle: ${currentAngle.toFixed(1)}° (need ${dropThreshold}° change)`
      });

      if (angleChange >= dropThreshold) {
        hasDetectedDrop = true;
        break;
      }

      await this.delay(50);
    }

    if (!hasDetectedDrop) {
      await this.speak('Step not detected. Please try again.', false);
      return { angle: baselineAngle || 0, timestamp: Date.now(), isValid: false };
    }

    // --------- PHASE 3: CAPTURE STABLE ANGLE ----------
    this.updateProgress({
      currentStep: stepNumber,
      totalSteps: 5,
      isValidating: true,
      validationMessage: `Step ${stepNumber}/5: Hold position to capture angle...`
    });

    const stuckStart = Date.now();
    while (Date.now() - stuckStart < 12000) {
      const currentAngle = this.angleDataRef.current;

      angleHistory.push(currentAngle);
      if (angleHistory.length > stabilityWindowSize) angleHistory.shift();

      if (angleHistory.length >= stabilityWindowSize) {
        const recent = angleHistory.slice(-stabilityWindowSize);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / recent.length;
        const stdDev = Math.sqrt(variance);

        this.updateProgress({
          currentStep: stepNumber,
          totalSteps: 5,
          currentAngle: mean,
          isValidating: true,
          validationMessage: `Step ${stepNumber}/5: Stability: ${stdDev.toFixed(2)}° (need < ${stabilityThreshold}°)`
        });

        if (stdDev <= stabilityThreshold) {
          if (stableAngle === null) {
            stableAngle = mean;
            stableStartTime = Date.now();
          } else {
            const stableDuration = Date.now() - stableStartTime!;
            if (stableDuration >= minStableDuration) {
              await this.speak('Angle captured. Return your foot to resting position.', true);
              
              // Capture the angle
              const capturedAngle = stableAngle;
              
              // --------- PHASE 4: WAIT FOR RETURN TO BASELINE ----------
              await this.delay(500);
              this.updateProgress({
                currentStep: stepNumber,
                totalSteps: 5,
                isValidating: true,
                validationMessage: `Step ${stepNumber}/5: Waiting for return to rest...`
              });

              let baselineReturnStart: number | null = null;
              const returnStartTime = Date.now();
              
              while (Date.now() - returnStartTime < 10000) {
                const currentAngle = this.angleDataRef.current;

                if (currentAngle <= baselineThreshold) {
                  if (baselineReturnStart === null) {
                    baselineReturnStart = Date.now();
                  } else if (Date.now() - baselineReturnStart >= 500) {
                    hasReturnedToBaseline = true;
                    break;
                  }
                } else {
                  baselineReturnStart = null;
                }

                await this.delay(50);
              }

              return {
                angle: capturedAngle,
                timestamp: Date.now(),
                isValid: true
              };
            }
          }
        } else {
          stableAngle = null;
          stableStartTime = null;
        }
      }

      await this.delay(50);
    }

    // fallback - if we have a reasonably stable angle, use it
    if (angleHistory.length >= 10) {
      const fallbackAngle = angleHistory.reduce((a, b) => a + b, 0) / angleHistory.length;
      // If the angle is significantly above baseline, consider it valid
      if (Math.abs(fallbackAngle - baselineAngle!) >= dropThreshold) {
        await this.speak('Angle captured. Return your foot to resting position.', true);
        return { angle: fallbackAngle, timestamp: Date.now(), isValid: true };
      }
    }

    const fallbackAngle =
      angleHistory.length > 0
        ? angleHistory.reduce((a, b) => a + b, 0) / angleHistory.length
        : this.angleDataRef.current;

    return { angle: fallbackAngle, timestamp: Date.now(), isValid: false };
  }

  private updateProgress(progress: CalibrationProgress) {
    this.progressCallback?.(progress);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stopCalibration() {
    this.isMonitoring = false;
    this.stopGyroMonitoring();
    Speech.stop(); // Stop any ongoing speech
  }

  getCalibrationResults() {
    return [...this.calibrationResults];
  }

  getValidCalibrationResults() {
    return this.calibrationResults.filter(r => r.isValid);
  }

  getAverageCalibrationAngle() {
    const vals = this.getValidCalibrationResults();
    if (vals.length === 0) return 0;
    return vals.reduce((sum, r) => sum + r.angle, 0) / vals.length;
  }

  isCalibrationComplete() {
    return this.calibrationResults.length >= 5;
  }

  hasValidCalibration() {
    return this.getValidCalibrationResults().length >= 4;
  }
}

// Export singleton
export const calibrationService = CalibrationService.getInstance();
