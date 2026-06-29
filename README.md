# Venezuela Earthquake Situation Brief

Public-source operational dashboard for the June 2026 Venezuela earthquakes.

## Live refresh and validation

- GitHub Actions checks supported public sources every 30 minutes and deploys the current validated dashboard to GitHub Pages.
- The validator uses source-specific extraction and corroboration rules. If a source is unavailable or a rule fails, the last verified value is retained and the run is marked `partial`.
- `public/validation-status.json` records the check time, promoted fields, source failures, and latest USGS M4+ event.
- The dashboard checks for a new deployed version every minute. Viewers can disable this with the **AUTO ON/OFF** control; the preference is stored in their browser.
- Manual workflow runs are available from the repository Actions tab.

This is not an official government, UN, FEMA, PAHO, WHO, or Team Rubicon product. FEMA Community Lifelines are used only as an analytic framework. Credential-gated VOSOCC content is not accessed or inferred.

## Local verification

```bash
python3 scripts/refresh_data.py
pnpm install
pnpm build
pnpm lint
```

Automated extraction is not equivalent to human verification. Conflicting government, UN, media, or humanitarian figures remain visibly labeled as provisional or unreconciled.
