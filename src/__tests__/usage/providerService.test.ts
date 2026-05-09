import {describe, it, expect } from 'vitest';
import { listProviderStatus } from '../../usage/providerService.js';

describe('providerService', () => {
  it('returns an array of provider statuses', async () => {
    const results= await listProviderStatus();
    expect(Array.isArray(results)).toBe(true);
  });

  it('each result has required fields', async () => {
    const results = await listProviderStatus();
    if(results.length > 0) {
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('displayName');
      expect(results[0]).toHaveProperty('available');
      expect(results[0]).toHaveProperty('sourceCount');
      expect(results[0]).toHaveProperty('toolSources');
    }
  });
});
