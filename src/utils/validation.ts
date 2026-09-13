/**
 * Validation utilities for Doodh Khata customer registration and input forms.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a customer's full name.
 * Rule:
 * - Required, min 2 chars, max 60 chars.
 * - Must start with a letter (Unicode letters supported: English, Hindi/Devanagari, Marathi, Gujarati, etc.)
 * - Only letters, spaces, dots, hyphens, and apostrophes are allowed in the main part.
 * - Trailing digits are strictly permitted for disambiguation (e.g. "Ramesh 2", "Suresh Patil 01", "Mukesh 3").
 * - Digits at the start or in the middle (e.g., "123", "123 Ramesh", "Ra123mesh") are strictly invalid.
 * - Special characters and symbols (@, #, $, %, etc.) are strictly invalid.
 */
export function validateCustomerName(rawName: string): ValidationResult {
  const trimmed = rawName.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Customer name is required.' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Customer name must be at least 2 characters long.' };
  }

  if (trimmed.length > 60) {
    return { isValid: false, error: 'Customer name cannot exceed 60 characters.' };
  }

  // Check if starts with a number
  if (/^\d/u.test(trimmed)) {
    return { isValid: false, error: 'Name must start with letters, not numbers.' };
  }

  // Check for disallowed symbols (only allow Unicode letters and marks, spaces, dots, hyphens, apostrophes, and digits)
  if (/[^\p{L}\p{M}\s.\-'\d]/u.test(trimmed)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, and trailing numbers (no symbols).' };
  }

  // Must start with a letter, followed by letters/marks/spaces/punctuation, and optional trailing digits
  // Examples matching: "Ramesh", "Ramesh Kumar", "R. K. Sharma", "Ramesh 2", "Suresh Patil 01", "रामेश्वर 2"
  // Will fail: "Ra123mesh" because after digits there are letters.
  const validPattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.\-']*(?:\s*\d+)?$/u;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'Numbers are only allowed at the end of the name.' };
  }

  return { isValid: true };
}

/**
 * Real-time keystroke sanitizer for customer name.
 * - Strips any special symbols.
 * - Strips leading digits if typed before any letters.
 */
export function sanitizeCustomerNameInput(text: string): string {
  // Disallow symbols, keep Unicode letters, marks, spaces, dots, hyphens, apostrophes, and digits
  let cleaned = text.replace(/[^\p{L}\p{M}\s.\-'\d]/gu, '');

  // If text starts with digits, strip them
  if (/^\d+/u.test(cleaned)) {
    cleaned = cleaned.replace(/^\d+/u, '');
  }

  return cleaned;
}

/**
 * Validates a mobile phone number.
 * Rule:
 * - Optional: empty or whitespace is valid.
 * - If entered: must be exactly 10 digits starting with 6, 7, 8, or 9 (standard Indian mobile format).
 */
export function validatePhoneNumber(phoneStr: string): ValidationResult {
  const cleaned = phoneStr.replace(/[\s\-\+\(\)]/g, '');

  if (!cleaned) {
    return { isValid: true }; // Optional
  }

  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: 'Phone number must contain digits only.' };
  }

  if (cleaned.length !== 10) {
    return { isValid: false, error: `Mobile number must be exactly 10 digits (currently ${cleaned.length}).` };
  }

  if (!/^[6-9]/.test(cleaned)) {
    return { isValid: false, error: 'Mobile number must start with 6, 7, 8, or 9.' };
  }

  return { isValid: true };
}

/**
 * Real-time keystroke sanitizer for phone numbers.
 * - Digits only, max 10 characters.
 */
export function sanitizePhoneInput(text: string): string {
  return text.replace(/[^0-9]/g, '').slice(0, 10);
}

/**
 * Validates Farmer / Member Code.
 * - Optional: empty string is valid (auto-generated or none).
 * - If entered: must be an integer between 1 and 999999.
 */
export function validateFarmerCode(codeStr: string): ValidationResult {
  const trimmed = codeStr.trim();
  if (!trimmed) {
    return { isValid: true }; // Optional
  }

  if (!/^\d+$/.test(trimmed)) {
    return { isValid: false, error: 'Code must contain numbers only.' };
  }

  const num = parseInt(trimmed, 10);
  if (num <= 0 || num > 999999) {
    return { isValid: false, error: 'Code must be between 1 and 999999.' };
  }

  return { isValid: true };
}

/**
 * Validates Village / Area.
 * - Optional.
 * - Max 50 characters, letters, spaces, dots, hyphens, numbers allowed.
 */
export function validateVillage(villageStr: string): ValidationResult {
  const trimmed = villageStr.trim();
  if (!trimmed) {
    return { isValid: true }; // Optional
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Village name cannot exceed 50 characters.' };
  }

  if (/[<>{}[\]\\]/.test(trimmed)) {
    return { isValid: false, error: 'Village name contains invalid characters.' };
  }

  return { isValid: true };
}

/**
 * Validates Default Sale Rate for Buyers.
 */
export function validateSaleRate(rateStr: string, isBuyer: boolean): ValidationResult {
  if (!isBuyer) {
    return { isValid: true };
  }

  const trimmed = rateStr.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Default selling rate is required for milk buyers.' };
  }

  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) {
    return { isValid: false, error: 'Please enter a valid rate greater than ₹0.' };
  }

  if (num > 500) {
    return { isValid: false, error: 'Selling rate cannot exceed ₹500 / Litre.' };
  }

  return { isValid: true };
}

/**
 * Validates Opening Balance.
 */
export function validateOpeningBalance(balStr: string): ValidationResult {
  const trimmed = balStr.trim();
  if (!trimmed) {
    return { isValid: true };
  }

  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    return { isValid: false, error: 'Opening balance must be a valid number.' };
  }

  if (num < -1000000 || num > 1000000) {
    return { isValid: false, error: 'Opening balance is out of acceptable range (±₹10,00,000).' };
  }

  return { isValid: true };
}
