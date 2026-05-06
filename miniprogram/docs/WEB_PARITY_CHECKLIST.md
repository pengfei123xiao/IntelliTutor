# Web parity checklist

## Mobile information architecture

- Chat tab: web `/chat` mobile equivalent. Supports sessions, history drawer, capability presets, tools, RAG, references, attachments, save to notebook, retry, copy, and CloudBase non-streaming fallback.
- Data tab: web `/knowledge`, `/notebook`, and question notebook mobile equivalent. Includes knowledge bases, uploads, notebook list, question filters, bookmark/delete.
- Learning tab: web workspace entry mobile equivalent. Includes capability launcher for chat, deep solve, quiz generation, deep research, math animation, visualization, and TutorBot status.
- Parent tab: mobile-only parent-readable report built from sessions and question notebook data.
- Profile tab: web settings/status mobile equivalent. Includes login, cloud env, API mode, database policy, and migrated feature list.
- Guide page: web `/guide` mobile equivalent. Creates and lists guided learning sessions and can continue a path in Chat.

## CloudBase backend

- Function: `apiProxy`
- Environment target: `cloud1-d0gxrvlbc5c9f8145`
- Collections used in test mode:
  - `knowledge_bases`
  - `chat_sessions`
  - `notebooks`
  - `question_entries`
  - `question_categories`
  - `guide_sessions`
  - `tutor_bots`
  - `app_settings`

## Deployment note

The WeChat DevTools CLI can see the target environment, but function deployment currently fails with `ResourceNotFound.Namespace`. This means the Cloud Functions namespace for the target environment is not initialized or not accessible to the current CLI session.

To finish deployment, initialize Cloud Functions for the environment in the CloudBase console or provide Tencent Cloud `SecretId` and `SecretKey` for a non-interactive CloudBase CLI login.
