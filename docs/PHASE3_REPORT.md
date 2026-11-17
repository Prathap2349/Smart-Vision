# Phase 3 submission report

## Overview

Smart Vision Sentry combines a FastAPI backend, YOLO person detection, tracking, and InsightFace resident recognition. Phase 3 hardened API authentication, cross-origin access, camera credentials, evidence access, and upload handling. Follow-up work added deployment support, structured errors, CI configuration, and real-footage evaluation tooling.

The frontend is live at [smart-vision-eta.vercel.app](https://smart-vision-eta.vercel.app). This is a project status report, not a claim that the hosted experience has been re-verified in this run.

## Work completed

- Protected `/api/*` and `/ws/*` routes with Supabase JWT or API-key authentication, with the documented health exception.
- Restricted CORS to configured origins; encrypted camera passwords at rest; protected evidence using auth or short-lived signed URLs; bounded and validated uploads.
- Added per-camera pipelines, reconnect/backoff behavior, bounded alert delivery, and event-loop-safe webcam Test Mode processing.
- Added production configuration checks, Docker packaging, deployment instructions, standard error responses, request IDs, page error boundaries, and Python 3.11 CI jobs.
- Added evaluation inventory, validation, enrollment, and report generation. Test Mode frames go to the configured backend; see [Architecture](ARCHITECTURE.md) for the data flow and privacy boundaries.

## Measured results

- **Backend tests:** 86 passed on Python 3.11 using the pinned CI dependency set. One Starlette/AnyIO deprecation warning was emitted.
- **Frontend:** `npm run build` succeeded.
- **Phase 2 benchmark:** The latest saved report, `backend/benchmarks/results/benchmark_report_20261116_183618.json`, records a 120-frame single-stream run in 3.81 seconds at 31.51 FPS. Its concurrent repeated-video run recorded per-stream rates of 42.39 FPS (1 stream), 26.24 FPS (2), and 12.82 FPS (4), with aggregate rates of 42.34, 52.16, and 50.33 FPS. This was a short run on a development Mac using CoreML and repeated video sources; it is not a test of independent physical cameras. The report marks the 30-minute endurance run as not measured.
- **Real-footage evaluation:** `INSUFFICIENT_DATASET`. The results inventory has 0 clips on disk and 20 labelled rows whose video files are missing. No precision, recall, F1, false-positive, or false-negative figures are available. Recording and labelling real footage is the next evaluation step.

## Current status and limitations

- **Frontend:** Vercel deployment at [smart-vision-eta.vercel.app](https://smart-vision-eta.vercel.app).
- **Backend:** Runs locally with a Cloudflare Tunnel or ngrok as described in [Deployment](DEPLOYMENT.md). No cloud backend is deployed.
- **Railway:** The trial expired at the account level; a paid/Hobby plan is required before deploying there.
- **Docker:** The image has not been built locally because Docker is unavailable in this environment. The configured CI Docker job is pending verification.
- **CI:** The workflow is configured but has not yet been run for this release branch.
- The benchmark is a short development-machine run on repeated video, not a multi-camera field test. The evaluation dataset contains no real clips, so the system's real-world alert accuracy is unmeasured.

### Before redeploying the frontend

Set these Vercel environment variables and redeploy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` using an HTTPS URL
- `VITE_WS_BASE_URL` using a WSS URL

The hardcoded Supabase project URL was removed; the frontend now needs the configured Vercel values. HTTPS frontends require HTTPS API and WSS WebSocket endpoints to avoid mixed-content blocking.

## Next steps

1. Configure the Vercel environment variables before the next frontend deployment.
2. Record consenting real clips using the [evaluation checklist](EVALUATION_CHECKLIST.md), validate labels, and run the evaluator.
3. Run the CI workflow and confirm its Docker image build; build locally when Docker is available.
4. Review this report and release artifacts before any push, PR, merge, or tag.
