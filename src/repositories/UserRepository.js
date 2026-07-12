/**
 * src/repositories/UserRepository.js
 * User and Roles Repository Layer
 */
import { supabase } from '../lib/supabase/client';
export class UserRepository {
  constructor() {}

  /**
   * Fetch all registered console operators.
   */
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('UserRepository.getUsers failed:', err.message);
      return [];
    }
  }
}

export default UserRepository;
