# 🚀 Deployment Guide

This guide covers deploying the Shift Tracker application to various platforms.

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository set up
- Firebase project configured
- Environment variables ready

## 🌐 Platform-Specific Deployment

### 1. Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

#### Automatic Deployment
1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your repository

2. **Configure Environment Variables**:
   - Add all Firebase environment variables
   - Set `NODE_ENV=production`

3. **Deploy**:
   - Vercel will automatically build and deploy
   - Each push to main branch triggers a new deployment

#### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 2. Netlify

#### Automatic Deployment
1. **Connect Repository**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 18

3. **Environment Variables**:
   - Add all Firebase environment variables

#### Manual Deployment
```bash
# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=.next
```

### 3. GitHub Pages

#### Setup
1. **Enable GitHub Pages**:
   - Go to repository Settings > Pages
   - Source: GitHub Actions

2. **Configure Workflow**:
   - The `.github/workflows/deploy.yml` file handles this automatically
   - Push to main branch to trigger deployment

#### Manual Deployment
```bash
# Build and export
npm run build
npm run export

# Deploy to gh-pages branch
gh-pages -d out
```

### 4. Docker Deployment

#### Local Docker
```bash
# Build image
docker build -t shift-tracker .

# Run container
docker run -p 3000:3000 shift-tracker
```

#### Docker Compose
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Production Docker
```bash
# Build for production
docker build --target runner -t shift-tracker:prod .

# Run with environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your_key \
  shift-tracker:prod
```

### 5. Traditional Hosting

#### Build and Upload
```bash
# Build the project
npm run build

# Upload .next directory to your hosting provider
# Configure your web server to serve the Next.js app
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Environment Configuration

### Required Environment Variables
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Optional Environment Variables
```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## 🚀 Deployment Checklist

### Before Deployment
- [ ] All tests pass (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables configured
- [ ] Firebase project set up
- [ ] Domain configured (if applicable)

### After Deployment
- [ ] Application loads correctly
- [ ] Firebase connection works
- [ ] All features functional
- [ ] Performance acceptable
- [ ] Error monitoring configured

## 📊 Performance Optimization

### Build Optimization
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Enable standalone output
# Add to next.config.ts:
output: 'standalone'
```

### Runtime Optimization
- Enable compression
- Configure CDN
- Optimize images
- Enable caching headers

## 🔍 Monitoring and Debugging

### Health Checks
```bash
# Check if app is running
curl http://yourdomain.com/api/health

# Check build status
curl http://yourdomain.com/api/status
```

### Logs
```bash
# Vercel
vercel logs

# Netlify
netlify logs

# Docker
docker logs container_name
```

### Error Tracking
- Configure error monitoring (Sentry, LogRocket)
- Set up performance monitoring
- Monitor Firebase usage

## 🔒 Security Considerations

### Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Environment Variables
- Never commit `.env.local` to Git
- Use platform-specific secret management
- Rotate API keys regularly

### Firebase Security
- Configure Firestore security rules
- Limit API key usage
- Monitor authentication attempts

## 📱 Mobile Deployment

### PWA Features
- Add manifest.json
- Configure service worker
- Enable offline functionality

### App Stores
- Build with React Native
- Package for iOS/Android
- Submit to app stores

## 🔄 Continuous Deployment

### GitHub Actions
- Automatic testing on PR
- Build validation
- Deployment to staging/production

### Branch Strategy
- `main`: Production
- `develop`: Staging
- `feature/*`: Feature branches

## 🆘 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

#### Runtime Errors
- Check environment variables
- Verify Firebase configuration
- Check browser console
- Review server logs

#### Performance Issues
- Enable bundle analysis
- Check image optimization
- Review Firebase queries
- Monitor network requests

### Getting Help
1. Check the [Issues](https://github.com/yourusername/shift-tracker/issues) page
2. Review deployment logs
3. Test locally first
4. Check platform-specific documentation

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancers
- Deploy multiple instances
- Configure auto-scaling

### Database Scaling
- Firebase scales automatically
- Monitor usage limits
- Optimize queries

### CDN Configuration
- Enable static asset caching
- Configure edge locations
- Monitor cache hit rates

---

**Happy Deploying! 🚀**

For more help, check the main [README.md](README.md) or create an issue on GitHub.
