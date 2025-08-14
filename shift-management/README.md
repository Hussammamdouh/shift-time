# Shift Management App

A personal shift tracking application built with Next.js, Firebase, and TypeScript. Track your work shifts, breaks, and generate reports with a clean, dark UI.

## Features

- ⏱️ **Stopwatch Mode**: Real-time shift tracking with break management
- 📝 **Manual Entry**: Add past shifts with custom break times
- 📊 **Reporting**: View history, filter by tags, export to CSV
- 🔄 **Sync**: Share data across devices using Firebase
- 🔒 **Security**: Optional passcode lock for app access
- 🌙 **Dark Theme**: Modern, mobile-first dark interface

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Firebase (Firestore + Anonymous Auth)
- **Storage**: Local storage + Firebase sync
- **Build**: PostCSS, ESLint

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd shift-management
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Anonymous Authentication
4. Copy your Firebase config values

### 3. Environment Configuration

1. Copy `env.template` to `.env.local`
2. Fill in your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Firestore Rules

Set up Firestore security rules to allow anonymous access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Stopwatch Mode
- **Start**: Begin tracking a new shift
- **Break**: Pause for breaks (multiple breaks supported)
- **Back**: Resume work after breaks
- **End**: Complete the shift and save to history

### Manual Entry
- Add past shifts with custom start/end times
- Include multiple breaks
- Add notes and tags for organization

### Reports
- View all shift history
- Filter by tags or search notes
- Export data to CSV format
- See total working time statistics

### Sync
- Use a passcode to sync across devices
- Real-time updates with live subscription
- Manual push/pull operations

### Settings
- Configure time format (12/24 hour)
- Set target minutes per shift
- Manage app lock passcode
- Configure sync preferences

## Project Structure

```
shift-management/
├── app/                    # Next.js app router pages
├── components/            # React components
├── lib/                   # Utility functions and Firebase config
├── styles/                # Global CSS and Tailwind
├── public/                # Static assets
└── types/                 # TypeScript type definitions
```

## Troubleshooting

### Firebase Connection Issues
- Check environment variables in `.env.local`
- Verify Firebase project configuration
- Ensure Firestore and Auth are enabled
- Check browser console for error messages

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run lint`

### Sync Issues
- Verify passcode is correct
- Check Firebase rules allow anonymous access
- Ensure network connectivity

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. Update types in `lib/types.ts`
2. Add components in `components/`
3. Update storage logic in `lib/storage.ts`
4. Add sync support in `lib/sync.ts`

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository
2. Add environment variables
3. Deploy automatically on push

### Other Platforms

- Build: `npm run build`
- Start: `npm run start`
- Set environment variables in your hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for personal use. Feel free to modify and use as needed.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Check browser console for errors
4. Verify environment configuration
