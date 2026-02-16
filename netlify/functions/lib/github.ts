import type { RepoConfig, RepoResult } from '../../../shared/types';

async function getOctokit() {
  const { Octokit } = await import('@octokit/rest');
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

export async function createRepo(config: RepoConfig): Promise<RepoResult> {
  const octokit = await getOctokit();

  const { data } = await octokit.repos.createForAuthenticatedUser({
    name: config.name,
    description: config.description,
    private: config.isPrivate,
    auto_init: true,
  });

  return {
    url: data.html_url,
    cloneUrl: data.clone_url,
    fullName: data.full_name,
    defaultBranch: data.default_branch,
  };
}

export async function commitFiles(
  repoFullName: string,
  files: { path: string; content: string }[],
  message: string
): Promise<void> {
  const octokit = await getOctokit();
  const [owner, repo] = repoFullName.split('/');

  // Get the default branch's latest commit SHA
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: 'heads/main',
  });
  const latestCommitSha = ref.object.sha;

  // Get the tree SHA of that commit
  const { data: commit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commit.tree.sha;

  // Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    })
  );

  // Create new tree
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // Create commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: [latestCommitSha],
  });

  // Update ref
  await octokit.git.updateRef({
    owner,
    repo,
    ref: 'heads/main',
    sha: newCommit.sha,
  });
}

export async function getAuthenticatedUser(): Promise<string> {
  const octokit = await getOctokit();
  const { data } = await octokit.users.getAuthenticated();
  return data.login;
}

export async function addDeployKey(
  repoFullName: string,
  title: string,
  key: string
): Promise<number> {
  const octokit = await getOctokit();
  const [owner, repo] = repoFullName.split('/');
  const { data } = await octokit.repos.createDeployKey({
    owner,
    repo,
    title,
    key,
    read_only: true,
  });
  return data.id;
}
