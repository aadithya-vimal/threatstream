# ThreatStream

Real-time cyber threat visualization platform with interactive 3D globe and live threat feed.

## Features

- **Interactive 3D Globe** - Visualize cyber attacks in real-time on a rotating Earth
- **Animated Attack Arcs** - Color-coded arcs showing attack paths from attacker to victim
- **Live Threat Feed** - Scrolling list of latest 20 threat events
- **Real-time Statistics** - Counter dashboard showing threat severity breakdown
- **Cyberpunk Theme** - Dark theme with animated grid background and neon accents
- **Firebase Integration** - Live data from Firebase Realtime Database

## Tech Stack

- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **react-globe.gl** - 3D globe visualization
- **Firebase Realtime Database** - Live threat data backend
- **CSS3 Animations** - Cyberpunk grid background

---

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Firebase Project** with Realtime Database enabled
- **Git** for version control

---

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd threatstream
```

### 2. Install dependencies

```bash
npm install
```

This will install all required packages including React, Vite, react-globe.gl, and Firebase SDK.

---

## Firebase Configuration

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard to create your project

### Step 2: Enable Realtime Database

1. In Firebase Console, navigate to **Build > Realtime Database**
2. Click "Create Database"
3. Choose location (select closest to your users)
4. Start in **test mode** (for development) or configure security rules as needed
5. Note your database URL (format: `https://PROJECT_ID-default-rtdb.firebaseio.com`)

