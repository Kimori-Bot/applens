'use client';

import { useState, useEffect } from 'react';

interface Device {
  id: number;
  serial: string;
  model: string;
  manufacturer: string;
  android_version: string;
  screen_resolution: string;
  status: string;
  last_seen: string;
  added_at: string;
}

export default function DeviceFleetPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [scanning, setScanning] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/devices');
      const data = await res.json();
      setDevices(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scanDevices = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });
      const data = await res.json();
      await fetchDevices();
      alert(data.message || 'Scan complete');
    } catch (err) {
      alert('Failed to scan devices');
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const reserveDevice = async (deviceId: number) => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reserve' }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDevices();
        alert('Device reserved successfully');
      } else {
        alert(data.error || 'Failed to reserve device');
      }
    } catch (err) {
      alert('Failed to reserve device');
      console.error(err);
    }
  };

  const releaseDevice = async (deviceId: number) => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release' }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDevices();
        alert('Device released successfully');
      } else {
        alert(data.error || 'Failed to release device');
      }
    } catch (err) {
      alert('Failed to release device');
      console.error(err);
    }
  };

  const deleteDevice = async (deviceId: number) => {
    if (!confirm('Are you sure you want to remove this device from inventory?')) return;
    
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDevices();
        alert('Device removed from inventory');
      } else {
        alert(data.error || 'Failed to remove device');
      }
    } catch (err) {
      alert('Failed to remove device');
      console.error(err);
    }
  };

  const filteredDevices = filter === 'all' 
    ? devices 
    : devices.filter(d => d.status === filter);

  const groupedByVersion = devices.reduce((acc, device) => {
    const version = device.android_version || 'Unknown';
    if (!acc[version]) acc[version] = [];
    acc[version].push(device);
    return acc;
  }, {} as Record<string, Device[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in_use': return 'bg-blue-100 text-blue-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Device Fleet</h1>
            <p className="text-gray-600">Manage your Android test devices</p>
          </div>
          <button
            onClick={scanDevices}
            disabled={scanning}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-5 h-5 ${scanning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {scanning ? 'Scanning...' : 'Scan Devices'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{devices.length}</div>
            <div className="text-sm text-gray-600">Total Devices</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {devices.filter(d => d.status === 'available').length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {devices.filter(d => d.status === 'in_use').length}
            </div>
            <div className="text-sm text-gray-600">In Use</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-600">
              {Object.keys(groupedByVersion).length}
            </div>
            <div className="text-sm text-gray-600">Android Versions</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <div className="flex gap-2">
              {['all', 'available', 'in_use', 'offline', 'error'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    filter === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Group by Android Version */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grouped by Android Version</h2>
          <div className="space-y-4">
            {Object.entries(groupedByVersion).map(([version, versionDevices]) => (
              <div key={version} className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  Android {version} ({versionDevices.length} devices)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {versionDevices.map(device => (
                    <div
                      key={device.id}
                      className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition ${
                        selectedDevice?.id === device.id ? 'ring-2 ring-indigo-500' : ''
                      }`}
                      onClick={() => setSelectedDevice(device)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </div>
                      <div className="font-medium text-sm text-gray-900 truncate">{device.model || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{device.manufacturer || 'Unknown'}</div>
                      <div className="text-xs text-gray-400 mt-1">{device.serial}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedByVersion).length === 0 && (
              <p className="text-gray-500 text-center py-4">No devices found. Click "Scan Devices" to add devices.</p>
            )}
          </div>
        </div>

        {/* Device List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">All Devices</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading devices...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No devices found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Android</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Screen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDevices.map(device => (
                    <tr key={device.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{device.model || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{device.manufacturer || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{device.serial}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{device.android_version || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{device.screen_resolution || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {device.last_seen ? new Date(device.last_seen).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {device.status === 'available' ? (
                          <button
                            onClick={() => reserveDevice(device.id)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Reserve
                          </button>
                        ) : device.status === 'in_use' ? (
                          <button
                            onClick={() => releaseDevice(device.id)}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Release
                          </button>
                        ) : null}
                        <button
                          onClick={() => deleteDevice(device.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium ml-3"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
