import { describe, expect, it } from 'vitest'

import {
  resolveCopilotHome,
  resolveTokenLensCacheDir,
  resolveTokenLensConfigDir,
} from '../platform-paths.js'

function normalizeSeparators(pathValue: string): string {
  return pathValue.replace(/\\/g, '/')
}

describe('cross-platform data paths', () => {
  it('honors an explicit Copilot home on every platform', () => {
    expect(resolveCopilotHome({ COPILOT_HOME: '/data/copilot' }, '/home/user')).toBe('/data/copilot')
    expect(normalizeSeparators(resolveCopilotHome({}, '/home/user'))).toBe('/home/user/.copilot')
  })

  it('uses XDG directories on Linux', () => {
    const env = { XDG_CACHE_HOME: '/var/cache/user', XDG_CONFIG_HOME: '/var/config/user' }
    expect(normalizeSeparators(resolveTokenLensCacheDir(env, 'linux', '/home/user'))).toBe('/var/cache/user/tokenlens')
    expect(normalizeSeparators(resolveTokenLensConfigDir(env, 'linux', '/home/user'))).toBe('/var/config/user/tokenlens')
  })

  it('uses native application directories on Windows', () => {
    const env = { LOCALAPPDATA: 'C:\\Users\\dev\\AppData\\Local', APPDATA: 'C:\\Users\\dev\\AppData\\Roaming' }
    expect(normalizeSeparators(resolveTokenLensCacheDir(env, 'win32', 'C:\\Users\\dev'))).toContain('AppData/Local/tokenlens/cache')
    expect(normalizeSeparators(resolveTokenLensConfigDir(env, 'win32', 'C:\\Users\\dev'))).toContain('AppData/Roaming/tokenlens')
  })

  it('allows explicit TokenLens directories', () => {
    const env = { TOKENLENS_CACHE_DIR: '/tmp/cache', TOKENLENS_CONFIG_DIR: '/tmp/config' }
    expect(resolveTokenLensCacheDir(env)).toBe('/tmp/cache')
    expect(resolveTokenLensConfigDir(env)).toBe('/tmp/config')
  })
})
