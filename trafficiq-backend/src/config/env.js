/**
 * Environment Variable Validator
 * Validates all required environment variables exist at startup.
 * Exits with a clear error message if any are missing.
 */

const requiredVars = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'REFRESH_TOKEN_SECRET',
  'REFRESH_TOKEN_EXPIRES_IN',
  'REDIS_URL',
  'MQTT_BROKER_URL',
  'ML_SERVICE_URL',
  'CLIENT_URL',
];

const optionalVars = [
  'MQTT_USERNAME',
  'MQTT_PASSWORD',
];

/**
 * Validate that all required environment variables are present.
 * @throws {Error} Exits process if required vars are missing.
 */
function validateEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '[ENV VALIDATOR] FATAL: Missing required environment variables:');
    missing.forEach((key) => {
      console.error(`  ✗ ${key}`);
    });
    console.error('\nSet them in a .env file or export them in your shell.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  // Warn about optional vars that are not set
  const missingOptional = optionalVars.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn('\x1b[33m%s\x1b[0m', '[ENV VALIDATOR] WARNING: Optional environment variables not set:');
    missingOptional.forEach((key) => {
      console.warn(`  ⚠ ${key}`);
    });
    console.warn('');
  }

  console.log('\x1b[32m%s\x1b[0m', '[ENV VALIDATOR] All required environment variables are set.');
}

module.exports = validateEnv;
