import type { Context } from '@netlify/functions';
import { createInitialState } from './lib/state-machine';
import { saveState, loadState, listProjects } from './lib/store';

export default async (req: Request, _context: Context) => {
  const method = req.method;

  if (method === 'GET') {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      const projects = await listProjects();
      return Response.json({ projects });
    }

    const state = await loadState(id);
    if (!state) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    return Response.json(state);
  }

  if (method === 'POST') {
    const state = createInitialState();
    await saveState(state);
    return Response.json(state);
  }

  if (method === 'PUT') {
    const state = await req.json();
    await saveState(state);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
