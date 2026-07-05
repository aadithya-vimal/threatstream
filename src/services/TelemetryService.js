/**
 * src/services/TelemetryService.js
 * EDR Telemetry and Detection Rules Service Layer
 */
import { TelemetryRepository } from '../repositories/TelemetryRepository';

export class TelemetryService {
  constructor() {
    this.telemetryRepository = new TelemetryRepository();
  }

  async getTelemetryEvents(queryStr = '') {
    return await this.telemetryRepository.getTelemetryEvents(queryStr);
  }

  getTelemetryEventsSync(queryStr = '') {
    return this.telemetryRepository.filterLocalEvents(this.telemetryRepository.mockEvents, queryStr);
  }

  async getRules() {
    return await this.telemetryRepository.getRules();
  }
}

/**
 * Mock Event Generator to simulate live endpoint WebSocket streams.
 */
export class MockEventGenerator {
  constructor(onEventGenerated) {
    this.callback = onEventGenerated;
    this.timer = null;
    this.hosts = ['WIN10-DESK-294', 'MACOS-DEV-382', 'PRD-DB-SRV-01', 'PRD-APP-SRV-02', 'CEO-LAPTOP-01'];
    this.users = ['sales_user', 'dev_user', 'db_admin', 'root', 'ceo_admin', 'SYSTEM'];
    this.eventTypes = ['Process', 'Network Connection', 'Registry', 'DNS', 'Authentication', 'PowerShell'];
  }

  start() {
    this.stop();
    this.timer = setInterval(() => {
      const randomType = this.eventTypes[Math.floor(Math.random() * this.eventTypes.length)];
      const randomHost = this.hosts[Math.floor(Math.random() * this.hosts.length)];
      const randomUser = this.users[Math.floor(Math.random() * this.users.length)];
      
      let details = '';
      let category = 'Auditing';

      switch (randomType) {
        case 'Process':
          details = `Process Created: cmd.exe /c "ipconfig /all" (PID: ${Math.floor(Math.random() * 10000)})`;
          category = 'Execution';
          break;
        case 'Network Connection':
          const remoteIp = `192.168.4.${Math.floor(Math.random() * 254)}`;
          details = `TCP connection established: System -> ${remoteIp}:80 (Allowed)`;
          category = 'Network Flow';
          break;
        case 'Registry':
          details = 'Registry Value Modified: HKCU\\Software\\Microsoft\\Office\\Excel\\Security\\VBA -> 1';
          category = 'Configuration';
          break;
        case 'DNS':
          details = 'DNS Lookup queried: api.github.com (Resolved: 140.82.121.5)';
          category = 'DNS Lookup';
          break;
        case 'Authentication':
          details = `Console login authenticated successfully for user: ${randomUser}`;
          category = 'Access Log';
          break;
        case 'PowerShell':
          details = 'PowerShell Script block evaluated: Get-Process | Select-Object ProcessName';
          category = 'Execution';
          break;
        default:
          details = 'Telemetry log entry recorded.';
      }

      const newEvent = {
        id: `evt-live-${Math.floor(Math.random() * 100000)}`,
        timestamp: new Date().toISOString(),
        type: randomType,
        hostname: randomHost,
        user: randomUser,
        details,
        category
      };

      this.callback(newEvent);
    }, 4000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export default TelemetryService;
