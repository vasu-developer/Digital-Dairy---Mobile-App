import { useAppTheme } from '@/context/ThemeContext';

export function useTheme() {
  const { colors } = useAppTheme();
  return colors;
}
