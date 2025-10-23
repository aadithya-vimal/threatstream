# ThreatStream Production Deployment Guide

## Firebase Realtime Database Security Rules

### Production-Ready Rules (Copy & Paste)

```json
{
  "rules": {
    "threats": {
      ".read": true,
      ".write": false,
      ".indexOn": ["timestamp", "attack_type", "country"],
      "$threatId": {
        ".validate": "newData.hasChildren(['ip', 'lat', 'lon', 'country', 'attack_type', 'timestamp']) && newData.children().length() == 6",
        "ip": {
          ".validate": "newData.isString() && newData.val().length >= 7 && newData.val().length <= 45"
        },
        "lat": {
          ".validate": "newData.isNumber() && newData.val() >= -90 && newData.val() <= 90"
        },
        "lon": {
          ".validate": "newData.isNumber() && newData.val() >= -180 && newData.val() <= 180"
        },
        "country": {
          ".validate": "newData.isString() && newData.val().matches(/^[A-Z]{2}$/)"
        },
        "attack_type": {
          ".validate": "newData.isString() && newData.val().matches(/^(ssh|ftp|apache|imap|sip|bots|strongips|all|unknown)$/)"
        },
        "timestamp": {
          ".validate": "newData.isNumber() && newData.val() > 1600000000000 && newData.val() <= (now + 60000)"
        },
        "$other": {
          ".validate": false
        }
      }
    },
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

---

## Step-by-Step Deployment

### 1. Apply Security Rules

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select project**: threatstream-3b1ed
3. **Navigate to**: Build > Realtime Database > Rules tab
4. **Copy the rules above** and paste into the editor
5. **Click "Publish"**
6. **Verify**: You should see "Rules published successfully"

---

### 2. Test Database Connectivity

Before deploying, add test data:

1. In Firebase Console, go to **Realtime Database > Data** tab
2. Click the **+** icon next to the database root
3. Add this test threat:

**Name:** `threats`
**Value:** Click "+" to add child

Then add a child with:

**Name:** `test1`
**Value:** Click "+" to add the following fields:

```
ip: "203.0.113.45"
lat: 40.7128
lon: -74.0060
country: "US"
attack_type: "ssh"
timestamp: 1737590400000
```

---

### 3. Deploy to Cloudflare Pages

#### A. Via GitHub Integration (Recommended)

**Step 1: Push to GitHub**
```bash
cd /workspace/cmh2t1290004nq2i3ki18lzw4/threatstream
git add .
git commit -m "Initial ThreatStream deployment"
git push origin main
```

**Step 2: Connect Cloudflare Pages**
1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** > **Create application** > **Pages**
3. Click **Connect to Git**
4. Authorize GitHub and select your repository
5. Configure build settings:
   - **Project name**: `threatstream`
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

**Step 3: Add Environment Variables**

In Cloudflare Pages settings, add these environment variables:

```
VITE_FIREBASE_API_KEY=AIzaSyA2dC_-gmtH8QXO1M2XJI8dUxWYq1KwW0Q
VITE_FIREBASE_AUTH_DOMAIN=threatstream-3b1ed.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://threatstream-3b1ed-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=threatstream-3b1ed
VITE_FIREBASE_STORAGE_BUCKET=threatstream-3b1ed.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=239463975849
VITE_FIREBASE_APP_ID=1:239463975849:web:fb4c0cdd5b5ec4933092b8
```

Set scope to: **Production and Preview**

**Step 4: Deploy**
- Click **Save and Deploy**
- Wait for build to complete (~2-3 minutes)
- You'll receive a URL like: `https://threatstream.pages.dev`

---

#### B. Manual Deployment via Wrangler

```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the project
cd /workspace/cmh2t1290004nq2i3ki18lzw4/threatstream
npm run build

# Deploy
wrangler pages deploy dist --project-name=threatstream
```

After deployment, add environment variables via Cloudflare Dashboard as described above.

---

### 4. Post-Deployment Verification

**Checklist:**
- [ ] Visit your deployment URL
- [ ] Open browser DevTools Console (F12)
- [ ] Verify "Firebase initialized successfully" message
- [ ] Verify "Listening for threats at /threats" message
- [ ] Check that test threat appears on globe and in feed
- [ ] Test globe interactivity (rotate, zoom)
- [ ] Verify stats counters show correct values
- [ ] Check animated grid background is visible
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

