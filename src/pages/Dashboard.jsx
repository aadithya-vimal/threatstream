// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatsCounters from '../components/StatsCounters';
import Globe from '../components/Globe';
import ThreatFeed from '../components/ThreatFeed';
// Import the NEW function `getRecentThreats` alongside the existing one
import { listenForThreats, getRecentThreats } from '../services/firebaseService';
import './Dashboard.css';

function Dashboard() {
  const [threats, setThreats] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Added loading state

  // Calculate threat statistics (This function remains the same)
  const calculateStats = (threatsArray) => {
    const stats = {
      total: threatsArray.length,
      critical: 0,
      high: 0,
      mediumLow: 0
    };

    threatsArray.forEach(threat => {
      const type = threat.attack_type?.toLowerCase() || 'unknown';

      // Critical: bots, strongips
      if (type === 'bots' || type === 'strongips') {
        stats.critical++;
      }
      // High: ssh, apache
      else if (type === 'ssh' || type === 'apache') {
        stats.high++;
      }
      // Medium/Low: everything else (ftp, imap, sip, all, unknown)
      else {
        stats.mediumLow++;
      }
    });

    return stats;
  };

  // NEW useEffect hook to handle initial load AND listener setup
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true; // Flag to prevent state updates if unmounted

    const setupListener = () => {
       // Only start listening after initial load finishes
       unsubscribe = listenForThreats((newThreat) => {
        if (isMounted) {
          setThreats(prev => {
            // Prevent adding duplicates if it arrives via listener right after initial load
            if (prev.some(t => t.timestamp === newThreat.timestamp && t.ip === newThreat.ip)) {
                return prev;
            }
            const updated = [newThreat, ...prev];
            return updated.slice(0, 100); // Keep max 100
          });
        }
      });
    };

    // Fetch initial data when component mounts
    const fetchInitialData = async () => {
        setIsLoading(true);
        console.log("Fetching initial threat data...");
        // Call the new function to get the last 50 threats
        const initialThreats = await getRecentThreats(50);
        if (isMounted) {
            setThreats(initialThreats); // Set the initial state
            setIsLoading(false);        // Update loading status
            console.log("Initial data loaded, starting listener.");
            setupListener(); // Start the real-time listener AFTER initial load
        }
    };

    fetchInitialData(); // Run the initial fetch

    // Cleanup function (runs when component unmounts)
    return () => {
      isMounted = false; // Set flag when unmounting
      if (unsubscribe) {
        console.log("Unsubscribing from Firebase listener.");
        unsubscribe(); // Stop listening to Firebase
      }
    };
  }, []); // Empty dependency array means this runs only once on mount

  const threatStats = calculateStats(threats);

  return (
    <div className="dashboard-container">
      {/* Display stats counters */}
      <StatsCounters threatStats={threatStats} />
      <div className="main-content">
        <div className="globe-section">
          {/* Globe component receives the threats state */}
          <Globe threats={threats} />
        </div>
        <div className="feed-section">
          {/* Conditionally render loading text or the feed */}
          {isLoading ? (
             <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', paddingTop: '20px' }}>Loading recent threats...</div>
           ) : (
             <ThreatFeed threats={threats} />
           )}
        </div>
      </div>
      {/* Footer remains the same */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <p className="footer-text">
              &copy; 2025 Aadithya Vimal
            </p>
          </div>
          <div className="footer-right">
            <Link to="/terms" className="footer-link">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
