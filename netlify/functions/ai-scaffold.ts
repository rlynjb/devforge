import type { Context } from '@netlify/functions';
import { createScaffoldChain } from './lib/ai/chains';
import type { ProjectPlan, AppSettings } from '../../shared/types';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await req.json()) as {
      plan: ProjectPlan;
      settings: AppSettings;
    };
    const chain = createScaffoldChain(body.settings);
    const scaffold = await chain.invoke({ plan: body.plan });
    return Response.json(scaffold);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scaffold generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
