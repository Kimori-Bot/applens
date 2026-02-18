/**
 * AppLens Supabase Storage
 * 
 * Set environment variables:
 *   SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_ANON_KEY=your-anon-key
 * 
 * Or configure via config.js
 */

const { createClient } = require('@supabase/supabase-js');

let supabase = null;

// Initialize Supabase client
const initSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.log('[AppLens] Supabase not configured');
    return null;
  }
  
  supabase = createClient(url, key);
  console.log('[AppLens] Supabase connected:', url);
  return supabase;
};

// Storage interface (same as file storage)
const storage = {
  // Read all records of a type
  read: async (type) => {
    if (!supabase) return [];
    const { data, error } = await supabase.from(type).select('*').order('created_at', { ascending: false });
    if (error) { console.error('Supabase read error:', error); return []; }
    return data || [];
  },
  
  // Add a record
  push: async (type, item) => {
    if (!supabase) return [];
    const { data, error } = await supabase.from(type).insert(item).select();
    if (error) { console.error('Supabase push error:', error); return []; }
    return data || [];
  },
  
  // Get records by session
  getBySession: async (type, sessionId) => {
    if (!supabase) return [];
    const { data, error } = await supabase.from(type).select('*').eq('session_id', sessionId);
    if (error) { console.error('Supabase getBySession error:', error); return []; }
    return data || [];
  },
  
  // Update record
  update: async (type, id, updates) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from(type).update(updates).eq('id', id).select();
    if (error) { console.error('Supabase update error:', error); return null; }
    return data;
  },
  
  // Delete record
  delete: async (type, id) => {
    if (!supabase) return false;
    const { error } = await supabase.from(type).delete().eq('id', id);
    if (error) { console.error('Supabase delete error:', error); return false; }
    return true;
  },
  
  // Clear all (use with caution!)
  clear: async (type) => {
    if (!supabase) return false;
    const { error } = await supabase.from(type).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { console.error('Supabase clear error:', error); return false; }
    return true;
  },
  
  // Check if connected
  isConnected: () => !!supabase,
  
  // Initialize
  init: initSupabase
};

module.exports = storage;
