/**
 * src/repositories/TelemetryRepository.js
 * Telemetry and Detections Rules Repository
 */
import { supabase } from '../lib/supabase/client';

export class TelemetryRepository {
  constructor() {}

  /**
   * Search through telemetry events using standard filters
   */
  async getTelemetryEvents(queryStr = '') {
    try {
      const { data, error } = await supabase
        .from('telemetry')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return this.filterLocalEvents(data, queryStr);
    } catch (err) {
      console.warn('TelemetryRepository.getTelemetryEvents failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch Active detection rules (Sigma/YARA)
   */
  async getRules() {
    try {
      const { data, error } = await supabase
        .from('detections')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('TelemetryRepository.getRules failed:', err.message);
      return [];
    }
  }

  // --- KQL Search Engine Filter Logic ---
  filterLocalEvents(events, queryStr) {
    if (!queryStr || queryStr.trim() === '') {
      return [...events];
    }

    const lines = queryStr.split('\n').map(l => l.trim()).filter(Boolean);
    let filtered = [...events];

    try {
      lines.forEach(line => {
        if (line.startsWith('//') || line.startsWith('#')) return;

        if (line.startsWith('|')) {
          const cmdParts = line.substring(1).trim().split(/\s+/);
          const cmd = cmdParts[0].toLowerCase();
          
          if (cmd === 'where') {
            const expr = cmdParts.slice(1).join(' ');
            
            if (expr.includes('==')) {
              const [field, val] = expr.split('==').map(s => s.trim().replace(/['"]/g, ''));
              filtered = filtered.filter(evt => {
                const objValue = this.getNestedValue(evt, field);
                return String(objValue).toLowerCase() === String(val).toLowerCase();
              });
            }
            else if (expr.includes('contains') || expr.includes('has')) {
              const delimiter = expr.includes('contains') ? 'contains' : 'has';
              const [field, val] = expr.split(delimiter).map(s => s.trim().replace(/['"]/g, ''));
              filtered = filtered.filter(evt => {
                const objValue = this.getNestedValue(evt, field);
                return String(objValue).toLowerCase().includes(String(val).toLowerCase());
              });
            }
            else if (expr.includes('!=')) {
              const [field, val] = expr.split('!=').map(s => s.trim().replace(/['"]/g, ''));
              filtered = filtered.filter(evt => {
                const objValue = this.getNestedValue(evt, field);
                return String(objValue).toLowerCase() !== String(val).toLowerCase();
              });
            }
          }
          else if (cmd === 'limit') {
            const limitCount = parseInt(cmdParts[1]);
            if (!isNaN(limitCount)) {
              filtered = filtered.slice(0, limitCount);
            }
          }
          else if (cmd === 'order' && cmdParts[1] === 'by') {
            const field = cmdParts[2];
            const direction = cmdParts[3] || 'asc';
            filtered.sort((a, b) => {
              const valA = String(this.getNestedValue(a, field));
              const valB = String(this.getNestedValue(b, field));
              return direction.toLowerCase() === 'desc' 
                ? valB.localeCompare(valA)
                : valA.localeCompare(valB);
            });
          }
        } 
        else {
          const term = line.toLowerCase();
          filtered = filtered.filter(evt => 
            evt.hostname.toLowerCase().includes(term) ||
            evt.user.toLowerCase().includes(term) ||
            evt.type.toLowerCase().includes(term) ||
            (evt.details && evt.details.toLowerCase().includes(term))
          );
        }
      });
    } catch (err) {
      console.error('KQL Query Parse error inside repository:', err);
    }

    return filtered;
  }

  getNestedValue(obj, path) {
    const lowercaseKey = path.toLowerCase();
    const actualKey = Object.keys(obj).find(k => k.toLowerCase() === lowercaseKey) || path;
    return obj[actualKey] !== undefined ? obj[actualKey] : '';
  }

  /**
   * Fetch all triggered security alerts.
   */
  async getAlerts() {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('TelemetryRepository.getAlerts failed:', err.message);
      return [];
    }
  }

  /**
   * Write new alert event.
   */
  async saveAlert(alert) {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert([alert])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const newAlert = { ...alert, id: `alert-${Math.floor(Math.random() * 100000)}`, created_at: new Date().toISOString() };
      console.warn('TelemetryRepository.saveAlert failed:', err.message);
      return newAlert;
    }
  }
}

export default TelemetryRepository;
