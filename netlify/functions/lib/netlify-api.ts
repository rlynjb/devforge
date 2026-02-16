import * as crypto from 'crypto';

const NETLIFY_API = 'https://api.netlify.com/api/v1';

function headers() {
  return {
    Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create a deploy key pair via Netlify API.
 * Returns the deploy key ID and public key (to be added to GitHub).
 */
async function createDeployKey(): Promise<{ id: string; publicKey: string }> {
  const res = await fetch(`${NETLIFY_API}/deploy_keys`, {
    method: 'POST',
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to create deploy key: ${err.message || JSON.stringify(err)}`);
  }

  const data = await res.json();
  return { id: data.id, publicKey: data.public_key };
}

export async function createSite(params: {
  name: string;
  repoFullName: string;
  buildCommand: string;
  publishDir: string;
  deployKeyId?: string;
}): Promise<{ siteId: string; siteUrl: string; adminUrl: string }> {
  const body: Record<string, unknown> = { name: params.name };

  if (params.deployKeyId) {
    body.repo = {
      provider: 'github',
      deploy_key_id: params.deployKeyId,
      repo_path: params.repoFullName,
      repo_branch: 'main',
      cmd: params.buildCommand,
      dir: params.publishDir,
    };
  }

  const res = await fetch(`${NETLIFY_API}/sites`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Netlify createSite error:', JSON.stringify(err, null, 2));

    // If repo linking failed, retry without it
    if (params.deployKeyId) {
      console.log('Retrying site creation without repo linking...');
      const retryRes = await fetch(`${NETLIFY_API}/sites`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name: params.name }),
      });

      if (!retryRes.ok) {
        const retryErr = await retryRes.json().catch(() => ({}));
        throw new Error(`Netlify site creation failed: ${retryErr.message || retryErr.error || JSON.stringify(retryErr)}`);
      }

      const retryData = await retryRes.json();
      return {
        siteId: retryData.id,
        siteUrl: retryData.ssl_url || retryData.url,
        adminUrl: retryData.admin_url,
      };
    }

    throw new Error(`Netlify site creation failed: ${err.message || err.error || JSON.stringify(err) || res.statusText}`);
  }

  const data = await res.json();
  return {
    siteId: data.id,
    siteUrl: data.ssl_url || data.url,
    adminUrl: data.admin_url,
  };
}

/**
 * Create a deploy key, add it to the GitHub repo, and return the deploy key ID.
 * This allows Netlify to clone the repo without requiring the GitHub App.
 */
export async function setupDeployKey(
  repoFullName: string,
  addKeyToGitHub: (repoFullName: string, title: string, publicKey: string) => Promise<number>
): Promise<string> {
  const { id, publicKey } = await createDeployKey();
  console.log('Created Netlify deploy key:', id);

  await addKeyToGitHub(repoFullName, 'Netlify Deploy Key', publicKey);
  console.log('Added deploy key to GitHub repo:', repoFullName);

  return id;
}

/**
 * Deploy files directly to a Netlify site using the file digest deploy API.
 * Used as a fallback when repo linking isn't available, or to deploy a preview.
 */
export async function deployFiles(
  siteId: string,
  files: { path: string; content: string }[]
): Promise<{ deployUrl: string }> {
  const fileHashes: Record<string, string> = {};
  const fileContents: Record<string, string> = {};

  for (const file of files) {
    const normalizedPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
    const hash = crypto.createHash('sha1').update(file.content).digest('hex');
    fileHashes[normalizedPath] = hash;
    fileContents[hash] = file.content;
  }

  // Step 1: Create deploy with file digest
  const createRes = await fetch(`${NETLIFY_API}/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ files: fileHashes }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Deploy creation failed: ${err.message || JSON.stringify(err)}`);
  }

  const deploy = await createRes.json();
  const deployId = deploy.id;

  // Step 2: Upload any required files
  const required: string[] = deploy.required || [];
  for (const hash of required) {
    const content = fileContents[hash];
    if (!content) continue;

    await fetch(`${NETLIFY_API}/deploys/${deployId}/files/${hash}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });
  }

  return {
    deployUrl: deploy.ssl_url || deploy.url || `https://${deploy.subdomain}.netlify.app`,
  };
}

export async function setEnvVars(
  siteId: string,
  vars: { key: string; value: string }[]
): Promise<void> {
  for (const v of vars) {
    await fetch(`${NETLIFY_API}/sites/${siteId}/env/${v.key}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ values: [{ value: v.value, context: 'production' }] }),
    });
  }
}
