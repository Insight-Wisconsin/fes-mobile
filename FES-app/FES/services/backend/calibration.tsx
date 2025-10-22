import { Accelerometer } from 'expo-sensors';
import React from 'react';

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
  private angleDataRef: React.MutableRefObject<number>;
  private isMonitoring = false;
  private calibrationResults: CalibrationResult[] = [];
  private progressCallback?: (progress: CalibrationProgress) => void;
  private completionCallback?: (results: CalibrationResult[]) => void;

  private constructor() {
    this.angleDataRef = { current: 0 };
  }

  static getInstance(): CalibrationService {
    if (!CalibrationService.instance) {
      CalibrationService.instance = new CalibrationService();
    }
    return CalibrationService.instance;
  }

  // Method to update the current y angle from RealTimeData component
  updateAngleData(yAngle: number) {
    this.angleDataRef.current = yAngle;
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
      const accelSubscription = Accelerometer.addListener((data) => {
        if (data && typeof data === 'object') {
          // Convert accelerometer data to angles (same as RealTimeData)
          const angleData = this.convertAccelToAngles({
            x: data.x || 0,
            y: data.y || 0,
            z: data.z || 0
          });
          
          // Update the angle data reference
          this.angleDataRef.current = angleData.y;
        }
      });

      // Perform 5 calibration steps
      for (let step = 1; step <= 5; step++) {
        if (!this.isMonitoring) break; // Allow cancellation

        this.updateProgress({
          currentStep: step,
          totalSteps: 5,
          isValidating: true,
          validationMessage: `Capturing foot angle ${step}/5... Walk normally for 5 seconds`
        });

        const result = await this.performCalibrationStep(step);
        this.calibrationResults.push(result);

        this.updateProgress({
          currentStep: step,
          totalSteps: 5,
          isValidating: false,
          validationMessage: `Foot angle ${step} captured: ${result.angle.toFixed(1)}°`
        });

        // Wait a bit between steps
        await this.delay(1000);
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
    const startTime = Date.now();
    
    let angleSum = 0;
    let sampleCount = 0;

    // Monitor for 5 seconds and collect all angle readings
    while (Date.now() - startTime < monitoringDuration) {
      const currentAngle = this.angleDataRef.current;
      
      angleSum += currentAngle;
      sampleCount++;

      // Update progress with current angle
      this.updateProgress({
        currentStep: stepNumber,
        totalSteps: 5,
        currentAngle: currentAngle,
        isValidating: true,
        validationMessage: `Capturing foot angle... Current: ${currentAngle.toFixed(2)}°`
      });

      await this.delay(50); // Check every 50ms
    }

    const averageAngle = angleSum / sampleCount;

    return {
      angle: averageAngle,
      timestamp: Date.now(),
      isValid: true // Always valid since we're just capturing averages
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
