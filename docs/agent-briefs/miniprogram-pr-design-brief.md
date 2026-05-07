# Mini Program PR Design Brief

Every mini program PR must include this brief in its PR body and use it as an implementation checklist.

## Product Direction

- Target product name in the mini program: intelliclass.
- Treat the app as customer-facing. Do not expose backend/demo/debug actions in the default experience.
- Compare against the web side before changing UI or behavior:
  - `vendor/DeepTutor/README.md`
  - `vendor/DeepTutor/web`
  - current mini program pages under `miniprogram/pages`
- Use `miniprogram/docs/DESIGN.md` as the design source. The intended direction is Claude-like warm canvas, coral actions, dark product surfaces, restrained typography, and calm editorial spacing.

## Bottom Tab Direction

- Preferred tab set: `聊天`, `资料`, `学习`, `助教`, `我的`.
- Merge `周报` into `学习`; weekly reports are part of the learning loop, not a separate bottom-level destination.
- Use `助教` for web-side capabilities that are not just ordinary chat:
  - TutorBot style persistent tutors.
  - 智能写作.
  - 深度解题.
  - 数学动画 or visual explanation.
  - Specialized learning missions that can open chat with a preset.

## Copy Rules

- Use concise Chinese labels that a student, teacher, or parent can understand.
- Do not write instruction-manual copy such as "这个功能可以..." or long explanatory paragraphs.
- Avoid internal words in visible UI: `RAG`, `Tools`, `Reference`, `backend`, `token`, `model`, `debug`, `家长`.
- AI-generated output must carry a small note: `AI 生成内容仅供参考`.
- Role-neutral report naming: use `学习周报`, `周报`, `学习摘要`, not `家长周报`.

## Visual Rules

- No content-area one-character pseudo-icons.
- Bottom tab icons are allowed and expected.
- Prefer list rows, compact bands, segmented controls, and dark product surfaces over many stacked cards.
- Cards are allowed only when they represent a real repeated object, such as a book, tutor, session, or report item.
- Do not create decorative icon tiles just to explain features.
- Use warm canvas `#faf9f5`, coral `#cc785c`, dark surface `#181715`, and hairline `#e6dfd8`.

## Mini Program Constraints

- Follow WeChat mini program structure: page folders, `app.json` registration, scoped WXML/WXSS/JS, no web-only DOM APIs.
- Keep the main package small. Do not add KaTeX, MathJax, Chart.js, or large graph libraries to the main package.
- Render LaTeX with the existing lightweight tokenizer, or use server-rendered images/subpackages later.
- Keep customer pages usable without backend data by using stable CloudBase/demo fallbacks.

## Required Verification

- `node miniprogram/scripts/check-ci.cjs`
- `node miniprogram/cloud/scripts/check-runtime.mjs` when cloud/API files change
- `git diff --check`
- WeChat DevTools preview when UI or tab structure changes
- Search for banned customer-visible copy before review:
  - `RAG`
  - `Tools`
  - `Reference`
  - `家长`
  - `带着当前资料`
  - `重置演示数据`
