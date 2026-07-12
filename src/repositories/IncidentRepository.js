/**
 * src/repositories/IncidentRepository.js
 * Incident Response, Playbooks, and Forensic Evidence Repository
 */
import { supabase } from '../lib/supabase/client';
import { Incident } from '../types';

export class IncidentRepository {
  constructor() {}

  /**
   * Fetch active incidents.
   */
  async getIncidents() {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('logged_date', { ascending: false });

      if (error) throw error;
      return data.map(item => new Incident(item));
    } catch (err) {
      console.warn('IncidentRepository.getIncidents failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch specific incident by ID.
   */
  async getIncidentById(id) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return new Incident(data);
    } catch (err) {
      console.warn('IncidentRepository.getIncidentById failed:', err.message);
      return null;
    }
  }

  /**
   * Update incident fields.
   */
  async updateIncident(id, fields) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return new Incident(data);
    } catch (err) {
      console.warn('IncidentRepository.updateIncident failed:', err.message);
      return null;
    }
  }

  /**
   * Fetch file static details for Malware PE analyzer
   */
  async getMalwareProfile(filename) {
    try {
      const { data, error } = await supabase
        .from('malware_samples')
        .select('*')
        .eq('filename', filename)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('IncidentRepository.getMalwareProfile failed:', err.message);
      return null;
    }
  }

  /**
   * Upload incident evidence attachment to Supabase Storage.
   */
  async uploadEvidence(incidentId, filename, fileBody) {
    try {
      const filePath = `${incidentId}/${filename}`;
      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(filePath, fileBody, { upsert: true });

      if (error) throw error;
      return data.path;
    } catch (err) {
      console.warn('IncidentRepository.uploadEvidence failed:', err.message);
      return null;
    }
  }

  /**
   * Download incident evidence attachment from Supabase Storage.
   */
  async downloadEvidence(incidentId, filename) {
    try {
      const filePath = `${incidentId}/${filename}`;
      const { data, error } = await supabase.storage
        .from('evidence')
        .download(filePath);

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('IncidentRepository.downloadEvidence failed:', err.message);
      return null;
    }
  }

  /**
   * Upload malware payload sample to Supabase Storage.
   */
  async uploadMalwareSample(filename, fileBody) {
    try {
      const { data, error } = await supabase.storage
        .from('malware')
        .upload(filename, fileBody, { upsert: true });

      if (error) throw error;
      return data.path;
    } catch (err) {
      console.warn('IncidentRepository.uploadMalwareSample failed:', err.message);
      return null;
    }
  }

  /**
   * Download malware payload sample from Supabase Storage.
   */
  async downloadMalwareSample(filename) {
    try {
      const { data, error } = await supabase.storage
        .from('malware')
        .download(filename);

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('IncidentRepository.downloadMalwareSample failed:', err.message);
      return null;
    }
  }
}

export default IncidentRepository;
