import type { Context } from '@netlify/functions';
import { getRepoTree, getFileContent } from './lib/github';
import * as fs from 'fs';
import * as path from 'path';

const KNOWN_FILES = [
  'AI_RULES.md',
  'README.md',
  'ROADMAP.md',
  'GETTING_STARTED.md',
  'FEATURES.md',
  'package.json',
  'netlify.toml',
];

function scanLocalDir(dirPath: string, base = ''): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        results.push(...scanLocalDir(path.join(dirPath, entry.name), rel));
      } else {
        results.push(rel);
      }
    }
  } catch {
    // Directory not readable
  }
  return results;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const source = url.searchParams.get('source');
    const file = url.searchParams.get('file');

    // Read a specific file
    if (file) {
      if (source === 'github') {
        const repo = url.searchParams.get('repo');
        if (!repo) return Response.json({ error: 'Missing repo param' }, { status: 400 });
        const content = await getFileContent(repo, file);
        return Response.json({ content });
      }

      if (source === 'local') {
        const repoPath = url.searchParams.get('repoPath');
        if (!repoPath) return Response.json({ error: 'Missing repoPath param' }, { status: 400 });
        const filePath = path.join(repoPath, file);
        if (!fs.existsSync(filePath)) {
          return Response.json({ error: 'File not found' }, { status: 404 });
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return Response.json({ content });
      }

      return Response.json({ error: 'Invalid source' }, { status: 400 });
    }

    // Scan the repo tree
    if (source === 'github') {
      const repo = url.searchParams.get('repo');
      if (!repo) return Response.json({ error: 'Missing repo param' }, { status: 400 });

      const files = await getRepoTree(repo);
      const detected: Record<string, boolean> = {};
      for (const known of KNOWN_FILES) {
        detected[known] = files.includes(known);
      }

      return Response.json({ files, detected });
    }

    if (source === 'local') {
      const repoPath = url.searchParams.get('repoPath');
      if (!repoPath) return Response.json({ error: 'Missing repoPath param' }, { status: 400 });

      if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
        return Response.json({ error: 'Directory not found' }, { status: 404 });
      }

      const files = scanLocalDir(repoPath);
      const detected: Record<string, boolean> = {};
      for (const known of KNOWN_FILES) {
        detected[known] = files.includes(known);
      }

      return Response.json({ files, detected });
    }

    return Response.json({ error: 'Missing source param (github or local)' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Repo scan failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
