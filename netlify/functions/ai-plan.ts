import type { Context } from '@netlify/functions';
import { createPlannerChain } from './lib/ai/chains';
import type { IdeaInput, AppSettings } from '../../shared/types';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await req.json()) as { idea: IdeaInput; settings: AppSettings };
    const chain = createPlannerChain(body.settings);
    const plan = await chain.invoke(body.idea);
    return Response.json(plan);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Plan generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
