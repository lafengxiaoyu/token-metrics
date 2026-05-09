import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';
import{ homedir } from 'os';

export const CACHE_DIR = process.env.TOKENLENS_CACHE_DIR ?? join(homedir(), '.cache', 'tokenlens');

interface CachePayload<T> {
  version: number;
  savedAt: string;
  data: T;
}

export async function readJsonCache<T>(name: string, version: number): Promise<T | null> {
  try {
    const filePath = join(CACHE_DIR, `${name}.json`);
    const content = await readFile(filePath, 'utf-8');
    const payload = JSON.parse(content) as CachePayload<T>;

    if (payload.version !== version) {
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
}

export async function writeJsonCache<T>(name: string, version: number, data: T): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });

  const payload: CachePayload<T> = {
    version,
    savedAt: new Date().toISOString(),
    data,
  };

  const filePath = join(CACHE_DIR, `${name}.json`);
  const tmpPath = join(CACHE_DIR, `${name}.tmp`);

  await writeFile(tmpPath, JSON.stringify(payload), 'utf-8');
  await rename(tmpPath, filePath);
}
