-- Device Fleet Management Schema for AppLens
-- Run this to add device management capabilities

-- Devices table for tracking Android test devices
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  serial VARCHAR(255) NOT NULL UNIQUE,
  model VARCHAR(255),
  manufacturer VARCHAR(255),
  android_version VARCHAR(50),
  screen_resolution VARCHAR(50),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'offline', 'error')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for device queries
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_android_version ON devices(android_version);
CREATE INDEX idx_devices_serial ON devices(serial);

-- Device reservations table for tracking who is using which device
CREATE TABLE device_reservations (
  id SERIAL PRIMARY KEY,
  device_id INT REFERENCES devices(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  notes TEXT
);

-- Index for device reservations
CREATE INDEX idx_device_reservations_device_id ON device_reservations(device_id);
CREATE INDEX idx_device_reservations_company_id ON device_reservations(company_id);
CREATE INDEX idx_device_reservations_active ON device_reservations(released_at) WHERE released_at IS NULL;
