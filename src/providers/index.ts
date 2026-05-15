import { copilot } from './copilot.js'
import type { Provider, SessionSource } from './types.js'

export async function getAllProviders(): Promise<Provider[]> {
  return [copilot]
}

export const providers = [copilot]

export async function discoverAllSessions(): Promise<SessionSource[]> {
  return await copilot.discoverSessions()
}

export async function getProvider(name: string): Promise<Provider | undefined> {
  return name === 'copilot' ? copilot : undefined
}
