import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function missing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/** Portable, repository-relative paths only; no '..', devices, or Windows ADS. */
export function relativePath(input: string): string {
  const normalized = input.replace(/\\/gu, '/');
  const segments = normalized.split('/');
  if (!normalized || path.posix.isAbsolute(normalized) || segments.some((segment) => !segment || segment === '.' || segment === '..' || /[\u0000-\u001f<>:"|?*]/u.test(segment) || /[. ]$/u.test(segment) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(segment))) {
    throw new Error(`Unsafe path "${input}". Use a repository-relative path without traversal or special characters.`);
  }
  return segments.join('/');
}

export async function rootDirectory(input: string): Promise<string> {
  const root = await realpath(path.resolve(input));
  if (!(await lstat(root)).isDirectory()) throw new Error(`Not a directory: ${input}`);
  return root;
}

/** Refuse symbolic links/junctions in every existing component, including leaf. */
export async function safePath(root: string, input: string): Promise<string> {
  const normalized = relativePath(input);
  let cursor = root;
  const segments = normalized.split('/');
  for (const [index, segment] of segments.entries()) {
    cursor = path.join(cursor, segment);
    try {
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink()) throw new Error(`Refusing symbolic link or junction: ${cursor}`);
      if (stat.isFile() && stat.nlink > 1) throw new Error(`Refusing hard-linked file: ${cursor}`);
      if (index < segments.length - 1 && !stat.isDirectory()) throw new Error(`Expected directory: ${cursor}`);
      if (index === segments.length - 1 && !stat.isFile() && !stat.isDirectory()) throw new Error(`Refusing special file: ${cursor}`);
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }
  return cursor;
}

export async function optionalText(filename: string): Promise<string | undefined> {
  try { return await readFile(filename, 'utf8'); }
  catch (error) { if (missing(error)) return undefined; throw error; }
}

export async function readText(root: string, filename: string): Promise<string> {
  const absolute = await safePath(root, filename);
  const text = await optionalText(absolute);
  if (text === undefined) throw new Error(`File not found: ${filename}`);
  return text;
}

export interface PlannedWrite { path: string; content: string }

/** Preflight the entire plan before writes; unchanged files keep their mtime. */
export async function applyPlan(root: string, plan: readonly PlannedWrite[], check = false): Promise<string[]> {
  const targets = await Promise.all(plan.map(async (file) => {
    const absolute = await safePath(root, file.path);
    try {
      if (!(await lstat(absolute)).isFile()) throw new Error(`Expected regular file: ${file.path}`);
    } catch (error) { if (!missing(error)) throw error; }
    return { ...file, absolute, current: await optionalText(absolute) };
  }));
  const changed = targets.filter((file) => file.current !== file.content);
  if (!check) {
    for (const file of changed) {
      await mkdir(path.dirname(file.absolute), { recursive: true });
      // Recheck immediately before writing to catch changed directory entries.
      await safePath(root, file.path);
      await writeFile(file.absolute, file.content, { encoding: 'utf8', flag: file.current === undefined ? 'wx' : 'w' });
    }
  }
  return changed.map((file) => file.path);
}
