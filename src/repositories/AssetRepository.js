/**
 * src/repositories/AssetRepository.js
 * Assets and Infrastructure Inventory Repository
 */
import { supabase } from '../lib/supabase/client';
import { Asset } from '../types';

export class AssetRepository {
  constructor() {}

  /**
   * Fetch all registered assets.
   */
  async getAssets() {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('hostname', { ascending: true });

      if (error) throw error;
      return data.map(item => new Asset(item));
    } catch (err) {
      console.warn('AssetRepository.getAssets failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch detailed asset by ID.
   */
  async getAssetById(id) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return new Asset(data);
    } catch (err) {
      console.warn('AssetRepository.getAssetById failed:', err.message);
      return null;
    }
  }

  /**
   * Fetch Switch-Routing Topology Map nodes - correlation engine mapping
   */
  async getNetworkTopology() {
    try {
      const { data: nodes, error: nodeErr } = await supabase.from('topology_nodes').select('*');
      const { data: links, error: linkErr } = await supabase.from('topology_links').select('*');
      if (nodeErr || linkErr) throw new Error('Topology DB tables not found');
      return { nodes, links };
    } catch (err) {
      console.warn('AssetRepository.getNetworkTopology failed:', err.message);
      return { nodes: [], links: [] };
    }
  }
}

export default AssetRepository;
