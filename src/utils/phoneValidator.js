const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');

/**
 * Validates international phone numbers
 * Compatible with Flutter's phone_number package
 *
 * @param {string} phoneNumber - The phone number to validate
 * @param {string} defaultCountry - Default country code (e.g., 'VN' for Vietnam)
 * @returns {Object} - { isValid: boolean, formattedNumber: string|null, country: string|null, error: string|null }
 */
function validatePhoneNumber(phoneNumber, defaultCountry = 'VN') {
  try {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return {
        isValid: false,
        formattedNumber: null,
        country: null,
        error: 'Phone number is required'
      };
    }

    const trimmedPhone = phoneNumber.trim();

    // If phone starts with '+', validate without default country (international format)
    // Otherwise, use default country for local format validation
    const country = trimmedPhone.startsWith('+') ? undefined : defaultCountry;

    // Check if phone number is valid using libphonenumber-js
    if (!isValidPhoneNumber(trimmedPhone, country)) {
      return {
        isValid: false,
        formattedNumber: null,
        country: null,
        error: 'Invalid phone number format'
      };
    }

    // Parse the phone number to get detailed information
    const parsedPhone = parsePhoneNumber(trimmedPhone, country);

    return {
      isValid: true,
      formattedNumber: parsedPhone.number, // E.164 format (e.g., +84912345678)
      country: parsedPhone.country, // ISO country code (e.g., 'VN')
      nationalNumber: parsedPhone.nationalNumber, // National format without country code
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      formattedNumber: null,
      country: null,
      error: 'Invalid phone number format'
    };
  }
}

/**
 * Simple validation check - returns true/false only
 * Accepts phone numbers in two formats:
 * 1. International format with country code: +84912345678, +1234567890, etc.
 * 2. Local format without country code: 0912345678 (assumes VN by default)
 *
 * @param {string} phoneNumber - The phone number to validate
 * @param {string} defaultCountry - Default country code for local numbers (default: 'VN')
 * @returns {boolean}
 */
function isValidPhone(phoneNumber, defaultCountry = 'VN') {
  return validatePhoneNumber(phoneNumber, defaultCountry).isValid;
}

module.exports = {
  validatePhoneNumber,
  isValidPhone
};
