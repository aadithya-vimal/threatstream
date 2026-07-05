/**
 * src/services/ConfigurationService.js
 * System Settings Configuration Service Layer
 */
import { ConfigurationRepository } from '../repositories/ConfigurationRepository';

export class ConfigurationService {
  constructor() {
    this.configurationRepository = new ConfigurationRepository();
  }

  async getSettings() {
    return await this.configurationRepository.getSettings();
  }

  async updateSetting(key, value) {
    return await this.configurationRepository.updateSetting(key, value);
  }
}

export default ConfigurationService;
