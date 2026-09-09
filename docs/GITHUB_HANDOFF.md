# Upload to GitHub
Extract this ZIP into a new folder. Open the inner SiteSync folder containing package.json. This package already includes the Cloudflare identity fix, documentation and persistent deployment settings. Do not replace it with the older source ZIP.

Create an empty **public** GitHub repository named sitesync. Do not initialize it with another README or gitignore.

In PowerShell inside SiteSync:
```powershell
git init
git branch -M main
git add .
git status --short
git commit -m "Add SiteSync AS-01 hackathon prototype"
```
Check that the staged files do not include node_modules, dist, environment files or credentials. Then copy the repository HTTPS URL from GitHub and use it below:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/sitesync.git
git push -u origin main
```
Replace YOUR_USERNAME with your actual GitHub username. Authenticate through Git's normal sign-in prompt. Do not paste tokens into the repository.

If Git asks for a name/email, configure your preferred commit identity locally in this repository. You can use the GitHub-provided private commit email.

Submit these four items:
1. Idea: text from docs/IDEA.md.
2. Prototype: your public GitHub repository URL and https://sitesync-coordination.keshariritik101.workers.dev.
3. Walkthrough: an actual accessible 3–5 minute video.
4. Documentation: the README and docs folder.

GitHub upload does not require redeploying the live app. For later updates, npm run deploy rebuilds and restores Cloudflare configuration automatically.
