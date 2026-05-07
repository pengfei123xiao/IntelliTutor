#!/usr/bin/env node

const envId = "cloud1-d0gxrvlbc5c9f8145";
const functionName = "apiProxy";

const samples = [
  {
    label: "Seed test database",
    event: {
      path: "/api/v1/mobile/setup/seed",
      method: "POST",
      data: { seed_version: "2026-05-mobile-backend" },
    },
  },
  {
    label: "Mastery analytics",
    event: {
      path: "/api/v1/mobile/analytics/mastery",
      method: "GET",
      data: {},
    },
  },
  {
    label: "Weak point analytics",
    event: {
      path: "/api/v1/mobile/analytics/weak-points",
      method: "GET",
      data: {},
    },
  },
  {
    label: "Learning recommendation",
    event: {
      path: "/api/v1/mobile/analytics/recommendations",
      method: "GET",
      data: {},
    },
  },
  {
    label: "Question stats",
    event: {
      path: "/api/v1/mobile/analytics/question-stats",
      method: "GET",
      data: {},
    },
  },
  {
    label: "Database-first overview",
    event: {
      path: "/api/v1/mobile/overview",
      method: "GET",
      data: {},
    },
  },
];

console.log(`# CloudBase invoke samples for ${functionName}`);
console.log(`# Target env: ${envId}`);
console.log("# Run these after deploying apiProxy with an authenticated local CloudBase CLI session.");
console.log("");

for (const sample of samples) {
  const event = JSON.stringify(sample.event).replaceAll("'", "'\\''");
  console.log(`## ${sample.label}`);
  console.log(`cloudbase fn invoke ${functionName} --envId ${envId} --params '${event}'`);
  console.log("");
}
