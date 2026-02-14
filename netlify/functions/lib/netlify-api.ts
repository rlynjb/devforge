const NETLIFY_API = 'https://api.netlify.com/api/v1';

function headers() {
  return {
    Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export async function createSite(params: {
  name: string;
  repoFullName: string;
  buildCommand: string;
  publishDir: string;
}): Promise<{ siteId: string; siteUrl: string; adminUrl: string }> {
  const res = await fetch(`${NETLIFY_API}/sites`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: params.name,
      repo: {
        provider: 'github',
        repo_path: params.repoFullName,
        repo_branch: 'main',
        cmd: params.buildCommand,
        dir: params.publishDir,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Netlify site creation failed: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    siteId: data.id,
    siteUrl: data.ssl_url || data.url,
    adminUrl: data.admin_url,
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
