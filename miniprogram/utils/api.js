const { env } = require("../config/env");

const PROFILE_SETTINGS_KEY = "profileApiSettings";
const API_TOKEN_KEY = "profileApiToken";

const DEFAULT_PROFILE_SETTINGS = {
  apiBaseUrl: env.apiBaseUrl,
  modelName: "cloudbase-adapter",
  useCloudFunctions: env.useCloudFunctions,
  enableRag: true,
  enableWebSearch: false,
  enableMathAnimation: true,
  enableTeacherView: true,
};

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

function getProfileSettings() {
  let saved = {};
  try {
    saved = wx.getStorageSync(PROFILE_SETTINGS_KEY) || {};
  } catch (error) {
    saved = {};
  }
  return {
    ...DEFAULT_PROFILE_SETTINGS,
    ...saved,
    useCloudFunctions: saved.useCloudFunctions === undefined ? DEFAULT_PROFILE_SETTINGS.useCloudFunctions : !!saved.useCloudFunctions,
    enableRag: saved.enableRag === undefined ? DEFAULT_PROFILE_SETTINGS.enableRag : !!saved.enableRag,
    enableWebSearch: saved.enableWebSearch === undefined ? DEFAULT_PROFILE_SETTINGS.enableWebSearch : !!saved.enableWebSearch,
    enableMathAnimation: saved.enableMathAnimation === undefined ? DEFAULT_PROFILE_SETTINGS.enableMathAnimation : !!saved.enableMathAnimation,
    enableTeacherView: saved.enableTeacherView === undefined ? DEFAULT_PROFILE_SETTINGS.enableTeacherView : !!saved.enableTeacherView,
  };
}

function saveProfileSettings(settings) {
  const next = {
    ...getProfileSettings(),
    ...settings,
  };
  wx.setStorageSync(PROFILE_SETTINGS_KEY, next);
  return next;
}

function resetProfileSettings() {
  wx.setStorageSync(PROFILE_SETTINGS_KEY, DEFAULT_PROFILE_SETTINGS);
  wx.removeStorageSync(API_TOKEN_KEY);
  return { ...DEFAULT_PROFILE_SETTINGS };
}

function getProfileApiToken() {
  try {
    return wx.getStorageSync(API_TOKEN_KEY) || "";
  } catch (error) {
    return "";
  }
}

function saveProfileApiToken(token) {
  wx.setStorageSync(API_TOKEN_KEY, token || "");
  return token || "";
}

function maskToken(token) {
  if (!token) return "未设置";
  if (token.length <= 8) return "已保存，内容已遮罩";
  return `${token.slice(0, 4)} **** ${token.slice(-4)}`;
}

function apiUrl(path) {
  const settings = getProfileSettings();
  const configuredBase = settings.apiBaseUrl || env.apiBaseUrl;
  const base = configuredBase.endsWith("/") ? configuredBase.slice(0, -1) : configuredBase;
  return `${base}${normalizePath(path)}`;
}

