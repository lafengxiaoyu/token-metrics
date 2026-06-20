import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';
import { resolveTokenLensCacheDir } from '../platform-paths.js';

interface CachePayload<T> {
  version: number;
  savedAt: string;
  data: T;
}

export async function readJsonCache<T>(name: string, version: number): Promise<T | null> {
  try {
    const filePath = join(resolveTokenLensCacheDir(), `${name}.json`);
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
  const cacheDir = resolveTokenLensCacheDir();
  await mkdir(cacheDir, { recursive: true });

  const payload: CachePayload<T> = {
    version,
    savedAt: new Date().toISOString(),
    data,
  };

  const filePath = join(cacheDir, `${name}.json`);
  const tmpPath = join(cacheDir, `${name}.tmp`);

  await writeFile(tmpPath, JSON.stringify(payload), 'utf-8');
  await rename(tmpPath, filePath);
}
