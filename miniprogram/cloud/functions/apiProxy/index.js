const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const collections = {
  knowledge: "knowledge_bases",
  sessions: "chat_sessions",
  notebooks: "notebooks",
  questionEntries: "question_entries",
  questionCategories: "question_categories",
  guideSessions: "guide_sessions",
  bots: "tutor_bots",
  settings: "app_settings",
};

function now() {
  return Date.now();
}

function ok(data) {
  return { ok: true, data };
}

function fail(statusCode, message) {
  return { ok: false, statusCode, message };
}

function parsePath(rawPath) {
  const [pathname, queryString = ""] = String(rawPath || "/").split("?");
  const query = {};
  queryString.split("&").filter(Boolean).forEach((pair) => {
    const [key, value = ""] = pair.split("=");
    query[decodeURIComponent(key)] = decodeURIComponent(value);
  });
  return { pathname, query };
}

async function getList(collection, where = {}, limit = 100) {
  try {
    const result = await db.collection(collection).where(where).limit(limit).get();
    return result.data || [];
  } catch (error) {
    return [];
  }
}

async function addDoc(collection, data) {
  const result = await db.collection(collection).add({ data });
  return result._id;
}

async function updateById(collection, id, data) {
  await db.collection(collection).doc(id).update({ data });
}

async function removeById(collection, id) {
  await db.collection(collection).doc(id).remove();
}

