import type { Context } from '@netlify/functions';
import { createDeployChain } from './lib/ai/chains';
import type { AppSettings } from '../../shared/types';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await req.json()) as {
      techStack: string;
      projectType: string;
      hasApi: boolean;
      settings: AppSettings;
    };
    const chain = createDeployChain(body.settings);
    const config = await chain.invoke({
      techStack: body.techStack,
      projectType: body.projectType,
      hasApi: body.hasApi,
    });
    return Response.json(config);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Deploy config generation failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
