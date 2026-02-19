const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ndvfvjrkupudouolbtuc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmZ2anJrdXB1ZG91b2xidHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzA4NTEsImV4cCI6MjA4NzAwNjg1MX0.wZb_QL8Htk0OKrYAKpbM-0cdUnPhOF06qwg5bdKEioY';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  supabase,
  query: async (table, filters = {}, options = {}) => {
    let query = supabase.from(table).select(options.select || '*');
    
    // Apply filters
    if (filters.where) {
      Object.entries(filters.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    // Handle ordering
    if (options.order) {
      const [col, dir = 'asc'] = options.order.split(':');
      query = query.order(col, { ascending: dir === 'asc' });
    }
    
    // Handle limit
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    return query;
  },
  
  insert: async (table, data) => {
    const { data: result, error } = await supabase.from(table).insert(data).select();
    if (error) throw error;
    return result;
  },
  
  update: async (table, data, filters) => {
    let query = supabase.from(table).update(data);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { data: result, error } = await query.select();
    if (error) throw error;
    return result;
  },
  
  delete: async (table, filters) => {
    let query = supabase.from(table).delete();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  },
  
  testConnection: async () => {
    const { data, error } = await supabase.from('companies').select('count');
    if (error) throw error;
    return { connected: true, count: data?.[0]?.count || 0 };
  }
};