function makeId(prefix) {
  return `${prefix}_${now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureNotebook() {
  const notebooks = await getList(collections.notebooks, {}, 1);
  if (notebooks.length) return notebooks[0];
  const notebook = {
    name: "课堂笔记",
    description: "小程序保存的学习记录",
    color: "#cc785c",
    icon: "book",
    record_count: 0,
    records: [],
    created_at: now(),
    updated_at: now(),
  };
  const id = await addDoc(collections.notebooks, notebook);
  return { ...notebook, _id: id, id };
}

function buildAssistantReply(payload, kbNames) {
  const content = payload.content || payload.message || "请继续";
  const capability = payload.capability || "";
  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  const hasRag = tools.includes("rag") || (payload.knowledge_bases || []).length > 0;
  const kbLine = hasRag
    ? `\n\n我会优先结合资料：${(payload.knowledge_bases || kbNames || []).join("、") || "当前资料"}。`
    : "";

  const capabilityMap = {
    deep_solve: "我会按“理解题意 → 建模 → 分步推导 → 易错点提醒”的方式带你解题。",
    deep_question: "我会先定位知识点，再生成检测题，并给出答案、解析和追问方向。",
    deep_research: "我会把问题拆成研究提纲、关键概念、证据来源和下一步阅读建议。",
    math_animator: "我会把抽象数学过程拆成可视化步骤，适合后续生成动画脚本。",
    visualize: "我会把材料整理成结构化图表、流程图或对比表。",
  };

  const intro = capabilityMap[capability] || "我会像网页端聊天一样，先抓住你的问题，再用提问和解释帮你推进。";
  return `${intro}${kbLine}\n\n你刚才的问题是：${content}\n\n建议下一步：先告诉我年级、学科和当前资料范围，我可以继续生成讲解、测评题或学习路径。`;
}

async function listKnowledge() {
  const items = await getList(collections.knowledge, {}, 100);
  return items.map((item) => ({
    name: item.name,
    is_default: item.is_default || false,
    status: item.status || "ready",
    statistics: item.statistics || {
      document_count: (item.files || []).length,
      chunk_count: item.chunk_count || 0,
      rag_provider: item.rag_provider || "cloudbase",
    },
  }));
}

async function handleKnowledgeCreate(data) {
  const name = String(data.name || "").trim();
  if (!name) return fail(400, "资料库名称不能为空");
  const existing = await getList(collections.knowledge, { name }, 1);
  if (existing.length) return ok({ knowledge_base: existing[0] });
  const doc = {
    name,
    description: data.description || "",
    status: "ready",
    files: [],
    statistics: {
      document_count: 0,
      chunk_count: 0,
      rag_provider: "cloudbase",
    },
    created_at: now(),
    updated_at: now(),
  };
  const id = await addDoc(collections.knowledge, doc);
  return ok({ knowledge_base: { ...doc, _id: id } });
}

async function handleKnowledgeUpload(pathname, data) {
  const match = pathname.match(/^\/api\/v1\/knowledge\/(.+)\/upload$/);
  const name = decodeURIComponent(match ? match[1] : "");
  if (!name) return fail(400, "资料库名称不能为空");
  const items = await getList(collections.knowledge, { name }, 1);
  if (!items.length) await handleKnowledgeCreate({ name });
  const latest = (await getList(collections.knowledge, { name }, 1))[0];
  const files = Array.isArray(data.files) ? data.files : [];
  const nextFiles = [...(latest.files || []), ...files.map((file) => ({
    fileID: file.fileID,
    name: file.name || "资料文件",
    cloudPath: file.cloudPath || "",
    uploaded_at: now(),
  }))];
  await updateById(collections.knowledge, latest._id, {
    files: nextFiles,
    status: "ready",
    statistics: {
      document_count: nextFiles.length,
      chunk_count: nextFiles.length * 12,
      rag_provider: "cloudbase",
    },
    updated_at: now(),
  });
  return ok({ task_id: makeId("upload"), uploaded: files.length });
}

async function listSessions(query) {
  const limit = Math.min(Number(query.limit || 50), 100);
  const sessions = await getList(collections.sessions, {}, limit);
  sessions.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  return ok({
    sessions: sessions.map((item) => ({
      id: item.session_id,
      session_id: item.session_id,
      title: item.title || "未命名对话",
      created_at: item.created_at,
      updated_at: item.updated_at,
      message_count: (item.messages || []).length,
      last_message: item.last_message || "",
      status: item.status || "completed",
      preferences: item.preferences || {},
    })),
  });
}

async function getSession(sessionId) {
  const sessions = await getList(collections.sessions, { session_id: sessionId }, 1);
  if (!sessions.length) return fail(404, "会话不存在");
  const session = sessions[0];
  return ok({
    id: session.session_id,
    session_id: session.session_id,
    title: session.title || "未命名对话",
    created_at: session.created_at,
    updated_at: session.updated_at,
    status: session.status || "completed",
    preferences: session.preferences || {},
    messages: session.messages || [],
  });
}

async function deleteSession(sessionId) {
  const sessions = await getList(collections.sessions, { session_id: sessionId }, 1);
  if (!sessions.length) return ok({ deleted: false });
  await removeById(collections.sessions, sessions[0]._id);
  return ok({ deleted: true });
}

async function chatTurn(data) {
  const sessionId = data.session_id || makeId("sess");
  const sessions = await getList(collections.sessions, { session_id: sessionId }, 1);
  const createdAt = sessions[0]?.created_at || now();
  const oldMessages = sessions[0]?.messages || [];
  const reply = buildAssistantReply(data);
  const userMessage = {
    id: oldMessages.length + 1,
    role: "user",
    content: data.content || data.message || "",
    attachments: data.attachments || [],
    created_at: now(),
  };
  const assistantMessage = {
    id: oldMessages.length + 2,
    role: "assistant",
    content: reply,
    attachments: [],
    created_at: now(),
  };
  const messages = [...oldMessages, userMessage, assistantMessage];
  const title = (data.content || data.message || "新对话").slice(0, 32);
  const payload = {
    session_id: sessionId,
    title,
    messages,
    last_message: reply.slice(0, 80),
    status: "completed",
    preferences: {
      capability: data.capability || "",
      tools: data.tools || [],
      knowledge_bases: data.knowledge_bases || [],
      language: "zh",
    },
    created_at: createdAt,
    updated_at: now(),
  };
  if (sessions.length) {
    await updateById(collections.sessions, sessions[0]._id, payload);
  } else {
    await addDoc(collections.sessions, payload);
  }
  return ok({ session_id: sessionId, content: reply, message: assistantMessage });
}

async function listNotebooks() {
  const notebooks = await getList(collections.notebooks, {}, 100);
  return ok({
    notebooks: notebooks.map((item) => ({
      id: item._id,
      notebook_id: item._id,
      name: item.name,
      description: item.description || "",
      record_count: (item.records || []).length,
      color: item.color || "#cc785c",
      icon: item.icon || "book",
      updated_at: item.updated_at,
    })),
  });
}

async function createNotebook(data) {
  const doc = {
    name: data.name || "课堂笔记",
    description: data.description || "",
    color: data.color || "#cc785c",
    icon: data.icon || "book",
    records: [],
    created_at: now(),
    updated_at: now(),
  };
  const id = await addDoc(collections.notebooks, doc);
  return ok({ notebook: { ...doc, id, notebook_id: id } });
}

async function addNotebookRecord(data) {
  const notebook = await ensureNotebook();
  const targetId = (data.notebook_ids && data.notebook_ids[0]) || notebook._id || notebook.id;
  const record = {
    id: makeId("record"),
    type: data.record_type || "chat",
    title: data.title || "学习记录",
    summary: data.summary || "",
    user_query: data.user_query || "",
    output: data.output || "",
    metadata: data.metadata || {},
    created_at: now(),
  };
  const current = await db.collection(collections.notebooks).doc(targetId).get().catch(() => null);
  const records = current?.data?.records || [];
  await updateById(collections.notebooks, targetId, {
    records: [...records, record],
    record_count: records.length + 1,
    updated_at: now(),
  });
  return ok({ record });
}

async function listQuestionEntries(query) {
  const where = {};
  if (query.bookmarked === "true") where.bookmarked = true;
  if (query.is_correct === "false") where.is_correct = false;
  const items = await getList(collections.questionEntries, where, 200);
  return ok({
    items: items.map((item) => ({
      id: item._id,
      question: item.question || item.title || "未命名题目",
      question_type: item.question_type || "short_answer",
      options: item.options || {},
      correct_answer: item.correct_answer || "",
      explanation: item.explanation || "",
      difficulty: item.difficulty || "中等",
      user_answer: item.user_answer || "",
      is_correct: item.is_correct !== false,
      bookmarked: Boolean(item.bookmarked),
      categories: item.categories || [],
      created_at: item.created_at || now(),
    })),
    total: items.length,
  });
}

async function listQuestionCategories() {
  const items = await getList(collections.questionCategories, {}, 100);
  if (!items.length) {
    await addDoc(collections.questionCategories, { name: "错题复盘", entry_count: 0, created_at: now() });
    await addDoc(collections.questionCategories, { name: "高频考点", entry_count: 0, created_at: now() });
  }
  const next = await getList(collections.questionCategories, {}, 100);
  return ok(next.map((item) => ({
    id: item._id,
    name: item.name,
    entry_count: item.entry_count || 0,
    created_at: item.created_at,
  })));
}

async function updateQuestionEntry(pathname, data) {
  const id = pathname.split("/").pop();
  await updateById(collections.questionEntries, id, { ...data, updated_at: now() });
  return ok({ updated: true });
}

async function deleteQuestionEntry(pathname) {
  const id = pathname.split("/").pop();
  await removeById(collections.questionEntries, id);
  return ok({ deleted: true });
}

async function mobileOverview(query) {
  const knowledge = await listKnowledge();
  const sessions = await getList(collections.sessions, {}, 100);
  const q = await getList(collections.questionEntries, {}, 100);
  return ok({
    active_knowledge_base: query.active_knowledge_base || (knowledge[0] && knowledge[0].name) || "",
    stats: {
      materials: knowledge.length,
      sessions: sessions.length,
      mastery: q.length ? q.filter((item) => item.is_correct !== false).length / q.length : 0.72,
    },
    capabilities: [
      "聊天",
      "深度解题",
      "出题测评",
      "深度研究",
      "数学动画",
      "图表可视化",
      "智能写作",
      "辅导机器人",
    ],
  });
}

async function createGuide(data) {
  const doc = {
    session_id: makeId("guide"),
    title: data.learning_goal || data.user_input || "今日学习路径",
    topic: data.learning_goal || "完成今日学习并定位薄弱知识点",
    status: "ready",
    knowledge_base: data.knowledge_base || "",
    tasks: [
      "梳理已掌握内容",
      "定位薄弱知识点",
      "完成 3 道检测题",
      "生成复习提醒",
    ],
    created_at: now(),
    updated_at: now(),
  };
  await addDoc(collections.guideSessions, doc);
  return ok({ session: doc, task_id: doc.session_id });
}

async function listGuideSessions() {
  const sessions = await getList(collections.guideSessions, {}, 50);
  sessions.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  return ok({ sessions });
}

async function parentReport() {
  const sessions = await getList(collections.sessions, {}, 6);
  const wrong = await getList(collections.questionEntries, { is_correct: false }, 6);
  return ok({
    summary: {
      learning_sessions: sessions.length,
      weak_points: wrong.map((item) => item.question || item.title || "待复盘知识点"),
      review_items: wrong.slice(0, 3).map((item) => item.explanation || item.question || "复习一条错题解析"),
    },
    discussion_prompt: "让孩子先复述今天最卡住的一个点，再用一道题说明自己现在怎么想。",
    recent_sessions: sessions,
  });
}

async function tutorBots() {
  const bots = await getList(collections.bots, {}, 50);
  if (!bots.length) {
    return ok([
      {
        bot_id: "mathtutor",
        name: "Mathtutor",
        description: "数学思维辅导机器人",
        persona: "循序渐进、先问后讲",
        channels: ["chat", "guide"],
        model: "cloudbase-adapter",
        running: true,
      },
    ]);
  }
  return ok(bots);
}

async function settings() {
  return ok({
    cloud_env_id: cloud.DYNAMIC_CURRENT_ENV,
    api_mode: "cloud-function",
    database_policy: "test-open",
    model: "cloudbase-adapter",
    features: ["聊天", "资料库", "笔记", "错题本", "学习路径", "家长周报", "机器人"],
  });
}

exports.main = async (event) => {
  const { pathname, query } = parsePath(event.path);
  const method = String(event.method || "GET").toUpperCase();
  const data = event.data || {};

  try {
    if (pathname === "/api/v1/mobile/auth/wechat/login" && method === "POST") {
      return ok({ token: "dev-cloud-token", user: { nickname: "IntelliTutor 用户", role: "teacher", openid: "cloud-dev-openid" } });
    }
    if (pathname === "/api/v1/mobile/overview") return mobileOverview(query);
    if (pathname === "/api/v1/knowledge/list") return ok(await listKnowledge());
    if (pathname === "/api/v1/knowledge/rag-providers") {
      return ok({ providers: [{ id: "cloudbase", name: "CloudBase", description: "测试阶段云函数资料适配器" }] });
    }
    if (pathname === "/api/v1/mobile/knowledge/create-empty" && method === "POST") return handleKnowledgeCreate(data);
    if (/^\/api\/v1\/knowledge\/.+\/upload$/.test(pathname) && method === "POST") return handleKnowledgeUpload(pathname, data);
    if (pathname === "/api/v1/mobile/chat/turn" && method === "POST") return chatTurn(data);
    if (pathname === "/api/v1/sessions" && method === "GET") return listSessions(query);
    if (/^\/api\/v1\/sessions\/[^/]+$/.test(pathname) && method === "GET") return getSession(decodeURIComponent(pathname.split("/").pop()));
    if (/^\/api\/v1\/sessions\/[^/]+$/.test(pathname) && method === "DELETE") return deleteSession(decodeURIComponent(pathname.split("/").pop()));
    if (pathname === "/api/v1/notebook/list") return listNotebooks();
    if (pathname === "/api/v1/notebook/create" && method === "POST") return createNotebook(data);
    if (pathname === "/api/v1/notebook/add_record" && method === "POST") return addNotebookRecord(data);
    if (pathname === "/api/v1/question-notebook/entries" && method === "GET") return listQuestionEntries(query);
    if (pathname === "/api/v1/question-notebook/categories" && method === "GET") return listQuestionCategories();
    if (/^\/api\/v1\/question-notebook\/entries\/[^/]+$/.test(pathname) && method === "PATCH") return updateQuestionEntry(pathname, data);
    if (/^\/api\/v1\/question-notebook\/entries\/[^/]+$/.test(pathname) && method === "DELETE") return deleteQuestionEntry(pathname);
    if (pathname === "/api/v1/mobile/guide/today" && method === "POST") return createGuide(data);
    if (pathname === "/api/v1/guide/create_session" && method === "POST") return createGuide(data);
    if (pathname === "/api/v1/guide/sessions") return listGuideSessions();
    if (pathname === "/api/v1/mobile/parent/report") return parentReport();
    if (pathname === "/api/v1/tutorbot") return tutorBots();
    if (pathname === "/api/v1/mobile/settings") return settings();
    return fail(404, `未实现的移动端接口：${method} ${pathname}`);
  } catch (error) {
    return fail(500, error.message || "云函数执行失败");
  }
};
