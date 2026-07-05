/**
 * src/repositories/ConfigurationRepository.js
 * System Settings Configuration Repository
 */
import { supabase } from '../lib/supabase/client';

export class ConfigurationRepository {
  constructor() {
    this.mockSettings = {
      maxCacheSize: 100,
      ingressLimit: 500,
      sessionExpiry: 8
    };
  }

  /**
   * Fetch all configurations.
   */
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;
      const settingsMap = {};
      data.forEach(item => {
        settingsMap[item.key] = item.value;
      });
      return settingsMap;
    } catch (err) {
      console.warn('ConfigurationRepository: falling back to mock configurations.', err.message);
      return this.mockSettings;
    }
  }

  /**
   * Update configuration key value.
   */
  async updateSetting(key, value) {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn(`ConfigurationRepository: updating local config for key: ${key}.`, err.message);
      this.mockSettings[key] = value;
      return true;
    }
  }
}

export default ConfigurationRepository;
