export async function fetchGithubData(githubUrl: string): Promise<string | null> {
    try {
        if (!githubUrl || !githubUrl.includes('github.com')) {
            return null;
        }

        // Convert https://github.com/user/repo to user/repo
        const urlObj = new URL(githubUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        if (pathParts.length < 2) return null;

        const owner = pathParts[0];
        const repo = pathParts[1].replace(/\.git$/, '');

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Hackathon-ATS'
        };

        // 0. Fetch repository metadata
        let repoMeta = '';
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        if (repoRes.ok) {
            const repoData = await repoRes.json();
            repoMeta = `Language: ${repoData.language || 'Unknown'}, Stars: ${repoData.stargazers_count || 0}, Description: ${repoData.description || 'None'}`;
        } else if (repoRes.status === 404) {
            return null;
        }

        // 1. Fetch README.md
        let readmeContent = '';
        const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
        if (readmeRes.ok) {
            const readmeData = await readmeRes.json();
            if (readmeData.content) {
                readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8');
            }
        }

        // 2. Fetch package.json (to understand tech stack)
        let packageJsonContent = '';
        const packageRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers });
        if (packageRes.ok) {
            const packageData = await packageRes.json();
            if (packageData.content) {
                packageJsonContent = Buffer.from(packageData.content, 'base64').toString('utf-8');
            }
        }

        // 3. Fetch recent commit activity
        let commitSummary = '';
        const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers });
        if (commitsRes.ok) {
            const commitsData = await commitsRes.json();
            if (Array.isArray(commitsData)) {
                commitSummary = commitsData
                    .map((c: { commit?: { message?: string; author?: { date?: string } } }) =>
                        `- ${c.commit?.author?.date || ''}: ${(c.commit?.message || '').split('\n')[0]}`
                    )
                    .join('\n');
            }
        }

        if (!readmeContent && !packageJsonContent && !commitSummary) {
            return "GitHub repository found but it appears mostly empty or missing standard files.";
        }

        let combinedContext = `--- GITHUB REPOSITORY CONTEXT ---\n`;
        combinedContext += `Repository: ${owner}/${repo}\n`;
        if (repoMeta) combinedContext += `${repoMeta}\n`;
        combinedContext += `\n`;

        if (readmeContent) {
            combinedContext += `--- README.md ---\n${readmeContent.substring(0, 5000)}\n\n`; // Limit size
        }

        if (packageJsonContent) {
            try {
                const parsedPackage = JSON.parse(packageJsonContent);
                combinedContext += `--- package.json dependencies ---\n`;
                combinedContext += JSON.stringify({
                    dependencies: parsedPackage.dependencies,
                    devDependencies: parsedPackage.devDependencies
                }, null, 2);
                combinedContext += `\n\n`;
            } catch {
                // Ignore parse errors
            }
        }

        if (commitSummary) {
            combinedContext += `--- Recent Commits (up to 10) ---\n${commitSummary}\n`;
        }

        return combinedContext;

    } catch (error) {
        console.error("Error fetching GitHub data:", error);
        return null;
    }
}
