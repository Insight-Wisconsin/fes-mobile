import { useAngle } from '@/contexts/AngleContext';
import { useEffect } from 'react';

export default function CalibrationLogger() {
  const { angleData } = useAngle(); // Get shared data

  useEffect(() => {
    console.log('[Calibration] angleData:', angleData);
  }, [angleData]); // Runs every time angleData changes

  return null; // This component doesn’t show anything — it just logs
}

