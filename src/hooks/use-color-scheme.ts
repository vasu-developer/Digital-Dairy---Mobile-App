import { useAppTheme } from '@/context/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  const { isDark } = useAppTheme();
  return isDark ? 'dark' : 'light';
}

export { useAppTheme };
