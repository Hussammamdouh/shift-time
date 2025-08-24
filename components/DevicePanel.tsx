'use client';
import { useState, useEffect } from 'react';
import type { Snapshot, DeviceInfo } from '@/lib/types';
import { formatDeviceType, isDeviceActive } from '@/lib/deviceUtils';

export default function DevicePanel({ snap }: { snap: Snapshot }) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    if (snap.devices && snap.currentDeviceId) {
      setDevices(snap.devices);
      setCurrentDevice(snap.devices.find(d => d.id === snap.currentDeviceId) || null);
    }
  }, [snap.devices, snap.currentDeviceId]);

  const onlineDevices = devices.filter(d => isDeviceActive(d));
  const offlineDevices = devices.filter(d => !isDeviceActive(d));

  if (devices.length === 0) {
    return (
      <div className="card space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Device Management</h3>
            <p className="text-sm text-slate-400">Track all devices using this sync passcode</p>
          </div>
        </div>
        
        <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <p className="text-lg font-medium">No devices detected yet</p>
          <p className="text-sm">Start syncing on another device to see it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Device Management</h3>
            <p className="text-sm text-slate-400">Track all devices using this sync passcode</p>
          </div>
        </div>
        
        {/* Device Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="text-2xl font-bold text-slate-200">{devices.length}</div>
            <div className="text-sm text-slate-400">Total Devices</div>
          </div>
          <div className="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <div className="text-2xl font-bold text-emerald-400">{onlineDevices.length}</div>
            <div className="text-sm text-emerald-300">Online</div>
          </div>
          <div className="p-4 bg-slate-500/20 rounded-xl border border-slate-500/30">
            <div className="text-2xl font-bold text-slate-400">{offlineDevices.length}</div>
            <div className="text-sm text-slate-300">Offline</div>
          </div>
        </div>
      </div>

      {/* Current Device */}
      {currentDevice && (
        <div className="card space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-md font-semibold text-slate-200">Current Device</h4>
          </div>
          
          <div className="p-4 bg-violet-500/20 rounded-xl border border-violet-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{formatDeviceType(currentDevice.type).split(' ')[0]}</div>
                <div>
                  <div className="font-semibold text-violet-300">{currentDevice.name}</div>
                  <div className="text-sm text-violet-200">{formatDeviceType(currentDevice.type).split(' ')[1]}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-violet-300">🟢 This Device</div>
                <div className="text-xs text-violet-200">Always Online</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Online Devices */}
      {onlineDevices.filter(d => d.id !== snap.currentDeviceId).length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="text-md font-semibold text-slate-200">Other Online Devices</h4>
          </div>
          
          <div className="space-y-3">
            {onlineDevices
              .filter(d => d.id !== snap.currentDeviceId)
              .map(device => (
                <div key={device.id} className="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{formatDeviceType(device.type).split(' ')[0]}</div>
                      <div>
                        <div className="font-semibold text-emerald-300">{device.name}</div>
                        <div className="text-sm text-emerald-200">{formatDeviceType(device.type).split(' ')[1]}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-emerald-300">🟢 Online</div>
                      <div className="text-xs text-emerald-200">
                        Last seen: {new Date(device.lastSeen).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Offline Devices */}
      {offlineDevices.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-slate-600 to-gray-600 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
              </svg>
            </div>
            <h4 className="text-md font-semibold text-slate-200">Offline Devices</h4>
          </div>
          
          <div className="space-y-3">
            {offlineDevices.map(device => (
              <div key={device.id} className="p-4 bg-slate-500/20 rounded-xl border border-slate-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{formatDeviceType(device.type).split(' ')[0]}</div>
                    <div>
                      <div className="font-semibold text-slate-300">{device.name}</div>
                      <div className="text-sm text-slate-200">{formatDeviceType(device.type).split(' ')[1]}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-300">🔴 Offline</div>
                    <div className="text-xs text-slate-200">
                      Last seen: {new Date(device.lastSeen).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Info */}
      <div className="card space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-md font-semibold text-slate-200">How It Works</h4>
        </div>
        
        <div className="text-sm text-slate-400 space-y-2">
          <p>• <strong>Device Detection:</strong> Each device gets a unique ID when it first syncs</p>
          <p>• <strong>Real-time Updates:</strong> All devices stay in sync automatically</p>
          <p>• <strong>Status Tracking:</strong> See which devices are currently online and active</p>
          <p>• <strong>Automatic Cleanup:</strong> Offline devices are automatically detected after 5 minutes</p>
        </div>
      </div>
    </div>
  );
}
