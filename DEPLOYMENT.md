# Deployment Guide 🚀

## GitHub Pages (Recommended)

This project includes a GitHub Action to automatically deploy to GitHub Pages on every push to `main`.

### Setup
1. Go to your repository **Settings** > **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push changes to `main`.

### Configuration
If deploying to a user site (`username.github.io`), mostly no config needed.
If deploying to a project site (`username.github.io/repo-name`), ensure `vite.config.ts` has:
```ts
export default defineConfig({
  base: '/repo-name/', // Update this!
})
```

## Vercel

1. Import the repository in Vercel.
2. Framework Preset: **Vite**.
3. Click **Deploy**.
