const readline = require('readline');
const crypto = require('crypto');
const api = require('./api');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Generates a random secret key.
 * @param {number} length - The length of the secret key in bits.
 * @param {string} encoding - The encoding for the secret key (hex or base64).
 * @returns {string} The generated secret key as a string.
 */
const generateSecretKey = (length, encoding) => {
  const byteLength = Math.ceil(length / 8);
  const buffer = crypto.randomBytes(byteLength);
  return buffer.toString(encoding);
};

/**
 * Generates a single random secret key.
 * @param {number} length - The length of the secret key in bits.
 * @param {string} encoding - The encoding for the secret key (hex or base64).
 * @returns {Promise<string>} A promise that resolves with the generated secret key.
 */
const generateSingleKey = (length = 256, encoding = 'hex') => {
  return new Promise((resolve, reject) => {
    if (isNaN(length) || length <= 0) {
      reject(new Error('Invalid key length'));
    } else {
      const secretKey = generateSecretKey(length, encoding);
      resolve(secretKey);
    }
  });
};

/**
 * Generates multiple random secret keys.
 * @param {Array<{ length: number, encoding: string }>} keySettings - An array of individual key settings.
 * @returns {Promise<string[]>} A promise that resolves with an array of generated secret keys.
 */
const generateSecretKeys = async (keySettings) => {
  const secretKeys = [];
  for (let i = 0; i < keySettings.length; i++) {
    try {
      const { length, encoding } = keySettings[i];
      const secretKey = await generateSingleKey(length, encoding);
      secretKeys.push(secretKey);
    } catch (error) {
      console.error(`Failed to generate Secret Key ${i + 1}:`, error.message);
    }
  }
  return secretKeys;
};

const generateMultipleKeys = async () => {
  const count = await promptForKeyCount('Enter the number of secret keys to generate (default: 3): ', 3);
  const keySettings = [];

  for (let i = 0; i < count; i++) {
    console.log(`Settings for Secret Key ${i + 1}:`);
    const length = await promptForKeyLength(i + 1);
    const encoding = await promptForKeyEncoding(i + 1);
    keySettings.push({ length, encoding });
  }

  try {
    console.log(`Generating ${count} secret key(s)...\n`);
    const secretKeys = await generateSecretKeys(keySettings);
    console.log(`Generated ${count} secret key(s):\n`);
    secretKeys.forEach((secretKey, index) => {
      console.log(`Secret Key ${index + 1}: ${secretKey}`);
    });
  } catch (error) {
    console.error('Failed to generate secret keys:', error.message);
  }
};

const generateMultiKeysAuto = async (autopilot = false) => {
  let count;
  let length;

  if (autopilot) {
    count = await promptForKeyCount('Enter the number of secret keys to generate only once (default: 3): ', 3);
    length = await promptForKeyLength('Autopilot: Enter the length of Secret Keys once in bits (default: 256): ', 256);
  } else {
    count = await promptForKeyCount('Enter the number of secret keys to generate (default: 3): ', 3);
    length = await promptForKeyLength(`Enter the length of Secret Key in bits (default: 256): `, 256);
  }

  const keySettings = [];

  for (let i = 0; i < count; i++) {
    keySettings.push({ length, encoding: 'hex' });
  }

  try {
    console.log(`Generating ${count} secret key(s)...\n`);
    const secretKeys = await generateSecretKeys(keySettings);
    console.log(`Generated ${count} secret key(s):\n`);
    secretKeys.forEach((secretKey, index) => {
      console.log(`Secret Key ${index + 1}: ${secretKey}`);
    });
  } catch (error) {
    console.error('Failed to generate secret keys:', error.message);
  }
};

const promptForKeyCount = (question, defaultValue) => {
  return new Promise((resolve) => {
    rl.question(question, (count) => {
      resolve(parseInt(count) || defaultValue);
    });
  });
};

const promptForKeyLength = (keyNumber) => {
  return new Promise((resolve) => {
    rl.question(`Enter the length of Secret Key ${keyNumber} in bits: `, (length) => {
      resolve(parseInt(length) || 256);
    });
  });
};

const promptForKeyEncoding = (keyNumber) => {
  return new Promise((resolve) => {
    rl.question(`Enter the encoding for Secret Key ${keyNumber} (hex or base64): `, (encoding) => {
      resolve(encoding.trim().toLowerCase() || 'hex');
    });
  });
};

const showMenu = () => {
  console.log('Secret Key Generator');
  console.log('---------------------');
  console.log('1. Generate Single Key');
  console.log('2. Generate Multiple Keys');
  console.log('3. Generate Multiple Keys (Autopilot)');
  console.log('4. Exit');

  rl.question('Enter your choice: ', async (choice) => {
    switch (choice) {
      case '1':
        generateSingleKey().finally(() => showMenu());
        break;
      case '2':
        generateMultipleKeys().finally(() => showMenu());
        break;
      case '3':
        generateMultiKeysAuto(true).finally(() => showMenu());
        break;
      case '4':
        rl.close();
        break;
      default:
        console.log('Invalid choice. Please try again.\n');
        showMenu();
        break;
    }
  });
};

showMenu();
api.integrateWithProject();