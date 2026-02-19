import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndvfvjrkupudouolbtuc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmZ2anJrdXB1ZG91b2xidHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzA4NTEsImV4cCI6MjA4NzAwNjg1MX0.wZb_QL8Htk0OKrYAKpbM-0cdUnPhOF06qwg5bdKEioY';

// @ts-ignore
export const supabase: any = createClient(supabaseUrl, supabaseAnonKey);

// @ts-ignore
export const query = async (table, filters: Record<string, any> = {}, options: Record<string, any> = {}) => {
  let query = supabase.from(table).select(options.select || '*');
  
  if (filters.where) {
    Object.entries(filters.where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  if (options.order) {
    const [col, dir = 'asc'] = options.order.split(':');
    query = query.order(col, { ascending: dir === 'asc' });
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  // Handle delete method
  if (options.method === 'delete') {
    if (filters.where) {
      Object.entries(filters.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    const { error } = await query;
    return { error };
  }
  
  return query;
};

// @ts-ignore
export const insert = async (table, data) => {
  const { data: result, error } = await supabase.from(table).insert(data).select();
  if (error) throw error;
  return result;
};

// @ts-ignore
export const update = async (table, data, filters) => {
  let query = supabase.from(table).update(data);
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { data: result, error } = await query.select();
  if (error) throw error;
  return result;
};

// @ts-ignore
export const deleteRecord = async (table, filters) => {
  let query = supabase.from(table).delete();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { error } = await query;
  if (error) throw error;
  return { success: true };
};

// @ts-ignore
export const testConnection = async () => {
  const { data, error } = await supabase.from('companies').select('count');
  if (error) throw error;
  return { connected: true, count: data?.[0]?.count || 0 };
};