### Step 3: Get Firebase Web App Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register app with nickname (e.g., "ThreatStream Web")
5. Copy the configuration object that appears (you'll need all these values)

### Step 4: Create Environment File

1. In the project root directory, create a file named `.env`
2. Copy the contents from `.env.example`
3. Replace placeholder values with your actual Firebase configuration:

```bash
VITE_FIREBASE_API_KEY=AIzaSyC...your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

**Important:**
- Never commit the `.env` file to version control (already in `.gitignore`)
- All environment variables must start with `VITE_` prefix for Vite to expose them
- Database URL must include `https://` and end with `.firebaseio.com`

### Step 5: Configure Database Structure

Your Firebase Realtime Database should have threats stored at the `/threats` path.

**Expected data structure:**
```json
{
  "threats": {
    "unique-threat-id-1": {
      "ip": "192.168.1.100",
      "lat": 52.5200,
      "lon": 13.4050,
      "country": "DE",
      "attack_type": "ssh",
      "timestamp": 1705334625000
    },
    "unique-threat-id-2": {
      "ip": "10.0.0.45",
      "lat": 37.7749,
      "lon": -122.4194,
      "country": "US",
      "attack_type": "apache",
      "timestamp": 1705334630000
    }
  }
}
```

**Field requirements:**
- `ip` (string) - Attacker IP address
- `lat` (number) - Attacker latitude (-90 to 90)
- `lon` (number) - Attacker longitude (-180 to 180)
- `country` (string) - 2-letter ISO country code
- `attack_type` (string) - Type: ssh, ftp, apache, imap, sip, bots, strongips, all
- `timestamp` (number) - Unix timestamp in milliseconds

### Step 6: Test Firebase Connection

You can test by manually adding a threat entry in Firebase Console:
1. Go to Realtime Database in Firebase Console
2. Click the **+** icon next to your database root
3. Add a child at path `/threats/test1`
4. Enter the data structure shown above
5. Click "Add"

When you run the app, this threat should appear on the globe and in the feed.

---

## Local Development

### Start Development Server

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`

**What happens:**
- Hot Module Replacement (HMR) enabled - changes appear instantly
- Firebase connection established
- Listens for new threats at `/threats` path
- Console logs show Firebase initialization status

### Development Features

- **Auto-reload** - File changes trigger instant updates
- **Error overlay** - Build errors shown in browser
- **Fast refresh** - React state preserved during updates
- **Console logging** - Firebase events logged to browser console

### Troubleshooting

**Issue:** "Firebase configuration incomplete" error
- **Solution:** Check `.env` file exists and all variables are set correctly

**Issue:** No threats appearing on globe
- **Solution:**
  - Check Firebase Database URL in `.env`
  - Verify data exists at `/threats` path in Firebase Console
  - Check browser console for Firebase errors

**Issue:** Globe not rendering
- **Solution:**
  - Check browser console for WebGL errors
  - Ensure browser supports WebGL 2.0
  - Try different browser (Chrome/Firefox recommended)

---

## Building for Production

### Create Production Build

```bash
npm run build
```

**What happens:**
- React code compiled and optimized
- Assets minified and bundled
- Output generated in `dist/` directory
- Source maps disabled for smaller bundle size
- Environment variables from `.env` baked into build

**Build output structure:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
```

### Preview Production Build Locally

```bash
npm run preview
```

This serves the production build locally for testing before deployment.

---

## Deployment to Cloudflare Pages

Cloudflare Pages offers free hosting with CDN, automatic HTTPS, and unlimited bandwidth.

### Method 1: GitHub Integration (Recommended)

**Advantages:**
- Automatic deployments on git push
- Preview deployments for pull requests
- Easy rollback to previous versions
- CI/CD pipeline included

**Steps:**

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Initial ThreatStream deployment"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
   - Authorize Cloudflare to access your GitHub account
   - Select your `threatstream` repository

3. **Configure Build Settings**
   - **Project name:** threatstream (or your preferred name)
   - **Production branch:** main
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** / (or leave empty)

4. **Set Environment Variables**
   - Click **Environment variables (advanced)**
   - Add each Firebase variable (use same values from your `.env` file):
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_DATABASE_URL`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
   - Set scope to **Production** and **Preview** for all variables

5. **Deploy**
   - Click **Save and Deploy**
   - Cloudflare builds and deploys your app
   - You'll get a URL like `https://threatstream-xyz.pages.dev`

6. **Future Updates**
   - Push to GitHub triggers automatic rebuild and deployment
   - Check deployment status in Cloudflare dashboard

### Method 2: Manual Upload via Wrangler CLI

**Advantages:**
- No GitHub required
- Direct control over deployments
- Useful for testing or private projects

**Steps:**

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```
   This opens browser for authentication.

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Deploy to Cloudflare Pages**
   ```bash
   wrangler pages deploy dist --project-name=threatstream
   ```

   - First time: Creates new project named "threatstream"
   - Subsequent deploys: Updates existing project
   - You'll receive deployment URL in terminal

5. **Set Environment Variables** (via Cloudflare Dashboard)
   - Go to Cloudflare Dashboard > Workers & Pages
   - Select your `threatstream` project
   - Go to **Settings** > **Environment variables**
   - Add all `VITE_FIREBASE_*` variables
   - Redeploy for changes to take effect

**For subsequent deployments:**
```bash
npm run build && wrangler pages deploy dist --project-name=threatstream
```

### Post-Deployment Verification

After deployment (either method):

1. **Visit your deployment URL**
2. **Open browser console** - Check for Firebase connection logs
3. **Add test threat in Firebase** - Verify it appears on globe
4. **Check all features:**
   - Globe renders and is interactive (rotate, zoom)
   - Stats counters display (may be 0 if no threats yet)
   - Threat feed shows "Waiting for threat data..." or recent threats
   - Animated grid background visible
   - Header and dashboard button present

### Custom Domain (Optional)

To use your own domain with Cloudflare Pages:

1. In Cloudflare Dashboard, go to your Pages project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter your domain (e.g., `threatstream.yourdomain.com`)
5. Follow DNS configuration instructions
6. Cloudflare automatically provisions SSL certificate

---

## Project Structure

```
threatstream/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── Header.jsx
│   │   ├── StatsCounters.jsx
│   │   ├── Globe.jsx
│   │   └── ThreatFeed.jsx
│   ├── services/         # Firebase integration
│   │   └── firebaseService.js
│   ├── App.jsx          # Root component
│   ├── App.css          # App-specific styles
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles and theme
├── .env                 # Environment config (not in git)
├── .env.example         # Environment template
├── .gitignore
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── README.md            # This file
```

---

## Attack Type Color Reference

Each attack type displays with a distinct color:

| Attack Type | Color | Hex Code | Target Location |
|-------------|-------|----------|-----------------|
| ssh | Bright Cyan | #00FFFF | Berlin |
| ftp | Bright Green | #00FF00 | Singapore |
| apache | Bright Red | #FF0000 | San Francisco |
| imap | Purple | #8A2BE2 | Berlin |
| sip | Orange | #FFA500 | Singapore |
| bots | Pink | #FF1493 | Singapore |
| strongips | White | #FFFFFF | Singapore |
| all | Yellow | #FFFF00 | San Francisco |
| unknown | Yellow | #FFFF00 | San Francisco |

---

## Target Locations

Static victim markers on globe:

- **SSH/IMAP Target** - Berlin, Germany (52.5200°N, 13.4050°E)
- **Web Target** - San Francisco, USA (37.7749°N, 122.4194°W)
- **IoT Target** - Singapore (1.3521°N, 103.8198°E)

---

## Browser Compatibility

**Recommended browsers:**
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

**Requirements:**
- WebGL 2.0 support (for 3D globe)
- ES6+ JavaScript support
- CSS3 animations support

---

## Performance Notes

- **Max threats stored:** 100 (automatic pruning)
- **Max active arcs:** 50 concurrent
- **Arc lifetime:** 15 seconds (auto-fade)
- **Feed display:** Latest 20 threats only

These limits ensure smooth performance even with high-volume threat data.

---

## Security Considerations

**Firebase Rules:**
- For production, configure proper Realtime Database security rules
- Example read-only rule (for public threat feed):
  ```json
  {
    "rules": {
      "threats": {
        ".read": true,
        ".write": "auth != null"
      }
    }
  }
  ```

**Environment Variables:**
- Never commit `.env` file to public repositories
- Firebase API key is safe to expose in client code (domain-restricted in Firebase Console)
- Use Firebase security rules to control data access

---

## License

[Specify your license here]

---

## Support

For issues or questions:
- Check browser console for error messages
- Verify Firebase configuration
- Ensure Realtime Database has data at `/threats` path
- Check WebGL support in browser
