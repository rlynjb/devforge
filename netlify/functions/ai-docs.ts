import type { Context } from '@netlify/functions';
import { createDocsChain } from './lib/ai/chains';
import type { ProjectPlan, AppSettings } from '../../shared/types';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await req.json()) as {
      plan: ProjectPlan;
      repoName: string;
      settings: AppSettings;
    };
    const chain = createDocsChain(body.settings);
    const docs = await chain.invoke({ plan: body.plan, repoName: body.repoName });
    return Response.json(docs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Docs generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
