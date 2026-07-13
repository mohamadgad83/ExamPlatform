// src/utils/db.js
import { supabase } from '../services/supabase';
import { TABLES } from '../config/tables';

// كلاس للتعامل مع أي جدول بسهولة
export class TableService {
  constructor(tableName) {
    this.table = tableName;
  }

  async findAll(filters = {}) {
    let query = supabase.from(this.table).select('*');
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findById(id) {
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async findOne(filters) {
    let query = supabase.from(this.table).select('*');
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  }

  async create(data) {
    const { data: result, error } = await supabase
      .from(this.table)
      .insert(data)
      .select();

    if (error) throw error;
    return result[0];
  }

  async update(id, data) {
    const { data: result, error } = await supabase
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select();

    if (error) throw error;
    return result[0];
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async count(filters = {}) {
    let query = supabase.from(this.table).select('*', { count: 'exact', head: true });
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;
    if (error) throw error;
    return count;
  }
}

// إنشاء خدمات لكل جدول
export const UsersService = new TableService(TABLES.USERS);
export const ExamsService = new TableService(TABLES.EXAMS);
export const QuestionsService = new TableService(TABLES.QUESTIONS);
export const SubmissionsService = new TableService(TABLES.SUBMISSIONS);
export const TeachersService = new TableService(TABLES.TEACHERS);
export const StudentsService = new TableService(TABLES.STUDENTS);
export const GradesService = new TableService(TABLES.GRADES);
export const StagesService = new TableService(TABLES.STAGES);
export const SubjectsService = new TableService(TABLES.SUBJECTS);
export const ClassesService = new TableService(TABLES.CLASSES);
export const GroupsService = new TableService(TABLES.GROUPS);
export const AttemptsService = new TableService(TABLES.ATTEMPTS);
export const EnrollmentsService = new TableService(TABLES.ENROLLMENTS);
export const PaymentsService = new TableService(TABLES.PAYMENTS);
export const CouponsService = new TableService(TABLES.COUPONS);
export const NotificationsService = new TableService(TABLES.NOTIFICATIONS);
