/**
 * src/repositories/ThreatRepository.js
 * Threat and IOC Repository Layer
 */
import { supabase } from '../lib/supabase/client';
import { Threat, IOC } from '../types';

export class ThreatRepository {
  constructor() {}

  /**
   * Fetch recent threat events.
   */
  async getRecentThreats(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('threat_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map(item => new Threat(item));
    } catch (err) {
      console.warn('ThreatRepository.getRecentThreats failed:', err.message);
      return [];
    }
  }

  /**
   * Set dynamic list of threat events (useful for real-time live events cache)
   */
  updateLocalThreatCache(threatsArray) {
    this.mockThreats = threatsArray;
  }

  /**
   * Listen for real-time threat events.
   * Connects to Supabase realtime channels only.
   */
  listenForThreats(callback) {
    // Attempt Supabase Realtime channel subscription
    try {
      const channel = supabase
        .channel('public:threat_events')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'threat_events' },
          (payload) => {
            callback(new Threat(payload.new));
          }
        )
        .subscribe();

      // Return cleanup handler
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('ThreatRepository: Supabase realtime channel unavailable.', err);
      return () => {};
    }
  }

  /**
   * Fetch all registered IOCs.
   */
  async getIOCs() {
    try {
      const { data, error } = await supabase
        .from('iocs')
        .select('*')
        .order('confidence', { ascending: false });

      if (error) throw error;
      return data.map(item => new IOC(item));
    } catch (err) {
      console.warn('ThreatRepository.getIOCs failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch specific IOC by its database identifier.
   */
  async getIOCById(id) {
    try {
      const { data, error } = await supabase
        .from('iocs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return new IOC(data);
    } catch (err) {
      console.warn('ThreatRepository.getIOCById failed:', err.message);
      return null;
    }
  }

  /**
   * Fetch all threat actors.
   */
  async getThreatActors() {
    try {
      const { data, error } = await supabase
        .from('threat_actors')
        .select('*')
        .order('risk_score', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('ThreatRepository.getThreatActors failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch all campaigns.
   */
  async getCampaigns() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('ThreatRepository.getCampaigns failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch all malware families.
   */
  async getMalwareFamilies() {
    try {
      const { data, error } = await supabase
        .from('malware_families')
        .select('*');

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('ThreatRepository.getMalwareFamilies failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch related assets/incidents/vulnerabilities correlations for a specific IOC.
   */
  async getIOCCorrelations(iocId) {
    try {
      const { data, error } = await supabase
        .from('ioc_correlations')
        .select('*')
        .eq('ioc_id', iocId);

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('ThreatRepository.getIOCCorrelations failed:', err.message);
      return [];
    }
  }
}

export default ThreatRepository;
