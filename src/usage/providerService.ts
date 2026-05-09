import { getAllProviders } from '../providers/index.js';
import type { ProviderStatusDTO } from '../shared/types.js';

export async function listProviderStatus(): Promise<ProviderStatusDTO[]> {
  const providers = await getAllProviders();
  const results: ProviderStatusDTO[] = [];

  for (const provider of providers) {
    try {
      const sessions = await provider.discoverSessions();
      const toolSources = provider.name === 'claude'
        ? ['Claude Code', 'Claude Desktop']
        : [provider.displayName];

      results.push({
        name: provider.name,
        displayName: provider.displayName,
        available: true,
        sourceCount: sessions.length,
toolSources,
      });
    } catch (err) {
      results.push({
        name: provider.name,
        displayName: provider.displayName,
        available: false,
        sourceCount: 0,
        toolSources: [provider.displayName],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