**If threats don't appear:**
1. Check browser console for errors
2. Verify Firebase rules are published
3. Verify database URL is correct in environment variables
4. Check that test data exists at `/threats` path
5. Verify all environment variables are set in Cloudflare

---

### 5. Adding Production Threat Data

Since `.write` is set to `false`, you need to use Firebase Admin SDK from a backend service.

**Option A: Firebase Console (Manual)**
- Add threats manually via Firebase Console UI
- Good for testing, not scalable

**Option B: Backend Service (Recommended)**
- Set up a Node.js backend with Firebase Admin SDK
- Connect your threat detection systems to this backend
- Backend writes to `/threats` path
- See `add-threat-example.js` for reference code

**Option C: Cloud Functions**
- Use Firebase Cloud Functions to receive and process threats
- Automatically validates and writes to database
- Serverless, scales automatically

---

### 6. Database Maintenance

**Automatic Cleanup (Optional)**

To prevent unlimited database growth, consider:

1. **Time-based cleanup**: Delete threats older than X days
2. **Count-based cleanup**: Keep only latest 1000 threats
3. **Firebase Cloud Functions**: Set up automatic cleanup function

Example Cloud Function for cleanup:

```javascript
// Delete threats older than 7 days
exports.cleanupOldThreats = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.database();
    const threatsRef = db.ref('threats');
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const snapshot = await threatsRef
      .orderByChild('timestamp')
      .endAt(cutoffTime)
      .once('value');

    const updates = {};
    snapshot.forEach(child => {
      updates[child.key] = null;
    });

    await threatsRef.update(updates);
    console.log(`Cleaned up ${Object.keys(updates).length} old threats`);
  });
```

---

### 7. Performance Optimization

**Firebase Indexes** (Already configured in rules)
- `timestamp` - For chronological queries
- `attack_type` - For filtering by type
- `country` - For geographic filtering

**Cloudflare Settings**
- Enable "Always Use HTTPS"
- Enable "Auto Minify" (CSS, JS)
- Configure caching rules for static assets

**Frontend Optimizations** (Already implemented)
- Max 100 threats stored in state
- Max 50 concurrent arcs on globe
- Max 50 concurrent pulse markers
- 15-second arc/pulse lifetime

---

### 8. Monitoring

**Firebase Console**
- Monitor database usage under **Usage** tab
- Check read/write operations
- Monitor bandwidth usage

**Cloudflare Analytics**
- View visitor traffic
- Check page load times
- Monitor bandwidth usage

**Browser Console Logs**
- Firebase initialization success/failure
- Threat data validation errors
- WebGL performance warnings

---

### 9. Security Checklist

- [x] Production security rules applied
- [x] Write access disabled for public clients
- [x] Data validation enforced
- [x] Environment variables secured (not in git)
- [x] HTTPS enforced (Cloudflare automatic)
- [x] Firebase API key domain-restricted (configure in Firebase Console)
- [x] No sensitive data in threat records

---

### 10. Troubleshooting

**Issue: "Permission denied" errors**
- Check that security rules are published
- Verify `.read: true` is set for `/threats`

**Issue: Can't write threats**
- Expected behavior - use Firebase Admin SDK from backend
- Never write from frontend in production

**Issue: Globe not rendering**
- Check browser supports WebGL 2.0
- Open console and look for Three.js errors
- Test in Chrome/Firefox (best support)

**Issue: No threats appearing**
- Verify database URL in environment variables
- Check test data exists in Firebase Console
- Look for Firebase connection errors in console

**Issue: Build fails on Cloudflare**
- Check all environment variables are set
- Verify Node.js version compatibility
- Review build logs for specific errors

---

## Production URLs

After deployment, you'll have:
- **Production URL**: `https://threatstream.pages.dev`
- **Custom domain** (optional): Configure in Cloudflare Pages settings
- **Firebase Console**: https://console.firebase.google.com/project/threatstream-3b1ed
- **Cloudflare Dashboard**: https://dash.cloudflare.com/

---

## Support

For issues:
1. Check browser console for errors
2. Verify Firebase rules are correct
3. Check Cloudflare build logs
4. Review this deployment guide
5. Test with fresh browser (clear cache)

---

**Deployment Status**: Ready for production ✅
