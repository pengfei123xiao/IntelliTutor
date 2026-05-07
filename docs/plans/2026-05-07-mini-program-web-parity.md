# Mini Program Web Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the WeChat mini program from internal demo surfaces to customer-facing learning product surfaces aligned with the web app and IntelliTutor product idea.

**Architecture:** Keep the mini program as a lightweight native client. Put heavy AI, graph construction, LaTeX normalization, mastery algorithms, and database writes behind CloudBase `apiProxy`; the client receives compact view models and renders simple lists, reports, local graph summaries, and formula text without inflating the main package.

**Tech Stack:** Native WeChat Mini Program WXML/WXSS/JS, CloudBase cloud function `apiProxy`, deterministic fallback data in `miniprogram/utils/api.js`, GitHub PR + Mini Program CI.

---

### Task 1: Learning Tab Product Rewrite

**Files:**
- Modify: `miniprogram/pages/home/home.wxml`
- Modify: `miniprogram/pages/home/home.wxss`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/utils/api.js`
- Modify: `miniprogram/cloud/functions/apiProxy/index.js`

**Steps:**
1. Remove the always-visible “带着当前资料去聊天”/current-material CTA from the learning surface.
2. Remove duplicate chat tools from Learning tab; chat already owns capability/tool mode selection.
3. Add customer-facing modules from the web/product intent:
   - 书籍/书架：教材、文学书、上传资料沉淀出的阅读对象。
   - 个人知识图谱：掌握度、薄弱节点、最近更新。
   - 今日学习：from guide/recommendations.
   - 错题复盘：from question stats.
4. Use line rows and compact product sections, not feature cards or instruction copy.
5. Add API/fallback methods for `books`, `graph summary`, and `learning dashboard`.
6. Run `node miniprogram/scripts/check-ci.cjs` and `git diff --check`.
7. Open PR `codex/mini-learning-modules`.

### Task 2: Rename Parent Tab to Learning Report

**Files:**
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/parent/parent.json`
- Modify: `miniprogram/pages/parent/parent.wxml`
- Modify: `miniprogram/pages/parent/parent.wxss`
- Modify: `miniprogram/pages/parent/parent.js`
- Modify: `miniprogram/utils/api.js`
- Modify: `miniprogram/cloud/functions/apiProxy/index.js`

**Steps:**
1. Change tab text and navigation title from “家长”/“家长周报” to “周报”/“学习周报”.
2. Change copy so students, teachers, and parents can all use it.
3. Add compact report sections:
   - 本周掌握度
   - 薄弱节点
   - 知识图谱更新
   - 下周建议
   - 可分享摘要
4. Keep AI disclaimer but remove “家长能看懂” framing.
5. Keep compatibility route names for now if changing endpoint names would be too wide; expose new function names in client.
6. Run checks and PR `codex/mini-learning-report`.

### Task 3: Customer-Facing Profile

**Files:**
- Modify: `miniprogram/pages/profile/profile.wxml`
- Modify: `miniprogram/pages/profile/profile.wxss`
- Modify: `miniprogram/pages/profile/profile.js`

**Steps:**
1. Move API/backend/dev settings behind a “开发者设置” collapsible section.
2. Make default profile customer-facing:
   - 登录与隐私
   - 学习账号
   - 通知与反馈
   - 数据与隐私
   - 联系开发者
3. Keep feedback/contact entries.
4. Keep backend test tools available only after expanding developer settings.
5. Run checks and PR `codex/mini-profile-customer`.

### Task 4: Lightweight LaTeX Rendering Strategy

**Files:**
- Create: `miniprogram/utils/math.js`
- Modify: `miniprogram/pages/chat/chat.wxml`
- Modify: `miniprogram/pages/chat/chat.wxss`
- Modify: `miniprogram/pages/chat/chat.js`
- Modify: `miniprogram/scripts/check-ci.cjs`
- Modify: `miniprogram/docs/MIGRATION.md`

**Steps:**
1. Add a zero-dependency LaTeX tokenizer that preserves `$...$`, `$$...$$`, `\(...\)`, and `\[...\]` as formula segments.
2. Render formula segments as styled horizontal-scroll text blocks/chips first, not KaTeX in the main package.
3. Document production options:
   - server-render formula SVG/PNG through CloudBase for precise math,
   - optional independent subpackage/plugin later,
   - keep main package small and avoid bundling KaTeX/MathJax in the initial shell.
4. Update CI to check the tokenizer.
5. Run checks and PR `codex/mini-latex-lightweight`.

### Task 5: CI Review Agent

**Files:**
- No production file ownership.

**Steps:**
1. After each PR branch is ready, run `node miniprogram/scripts/check-ci.cjs`, `git diff --check`, and WeChat DevTools CLI preview.
2. Review that no branch adds secrets or huge package assets.
3. Confirm package size remains comfortably below WeChat package limits by using native views, lazy loading, and no heavy math/rendering libraries in the main package.
4. Merge only green PRs.
