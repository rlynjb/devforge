import type { Context } from '@netlify/functions';
import { commitFiles } from './lib/github';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await req.json()) as {
      repoFullName: string;
      files: { path: string; content: string }[];
      message: string;
    };
    await commitFiles(body.repoFullName, body.files, body.message);
    return Response.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Commit failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
