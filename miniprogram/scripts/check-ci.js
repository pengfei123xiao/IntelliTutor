const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

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

checkProjectConfig();
checkPages();
checkJavaScriptSyntax();
checkSecretLeak();

if (failures.length) {
  console.error("Mini program CI checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mini program CI checks passed.");
