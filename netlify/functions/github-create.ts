import type { Context } from '@netlify/functions';
import { createRepo, getAuthenticatedUser } from './lib/github';
import type { RepoConfig } from '../../shared/types';

export default async (req: Request, _context: Context) => {
  if (req.method === 'GET') {
    try {
      const login = await getAuthenticatedUser();
      return Response.json({ login });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get GitHub user';
      return Response.json({ error: message }, { status: 500 });
    }
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const config = (await req.json()) as RepoConfig;
    const result = await createRepo(config);
    return Response.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Repo creation failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
