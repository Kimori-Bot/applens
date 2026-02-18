// Simple file-based storage for AppLens
// Saves to ./data/ directory

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const storage = {
  // Read all data
  read: (type) => {
    const file = path.join(DATA_DIR, `${type}.json`);
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch (e) { console.error('Storage read error:', e); }
    return [];
  },
  
  // Write all data
  write: (type, data) => {
    const file = path.join(DATA_DIR, `${type}.json`);
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (e) { console.error('Storage write error:', e); }
  },
  
  // Add item
  push: (type, item) => {
    const data = storage.read(type);
    data.push(item);
    storage.write(type, data);
    return data;
  },
  
  // Get by session
  getBySession: (type, sessionId) => {
    const data = storage.read(type);
    return data.filter(item => item.session_id === sessionId);
  },
  
  // Clear all
  clear: () => {
    fs.readdirSync(DATA_DIR).forEach(file => {
      fs.unlinkSync(path.join(DATA_DIR, file));
    });
  }
};

module.exports = storage;
