import React, { createContext, useContext, useMemo, useState } from 'react';

export type Angle = { x: number; y: number; z: number };

// Describe what our shared box will store:
type AngleContextType = {
  angleData: Angle; // the current angles
  setAngleData: React.Dispatch<React.SetStateAction<Angle>>; // a function to update them
};

// Create an empty Context box (initially undefined)
const AngleContext = createContext<AngleContextType | undefined>(undefined);

// This component provides the data to everyone below it
export const AngleProvider = ({ children }: { children: React.ReactNode }) => {
  const [angleData, setAngleData] = useState<Angle>({ x: 0, y: 0, z: 0 });
  const value = useMemo(() => ({ angleData, setAngleData }), [angleData]);

  return (
    <AngleContext.Provider value={value}>
      {children}
    </AngleContext.Provider>
  );
};

// Helper so we can easily access the data later
export const useAngle = (): AngleContextType => {
  const ctx = useContext(AngleContext);
  if (!ctx) throw new Error('useAngle must be used inside AngleProvider');
  return ctx;
};
