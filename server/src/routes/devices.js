// Device Fleet Management Routes for AppLens
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/applens'
});

// ADB helper - scan for connected Android devices
async function scanDevicesWithADB() {
  try {
    const { stdout } = await execPromise('adb devices -l', { timeout: 30000 });
    const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.startsWith('List'));
    
    const devices = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[1] === 'device' || parts[1] === 'unauthorized' || parts[1] === 'offline') {
        const serial = parts[0];
        const deviceInfo = { serial, status: parts[1] === 'device' ? 'available' : 'offline' };
        
        // Parse device properties from -l output
        const props = {};
        for (let i = 2; i < parts.length; i++) {
          const [key, value] = parts[i].split(':');
          if (key && value) props[key] = value;
        }
        
        deviceInfo.model = props['model'] || null;
        deviceInfo.manufacturer = props['manufacturer'] || null;
        deviceInfo.product = props['product'] || null;
        deviceInfo.device = props['device'] || null;
        
        devices.push(deviceInfo);
      }
    }
    return devices;
  } catch (error) {
    console.error('ADB scan error:', error.message);
    return [];
  }
}

// Get detailed device info from ADB
async function getDeviceDetails(serial) {
  try {
    const details = {};
    
    // Get Android version
    try {
      const { stdout: versionOut } = await execPromise(`adb -s ${serial} shell getprop ro.build.version.release`, { timeout: 10000 });
      details.android_version = versionOut.trim();
    } catch (e) { details.android_version = null; }
    
    // Get model
    try {
      const { stdout: modelOut } = await execPromise(`adb -s ${serial} shell getprop ro.product.model`, { timeout: 10000 });
      details.model = modelOut.trim();
    } catch (e) { details.model = null; }
    
    // Get manufacturer
    try {
      const { stdout: mfrOut } = await execPromise(`adb -s ${serial} shell getprop ro.product.manufacturer`, { timeout: 10000 });
      details.manufacturer = mfrOut.trim();
    } catch (e) { details.manufacturer = null; }
    
    // Get screen resolution
    try {
      const { stdout: resOut } = await execPromise(`adb -s ${serial} shell wm size`, { timeout: 10000 });
      const match = resOut.trim().match(/(\d+)x(\d+)/);
      if (match) {
        details.screen_resolution = `${match[1]}x${match[2]}`;
      }
    } catch (e) { details.screen_resolution = null; }
    
    // Get device serial (should match)
    details.serial = serial;
    
    return details;
  } catch (error) {
    console.error(`Error getting details for device ${serial}:`, error.message);
    return null;
  }
}

// GET /api/devices - List all devices
router.get('/', async (req, res) => {
  try {
    const { status, android_version } = req.query;
    
    let query = 'SELECT * FROM devices';
    const conditions = [];
    const params = [];
    
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    
    if (android_version) {
      params.push(android_version);
      conditions.push(`android_version = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY added_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing devices:', error);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

// GET /api/devices/grouped - Get devices grouped by Android version
router.get('/grouped', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT android_version, json_agg(row_to_json(devices)) as devices
      FROM devices
      WHERE android_version IS NOT NULL
      GROUP BY android_version
      ORDER BY android_version DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error grouping devices:', error);
    res.status(500).json({ error: 'Failed to group devices' });
  }
});

// POST /api/devices/scan - Scan for new devices via ADB
router.post('/scan', async (req, res) => {
  try {
    const adbDevices = await scanDevicesWithADB();
    
    if (adbDevices.length === 0) {
      return res.json({ 
        message: 'No devices found via ADB',
        devices_added: 0,
        devices: []
      });
    }
    
    const results = [];
    let devicesAdded = 0;
    
    for (const device of adbDevices) {
      // Check if device already exists
      const existing = await pool.query(
        'SELECT id, status FROM devices WHERE serial = $1',
        [device.serial]
      );
      
      if (existing.rows.length === 0) {
        // Get detailed info from ADB
        const details = await getDeviceDetails(device.serial);
        
        // Insert new device
        const insertResult = await pool.query(`
          INSERT INTO devices (serial, model, manufacturer, android_version, screen_resolution, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          details.serial || device.serial,
          details.model || device.model || null,
          details.manufacturer || device.manufacturer || null,
          details.android_version || null,
          details.screen_resolution || null,
          device.status
        ]);
        
        results.push(insertResult.rows[0]);
        devicesAdded++;
      } else {
        // Update existing device status
        await pool.query(
          'UPDATE devices SET status = $1, last_seen = NOW() WHERE serial = $2',
          [device.status, device.serial]
        );
        results.push({ ...existing.rows[0], status: device.status, updated: true });
      }
    }
    
    res.json({
      message: `Scan complete. ${devicesAdded} new device(s) added.`,
      devices_added: devicesAdded,
      devices: results
    });
  } catch (error) {
    console.error('Error scanning devices:', error);
    res.status(500).json({ error: 'Failed to scan devices' });
  }
});

