const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const miniprogramRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(miniprogramRoot, "..");
const expectedAppId = "wxd3e927a37aa24bfb";
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${path.relative(repoRoot, file)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function exists(relativeFile) {
  return fs.existsSync(path.join(miniprogramRoot, relativeFile));
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function loadCommonJsFile(file) {
  const code = fs.readFileSync(file, "utf8");
  const module = { exports: {} };
  const wrapped = `(function (module, exports, require) {\n${code}\n})`;
  const script = new vm.Script(wrapped, { filename: file });
  script.runInThisContext()(module, module.exports, require);
  return module.exports;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(repoRoot, fullPath);
    if (entry.isDirectory()) {
      if ([".git", "node_modules", "dist", "build", "__pycache__"].includes(entry.name)) continue;
      if (relative.startsWith("vendor/")) continue;
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function checkProjectConfig() {
  const config = readJson(path.join(miniprogramRoot, "project.config.json"));
  if (!config) return;

  if (config.compileType !== "miniprogram") {
    fail("project.config.json compileType must be miniprogram");
  }
  if (config.appid !== expectedAppId) {
    fail(`project.config.json appid must be ${expectedAppId}`);
  }
  if (config.cloudfunctionRoot && !fs.existsSync(path.join(miniprogramRoot, config.cloudfunctionRoot))) {
    fail(`cloudfunctionRoot does not exist: ${config.cloudfunctionRoot}`);
  }
}

function checkPages() {
  const appJson = readJson(path.join(miniprogramRoot, "app.json"));
  if (!appJson) return;

  const pages = Array.isArray(appJson.pages) ? appJson.pages : [];
  if (!pages.length) fail("app.json must declare at least one page");

  for (const page of pages) {
    for (const ext of ["js", "json", "wxml", "wxss"]) {
      if (!exists(`${page}.${ext}`)) {
        fail(`Missing page file: ${page}.${ext}`);
      }
    }
  }

  const tabs = appJson.tabBar && Array.isArray(appJson.tabBar.list) ? appJson.tabBar.list : [];
  if (tabs.length < 2 || tabs.length > 5) {
    fail("WeChat tabBar must contain 2 to 5 tabs");
  }
  for (const tab of tabs) {
    if (!tab.pagePath || !pages.includes(tab.pagePath)) {
      fail(`tabBar pagePath must exist in pages: ${tab.pagePath || "<empty>"}`);
    }
    if (!tab.text || /Chat|Tools|RAG|Reference/.test(tab.text)) {
      fail(`tabBar text must be Chinese user-facing copy: ${tab.text || "<empty>"}`);
    }
  }
}

function checkJavaScriptSyntax() {
  const jsFiles = walk(miniprogramRoot).filter((file) => file.endsWith(".js"));
  for (const file of jsFiles) {
    try {
      childProcess.execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    } catch (error) {
      const stderr = error.stderr ? error.stderr.toString().trim() : error.message;
      fail(`JavaScript syntax failed in ${path.relative(repoRoot, file)}\n${stderr}`);
    }
  }
}

function checkSecretLeak() {
  const scanExtensions = new Set([".js", ".json", ".wxml", ".wxss", ".md", ".yml", ".yaml"]);
  const files = walk(repoRoot).filter((file) => scanExtensions.has(path.extname(file)));
  const tokenPattern = /AAQ[A-Za-z0-9+/=]{40,}/;
  const credentialWord = "\u5bc6\u94a5";
  const forbiddenPhrases = ["cli", "CLI"].map((prefix) => `${prefix} ${credentialWord}`);

  for (const file of files) {
    const relative = path.relative(repoRoot, file);
    if (relative === "miniprogram/project.private.config.json") continue;
    const content = fs.readFileSync(file, "utf8");
    if (tokenPattern.test(content)) {
      fail(`Possible Tencent CloudBase CLI token leaked in ${relative}`);
    }
    for (const phrase of forbiddenPhrases) {
      if (content.includes(phrase)) {
        fail(`Sensitive credential label leaked in ${relative}`);
      }
    }
  }
}

function checkMathTokenizer() {
  const { renderLatexText, tokenizeMath } = loadCommonJsFile(path.join(miniprogramRoot, "utils/math.js"));

  const inline = tokenizeMath("求解 $x^2 + 1$ 和 \\(y=2\\)");
  assertEqual(inline.length, 4, "math tokenizer should split text and inline formulas");
  assertEqual(inline[1].type, "math", "math tokenizer should mark $...$ as math");
  assertEqual(inline[1].display, false, "math tokenizer should keep $...$ inline");
  assertEqual(inline[1].text, "x^2 + 1", "math tokenizer should remove $ delimiters");
  assertEqual(inline[1].renderedText, "x² + 1", "math tokenizer should render simple superscripts");
  assertEqual(inline[3].text, "y=2", "math tokenizer should remove \\(\\) delimiters");

  const block = tokenizeMath("推导：\n$$\na^2 + b^2 = c^2\n$$\n结束");
  assertEqual(block[1].type, "math", "math tokenizer should mark $$...$$ as math");
  assertEqual(block[1].display, true, "math tokenizer should mark $$...$$ as display math");
  assertEqual(block[1].text, "a^2 + b^2 = c^2", "math tokenizer should trim display math content");

  const bracketBlock = tokenizeMath("面积 \\[S = \\pi r^2\\]");
  assertEqual(bracketBlock[1].display, true, "math tokenizer should mark \\[...\\] as display math");

  const escaped = tokenizeMath("价格是 \\$5，不是公式");
  assertEqual(escaped.length, 1, "math tokenizer should ignore escaped dollar signs");
  assertEqual(escaped[0].text, "价格是 \\$5，不是公式", "math tokenizer should preserve raw escaped dollars");

  const unmatched = tokenizeMath("保留未闭合 $x + 1");
  assertEqual(unmatched.length, 1, "math tokenizer should keep unmatched delimiters as text");
  assertEqual(unmatched[0].text, "保留未闭合 $x + 1", "math tokenizer should preserve unmatched raw content");

  assertEqual(renderLatexText("\\frac{x^2 + 1}{2}"), "x² + 1 / 2", "math renderer should make fractions readable");
  assertEqual(renderLatexText("\\sqrt{a_n} \\leq \\pi r^2"), "√(aₙ) ≤ π r²", "math renderer should map roots, subscripts and symbols");
}

checkProjectConfig();
checkPages();
checkJavaScriptSyntax();
checkSecretLeak();
checkMathTokenizer();

if (failures.length) {
  console.error("Mini program CI checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mini program CI checks passed.");
