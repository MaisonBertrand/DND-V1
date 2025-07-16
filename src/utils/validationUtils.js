// Validation utility functions - consolidated from duplicate validation code

/**
 * Email validation regex pattern
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Username validation regex pattern (alphanumeric, 3-20 characters)
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Password validation regex pattern (minimum 6 characters)
 */
export const PASSWORD_REGEX = /^.{6,}$/;

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export const isValidEmail = (email) => {
  return EMAIL_REGEX.test(email);
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} Whether username is valid
 */
export const isValidUsername = (username) => {
  return USERNAME_REGEX.test(username);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters' };
  }
  
  return { isValid: true, message: 'Password is valid' };
};

/**
 * Validate character name
 * @param {string} name - Character name to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateCharacterName = (name) => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Character name is required' };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, message: 'Character name must be at least 2 characters' };
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, message: 'Character name must be less than 50 characters' };
  }
  
  return { isValid: true, message: 'Character name is valid' };
};

/**
 * Validate ability scores
 * @param {Object} scores - Object containing ability scores
 * @returns {Object} Validation result with isValid and message
 */
export const validateAbilityScores = (scores) => {
  const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  
  for (const ability of abilities) {
    const score = scores[ability];
    if (score === undefined || score === null) {
      return { isValid: false, message: `${ability} score is required` };
    }
    
    if (score < 1 || score > 20) {
      return { isValid: false, message: `${ability} score must be between 1 and 20` };
    }
  }
  
  return { isValid: true, message: 'Ability scores are valid' };
};

/**
 * Validate party name
 * @param {string} name - Party name to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validatePartyName = (name) => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Party name is required' };
  }
  
  if (name.trim().length < 3) {
    return { isValid: false, message: 'Party name must be at least 3 characters' };
  }
  
  if (name.trim().length > 100) {
    return { isValid: false, message: 'Party name must be less than 100 characters' };
  }
  
  return { isValid: true, message: 'Party name is valid' };
};

/**
 * Validate party description
 * @param {string} description - Party description to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validatePartyDescription = (description) => {
  if (!description || description.trim().length === 0) {
    return { isValid: false, message: 'Party description is required' };
  }
  
  if (description.trim().length < 10) {
    return { isValid: false, message: 'Party description must be at least 10 characters' };
  }
  
  if (description.trim().length > 500) {
    return { isValid: false, message: 'Party description must be less than 500 characters' };
  }
  
  return { isValid: true, message: 'Party description is valid' };
};

/**
 * Validate party size
 * @param {number} maxPlayers - Maximum number of players
 * @returns {Object} Validation result with isValid and message
 */
export const validatePartySize = (maxPlayers) => {
  if (!maxPlayers || maxPlayers < 2) {
    return { isValid: false, message: 'Party must have at least 2 players' };
  }
  
  if (maxPlayers > 8) {
    return { isValid: false, message: 'Party cannot have more than 8 players' };
  }
  
  return { isValid: true, message: 'Party size is valid' };
};

/**
 * Validate campaign type
 * @param {string} campaignType - Campaign type to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateCampaignType = (campaignType) => {
  const validTypes = ['ai-assist', 'manual'];
  
  if (!validTypes.includes(campaignType)) {
    return { isValid: false, message: 'Invalid campaign type' };
  }
  
  return { isValid: true, message: 'Campaign type is valid' };
};

/**
 * Validate form fields
 * @param {Object} fields - Object containing field values
 * @param {Object} validators - Object containing validation functions
 * @returns {Object} Validation result with isValid, errors, and messages
 */
export const validateForm = (fields, validators) => {
  const errors = {};
  const messages = {};
  let isValid = true;
  
  for (const [fieldName, validator] of Object.entries(validators)) {
    const fieldValue = fields[fieldName];
    const result = validator(fieldValue);
    
    if (!result.isValid) {
      errors[fieldName] = true;
      messages[fieldName] = result.message;
      isValid = false;
    }
  }
  
  return { isValid, errors, messages };
};

/**
 * Sanitize input string
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate numeric input
 * @param {string|number} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with isValid and message
 */
export const validateNumericInput = (value, options = {}) => {
  const { min, max, required = true, integer = false } = options;
  
  if (required && (value === null || value === undefined || value === '')) {
    return { isValid: false, message: 'This field is required' };
  }
  
  if (!required && (value === null || value === undefined || value === '')) {
    return { isValid: true, message: 'Field is optional' };
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, message: 'Must be a valid number' };
  }
  
  if (integer && !Number.isInteger(numValue)) {
    return { isValid: false, message: 'Must be a whole number' };
  }
  
  if (min !== undefined && numValue < min) {
    return { isValid: false, message: `Must be at least ${min}` };
  }
  
  if (max !== undefined && numValue > max) {
    return { isValid: false, message: `Must be no more than ${max}` };
  }
  
  return { isValid: true, message: 'Number is valid' };
}; 