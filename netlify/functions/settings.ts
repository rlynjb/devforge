import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import type { AppSettings } from '../../shared/types';

const STORE_NAME = 'devforge-state';
const SETTINGS_KEY = 'global-settings';

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'openai',
  model: 'gpt-4o',
};

export default async (req: Request, _context: Context) => {
  const method = req.method;

  if (method === 'GET') {
    try {
      const store = getStore(STORE_NAME);
      const settings = await store.get(SETTINGS_KEY, { type: 'json' });
      return Response.json(settings || DEFAULT_SETTINGS);
    } catch {
      return Response.json(DEFAULT_SETTINGS);
    }
  }

  if (method === 'PUT') {
    const settings: AppSettings = await req.json();
    try {
      const store = getStore(STORE_NAME);
      await store.setJSON(SETTINGS_KEY, settings);
    } catch {
      // Blob store unavailable
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
