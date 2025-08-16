# 🚀 GitHub Pages Deployment Guide

## ✅ **Issue Fixed: Static Export Configuration**

The 404 error was caused by Next.js being configured for server-side rendering (`output: 'standalone'`), but GitHub Pages only supports static files.

**Solution**: Changed to `output: 'export'` for static site generation.

## 🚀 **Deploy to GitHub Pages**

### **Step 1: Push the Fixed Configuration**

```bash
git add .
git commit -m "🔧 Fix GitHub Pages deployment - use static export"
git push origin main
```

### **Step 2: Verify GitHub Pages Settings**

1. Go to: `https://github.com/Hussammamdouh/shift-time/settings/pages`
2. **Source**: Set to **"GitHub Actions"**
3. Click **Save**

### **Step 3: Add Environment Variables (CRITICAL!)**

1. Go to: **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyCjBdzEnNW7r1Z5rFuif1JTS5ghZzpOWyI
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = shift-manager-hm47.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID = shift-manager-hm47
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = shift-manager-hm47.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 538729969739
   NEXT_PUBLIC_FIREBASE_APP_ID = 1:538729969739:web:eefef3ad4bc209f7e475ce
   ```

### **Step 4: Watch Deployment**

1. Go to **Actions** tab in your repository
2. Watch the "Deploy to GitHub Pages (Simple)" workflow
3. Wait for it to complete successfully

### **Step 5: Access Your Live Site**

Your app will be available at:
```
https://hussammamdouh.github.io/shift-time/
```

## 🔧 **What Changed for GitHub Pages**

### **1. Next.js Configuration**
- ✅ `output: 'export'` - Creates static files
- ✅ `basePath: '/shift-time'` - Subdirectory deployment
- ✅ `assetPrefix: '/shift-time/'` - Asset path prefix
- ✅ `trailingSlash: true` - GitHub Pages compatibility
- ✅ `images: { unoptimized: true }` - Static image handling

### **2. Build Output**
- ✅ Creates `out/` directory with static files
- ✅ All pages pre-rendered as HTML
- ✅ No server-side dependencies
- ✅ All assets use `/shift-time/` prefix

### **3. GitHub Actions**
- ✅ Uses `actions/deploy-pages@v4` (official action)
- ✅ Uploads from `out/` directory
- ✅ Proper permissions for Pages deployment
- ✅ Copies public files to output directory

## 🎯 **Features That Work on GitHub Pages**

- ✅ **Stopwatch**: Full functionality
- ✅ **Reports**: Data display and export
- ✅ **Settings**: All configuration options
- ✅ **Firebase**: Client-side integration (with env vars)
- ✅ **Responsive Design**: Mobile and desktop
- ✅ **Data Persistence**: Local storage + Firebase sync

## 🚫 **Features Removed for Static Export**

- ❌ **API Routes**: `/api/health`, `/api/status`
- ❌ **Server-side Rendering**: All pages are static
- ❌ **Dynamic Routes**: Pre-rendered at build time

## 🔄 **Automatic Deployment**

Every time you push to `main`:
1. ✅ GitHub Actions builds your app
2. ✅ Creates static files in `out/` directory
3. ✅ Deploys to GitHub Pages
4. ✅ Updates your live site

## 🆘 **Troubleshooting**

### **Still Getting 404?**
1. Check **Actions** tab for build errors
2. Verify environment variables are set
3. Wait 5-10 minutes for deployment to complete

### **Build Fails?**
1. Check for TypeScript errors locally: `npm run build`
2. Verify all dependencies are installed
3. Check GitHub Actions logs for specific errors

### **Firebase Not Working?**
1. ✅ **VERIFY ALL ENVIRONMENT VARIABLES ARE SET** in GitHub Secrets
2. Check Firebase project is active
3. Ensure services are enabled (Auth, Firestore)
4. **Most Common Issue**: Missing environment variables in GitHub Secrets

### **Manifest.json 404?**
1. ✅ **Fixed**: Public files are now copied to output directory
2. ✅ **Fixed**: All asset paths use `/shift-time/` prefix
3. ✅ **Fixed**: Next.js configuration handles basePath correctly

## 🎉 **Success Indicators**

- ✅ **Build**: "✓ Exporting (3/3)" in Actions
- ✅ **Deployment**: "Deploy to GitHub Pages" step succeeds
- ✅ **Live Site**: App loads without 404 errors
- ✅ **Functionality**: All features work as expected
- ✅ **Firebase**: Authentication and data sync working
- ✅ **Assets**: All CSS, JS, fonts, and images loading

## 🚨 **CRITICAL: Environment Variables**

**The most common cause of Firebase errors is missing environment variables in GitHub Secrets!**

Make sure you have ALL of these set in your repository:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add each Firebase environment variable as a secret
3. Use the exact names shown above
4. Use the values from your `.env.local` file

---

**🚀 Your Shift Tracker will now deploy successfully to GitHub Pages!**

The static export configuration ensures compatibility with GitHub Pages' static hosting requirements, and all asset paths are correctly configured for subdirectory deployment.
