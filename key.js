// const crypto = require('crypto');

// // Generate a secure random 32-byte key
// const ENCRYPTION_KEY = crypto.randomBytes(32);

// // Convert to hex or base64 for storage
// const hexKey = ENCRYPTION_KEY.toString('hex'); // For hexadecimal format
// const base64Key = ENCRYPTION_KEY.toString('base64'); // For base64 format

// console.log('32-byte encryption key in hex:', hexKey);
// console.log('32-byte encryption key in base64:', base64Key);
const crypto = require('crypto');

// Generate a secure random 32-byte key
const ENCRYPTION_KEY = crypto.randomBytes(32);

// Convert to hex or base64 for storage
const hexKey = ENCRYPTION_KEY.toString('hex'); // For hexadecimal format
const base64Key = ENCRYPTION_KEY.toString('base64'); // For base64 format

console.log('32-byte encryption key in hex:', hexKey);
console.log('32-byte encryption key in base64:', base64Key);

// Store either hexKey or base64Key in your environment variable or configuration
