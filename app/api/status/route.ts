import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const status = {
      service: 'Shift Tracker',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      features: {
        firebase: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authentication: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        database: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      },
      build: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      }
    };

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
