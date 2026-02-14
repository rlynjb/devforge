import { getStore } from '@netlify/blobs';
import type { ProjectState } from '../../../shared/types';

const STORE_NAME = 'devforge-state';

export async function saveState(state: ProjectState): Promise<void> {
  try {
    const store = getStore(STORE_NAME);
    await store.setJSON(state.id, state);
  } catch {
    console.warn('Blob store unavailable, state not persisted server-side');
  }
}

export async function loadState(id: string): Promise<ProjectState | null> {
  try {
    const store = getStore(STORE_NAME);
    return (await store.get(id, { type: 'json' })) as ProjectState | null;
  } catch {
    return null;
  }
}

export async function listProjects(): Promise<string[]> {
  try {
    const store = getStore(STORE_NAME);
    const { blobs } = await store.list();
    return blobs.map((b) => b.key);
  } catch {
    return [];
  }
}
