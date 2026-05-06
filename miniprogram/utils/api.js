const { env } = require("../config/env");

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

function apiUrl(path) {
  const base = env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl;
  return `${base}${normalizePath(path)}`;
}

function request({ url, method = "GET", data, header = {}, timeout = env.requestTimeout }) {
  if (env.useCloudFunctions && wx.cloud) {
    return cloudRequest({ url, method, data });
  }

  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync("authToken") || "";
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    wx.request({
      url: apiUrl(url),
      method,
      data,
      timeout,
      header: {
        "content-type": "application/json",
        ...authHeader,
        ...header,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        reject({
          statusCode: res.statusCode,
          message: res.data && res.data.detail ? res.data.detail : "请求失败",
          data: res.data,
        });
      },
      fail(err) {
        reject({
          statusCode: 0,
          message: err.errMsg || "网络连接失败",
          data: err,
        });
      },
    });
  });
}

function cloudRequest({ url, method = "GET", data }) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: env.apiProxyFunction,
      data: {
        path: normalizePath(url),
        method,
        data: data || {},
      },
      success(res) {
        const payload = res.result || {};
        if (payload.ok === false) {
          reject({
            statusCode: payload.statusCode || 500,
            message: payload.message || "云函数请求失败",
            data: payload,
          });
          return;
        }
        resolve(payload.data !== undefined ? payload.data : payload);
      },
      fail(err) {
        reject({
          statusCode: 0,
          message: err.errMsg || "云函数连接失败",
          data: err,
        });
      },
    });
  });
}

function mobileLogin(payload) {
  return request({
    url: "/api/v1/mobile/auth/wechat/login",
    method: "POST",
    data: payload,
  });
}

function getMobileOverview(activeKnowledgeBase = "") {
  const query = activeKnowledgeBase
    ? `?active_knowledge_base=${encodeURIComponent(activeKnowledgeBase)}`
    : "";
  return request({ url: `/api/v1/mobile/overview${query}` });
}

function getParentReport() {
  return request({ url: "/api/v1/mobile/parent/report" });
}

function createTodayGuide(payload) {
  return request({
    url: "/api/v1/mobile/guide/today",
    method: "POST",
    data: payload,
  });
}

function uploadFile({ url, filePath, name = "files", formData = {}, timeout = env.uploadTimeout }) {
  if (env.useCloudFunctions && wx.cloud) {
    const filename = filePath.split("/").pop() || `${Date.now()}`;
    const cloudPath = `uploads/${Date.now()}-${filename}`;
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: async (uploadRes) => {
          try {
            const result = await cloudRequest({
              url,
              method: "POST",
              data: {
                ...formData,
                files: [
                  {
                    fileID: uploadRes.fileID,
                    name: filename,
                    cloudPath,
                  },
                ],
              },
            });
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        fail(err) {
          reject({
            statusCode: 0,
            message: err.errMsg || "云存储上传失败",
            data: err,
          });
        },
      });
    });
  }

  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync("authToken") || "";
    const header = token ? { Authorization: `Bearer ${token}` } : {};

    wx.uploadFile({
      url: apiUrl(url),
      filePath,
      name,
      formData,
      timeout,
      header,
      success(res) {
        let payload = res.data;
        try {
          payload = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        } catch (error) {
          payload = res.data;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(payload);
          return;
        }

        reject({
          statusCode: res.statusCode,
          message: payload && payload.detail ? payload.detail : "上传失败",
          data: payload,
        });
      },
      fail(err) {
        reject({
          statusCode: 0,
          message: err.errMsg || "上传连接失败",
          data: err,
        });
      },
    });
  });
}

function getKnowledgeBases() {
  return request({ url: "/api/v1/knowledge/list" });
}

function createKnowledgeBase(name) {
  return request({
    url: "/api/v1/mobile/knowledge/create-empty",
    method: "POST",
    data: {
      name,
      description: "Created from IntelliTutor Mini Program",
    },
  });
}

function uploadKnowledgeFile(kbName, filePath) {
  return uploadFile({
    url: `/api/v1/knowledge/${encodeURIComponent(kbName)}/upload`,
    filePath,
    formData: {},
  });
}

function getGuideSessions() {
  return request({ url: "/api/v1/guide/sessions" });
}

function createGuideSession(payload) {
  return request({
    url: "/api/v1/guide/create_session",
    method: "POST",
    data: {
      user_input: payload.user_input || payload.topic || payload.title || "",
      records: payload.records || null,
      notebook_id: payload.notebook_id || null,
      notebook_references: payload.notebook_references || null,
    },
  });
}

function sendChatTurn(payload) {
  return request({
    url: "/api/v1/mobile/chat/turn",
    method: "POST",
    data: payload,
    timeout: 60000,
  });
}

function getRecentSessions(limit = 6) {
  return request({ url: `/api/v1/sessions?limit=${limit}&offset=0` });
}

function getSessionDetail(sessionId) {
  return request({ url: `/api/v1/sessions/${encodeURIComponent(sessionId)}` });
}

function deleteSession(sessionId) {
  return request({
    url: `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
    method: "DELETE",
  });
}

function listNotebooks() {
  return request({ url: "/api/v1/notebook/list" });
}

function createNotebook(payload) {
  return request({
    url: "/api/v1/notebook/create",
    method: "POST",
    data: payload,
  });
}

function addNotebookRecord(payload) {
  return request({
    url: "/api/v1/notebook/add_record",
    method: "POST",
    data: payload,
    timeout: 60000,
  });
}

function getQuestionNotebookEntries(filter = {}) {
  const params = [];
  if (filter.bookmarked !== undefined) params.push(`bookmarked=${filter.bookmarked}`);
  if (filter.is_correct !== undefined) params.push(`is_correct=${filter.is_correct}`);
  if (filter.category_id !== undefined && filter.category_id !== null) params.push(`category_id=${filter.category_id}`);
  const query = params.length ? `?${params.join("&")}` : "";
  return request({ url: `/api/v1/question-notebook/entries${query}` });
}

function getQuestionCategories() {
  return request({ url: "/api/v1/question-notebook/categories" });
}

function updateQuestionEntry(entryId, updates) {
  return request({
    url: `/api/v1/question-notebook/entries/${entryId}`,
    method: "PATCH",
    data: updates,
  });
}

function deleteQuestionEntry(entryId) {
  return request({
    url: `/api/v1/question-notebook/entries/${entryId}`,
    method: "DELETE",
  });
}

function getTutorBots() {
  return request({ url: "/api/v1/tutorbot" });
}

function getSettings() {
  return request({ url: "/api/v1/mobile/settings" });
}

module.exports = {
  apiUrl,
  request,
  uploadFile,
  mobileLogin,
  getMobileOverview,
  getParentReport,
  createTodayGuide,
  getKnowledgeBases,
  createKnowledgeBase,
  uploadKnowledgeFile,
  getGuideSessions,
  createGuideSession,
  getRecentSessions,
  getSessionDetail,
  deleteSession,
  sendChatTurn,
  listNotebooks,
  createNotebook,
  addNotebookRecord,
  getQuestionNotebookEntries,
  getQuestionCategories,
  updateQuestionEntry,
  deleteQuestionEntry,
  getTutorBots,
  getSettings,
};
