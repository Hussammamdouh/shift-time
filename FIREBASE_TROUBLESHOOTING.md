# Firebase Troubleshooting Guide

## Issues Encountered

### 1. Firebase Quota Exceeded Error
**Error**: `FirebaseError: [code=resource-exhausted]: Quota exceeded.`

**Cause**: Your Firebase project `shift-manager-hm47` has hit its usage limits.

**Solutions**:
- **Upgrade Firebase Plan**: Go to [Firebase Console](https://console.firebase.google.com/) → Billing → Upgrade to Blaze (pay-as-you-go) plan
- **Check Current Usage**: Go to Firebase Console → Usage and billing to see current limits
- **Wait for Reset**: Free tier quotas reset monthly
- **Optimize Usage**: Reduce unnecessary Firestore reads/writes

### 2. OAuth Domain Not Authorized
**Error**: `The current domain is not authorized for OAuth operations. This will prevent signInWithPopup, signInWithRedirect, linkWithPopup and linkWithRedirect from working.`

**Cause**: The domain `hussammamdouh.github.io` is not in Firebase's authorized domains list.

**Solution**:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project `shift-manager-hm47`
3. Go to Authentication → Settings → Authorized domains
4. Click "Add domain"
5. Add `hussammamdouh.github.io`
6. Click "Add"

### 3. Manifest.json 404 Error
**Error**: `GET https://hussammamdouh.github.io/manifest.json 404 (Not Found)`

**Cause**: The app is trying to fetch manifest from the wrong domain.

**Solution**: ✅ **Fixed** - Updated `public/manifest.json` to use correct paths.

## Immediate Actions Required

### 1. Fix Firebase Quota (Most Critical)
```bash
# Check your current Firebase usage
# Go to: https://console.firebase.google.com/project/shift-manager-hm47/usage
```

**Options**:
- **Upgrade to Blaze Plan**: $25/month base + usage-based pricing
- **Wait for Monthly Reset**: If on free tier
- **Optimize Code**: Reduce Firestore operations

### 2. Authorize GitHub Pages Domain
```bash
# Add this domain to Firebase Console:
hussammamdouh.github.io
```

### 3. Check Environment Variables
Ensure your `.env.local` file has all required Firebase config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=shift-manager-hm47.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=shift-manager-hm47
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=shift-manager-hm47.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Code Improvements Made

### 1. Enhanced Error Handling
- Added `FirebaseErrorHandler` component for global error catching
- Implemented quota exceeded error detection
- Added user-friendly error messages

### 2. Firebase Utilities
- Added `withQuotaErrorHandling` function for graceful fallbacks
- Added `isQuotaExceededError` helper function
- Enhanced error logging and user feedback

### 3. Manifest Fixes
- Updated paths in `manifest.json`
- Fixed GitHub Pages deployment issues

## Testing the Fixes

1. **Deploy Changes**: Push your updated code to GitHub
2. **Check Console**: Look for reduced error messages
3. **Verify Firebase**: Ensure domain is authorized
4. **Monitor Usage**: Check Firebase Console for quota status

## Long-term Recommendations

### 1. Firebase Optimization
- Implement data caching strategies
- Use offline persistence wisely
- Batch Firestore operations
- Implement proper error boundaries

### 2. Monitoring
- Set up Firebase usage alerts
- Monitor read/write patterns
- Implement usage analytics

### 3. Alternative Solutions
- Consider local storage for non-critical data
- Implement offline-first architecture
- Use Firebase Emulator for development

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [GitHub Pages Documentation](https://pages.github.com/)

## Quick Commands

```bash
# Check current Firebase project
firebase projects:list

# Check Firebase usage
firebase use shift-manager-hm47

# Deploy to GitHub Pages
npm run build:pages
```

---

**Note**: The most critical issue is the Firebase quota exceeded. This needs immediate attention to restore full functionality.
