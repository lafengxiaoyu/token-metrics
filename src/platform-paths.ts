import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

type Environment = Record<string, string | undefined>

export function resolveCopilotHome(env: Environment = process.env, home = homedir()): string {
  return env['COPILOT_HOME'] || join(home, '.copilot')
}

export function resolveTokenLensCacheDir(
  env: Environment = process.env,
  platform = process.platform,
  home = homedir(),
): string {
  if (env['TOKENLENS_CACHE_DIR']) return env['TOKENLENS_CACHE_DIR']
  if (env['XDG_CACHE_HOME']) return join(env['XDG_CACHE_HOME'], 'tokenlens')
  if (platform === 'win32' && env['LOCALAPPDATA']) return join(env['LOCALAPPDATA'], 'tokenlens', 'cache')
  return join(home, '.cache', 'tokenlens')
}

export function resolveTokenLensConfigDir(
  env: Environment = process.env,
  platform = process.platform,
  home = homedir(),
): string {
  if (env['TOKENLENS_CONFIG_DIR']) return env['TOKENLENS_CONFIG_DIR']
  if (env['XDG_CONFIG_HOME']) return join(env['XDG_CONFIG_HOME'], 'tokenlens')
  if (platform === 'win32' && env['APPDATA']) return join(env['APPDATA'], 'tokenlens')
  return join(home, '.config', 'tokenlens')
}

export function resolveExistingConfigDir(
  env: Environment = process.env,
  platform = process.platform,
  home = homedir(),
): string {
  const preferred = resolveTokenLensConfigDir(env, platform, home)
  if (existsSync(join(preferred, 'config.json'))) return preferred

  const legacy = join(home, '.config', 'codeburn')
  if (existsSync(join(legacy, 'config.json'))) return legacy
  return preferred
}
