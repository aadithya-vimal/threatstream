import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onChildAdded } from 'firebase/database'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

let database = null

/**
 * Initialize Firebase app and return database instance
 * @returns {Object} Firebase database instance
 */
export const initializeFirebase = () => {
  try {
    // Check if all required config values are present
    const hasAllConfig = Object.values(firebaseConfig).every(val => val !== undefined && val !== '')

    if (!hasAllConfig) {
      console.warn('Firebase configuration incomplete. Please check your .env file.')
    }

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    database = getDatabase(app)

    console.log('Firebase initialized successfully')
    return database
  } catch (error) {
    console.error('Firebase initialization failed:', error)
    throw error
  }
}

/**
 * Validate threat data structure
 * @param {Object} data - Threat data object
 * @returns {boolean} True if valid, false otherwise
 */
const validateThreatData = (data) => {
  // Check all required fields exist and have correct types
  if (typeof data.ip !== 'string') {
    console.warn('Invalid threat data received: ip is missing or invalid')
    return false
  }
  if (typeof data.lat !== 'number') {
    console.warn('Invalid threat data received: lat is missing or invalid')
    return false
  }
  if (typeof data.lon !== 'number') {
    console.warn('Invalid threat data received: lon is missing or invalid')
    return false
  }
  if (typeof data.country !== 'string') {
    console.warn('Invalid threat data received: country is missing or invalid')
    return false
  }
  if (typeof data.attack_type !== 'string') {
    console.warn('Invalid threat data received: attack_type is missing or invalid')
    return false
  }
  if (typeof data.timestamp !== 'number') {
    console.warn('Invalid threat data received: timestamp is missing or invalid')
    return false
  }

  return true
}

/**
 * Listen for new threat data from Firebase Realtime Database
 * @param {Function} callback - Function to call when new threat arrives
 * @returns {Function} Unsubscribe function to stop listening
 */
export const listenForThreats = (callback) => {
  try {
    // Initialize Firebase if not already done
    if (!database) {
      initializeFirebase()
    }

    // Create reference to /threats path
    const threatsRef = ref(database, 'threats')

    console.log('Listening for threats at /threats')

    // Set up listener for child_added events
    const unsubscribe = onChildAdded(threatsRef, (snapshot) => {
      const threatData = snapshot.val()

      // Validate data before calling callback
      if (validateThreatData(threatData)) {
        // Optional: Log new threats (can be verbose)
        // console.log(`New threat received: ${threatData.attack_type} from ${threatData.country}`)

        callback(threatData)
      }
    }, (error) => {
      // Handle database connection errors
      if (error.code === 'PERMISSION_DENIED') {
        console.error('Firebase permission denied. Check your database security rules.')
      } else {
        console.error('Firebase listener error:', error)
      }
    })

    // Return unsubscribe function for cleanup
    return unsubscribe
  } catch (error) {
    console.error('Failed to set up Firebase listener:', error)
    throw error
  }
}