// GET /api/devices/:id - Get device details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM devices WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Get reservation history
    const reservations = await pool.query(`
      SELECT dr.*, c.name as company_name
      FROM device_reservations dr
      LEFT JOIN companies c ON dr.company_id = c.id
      WHERE dr.device_id = $1
      ORDER BY dr.reserved_at DESC
      LIMIT 10
    `, [id]);
    
    res.json({
      device: result.rows[0],
      reservations: reservations.rows
    });
  } catch (error) {
    console.error('Error getting device:', error);
    res.status(500).json({ error: 'Failed to get device' });
  }
});

// POST /api/devices/:id/reserve - Reserve device for test
router.post('/:id/reserve', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, session_id, notes } = req.body;
    
    // Check if device exists and is available
    const deviceResult = await pool.query(
      'SELECT * FROM devices WHERE id = $1',
      [id]
    );
    
    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const device = deviceResult.rows[0];
    
    if (device.status !== 'available') {
      return res.status(400).json({ 
        error: 'Device is not available',
        current_status: device.status
      });
    }
    
    // Create reservation
    const reservationResult = await pool.query(`
      INSERT INTO device_reservations (device_id, company_id, session_id, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, company_id || null, session_id || null, notes || null]);
    
    // Update device status
    await pool.query(
      'UPDATE devices SET status = $1, last_seen = NOW() WHERE id = $2',
      ['in_use', id]
    );
    
    res.json({
      message: 'Device reserved successfully',
      device: { ...device, status: 'in_use' },
      reservation: reservationResult.rows[0]
    });
  } catch (error) {
    console.error('Error reserving device:', error);
    res.status(500).json({ error: 'Failed to reserve device' });
  }
});

// POST /api/devices/:id/release - Release device after test
router.post('/:id/release', async (req, res) => {
  try {
    const { id } = req.params;
    const { session_id } = req.body;
    
    // Check if device exists
    const deviceResult = await pool.query(
      'SELECT * FROM devices WHERE id = $1',
      [id]
    );
    
    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const device = deviceResult.rows[0];
    
    // Find active reservation
    const reservationResult = await pool.query(`
      SELECT * FROM device_reservations 
      WHERE device_id = $1 AND released_at IS NULL
      ORDER BY reserved_at DESC
      LIMIT 1
    `, [id]);
    
    if (reservationResult.rows.length === 0) {
      // No active reservation, just update status
      await pool.query(
        'UPDATE devices SET status = $1, last_seen = NOW() WHERE id = $2',
        ['available', id]
      );
      
      return res.json({
        message: 'Device released (no active reservation found)',
        device: { ...device, status: 'available' }
      });
    }
    
    // Release the reservation
    await pool.query(
      'UPDATE device_reservations SET released_at = NOW() WHERE id = $1',
      [reservationResult.rows[0].id]
    );
    
    // Update device status
    await pool.query(
      'UPDATE devices SET status = $1, last_seen = NOW() WHERE id = $2',
      ['available', id]
    );
    
    res.json({
      message: 'Device released successfully',
      device: { ...device, status: 'available' },
      reservation: reservationResult.rows[0]
    });
  } catch (error) {
    console.error('Error releasing device:', error);
    res.status(500).json({ error: 'Failed to release device' });
  }
});

// DELETE /api/devices/:id - Remove device from inventory
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if device exists
    const deviceResult = await pool.query(
      'SELECT * FROM devices WHERE id = $1',
      [id]
    );
    
    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Check if device is in use
    if (deviceResult.rows[0].status === 'in_use') {
      return res.status(400).json({ error: 'Cannot delete device while in use' });
    }
    
    // Delete device (cascades to reservations)
    await pool.query('DELETE FROM devices WHERE id = $1', [id]);
    
    res.json({
      message: 'Device removed from inventory',
      device: deviceResult.rows[0]
    });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

module.exports = router;
