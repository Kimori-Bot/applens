/**
 * AppLens Storage Manager
 * Supports multiple backends: memory, file, supabase
 * 
 * Configure via environment:
 *   STORAGE_TYPE=memory|file|supabase
 *   
 * For Supabase, also set:
 *   SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_ANON_KEY=your-key
 */

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'file';

// Load storage backends
const memoryStorage = require('./memory');  // We'll create this
const fileStorage = require('./storage');
const supabaseStorage = require('./supabase/storage');

// Get the active storage backend
const getStorage = () => {
  switch (STORAGE_TYPE) {
    case 'memory':
      console.log('[AppLens] Using memory storage');
      return memoryStorage;
    case 'supabase':
      console.log('[AppLens] Using Supabase storage');
      return supabaseStorage;
    case 'file':
    default:
      console.log('[AppLens] Using file storage');
      return fileStorage;
  }
};

// Initialize storage (for async backends like Supabase)
const initStorage = async () => {
  if (STORAGE_TYPE === 'supabase') {
    supabaseStorage.init();
  }
};

module.exports = { getStorage, initStorage, STORAGE_TYPE };
