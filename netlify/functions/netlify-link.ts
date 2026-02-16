import type { Context } from '@netlify/functions';
import { createSite, setupDeployKey, deployFiles } from './lib/netlify-api';
import { addDeployKey } from './lib/github';

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
      files?: { path: string; content: string }[];
    };

    // Step 1: Create a deploy key pair and add it to the GitHub repo
    let deployKeyId: string | undefined;
    try {
      deployKeyId = await setupDeployKey(body.repoFullName, addDeployKey);
      console.log('Deploy key set up successfully:', deployKeyId);
    } catch (err) {
      console.warn('Deploy key setup failed, will create site without repo linking:', err);
    }

    // Step 2: Create the Netlify site (with repo linking if deploy key worked)
    const result = await createSite({
      name: body.siteName,
      repoFullName: body.repoFullName,
      buildCommand: body.buildCommand,
      publishDir: body.publishDir,
      deployKeyId,
    });

    // Step 3: If scaffold files provided and no repo linking, deploy them directly
    let deployUrl: string | undefined;
    if (body.files && body.files.length > 0 && !deployKeyId) {
      const deploy = await deployFiles(result.siteId, body.files);
      deployUrl = deploy.deployUrl;
    }

    return Response.json({
      ...result,
      siteUrl: deployUrl || result.siteUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Netlify site creation failed';
    return Response.json({ error: message }, { status: 500 });
  }
};
