# CloudBase runtime

This directory contains the CloudBase runtime used by the native WeChat Mini Program for intelliclass.

## Target

- Mini Program AppID: `wxd3e927a37aa24bfb`
- CloudBase env ID: `cloud1-d0gxrvlbc5c9f8145`
- Cloud function root: `miniprogram/cloud/functions`
- API proxy function: `apiProxy`
- Mini Program config: `miniprogram/config/env.js`

Do not place Tencent Cloud, WeChat, or CloudBase secrets in this repository. Use an authenticated local CLI session or secure CI secrets when deploying.

## Runtime behavior

`apiProxy` is a compatibility layer for the Mini Program pages while the full web backend is being replicated. It serves stable response shapes for:

- Chat: `/api/v1/mobile/chat/turn`, `/api/v1/sessions`
- Knowledge: `/api/v1/knowledge/list`, `/api/v1/mobile/knowledge/create-empty`, `/api/v1/knowledge/:name/upload`
- Learning guide: `/api/v1/mobile/guide/today`, `/api/v1/guide/create_session`, `/api/v1/guide/sessions`
- Setup and seed: `/api/v1/mobile/setup/seed`
- Deterministic learning algorithms:
  - `/api/v1/mobile/analytics/mastery`
  - `/api/v1/mobile/analytics/weak-points`
  - `/api/v1/mobile/analytics/recommendations`
  - `/api/v1/mobile/analytics/question-stats`
- Parent report: `/api/v1/mobile/parent/report`
- Profile/settings: `/api/v1/mobile/auth/wechat/login`, `/api/v1/mobile/settings`
- Notebook and question notebook preview APIs

`apiProxy` now reads CloudBase database collections first. If a collection is unavailable or empty, it falls back to stable Chinese demo data so the Mini Program does not crash during acceptance preview. The lightweight algorithm layer is deterministic JavaScript: it calculates mastery, extracts weak points, recommends a learning path, and aggregates question statistics from saved question records and sessions. Production still needs real authentication, user isolation, content safety, and backend AI/RAG services.

## Initialize Cloud Functions namespace

If deployment fails with `ResourceNotFound.Namespace`, initialize the Cloud Functions namespace for `cloud1-d0gxrvlbc5c9f8145` first:

1. Open Tencent CloudBase console.
2. Select environment `cloud1-d0gxrvlbc5c9f8145`.
3. Enter Cloud Functions and complete first-time initialization.
4. Confirm the current account has permission to manage cloud functions in this environment.
5. Retry deployment from the project root.

This repository does not include any non-interactive secret-based login material.

## Deploy apiProxy

From the repository root:

```bash
cloudbase fn deploy apiProxy \
  --envId cloud1-d0gxrvlbc5c9f8145 \
  --dir miniprogram/cloud/functions/apiProxy \
  --force
```

Equivalent `tcb` command:

```bash
tcb fn deploy apiProxy \
  --envId cloud1-d0gxrvlbc5c9f8145 \
  --dir miniprogram/cloud/functions/apiProxy \
  --force
```

After deployment, use WeChat DevTools to upload or preview the Mini Program project at `miniprogram/`.

## Seed test data

After `apiProxy` is deployed, initialize the test-period database through the same cloud function. The route creates or writes records for:

- `knowledge_bases`
- `chat_sessions`
- `notebooks`
- `question_entries`
- `question_categories`
- `guide_sessions`
- `learning_paths`
- `parent_reports`
- `tutor_bots`
- `app_settings`

Print copyable invoke examples without reading any secret:

```bash
node miniprogram/cloud/scripts/print-invoke-samples.mjs
```

Seed command shape:

```bash
cloudbase fn invoke apiProxy \
  --envId cloud1-d0gxrvlbc5c9f8145 \
  --params '{"path":"/api/v1/mobile/setup/seed","method":"POST","data":{"seed_version":"2026-05-mobile-backend"}}'
```

Recommended verification after seeding:

```bash
cloudbase fn invoke apiProxy \
  --envId cloud1-d0gxrvlbc5c9f8145 \
  --params '{"path":"/api/v1/mobile/analytics/mastery","method":"GET","data":{}}'
```

## Test-period database permissions

For acceptance testing, create or allow the following collections:

- `knowledge_bases`
- `chat_sessions`
- `notebooks`
- `question_entries`
- `question_categories`
- `guide_sessions`
- `learning_paths`
- `parent_reports`
- `tutor_bots`
- `app_settings`

During a closed test, database permissions can be temporarily opened to allow reads and writes from the cloud function. Keep direct client access restricted where possible, and tighten rules before production:

```json
{
  "read": true,
  "write": true
}
```

Recommended production direction:

- Mini Program calls only `apiProxy`.
- `apiProxy` reads the WeChat context and validates user identity.
- Collections store `openid` or tenant ownership fields.
- Rules restrict reads/writes by owner and role.

## Local checks

Run the repository-safe runtime check:

```bash
node miniprogram/cloud/scripts/check-runtime.mjs
node miniprogram/cloud/scripts/print-invoke-samples.mjs
```

The runtime script checks required files, JSON validity, JavaScript syntax, target environment ID, function name, required collections, required seed/algorithm routes, and obvious secret markers. It does not read or require any secret.
