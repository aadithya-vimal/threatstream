import { initializeApp } from 'firebase/app';
// Add these imports for the new function
import { getDatabase, ref, onChildAdded, query, orderByChild, limitToLast, get } from 'firebase/database';

// Firebase configuration from environment variables (remains the same)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let database = null;

/**
 * Initialize Firebase app and return database instance
 * @returns {Object} Firebase database instance
 */
export const initializeFirebase = () => {
  try {
    const hasAllConfig = Object.values(firebaseConfig).every(val => val !== undefined && val !== '');
    if (!hasAllConfig) {
      console.warn('Firebase configuration incomplete. Please check your .env file.');
      // Optionally throw an error or return null if config is critical
      // return null; // Or throw new Error('Firebase config missing');
    }

    // Initialize Firebase only once
    if (!database) {
        const app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        console.log('Firebase initialized successfully');
    }
    return database;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    // Attempt to get existing instance if initialization failed due to re-init
    if (error.code === 'app/duplicate-app') {
        console.log("Firebase already initialized, attempting to get instance.");
        try {
            // Check if the app instance exists before trying to get database
            const existingApp = initializeApp(firebaseConfig, 'DEFAULT'); // Attempt to get default app instance
            database = getDatabase(existingApp);
            return database;
        } catch (reinitError) {
             console.error('Could not get existing Firebase instance:', reinitError);
             throw reinitError; // Re-throw if getting instance also fails
        }
    }
    throw error; // Re-throw original error if it wasn't duplicate-app
  }
};


/**
 * Validate threat data structure (remains the same)
 * @param {Object} data - Threat data object
 * @returns {boolean} True if valid, false otherwise
 */
const validateThreatData = (data) => {
  if (typeof data?.ip !== 'string') { // Added optional chaining for safety
    console.warn('Invalid threat data received: ip is missing or invalid', data);
    return false;
  }
  if (typeof data?.lat !== 'number') {
    console.warn('Invalid threat data received: lat is missing or invalid', data);
    return false;
  }
  if (typeof data?.lon !== 'number') {
    console.warn('Invalid threat data received: lon is missing or invalid', data);
    return false;
  }
  if (typeof data?.country !== 'string') {
    console.warn('Invalid threat data received: country is missing or invalid', data);
    return false;
  }
  if (typeof data?.attack_type !== 'string') {
    console.warn('Invalid threat data received: attack_type is missing or invalid', data);
    return false;
  }
  if (typeof data?.timestamp !== 'number') {
    console.warn('Invalid threat data received: timestamp is missing or invalid', data);
    return false;
  }
  return true;
};

/**
 * Listen for new threat data from Firebase Realtime Database (remains mostly the same)
 * @param {Function} callback - Function to call when new threat arrives
 * @returns {Function} Unsubscribe function to stop listening, or null if setup fails
 */
export const listenForThreats = (callback) => {
  try {
    if (!database) {
      initializeFirebase(); // Ensure initialized
      if (!database) { // Check again after attempting init
          throw new Error("Database not initialized after calling initializeFirebase.");
      }
    }
    const threatsRef = ref(database, 'threats');
    console.log('Listening for new threats at /threats');

    const unsubscribe = onChildAdded(threatsRef, (snapshot) => {
      const threatData = snapshot.val();
      if (validateThreatData(threatData)) {
        callback(threatData);
      }
    }, (error) => {
      if (error.code === 'PERMISSION_DENIED') {
        console.error('Firebase permission denied. Check your database security rules.');
      } else {
        console.error('Firebase listener error:', error);
      }
      // Consider adding logic here to notify the UI or attempt reconnection
    });

    return unsubscribe; // Return the function to detach the listener later
  } catch (error) {
    console.error('Failed to set up Firebase listener:', error);
    // Return null or a no-op function if setup failed, so cleanup doesn't error
    return () => {};
  }
};

// --- NEW FUNCTION ---
/**
 * Fetches the most recent threat entries from Firebase
 * @param {number} [limit=50] - The maximum number of recent threats to fetch
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of threat objects (newest first)
 */
export const getRecentThreats = async (limit = 50) => {
  try {
    if (!database) {
      initializeFirebase(); // Ensure initialized
      if (!database) { // Check again after attempting init
          throw new Error("Database not initialized after calling initializeFirebase.");
      }
    }
    const threatsRef = ref(database, 'threats');
    // Create a query to get the last 'limit' items ordered by timestamp
    const recentThreatsQuery = query(
      threatsRef,
      orderByChild('timestamp'), // Order by the 'timestamp' field
      limitToLast(limit)        // Get only the last 'limit' items
    );

    console.log(`Fetching last ${limit} threats...`);
    const snapshot = await get(recentThreatsQuery); // Execute the query once

    if (snapshot.exists()) {
      const threatsData = [];
      // The snapshot contains the data; loop through each child
      snapshot.forEach((childSnapshot) => {
        const threat = childSnapshot.val();
        // Add validation here as well for robustness
        if (validateThreatData(threat)) {
             threatsData.push(threat);
        }
      });
      console.log(`Fetched ${threatsData.length} recent threats.`);
      // Reverse the array so the absolute newest threat is at index 0
      return threatsData.reverse();
    } else {
      console.log('No recent threats found in Firebase.');
      return []; // Return empty array if no data exists
    }
  } catch (error) {
    console.error('Error fetching recent threats:', error);
    return []; // Return empty array on error
  }
};
// --- END NEW FUNCTION ---
