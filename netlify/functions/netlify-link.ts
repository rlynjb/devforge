import type { Context } from '@netlify/functions';
import { createSite } from './lib/netlify-api';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await req.json()) as {
      repoFullName: string;
      siteName: string;
      buildCommand: string;
      publishDir: string;
    };
    const result = await createSite({
      name: body.siteName,
      repoFullName: body.repoFullName,
      buildCommand: body.buildCommand,
      publishDir: body.publishDir,
    });
    return Response.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Netlify site creation failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
