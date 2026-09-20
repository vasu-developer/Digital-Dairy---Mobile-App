import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RateChartConfig {
  baseFat: number;
  baseSNF: number;
  baseRate: number;
  fatStepRate: number; // Rate change per 0.1 Fat increase/decrease (₹)
  snfStepRate: number; // Rate change per 0.1 SNF increase/decrease (₹)
  minRate: number;
}

export interface DairyPricingSettings {
  autoCalculate?: boolean; // When true: rate auto-calculates from Fat/SNF formula. When false (default): operator enters rates manually.
  customerRate: RateChartConfig; // Farmer purchase rate configuration
  dispatchRate: RateChartConfig; // Plant dispatch rate configuration
  updatedAt?: string;
}

export const DEFAULT_CUSTOMER_RATE_CONFIG: RateChartConfig = {
  baseFat: 6.0,
  baseSNF: 8.5,
  baseRate: 52.0,
  fatStepRate: 0.65,
  snfStepRate: 0.35,
  minRate: 20.0,
};

export const DEFAULT_DISPATCH_RATE_CONFIG: RateChartConfig = {
  baseFat: 6.0,
  baseSNF: 8.5,
  baseRate: 58.0,
  fatStepRate: 0.65,
  snfStepRate: 0.35,
  minRate: 20.0,
};

export const DEFAULT_PRICING_SETTINGS: DairyPricingSettings = {
  autoCalculate: false, // Default is disabled per user preference (manual rates active by default)
  customerRate: DEFAULT_CUSTOMER_RATE_CONFIG,
  dispatchRate: DEFAULT_DISPATCH_RATE_CONFIG,
  updatedAt: new Date().toISOString(),
};

export const DAIRY_PRICING_STORAGE_KEY = '@doodh_khata_dairy_pricing_settings';

/**
 * Loads the active pricing settings from persistent storage,
 * falling back to default settings if none are saved yet.
 */
export async function loadPricingSettings(): Promise<DairyPricingSettings> {
  try {
    const raw = await AsyncStorage.getItem(DAIRY_PRICING_STORAGE_KEY);
    if (!raw) {
      return {
        autoCalculate: false,
        customerRate: DEFAULT_CUSTOMER_RATE_CONFIG,
        dispatchRate: DEFAULT_DISPATCH_RATE_CONFIG,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      autoCalculate: parsed.autoCalculate === true, // Default to false unless explicitly set to true
      customerRate: { ...DEFAULT_CUSTOMER_RATE_CONFIG, ...(parsed.customerRate || {}) },
      dispatchRate: { ...DEFAULT_DISPATCH_RATE_CONFIG, ...(parsed.dispatchRate || {}) },
      updatedAt: parsed.updatedAt,
    };
  } catch (err) {
    console.error('Failed to load pricing settings:', err);
    return {
      autoCalculate: false,
      customerRate: DEFAULT_CUSTOMER_RATE_CONFIG,
      dispatchRate: DEFAULT_DISPATCH_RATE_CONFIG,
    };
  }
}

/**
 * Persists updated pricing settings to storage.
 */
export async function savePricingSettings(settings: DairyPricingSettings): Promise<void> {
  try {
    const payload: DairyPricingSettings = {
      ...settings,
      autoCalculate: settings.autoCalculate === true,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(DAIRY_PRICING_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save pricing settings:', err);
    throw err;
  }
}

/**
 * Calculates Milk Rate (₹ / Litre) based on Fat % and SNF % using Base Standard + Step Adjustments.
 * 
 * Rate = BaseRate + ((Fat - BaseFat) * 10 * FatStep) + ((SNF - BaseSNF) * 10 * SnfStep)
 * 
 * Safe against undefined, null, or NaN values.
 */
export function calculateFatSnfRate(
  fat?: number,
  snf?: number,
  config: RateChartConfig = DEFAULT_CUSTOMER_RATE_CONFIG
): number {
  const fatVal = typeof fat === 'number' && !isNaN(fat) ? fat : 0;
  const snfVal = typeof snf === 'number' && !isNaN(snf) ? snf : 0;

  if (fatVal <= 0 || snfVal <= 0) return 0;

  const fatDiffStep = (fatVal - config.baseFat) * 10;
  const snfDiffStep = (snfVal - config.baseSNF) * 10;

  let calculatedRate =
    config.baseRate + fatDiffStep * config.fatStepRate + snfDiffStep * config.snfStepRate;

  calculatedRate = Math.max(config.minRate, calculatedRate);

  return Math.round(calculatedRate * 100) / 100;
}

/**
 * Alias for backward compatibility
 */
export const getCalculatedRate = calculateFatSnfRate;
export const DEFAULT_RATE_CONFIG = DEFAULT_CUSTOMER_RATE_CONFIG;
