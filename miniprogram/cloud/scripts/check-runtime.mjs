#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const cloudRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const miniprogramRoot = path.resolve(cloudRoot, "..");
const functionRoot = path.join(cloudRoot, "functions", "apiProxy");
const envFile = path.join(miniprogramRoot, "config", "env.js");
const projectConfigFile = path.join(miniprogramRoot, "project.config.json");
const functionIndex = path.join(functionRoot, "index.js");
const functionPackage = path.join(functionRoot, "package.json");

const requiredFiles = [
  envFile,
  projectConfigFile,
  functionIndex,
  functionPackage,
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function checkFile(file) {
  assert(fs.existsSync(file), `missing file: ${file}`);
  assert(fs.statSync(file).size > 0, `empty file: ${file}`);
}

function checkJson(file) {
  JSON.parse(read(file));
}

function checkJsSyntax(file) {
  new vm.Script(read(file), { filename: file });
}

function checkNoSecrets(file) {
  const content = read(file);
  const tencentCloudSecret = "tencentcloud_" + "secret";
  const cloudbaseSecret = "cloudbase_" + "secret";
  const suspicious = [
    /secret(id|key)\s*[:=]\s*["'][^"']+["']/i,
    new RegExp(tencentCloudSecret, "i"),
    new RegExp(cloudbaseSecret, "i"),
  ];
  assert(!suspicious.some((pattern) => pattern.test(content)), `possible secret marker in ${file}`);
}

for (const file of requiredFiles) checkFile(file);
checkJson(projectConfigFile);
checkJson(functionPackage);
checkJsSyntax(envFile);
checkJsSyntax(functionIndex);
checkNoSecrets(envFile);
checkNoSecrets(functionIndex);

const envSource = read(envFile);
assert(envSource.includes("cloud1-d0gxrvlbc5c9f8145"), "env.js must target cloud1-d0gxrvlbc5c9f8145");
assert(envSource.includes("apiProxy"), "env.js must use apiProxy as the cloud function name");

const pkg = JSON.parse(read(functionPackage));
assert(pkg.dependencies && pkg.dependencies["wx-server-sdk"], "apiProxy package.json must include wx-server-sdk");

const functionSource = read(functionIndex);
const requiredRoutes = [
  "/api/v1/mobile/setup/seed",
  "/api/v1/mobile/analytics/mastery",
  "/api/v1/mobile/analytics/weak-points",
  "/api/v1/mobile/analytics/recommendations",
  "/api/v1/mobile/analytics/question-stats",
  "/api/v1/mobile/books",
  "/api/v1/mobile/graph/summary",
];

for (const route of requiredRoutes) {
  assert(functionSource.includes(route), `apiProxy must implement route: ${route}`);
}

for (const collectionName of [
  "knowledge_bases",
  "chat_sessions",
  "notebooks",
  "question_entries",
  "question_categories",
  "guide_sessions",
  "learning_paths",
  "parent_reports",
  "learning_books",
  "learning_graph_nodes",
  "learning_graph_edges",
  "tutor_bots",
  "app_settings",
]) {
  assert(functionSource.includes(collectionName), `apiProxy must reference collection: ${collectionName}`);
}

console.log("CloudBase runtime check passed.");
console.log(`Mini Program root: ${miniprogramRoot}`);
console.log(`Cloud function: ${functionRoot}`);
console.log("Invoke examples: node miniprogram/cloud/scripts/print-invoke-samples.mjs");
