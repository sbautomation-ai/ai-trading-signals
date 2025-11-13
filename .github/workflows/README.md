# GitHub Pages Deployment

This workflow automatically builds and deploys the frontend to GitHub Pages when you push to the `main` branch.

## Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Click on **Settings** → **Pages**
   - Under "Source", select **GitHub Actions**
   - Save the settings

2. **Configure the API URL (if using Netlify Functions):**
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `VITE_API_URL`
   - Value: Your Netlify function URL (e.g., `https://your-site.netlify.app/.netlify/functions/generate-signal`)
   - Click **Add secret**

3. **Update the base path in vite.config.ts:**
   - The base path is set to `/ai-trading-signals/` for GitHub Pages
   - If your repository name is different, update the `base` value in `vite.config.ts`

4. **Push to main branch:**
   - The workflow will automatically build and deploy your site
   - Your site will be available at: `https://your-username.github.io/ai-trading-signals/`

## Notes

- GitHub Pages only serves static files, so Netlify Functions need to stay on Netlify
- The frontend will call the Netlify function using the URL from `VITE_API_URL` secret
- If you don't set the secret, it will use the default Netlify URL (update this in the workflow file)

