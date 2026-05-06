const env = {
  name: "cloudbase-test",
  cloudEnvId: "cloud1-d0gxrvlbc5c9f8145",
  useCloudFunctions: true,
  apiProxyFunction: "apiProxy",
  apiBaseUrl: "http://127.0.0.1:3001",
  requestTimeout: 30000,
  uploadTimeout: 120000,
};

function getWsBaseUrl() {
  return env.apiBaseUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}

module.exports = {
  env,
  getWsBaseUrl,
};
