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
        const repo = pathParts[1];

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Hackathon-ATS'
        };

        // 1. Fetch README.md
        let readmeContent = '';
        const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
        if (readmeRes.ok) {
            const readmeData = await readmeRes.json();
            readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8');
        }

        // 2. Fetch package.json (to understand tech stack)
        let packageJsonContent = '';
        const packageRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, { headers });
        if (packageRes.ok) {
            const packageData = await packageRes.json();
            packageJsonContent = Buffer.from(packageData.content, 'base64').toString('utf-8');
        }

        if (!readmeContent && !packageJsonContent) {
            return "GitHub repository found but it appears mostly empty or missing standard files.";
        }

        let combinedContext = `--- GITHUB REPOSITORY CONTEXT ---\n`;
        combinedContext += `Repository: ${owner}/${repo}\n\n`;

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
            } catch {
                // Ignore parse errors
            }
        }

        return combinedContext;

    } catch (error) {
        console.error("Error fetching GitHub data:", error);
        return null;
    }
}
