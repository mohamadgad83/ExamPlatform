// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

// المتغيرات موجودة بالفعل من Vercel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// دالة مساعدة للتعامل مع الجداول الجديدة
export const getTable = (tableName) => supabase.from(tableName);

// مثال: دوال جاهزة
export const db = {
  // البحث
  async find(table, filters = {}) {
    let query = supabase.from(table).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  
  // إضافة
  async add(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();
    if (error) throw error;
    return result[0];
  },
  
  // تعديل
  async update(table, id, data) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    if (error) throw error;
    return result[0];
  },
  
  // حذف
  async remove(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
