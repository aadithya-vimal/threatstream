import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import StatsCounters from '../components/StatsCounters'
import Globe from '../components/Globe'
import ThreatFeed from '../components/ThreatFeed'
import { listenForThreats } from '../services/firebaseService'
import './Dashboard.css'

function Dashboard() {
  const [threats, setThreats] = useState([])

  // Calculate threat statistics based on severity mapping
  const calculateStats = (threatsArray) => {
    const stats = {
      total: threatsArray.length,
      critical: 0,
      high: 0,
      mediumLow: 0
    }

    threatsArray.forEach(threat => {
      const type = threat.attack_type?.toLowerCase() || 'unknown'

      // Critical: bots, strongips
      if (type === 'bots' || type === 'strongips') {
        stats.critical++
      }
      // High: ssh, apache
      else if (type === 'ssh' || type === 'apache') {
        stats.high++
      }
      // Medium/Low: everything else (ftp, imap, sip, all, unknown)
      else {
        stats.mediumLow++
      }
    })

    return stats
  }

  // Set up Firebase listener on component mount
  useEffect(() => {
    const handleNewThreat = (threat) => {
      setThreats(prev => {
        // Add new threat to beginning of array
        const updated = [threat, ...prev]
        // Keep only latest 100 threats to prevent memory issues
        return updated.slice(0, 100)
      })
    }

    // Initialize listener
    const unsubscribe = listenForThreats(handleNewThreat)

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  const threatStats = calculateStats(threats)

  return (
    <div className="dashboard-container">
      <StatsCounters threatStats={threatStats} />
      <div className="main-content">
        <div className="globe-section">
          <Globe threats={threats} />
        </div>
        <div className="feed-section">
          <ThreatFeed threats={threats} />
        </div>
      </div>
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
  )
}

export default Dashboard
