import type { Context } from '@netlify/functions';
import { createPolicyChain } from './lib/ai/chains';
import type { ProjectPlan, AppSettings } from '../../shared/types';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await req.json()) as {
      plan: ProjectPlan;
      settings: AppSettings;
      existingRules?: string;
    };

    const chain = createPolicyChain(body.settings);
    const policy = await chain.invoke({
      plan: body.plan,
      existingRules: body.existingRules ?? '',
    });

    return Response.json(policy);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Policy generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
