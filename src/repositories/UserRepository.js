/**
 * src/repositories/UserRepository.js
 * User and Roles Repository Layer
 */
import { supabase } from '../lib/supabase/client';

export class UserRepository {
  constructor() {
    this.mockUsers = [
      { name: 'Aadithya Vimal', email: 'aadit@threatstream.io', role: 'Global Administrator', status: 'Active', lastLogin: '2 mins ago' },
      { name: 'Jane Doe', email: 'jane.doe@threatstream.io', role: 'Incident Responder (Tier 2)', status: 'Active', lastLogin: '2 hours ago' },
      { name: 'Alex Chen', email: 'alex.chen@threatstream.io', role: 'Security Analyst (Tier 1)', status: 'Active', lastLogin: '1 day ago' },
      { name: 'Contractor Audit', email: 'external.auditor@threatstream.io', role: 'Read-Only Auditor', status: 'Suspended', lastLogin: '3 weeks ago' }
    ];
  }

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
      console.warn('UserRepository: falling back to mock operators.', err.message);
      return this.mockUsers;
    }
  }
}

export default UserRepository;
