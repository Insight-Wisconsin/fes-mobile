import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * React Native reports 'unspecified' when the platform states no preference.
 * The app only ever renders a light or dark palette, so collapse the value here
 * and every caller can index Colors without widening to string.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
