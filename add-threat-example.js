// Example backend script to add threats to Firebase
// This requires Firebase Admin SDK and service account credentials
// DO NOT run this from the frontend - backend/server only!

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need a service account key)
// Download from: Firebase Console > Project Settings > Service Accounts
// const serviceAccount = require('./path/to/serviceAccountKey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://threatstream-3b1ed-default-rtdb.firebaseio.com'
// });

// Example: Add a single threat
async function addThreat(threatData) {
  const db = admin.database();
  const threatsRef = db.ref('threats');

  // Generate unique ID
  const newThreatRef = threatsRef.push();

  await newThreatRef.set(threatData);
  console.log('Threat added:', newThreatRef.key);
}

// Example threat data
const exampleThreat = {
  ip: '203.0.113.45',
  lat: 40.7128,
  lon: -74.0060,
  country: 'US',
  attack_type: 'ssh',
  timestamp: Date.now()
};

// Example: Add multiple test threats
async function addTestThreats() {
  const db = admin.database();
  const threatsRef = db.ref('threats');

  const testThreats = [
    {
      ip: '198.51.100.23',
      lat: 52.5200,
      lon: 13.4050,
      country: 'DE',
      attack_type: 'ssh',
      timestamp: Date.now()
    },
    {
      ip: '203.0.113.89',
      lat: 37.7749,
      lon: -122.4194,
      country: 'US',
      attack_type: 'apache',
      timestamp: Date.now() + 1000
    },
    {
      ip: '192.0.2.156',
      lat: 1.3521,
      lon: 103.8198,
      country: 'SG',
      attack_type: 'ftp',
      timestamp: Date.now() + 2000
    },
    {
      ip: '198.51.100.77',
      lat: 35.6762,
      lon: 139.6503,
      country: 'JP',
      attack_type: 'bots',
      timestamp: Date.now() + 3000
    },
    {
      ip: '203.0.113.200',
      lat: 51.5074,
      lon: -0.1278,
      country: 'GB',
      attack_type: 'imap',
      timestamp: Date.now() + 4000
    }
  ];

  // Add all threats
  for (const threat of testThreats) {
    const newThreatRef = threatsRef.push();
    await newThreatRef.set(threat);
    console.log('Added threat:', newThreatRef.key, '-', threat.attack_type, 'from', threat.country);

    // Wait 500ms between additions for visual effect
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('All test threats added successfully!');
}

// Usage:
// addThreat(exampleThreat);
// addTestThreats();

module.exports = { addThreat, addTestThreats };
