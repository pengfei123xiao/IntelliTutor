# Mini Program Tab Reframe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge learning reports into the Learning tab and use the freed bottom tab for web-side assistant capabilities that are not yet represented in the mini program.

**Architecture:** Keep the bottom navigation customer-facing and task-based: `聊天`, `资料`, `学习`, `助教`, `我的`. The Learning tab becomes the single learning loop surface for books, graph, path, review, and weekly report. The new Assistant tab carries DeepTutor-style TutorBot, writing, deep solving, and visual math entry points without duplicating the chat composer.

**Tech Stack:** WeChat Mini Program native WXML/WXSS/JS, CloudBase `apiProxy`, existing lightweight LaTeX tokenizer, `miniprogram/docs/DESIGN.md` tokens.

---

## Non-Negotiable PR Notes

Every PR in this workstream must paste and satisfy `docs/agent-briefs/miniprogram-pr-design-brief.md`.

Each PR body must include:

- Design source: `miniprogram/docs/DESIGN.md`.
- Web comparison source: exact files inspected under `vendor/DeepTutor`.
- Customer copy check: no visible `RAG`, `Tools`, `Reference`, `家长`, `backend`, `token`, or explanation-manual paragraphs.
- UI check: no content-area one-character pseudo-icons; bottom tab icons only.
- AI disclaimer check where AI-generated output appears.
- WeChat constraint check: no heavy math or graph libraries in the main package.
- Verification commands and results.

## Proposed Bottom Tabs

1. `聊天`: direct AIChat surface.
2. `资料`: materials and knowledge bases.
3. `学习`: books, personal knowledge graph, learning path, review, and learning weekly report.
4. `助教`: persistent tutors and specialized web-side capabilities.
5. `我的`: account, privacy, feedback, customer settings, collapsed developer tools.

## PR A: Information Architecture

**Files:**
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/home/home.json`
- Modify: `miniprogram/pages/parent/parent.json`
- Create: `miniprogram/pages/tutor/tutor.json`
- Create: `miniprogram/pages/tutor/tutor.wxml`
- Create: `miniprogram/pages/tutor/tutor.wxss`
- Create: `miniprogram/pages/tutor/tutor.js`
- Create: `miniprogram/assets/tabbar/tutor.png`
- Create: `miniprogram/assets/tabbar/tutor-active.png`

**Implementation Notes:**
- Replace bottom tab `周报` with `助教`.
- Keep `pages/parent/parent` registered as a normal page for deep links from Learning.
- Do not remove report code in this PR.
- New `助教` page can be a thin shell with real data placeholders, but copy must be concise.

**Verification:**
- Run `node miniprogram/scripts/check-ci.cjs`.
- Run `git diff --check`.
- Run WeChat DevTools preview and record package size.

## PR B: Learning Tab Consolidation

**Files:**
- Modify: `miniprogram/pages/home/home.wxml`
- Modify: `miniprogram/pages/home/home.wxss`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/parent/parent.js` only if navigation helpers are needed
- Modify: `miniprogram/utils/api.js` only if a mobile summary endpoint is needed

**Implementation Notes:**
- Move `学习周报` summary into Learning as one section, not a separate full-page duplicate.
- Learning page structure:
  - Current book or material progress.
  - Personal knowledge graph status.
  - Today path.
  - Review queue.
  - Weekly learning summary.
- Remove any duplicated chat tool showcase from Learning.
- Avoid stacked promotional cards. Prefer compact bands and rows.

**Verification:**
- Run mini program CI.
- Search visible copy for banned internal terms.
- Preview the Learning tab on iPhone-sized viewport.

## PR C: Assistant Tab From Web Capabilities

**Files:**
- Modify: `miniprogram/pages/tutor/tutor.wxml`
- Modify: `miniprogram/pages/tutor/tutor.wxss`
- Modify: `miniprogram/pages/tutor/tutor.js`
- Modify: `miniprogram/utils/api.js`
- Modify: `miniprogram/cloud/functions/apiProxy/index.js`

**Implementation Notes:**
- Source from DeepTutor web/product capability list:
  - TutorBot
  - Co-Writer
  - Deep Solve
  - Math Animator
- User-facing labels:
  - `数学助教`
  - `写作助教`
  - `深度解题`
  - `图像讲解`
- Tapping an assistant should open chat with a preset or a focused assistant page.
- Do not explain all capabilities in long cards.

**Verification:**
- Run mini program CI.
- Run CloudBase runtime check.
- Invoke new `apiProxy` endpoints if added.

## PR D: CloudBase View Models

**Files:**
- Modify: `miniprogram/cloud/functions/apiProxy/index.js`
- Modify: `miniprogram/cloud/scripts/check-runtime.mjs`
- Modify: `miniprogram/cloud/README.md`

**Implementation Notes:**
- Add mobile endpoints for assistant catalog and assistant launch presets.
- Data should be CloudBase-first with deterministic fallback.
- Keep endpoint response shapes small and mini-program friendly.

**Verification:**
- Deploy with `cloudbase fn code update apiProxy`.
- Seed or invoke catalog endpoints.
- Logout after deployment if key login was used.

## PR E: Design Guardrail Check

**Files:**
- Modify: `miniprogram/scripts/check-ci.cjs`
- Modify: `docs/agent-briefs/miniprogram-pr-design-brief.md`

**Implementation Notes:**
- Add static checks for banned visible labels where practical.
- Keep checks precise enough not to fail on internal function names like `sendChatTurn`.
- Add a reminder that every PR body must include the design brief.

**Verification:**
- Run mini program CI.
- Confirm the check fails on a temporary banned visible string, then remove the temporary edit.