function request({ url, method = "GET", data, header = {}, timeout = env.requestTimeout }) {
  const settings = getProfileSettings();
  if (settings.useCloudFunctions && wx.cloud) {
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withFallback(promise, fallback) {
  return promise.catch(() => clone(typeof fallback === "function" ? fallback() : fallback));
}

function nowIso() {
  return new Date().toISOString();
}

const MOCK_KNOWLEDGE_BASES = [
  {
    name: "七年级数学上册",
    status: "已就绪",
    statistics: { document_count: 3, chunk_count: 42 },
  },
  {
    name: "课堂错题与讲义",
    status: "处理中",
    statistics: { document_count: 2, chunk_count: 18 },
  },
];

const MOCK_SESSIONS = [
  {
    session_id: "demo-session-1",
    title: "一次函数图像与性质",
    last_message: "继续用例题讲斜率和截距。",
    message_count: 6,
    updated_at: nowIso(),
  },
  {
    session_id: "demo-session-2",
    title: "三角形全等复习",
    last_message: "整理了判定方法和易错点。",
    message_count: 4,
    updated_at: nowIso(),
  },
];

const MOCK_NOTEBOOKS = [
  {
    id: "demo-notebook-1",
    notebook_id: "demo-notebook-1",
    name: "课堂笔记",
    description: "聊天中保存的学习记录和资料问答摘要",
    record_count: 5,
  },
];

const MOCK_QUESTIONS = {
  items: [
    {
      id: "demo-question-1",
      question: "一次函数 y = 2x + 1 中，斜率表示什么？",
      correct_answer: "斜率为 2，表示 x 每增加 1，y 增加 2。",
      explanation: "把函数看作变化关系，斜率描述变化速度。",
      bookmarked: true,
      is_correct: false,
      category_id: "function",
    },
    {
      id: "demo-question-2",
      question: "三角形全等的 SAS 条件需要哪些信息？",
      correct_answer: "两边及其夹角分别相等。",
      explanation: "夹角必须是已知两边之间的角。",
      bookmarked: false,
      is_correct: true,
      category_id: "geometry",
    },
  ],
};

const MOCK_GUIDE_SESSIONS = {
  sessions: [
    {
      session_id: "demo-guide-1",
      title: "一次函数 20 分钟学习路径",
      topic: "一次函数图像与性质",
      knowledge_base: "七年级数学上册",
      status: "可继续",
      tasks: ["回顾变量关系", "画出两条函数图像", "用一道题检查斜率理解"],
    },
  ],
};

const MOCK_BOTS = [
  {
    bot_id: "demo-bot-1",
    name: "数学带读助手",
    description: "擅长拆解题目、追问思路和沉淀错题。",
    status_label: "可用",
  },
  {
    bot_id: "demo-bot-2",
    name: "资料问答助手",
    description: "根据已上传讲义生成解释、提纲和检测题。",
    status_label: "可用",
  },
];

const MOCK_ASSISTANTS = {
  assistants: [
    {
      assistant_id: "assistant_math",
      name: "数学助教",
      short_name: "数学",
      mode: "deep_solve",
      tone: "先问思路，再补步骤",
      status_label: "可用",
      focus: ["拆题", "追问", "错因"],
      launch_prompt: "我想请数学助教帮我拆一道题。",
    },
    {
      assistant_id: "assistant_writing",
      name: "写作助教",
      short_name: "写作",
      mode: "co_writer",
      tone: "先保留原意，再改结构",
      status_label: "可用",
      focus: ["提纲", "润色", "点评"],
      launch_prompt: "我想请写作助教帮我改一段文字。",
    },
    {
      assistant_id: "assistant_review",
      name: "错题助教",
      short_name: "错题",
      mode: "deep_question",
      tone: "先定位知识点，再生成检测",
      status_label: "可用",
      focus: ["错因", "检测", "复盘"],
      launch_prompt: "我想请错题助教根据最近错题出一组检测。",
    },
  ],
};

function mobileLogin(payload) {
  return withFallback(request({
    url: "/api/v1/mobile/auth/wechat/login",
    method: "POST",
    data: payload,
  }), {
    token: "demo-token",
    user: {
      nickname: "体验账号",
      role: "学生",
      openid: "演示登录态",
    },
  });
}

function getMobileOverview(activeKnowledgeBase = "") {
  const query = activeKnowledgeBase
    ? `?active_knowledge_base=${encodeURIComponent(activeKnowledgeBase)}`
    : "";
  return withFallback(request({ url: `/api/v1/mobile/overview${query}` }), {
    active_knowledge_base: activeKnowledgeBase || "七年级数学上册",
    stats: {
      materials: 5,
      sessions: 12,
      mastery: 0.72,
    },
  });
}

function getParentReport() {
  return withFallback(request({ url: "/api/v1/mobile/parent/report" }), {
    summary: {
      learning_sessions: 8,
      weak_points: ["一次函数图像斜率理解不稳定", "几何证明中容易漏写理由"],
      review_items: ["用 2 道图像题复述斜率含义", "复盘三角形全等的 SAS 与 ASA 区别"],
    },
    discussion_prompt: "今晚可以请孩子用自己的话解释：为什么一次函数图像越陡，斜率越大？",
    recent_sessions: MOCK_SESSIONS,
  });
}

function createTodayGuide(payload) {
  return withFallback(request({
    url: "/api/v1/mobile/guide/today",
    method: "POST",
    data: payload,
  }), {
    ok: true,
    guide_id: `demo-guide-${Date.now()}`,
    tasks: ["明确学习目标", "带读关键概念", "完成即时检测"],
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
  return withFallback(request({ url: "/api/v1/knowledge/list" }), MOCK_KNOWLEDGE_BASES);
}

function createKnowledgeBase(name) {
  return withFallback(request({
    url: "/api/v1/mobile/knowledge/create-empty",
    method: "POST",
    data: {
      name,
      description: "小程序创建的学习资料库",
    },
  }), {
    name,
    status: "已创建",
    statistics: { document_count: 0, chunk_count: 0 },
  });
}

function uploadKnowledgeFile(kbName, filePath) {
  return withFallback(uploadFile({
    url: `/api/v1/knowledge/${encodeURIComponent(kbName)}/upload`,
    filePath,
    formData: {},
  }), {
    ok: true,
    status: "已加入处理队列",
    knowledge_base: kbName,
    filename: filePath.split("/").pop() || "学习资料",
  });
}

function getGuideSessions() {
  return withFallback(request({ url: "/api/v1/guide/sessions" }), MOCK_GUIDE_SESSIONS);
}

function createGuideSession(payload) {
  return withFallback(request({
    url: "/api/v1/guide/create_session",
    method: "POST",
    data: {
      user_input: payload.user_input || payload.topic || payload.title || "",
      records: payload.records || null,
      notebook_id: payload.notebook_id || null,
      notebook_references: payload.notebook_references || null,
    },
  }), {
    session_id: `demo-guide-${Date.now()}`,
    title: payload.topic || payload.title || "今日学习路径",
    topic: payload.topic || payload.title || "今日学习路径",
    knowledge_base: payload.knowledge_base || "",
    status: "可继续",
    tasks: ["梳理概念", "例题讲解", "错题复盘"],
  });
}

function sendChatTurn(payload) {
  return withFallback(request({
    url: "/api/v1/mobile/chat/turn",
    method: "POST",
    data: payload,
    timeout: 60000,
  }), () => {
    const toolHint = payload.tools && payload.tools.includes("rag") ? "我会优先结合当前资料来回答。" : "我会按学习对话的方式继续追问和讲解。";
    return {
      session_id: payload.session_id || `demo-chat-${Date.now()}`,
      content: `已收到你的问题：「${payload.content || payload.message || "附件资料"}」。${toolHint}\n\n演示回复：先确认目标，再拆成 3 步学习：\n1. 找出题目或资料里的关键词。\n2. 用一个例子解释核心概念。\n3. 给你一道小题检查是否掌握。`,
    };
  });
}

function getRecentSessions(limit = 6) {
  return withFallback(request({ url: `/api/v1/sessions?limit=${limit}&offset=0` }), MOCK_SESSIONS.slice(0, limit));
}

function getSessionDetail(sessionId) {
  return withFallback(request({ url: `/api/v1/sessions/${encodeURIComponent(sessionId)}` }), {
    session_id: sessionId,
    title: "一次函数图像与性质",
    preferences: {
      capability: "",
      tools: ["rag"],
      knowledge_bases: ["七年级数学上册"],
    },
    messages: [
      { role: "user", content: "请用提问的方式带我学习一次函数。" },
      { role: "assistant", content: "好的。先想一想：如果 x 每增加 1，y 固定增加 2，图像会有什么特点？" },
    ],
  });
}

function deleteSession(sessionId) {
  return request({
    url: `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
    method: "DELETE",
  });
}

function listNotebooks() {
  return withFallback(request({ url: "/api/v1/notebook/list" }), { notebooks: MOCK_NOTEBOOKS });
}

function createNotebook(payload) {
  return withFallback(request({
    url: "/api/v1/notebook/create",
    method: "POST",
    data: payload,
  }), () => {
    const id = `demo-notebook-${Date.now()}`;
    return {
      notebook: {
        id,
        notebook_id: id,
        name: payload.name || "课堂笔记",
      },
    };
  });
}

function addNotebookRecord(payload) {
  return withFallback(request({
    url: "/api/v1/notebook/add_record",
    method: "POST",
    data: payload,
    timeout: 60000,
  }), { ok: true, record_id: `demo-record-${Date.now()}` });
}

function getQuestionNotebookEntries(filter = {}) {
  const params = [];
  if (filter.bookmarked !== undefined) params.push(`bookmarked=${filter.bookmarked}`);
  if (filter.is_correct !== undefined) params.push(`is_correct=${filter.is_correct}`);
  if (filter.category_id !== undefined && filter.category_id !== null) params.push(`category_id=${filter.category_id}`);
  const query = params.length ? `?${params.join("&")}` : "";
  return withFallback(request({ url: `/api/v1/question-notebook/entries${query}` }), () => {
    let items = MOCK_QUESTIONS.items;
    if (filter.bookmarked !== undefined) items = items.filter((item) => item.bookmarked === filter.bookmarked);
    if (filter.is_correct !== undefined) items = items.filter((item) => item.is_correct === filter.is_correct);
    return { items };
  });
}

function getQuestionCategories() {
  return withFallback(request({ url: "/api/v1/question-notebook/categories" }), [
    { id: "function", name: "函数" },
    { id: "geometry", name: "几何" },
  ]);
}

function updateQuestionEntry(entryId, updates) {
  return withFallback(request({
    url: `/api/v1/question-notebook/entries/${entryId}`,
    method: "PATCH",
    data: updates,
  }), { ok: true, id: entryId, ...updates });
}

function deleteQuestionEntry(entryId) {
  return withFallback(request({
    url: `/api/v1/question-notebook/entries/${entryId}`,
    method: "DELETE",
  }), { ok: true, id: entryId });
}

function getTutorBots() {
  return withFallback(request({ url: "/api/v1/tutorbot" }), MOCK_BOTS);
}

function getAssistantCatalog() {
  return withFallback(request({ url: "/api/v1/mobile/assistants" }), MOCK_ASSISTANTS);
}

function launchAssistant(assistantId, payload = {}) {
  return withFallback(request({
    url: `/api/v1/mobile/assistants/${encodeURIComponent(assistantId)}/launch`,
    method: "POST",
    data: payload,
  }), {
    assistant: MOCK_ASSISTANTS.assistants.find((item) => item.assistant_id === assistantId) || MOCK_ASSISTANTS.assistants[0],
    preset: {
      capability: payload.capability || "chat",
      title: "学习助教",
      placeholder: payload.placeholder || "输入你想处理的问题",
      content: payload.content || "我想请助教帮我学习。",
    },
  });
}

function getSettings() {
  return withFallback(request({ url: "/api/v1/mobile/settings" }), {
    cloud_env_id: "cloud1-d0gxrvlbc5c9f8145",
    api_mode: "cloud-function",
    database_policy: "test-open",
    model: "cloudbase-adapter",
    features: ["聊天", "新对话", "历史记录", "书架", "资料问答", "参考资料", "个人知识图谱", "学习路径", "学习周报"],
    runtime_note: "测试期会优先返回中文演示数据，真实后端部署后可在此页验证连接。",
  });
}

function seedMobileBackend(payload = {}) {
  return request({
    url: "/api/v1/mobile/setup/seed",
    method: "POST",
    data: payload,
  });
}

function getMasteryAnalytics() {
  return withFallback(request({ url: "/api/v1/mobile/analytics/mastery" }), {
    mastery: 0.72,
    mastery_percent: 72,
    label: "基本掌握",
    confidence: "演示",
    dimensions: [],
  });
}

function getWeakPointAnalytics() {
  return withFallback(request({ url: "/api/v1/mobile/analytics/weak-points" }), {
    weak_points: [
      {
        topic: "一次函数图像",
        mastery: 0.68,
        evidence: "演示薄弱点",
        reason: "需要更多题目记录",
        next_action: "完成 3 道即时检测题",
      },
    ],
  });
}

function getLearningRecommendations() {
  return withFallback(request({ url: "/api/v1/mobile/analytics/recommendations" }), {
    recommendation: {
      title: "20 分钟学习路径",
      target_topic: "今日学习主题",
      tasks: ["梳理概念", "完成检测", "生成复盘"],
    },
  });
}

function getQuestionStats() {
  return withFallback(request({ url: "/api/v1/mobile/analytics/question-stats" }), {
    total: MOCK_QUESTIONS.items.length,
    correct: MOCK_QUESTIONS.items.filter((item) => item.is_correct).length,
    wrong: MOCK_QUESTIONS.items.filter((item) => !item.is_correct).length,
    accuracy: 0.5,
    by_topic: [],
    by_difficulty: [],
  });
}

async function testBackendConnection() {
  const startedAt = Date.now();
  const settings = await request({
    url: "/api/v1/mobile/settings",
    method: "GET",
    timeout: 12000,
  });
  return {
    ok: true,
    latency: Date.now() - startedAt,
    settings,
  };
}

function clearProfileCache() {
  [
    "activeKnowledgeBase",
    "chatDraft",
    "pendingChatPreset",
    "guideDraft",
    "lastBackendTest",
  ].forEach((key) => wx.removeStorageSync(key));
  return true;
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
  getAssistantCatalog,
  launchAssistant,
  getSettings,
  seedMobileBackend,
  getMasteryAnalytics,
  getWeakPointAnalytics,
  getLearningRecommendations,
  getQuestionStats,
  getProfileSettings,
  saveProfileSettings,
  resetProfileSettings,
  getProfileApiToken,
  saveProfileApiToken,
  maskToken,
  testBackendConnection,
  clearProfileCache,
};
