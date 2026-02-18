/**
 * Memory Storage (in-memory, for dev/fast prototyping)
 */

const memoryStore = {
  screens: [],
  elements: [],
  sessions: [],
  commands: [],
  commandResults: [],
  issues: [],
  screenshots: []
};

const storage = {
  read: (type) => {
    return memoryStore[type] || [];
  },
  
  push: (type, item) => {
    if (!memoryStore[type]) memoryStore[type] = [];
    memoryStore[type].push(item);
    return memoryStore[type];
  },
  
  getBySession: (type, sessionId) => {
    return (memoryStore[type] || []).filter(item => item.session_id === sessionId);
  },
  
  update: (type, id, updates) => {
    const arr = memoryStore[type] || [];
    const idx = arr.findIndex(i => i.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...updates };
      return arr[idx];
    }
    return null;
  },
  
  delete: (type, id) => {
    const arr = memoryStore[type] || [];
    const idx = arr.findIndex(i => i.id === id);
    if (idx >= 0) {
      arr.splice(idx, 1);
      return true;
    }
    return false;
  },
  
  clear: (type) => {
    if (type) {
      memoryStore[type] = [];
    } else {
      Object.keys(memoryStore).forEach(k => memoryStore[k] = []);
    }
    return true;
  },
  
  isConnected: () => true
};

module.exports = storage;
