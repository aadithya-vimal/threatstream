/**
 * src/repositories/ConfigurationRepository.js
 * System Settings Configuration Repository
 */
import { supabase } from '../lib/supabase/client';
import { withRepositoryFallback } from '../lib/dataMode';

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
      return withRepositoryFallback({
        repository: 'ConfigurationRepository',
        action: 'getSettings',
        error: err,
        mockValue: this.mockSettings,
        emptyValue: {},
      });
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
      return withRepositoryFallback({
        repository: 'ConfigurationRepository',
        action: 'updateSetting',
        error: err,
        mockValue: () => {
          this.mockSettings[key] = value;
          return true;
        },
        emptyValue: false,
      });
    }
  }
}

export default ConfigurationRepository;
