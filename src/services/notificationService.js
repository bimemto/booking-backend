const admin = require('firebase-admin');

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Support two methods: JSON string or individual env variables
    let serviceAccount;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      // Method 1: Individual environment variables (recommended)
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL
      };
      console.log('Loading Firebase credentials from individual environment variables');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Method 2: Base64 encoded JSON string
      try {
        // Decode base64 to get the JSON string
        const decodedString = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decodedString);
        console.log('Loading Firebase credentials from base64 encoded environment variable');
      } catch (decodeError) {
        console.error('Failed to decode base64 or parse JSON:', decodeError.message);
        throw decodeError;
      }
    } else {
      console.warn('Firebase service account credentials not found.');
      console.warn('Please provide either:');
      console.warn('1. FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL (recommended), or');
      console.warn('2. FIREBASE_SERVICE_ACCOUNT as base64 encoded JSON string');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error.message);
    console.error('Please check your Firebase credentials in .env file');
  }
};

/**
 * Send push notification to a driver
 * @param {string} fcmToken - FCM token of the driver
 * @param {Object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} data - Additional data to send with notification
 */
const sendNotification = async (fcmToken, notification, data = {}) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping notification.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmToken) {
    console.warn('FCM token not provided. Skipping notification.');
    return { success: false, error: 'FCM token not provided' };
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);

    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send verification approval notification to driver
 * @param {string} fcmToken - FCM token of the driver
 * @param {string} driverName - Name of the driver
 */
const sendDriverVerificationNotification = async (fcmToken, driverName) => {
  return sendNotification(
    fcmToken,
    {
      title: 'Account Verified',
      body: `Congratulations ${driverName}! Your driver account has been verified and approved.`
    },
    {
      type: 'VERIFICATION_SUCCESS',
      timestamp: new Date().toISOString()
    }
  );
};

module.exports = {
  initializeFirebase,
  sendNotification,
  sendDriverVerificationNotification
};
