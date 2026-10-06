# Wanderlust Booking Dashboard

Standalone Wanderlust booking dashboard. It intentionally has no dependency on the Aurora authentication application.

## Local development
```bash
npm ci
npm run dev
```

## Validation
```bash
npm run build
```

## Netlify
This repository is intentionally structured as a single Netlify application: `package.json` and `netlify.toml` are at repository root.

- Build command: `npm run build`
- Publish directory: `dist`
