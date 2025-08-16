# Shift Tracker - Professional Time Management

A modern, professional time tracking and shift management application built with Next.js, React, and Firebase. Track your work hours, calculate overtime, manage breaks, and generate comprehensive reports.

## ✨ Features

- **⏱️ Real-time Stopwatch**: Track active work sessions with precision timing
- **📊 Comprehensive Reporting**: View detailed analytics and export data
- **💰 Earnings Calculator**: Automatic salary calculation based on hourly rates
- **🕐 Overtime Tracking**: Calculate overtime hours beyond 7-hour daily targets
- **📱 Responsive Design**: Modern UI that works on all devices
- **☁️ Cloud Sync**: Firebase integration for data synchronization
- **📁 Data Import/Export**: CSV import/export functionality
- **🎨 Modern UI/UX**: Beautiful glassmorphism design with smooth animations

## 🚀 Live Demo

[Deploy to Vercel](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/shift-tracker)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Firebase (Authentication, Firestore)
- **Deployment**: Vercel, Netlify, or any static hosting
- **State Management**: React hooks with local storage
- **Build Tool**: Next.js with optimized bundling

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project (for cloud features)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/shift-tracker.git
cd shift-tracker
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Copy the environment template and configure your Firebase settings:

```bash
cp env.template .env.local
```

Edit `.env.local` with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Build for Production

### Build the Application

```bash
npm run build
# or
yarn build
```

### Start Production Server

```bash
npm start
# or
yarn start
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**: Ensure your code is pushed to a GitHub repository
2. **Connect to Vercel**: 
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables
   - Deploy!

### Deploy to Netlify

1. **Build Command**: `npm run build`
2. **Publish Directory**: `.next`
3. **Environment Variables**: Add your Firebase config

### Deploy to GitHub Pages

1. **Build Command**: `npm run build && npm run export`
2. **Publish Directory**: `out`

### Manual Deployment

```bash
# Build the project
npm run build

# The built files will be in the .next directory
# Deploy the .next directory to your hosting provider
```

## 🔧 Configuration

### Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Anonymous sign-in)
3. Create a Firestore database
4. Copy your project configuration to `.env.local`

### Customization

- **Theme**: Modify `styles/globals.css` for custom colors and styling
- **Features**: Edit components in the `components/` directory
- **Data Structure**: Modify types in `lib/types.ts`

## 📁 Project Structure

```
shift-tracker/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── ...                # Other pages
├── components/             # React components
│   ├── Stopwatch.tsx      # Main timer component
│   ├── ReportTable.tsx    # Reports and analytics
│   ├── Navbar.tsx         # Navigation component
│   └── ...                # Other components
├── lib/                    # Utility libraries
│   ├── firebase.ts        # Firebase configuration
│   ├── timeUtils.ts       # Time calculation utilities
│   ├── types.ts           # TypeScript type definitions
│   └── ...                # Other utilities
├── styles/                 # Global styles
│   └── globals.css        # Main stylesheet
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── next.config.ts          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── README.md               # This file
```

## 🎨 Design System

The application uses a modern design system with:

- **Glassmorphism Effects**: Backdrop blur and transparency
- **Gradient Accents**: Violet-to-cyan color scheme
- **Responsive Layout**: Mobile-first design approach
- **Smooth Animations**: CSS transitions and micro-interactions
- **Dark Theme**: Professional dark color scheme

## 🔒 Security Features

- **Environment Variables**: Secure configuration management
- **Firebase Security Rules**: Database access control
- **Input Validation**: Form validation and sanitization
- **Error Handling**: Graceful error handling and user feedback

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/shift-tracker/issues) page
2. Create a new issue with detailed information
3. Include your environment details and error messages

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Firebase](https://firebase.google.com/)
- Icons from [Heroicons](https://heroicons.com/)

## 📈 Roadmap

- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] API endpoints for integrations
- [ ] Multi-language support
- [ ] Advanced reporting templates

---

**Made with ❤️ for professional time management**

[Star this repo](https://github.com/yourusername/shift-tracker) if you find it helpful!
