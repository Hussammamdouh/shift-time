import type { DeviceInfo } from './types';

/**
 * Detect device type based on user agent and screen size
 */
export function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  
  // Check for mobile devices
  if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase())) {
    // Distinguish between mobile and tablet based on screen size
    if (screenWidth >= 768 || screenHeight >= 768) {
      return 'tablet';
    }
    return 'mobile';
  }
  
  // Check for tablet-like screen sizes on desktop
  if (screenWidth >= 768 && screenWidth < 1024) {
    return 'tablet';
  }
  
  return 'desktop';
}

/**
 * Generate a unique device ID
 */
export function generateDeviceId(): string {
  // Try to get existing device ID from localStorage
  const existingId = localStorage.getItem('shift-tracker-device-id');
  if (existingId) return existingId;
  
  // Generate new device ID
  const deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('shift-tracker-device-id', deviceId);
  return deviceId;
}

/**
 * Get device name (user-friendly)
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  
  const platform = navigator.platform;
  
  // Try to get device name from various sources
  if ('deviceMemory' in navigator && typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number') {
    return `${platform} (${(navigator as Navigator & { deviceMemory?: number }).deviceMemory}GB RAM)`;
  }
  
  if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency) {
    return `${platform} (${navigator.hardwareConcurrency} cores)`;
  }
  
  return platform || 'Unknown Device';
}

/**
 * Create device info object
 */
export function createDeviceInfo(): DeviceInfo {
  return {
    id: generateDeviceId(),
    name: getDeviceName(),
    type: detectDeviceType(),
    lastSeen: Date.now(),
    isOnline: navigator.onLine,
    version: '1.0.0' // You can update this to match your app version
  };
}

/**
 * Update device info with current status
 */
export function updateDeviceInfo(deviceInfo: DeviceInfo): DeviceInfo {
  return {
    ...deviceInfo,
    lastSeen: Date.now(),
    isOnline: navigator.onLine
  };
}

/**
 * Check if device is still active (within last 5 minutes)
 */
export function isDeviceActive(deviceInfo: DeviceInfo): boolean {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  return deviceInfo.lastSeen > fiveMinutesAgo;
}

/**
 * Get online devices from a list
 */
export function getOnlineDevices(devices: DeviceInfo[]): DeviceInfo[] {
  return devices.filter(device => isDeviceActive(device));
}

/**
 * Format device type for display
 */
export function formatDeviceType(type: DeviceInfo['type']): string {
  switch (type) {
    case 'desktop': return '🖥️ Desktop';
    case 'mobile': return '📱 Mobile';
    case 'tablet': return '📱 Tablet';
    default: return '❓ Unknown';
  }
}

/**
 * Get device status indicator
 */
export function getDeviceStatusIndicator(deviceInfo: DeviceInfo): string {
  if (deviceInfo.isOnline && isDeviceActive(deviceInfo)) {
    return '🟢 Online';
  } else if (isDeviceActive(deviceInfo)) {
    return '🟡 Recently Active';
  } else {
    return '🔴 Offline';
  }
}
