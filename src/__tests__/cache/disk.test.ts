import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readJsonCache, writeJsonCache } from '../../cache/disk.js';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';

describe('disk cache', () => {
  const testDir = join(tmpdir(), `tokenlens-test-${Date.now()}`);
  const originalCacheDir = process.env.TOKENLENS_CACHE_DIR;

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    process.env.TOKENLENS_CACHE_DIR = testDir;
  });

  afterAll(async () => {
    if (originalCacheDir === undefined) delete process.env.TOKENLENS_CACHE_DIR;
    else process.env.TOKENLENS_CACHE_DIR = originalCacheDir;
    await rm(testDir, { recursive: true, force: true });
  });

  it('missing cache returns null', async () => {
    const result = await readJsonCache('nonexistent', 1);
expect(result).toBeNull();
  });

  it('valid cache returns data', async () => {
    const data = { foo: 'bar' };
    await writeJsonCache('test', 1, data);
    const result = await readJsonCache('test', 1);
expect(result).toEqual(data);
  });

  it('version mismatch returns null', async () => {
    const data = { foo: 'bar' };
    await writeJsonCache('test', 1, data);
    const result = await readJsonCache('test', 2);
expect(result).toBeNull();
  });

  it('write creates JSON file', async () => {
    const data = { tokens: 100 };
    await writeJsonCache('tokens', 1, data);
    const result = await readJsonCache('tokens', 1);
expect(result).toEqual(data);
  });
});
