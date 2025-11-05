/**
 * Password Requirements Configuration
 * Centralized password validation rules for the application
 */

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
};

export const PASSWORD_ERROR_MESSAGES = {
  tooShort: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`,
  tooLong: `Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`,
  needsUppercase: 'Password must contain at least one uppercase letter',
  needsLowercase: 'Password must contain at least one lowercase letter',
  needsNumber: 'Password must contain at least one number',
  needsSpecialChar: 'Password must contain at least one special character (!@#$%^&*)',
  noMatch: "Passwords don't match",
  empty: 'Password is required',
};

/**
 * Validates a password against all requirements
 * @param password - The password to validate
 * @returns Object with isValid boolean and errors array
 */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!password) {
    errors.push(PASSWORD_ERROR_MESSAGES.empty);
    return { isValid: false, errors };
  }

  // Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(PASSWORD_ERROR_MESSAGES.tooShort);
  }

  // Check maximum length
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(PASSWORD_ERROR_MESSAGES.tooLong);
  }

  // Check for uppercase letter
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push(PASSWORD_ERROR_MESSAGES.needsUppercase);
  }

  // Check for lowercase letter
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push(PASSWORD_ERROR_MESSAGES.needsLowercase);
  }

  // Check for number
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push(PASSWORD_ERROR_MESSAGES.needsNumber);
  }

  // Check for special character
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push(PASSWORD_ERROR_MESSAGES.needsSpecialChar);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates password confirmation
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns Object with isValid boolean and error message
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): { isValid: boolean; error?: string } => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: PASSWORD_ERROR_MESSAGES.noMatch,
    };
  }
  return { isValid: true };
};

/**
 * Gets password strength as a percentage (0-100)
 * @param password - The password to evaluate
 * @returns Strength percentage
 */
export const getPasswordStrength = (password: string): number => {
  if (!password) return 0;

  let strength = 0;
  const checks = [
    password.length >= PASSWORD_REQUIREMENTS.minLength,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    password.length >= 12,
  ];

  checks.forEach((check) => {
    if (check) strength += 100 / checks.length;
  });

  return Math.round(strength);
};

/**
 * Gets password strength label
 * @param strength - Strength percentage (0-100)
 * @returns Strength label
 */
export const getPasswordStrengthLabel = (strength: number): string => {
  if (strength === 0) return 'None';
  if (strength < 40) return 'Weak';
  if (strength < 70) return 'Fair';
  if (strength < 90) return 'Good';
  return 'Strong';
};

/**
 * Gets password strength color
 * @param strength - Strength percentage (0-100)
 * @returns Color hex code
 */
export const getPasswordStrengthColor = (strength: number): string => {
  if (strength === 0) return '#666666';
  if (strength < 40) return '#FF3B30'; // Red
  if (strength < 70) return '#FF9500'; // Orange
  if (strength < 90) return '#FFCC00'; // Yellow
  return '#34C759'; // Green
};
