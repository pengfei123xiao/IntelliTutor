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
  learningPaths: "learning_paths",
  parentReports: "parent_reports",
  books: "learning_books",
  graphNodes: "learning_graph_nodes",
  graphEdges: "learning_graph_edges",
  bots: "tutor_bots",
  settings: "app_settings",
};

const TARGET_ENV_ID = "cloud1-d0gxrvlbc5c9f8145";

const demo = {
  knowledge: [
    {
      _id: "demo_kb_math",
      name: "演示资料库：七年级数学",
      description: "CloudBase 数据库未初始化时的演示资料库",
      is_default: true,
      status: "ready",
      files: [
        { name: "有理数与整式讲义.pdf", fileID: "demo://math-handout" },
        { name: "课堂错题整理.md", fileID: "demo://wrong-questions" },
      ],
      statistics: {
        document_count: 2,
        chunk_count: 24,
        rag_provider: "cloudbase-demo",
      },
      created_at: 1778083200000,
      updated_at: 1778083200000,
    },
  ],
  sessions: [
    {
      session_id: "demo_session_math",
      title: "演示对话：整式化简",
      messages: [
        { id: 1, role: "user", content: "请讲一下合并同类项。", created_at: 1778083200000 },
        {
          id: 2,
          role: "assistant",
          content: "合并同类项时，先找字母和字母指数完全相同的项，只把系数相加减。比如 3x + 2x = 5x。",
          created_at: 1778083200000,
        },
      ],
      last_message: "合并同类项时，先找字母和字母指数完全相同的项。",
      status: "completed",
      preferences: { capability: "", tools: ["rag"], knowledge_bases: ["演示资料库：七年级数学"], language: "zh" },
      created_at: 1778083200000,
      updated_at: 1778083200000,
    },
  ],
  notebooks: [
    {
      _id: "demo_notebook_class",
      name: "课堂笔记",
      description: "演示笔记本：用于保存聊天重点和课堂记录",
      color: "#cc785c",
      icon: "book",
      record_count: 1,
      records: [
        {
          id: "demo_record_1",
          type: "chat",
          title: "合并同类项",
          summary: "同类项的字母和指数相同，只合并系数。",
          created_at: 1778083200000,
        },
      ],
      created_at: 1778083200000,
      updated_at: 1778083200000,
    },
  ],
  questionEntries: [
    {
      _id: "demo_question_1",
      question: "化简：3x + 2x - x",
      question_type: "short_answer",
      correct_answer: "4x",
      explanation: "3、2、-1 是同类项系数，相加得到 4，所以结果是 4x。",
      difficulty: "基础",
      user_answer: "5x",
      is_correct: false,
      bookmarked: true,
      categories: ["demo_category_wrong"],
      created_at: 1778083200000,
    },
    {
      _id: "demo_question_2",
      question: "下列各项中，2a 与哪一项是同类项？",
      question_type: "single_choice",
      options: { A: "2b", B: "-3a", C: "a²", D: "ab" },
      correct_answer: "B",
      explanation: "同类项要求字母和字母指数完全相同，-3a 与 2a 是同类项。",
      difficulty: "基础",
      user_answer: "B",
      is_correct: true,
      bookmarked: false,
      categories: ["demo_category_core"],
      created_at: 1778083200000,
    },
  ],
  questionCategories: [
    { _id: "demo_category_wrong", name: "错题复盘", entry_count: 1, created_at: 1778083200000 },
    { _id: "demo_category_core", name: "高频考点", entry_count: 1, created_at: 1778083200000 },
  ],
  learningPaths: [
    {
      _id: "demo_learning_path_week_1",
      path_id: "demo_learning_path_week_1",
      title: "一周补强路径：整式化简",
      status: "ready",
      mastery_target: 0.82,
      tasks: [
        { id: "task_1", title: "复述同类项定义", minutes: 8, status: "todo" },
        { id: "task_2", title: "完成 3 道合并同类项题", minutes: 12, status: "todo" },
        { id: "task_3", title: "整理一次系数符号错因", minutes: 10, status: "todo" },
      ],
      created_at: 1778083200000,
      updated_at: 1778083200000,
    },
  ],
  parentReports: [
    {
      _id: "demo_parent_report_week",
      report_id: "demo_parent_report_week",
      title: "本周学习报告",
      period: "测试周",
      summary: "本周完成了整式化简与同类项复习，能说出基本规则，但符号处理仍需稳定。",
      weak_points: ["合并同类项时漏看负号", "解释步骤时容易只写答案"],
      review_items: ["每天 5 分钟口述规则", "复盘 2 道符号题"],
      created_at: 1778083200000,
    },
  ],
  books: [
    {
      _id: "demo_book_math_7a",
      book_id: "demo_book_math_7a",
      title: "七年级数学上册",
      subject: "数学",
      progress_percent: 62,
      mastery_percent: 72,
      current_chapter: "整式的加减",
      source: "教材资料",
      updated_at: 1778083200000,
    },
    {
      _id: "demo_book_luotuoxiangzi",
      book_id: "demo_book_luotuoxiangzi",
      title: "骆驼祥子",
      subject: "语文阅读",
      progress_percent: 38,
      mastery_percent: 66,
      current_chapter: "人物关系与社会背景",
      source: "阅读项目",
      updated_at: 1778083200000,
    },
  ],
  graphNodes: [
    {
      _id: "node_like_terms",
      node_id: "node_like_terms",
      title: "同类项",
      subject: "数学",
      mastery: 0.78,
      status: "stable",
      evidence_count: 5,
      updated_at: 1778083200000,
    },
    {
      _id: "node_signs",
      node_id: "node_signs",
      title: "符号处理",
      subject: "数学",
      mastery: 0.52,
      status: "weak",
      evidence_count: 3,
      updated_at: 1778083200000,
    },
    {
      _id: "node_linear_function",
      node_id: "node_linear_function",
      title: "一次函数图像",
      subject: "数学",
      mastery: 0.68,
      status: "learning",
      evidence_count: 4,
      updated_at: 1778083200000,
    },
    {
      _id: "node_xiangzi_character",
      node_id: "node_xiangzi_character",
      title: "祥子人物弧线",
      subject: "语文阅读",
      mastery: 0.64,
      status: "learning",
      evidence_count: 2,
      updated_at: 1778083200000,
    },
  ],
  graphEdges: [
    { _id: "edge_like_terms_signs", from: "node_like_terms", to: "node_signs", relation: "易错关联" },
    { _id: "edge_signs_linear", from: "node_signs", to: "node_linear_function", relation: "代数基础" },
    { _id: "edge_reading_math", from: "node_xiangzi_character", to: "node_like_terms", relation: "学习记录并列" },
  ],
  guideSessions: [
    {
      session_id: "demo_guide_1",
      title: "20 分钟复习：合并同类项",
      topic: "先回顾概念，再完成两道检测题，最后整理错因。",
      status: "ready",
      knowledge_base: "演示资料库：七年级数学",
      tasks: ["复述同类项定义", "完成 2 道化简题", "标记易错系数", "把错题保存到笔记"],
      created_at: 1778083200000,
      updated_at: 1778083200000,
    },
  ],
  bots: [
    {
      bot_id: "mathtutor",
      name: "Mathtutor",
      description: "数学思维辅导机器人",
      persona: "循序渐进、先问后讲",
      channels: ["chat", "guide"],
      model: "cloudbase-demo",
      running: true,
    },
    {
      bot_id: "reading-coach",
      name: "Reading Coach",
      description: "语文阅读与表达教练",
      persona: "先抓主旨，再追问证据",
      channels: ["chat"],
      model: "cloudbase-demo",
      running: true,
    },
  ],
  settings: [
    {
      _id: "mobile_backend_runtime",
      key: "mobile_backend_runtime",
      cloud_env_id: TARGET_ENV_ID,
      api_mode: "cloud-function",
      database_policy: "cloud-function-first",
      seed_version: "2026-05-mobile-backend",
      created_at: 1778083200000,
      updated_at: 1778083200000,
    },
  ],
};

function now() {
  return Date.now();
}

function ok(data, meta) {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

function fail(statusCode, message) {
  return { ok: false, statusCode, message };
}

function matchesWhere(item, where = {}) {
  return Object.keys(where).every((key) => item[key] === where[key]);
}

function fallbackList(collection, where = {}, limit = 100) {
  const map = {
    [collections.knowledge]: demo.knowledge,
    [collections.sessions]: demo.sessions,
    [collections.notebooks]: demo.notebooks,
    [collections.questionEntries]: demo.questionEntries,
    [collections.questionCategories]: demo.questionCategories,
    [collections.guideSessions]: demo.guideSessions,
    [collections.learningPaths]: demo.learningPaths,
    [collections.parentReports]: demo.parentReports,
    [collections.books]: demo.books,
    [collections.graphNodes]: demo.graphNodes,
    [collections.graphEdges]: demo.graphEdges,
    [collections.bots]: demo.bots,
    [collections.settings]: demo.settings,
  };
  return (map[collection] || []).filter((item) => matchesWhere(item, where)).slice(0, limit);
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
    return fallbackList(collection, where, limit);
  }
}

async function getStoredList(collection, where = {}, limit = 100) {
  try {
    const result = await db.collection(collection).where(where).limit(limit).get();
    return result.data || [];
  } catch (error) {
    return [];
  }
}

async function createCollection(collection) {
  try {
    await db.createCollection(collection);
    return { collection, created: true };
  } catch (error) {
    return { collection, created: false, message: error.message || "collection already exists or cannot be created by this SDK" };
  }
}

async function upsertDoc(collection, id, data) {
  const payload = { ...data, _id: id, updated_at: data.updated_at || now() };
  const storedData = { ...payload };
  delete storedData._id;
  try {
    await db.collection(collection).doc(id).set({ data: storedData });
    return { id, mode: "set" };
  } catch (setError) {
    const existing = await getStoredList(collection, { _id: id }, 1);
    if (existing.length) {
      const updated = await updateById(collection, existing[0]._id, storedData);
      return { id: existing[0]._id, mode: updated ? "update" : "fallback" };
    }
    try {
      const result = await db.collection(collection).add({ data: storedData });
      return { id: result._id, mode: "add" };
    } catch (addError) {
      return { id, mode: "fallback", message: addError.message || setError.message || "database write failed" };
    }
  }
}

async function addDoc(collection, data) {
  try {
    const result = await db.collection(collection).add({ data });
    return result._id;
  } catch (error) {
    return makeId("demo");
  }
}

async function updateById(collection, id, data) {
  try {
    await db.collection(collection).doc(id).update({ data });
    return true;
  } catch (error) {
    return false;
  }
}

async function removeById(collection, id) {
  try {
    await db.collection(collection).doc(id).remove();
    return true;
  } catch (error) {
    return false;
  }
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

function normalizePercent(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function itemTopic(item) {
  const categories = Array.isArray(item.categories) ? item.categories.filter(Boolean) : [];
  return item.knowledge_point || item.category_name || item.category_id || categories[0] || item.difficulty || "综合能力";
}

function buildQuestionStats(items) {
  const questions = items.length ? items : demo.questionEntries;
  const total = questions.length;
  const correct = questions.filter((item) => item.is_correct !== false).length;
  const wrong = total - correct;
  const bookmarked = questions.filter((item) => Boolean(item.bookmarked)).length;
  const byTopic = {};
  const byDifficulty = {};

  for (const item of questions) {
    const topic = itemTopic(item);
    const difficulty = item.difficulty || "中等";
    if (!byTopic[topic]) byTopic[topic] = { topic, total: 0, correct: 0, wrong: 0, mastery: 0 };
    if (!byDifficulty[difficulty]) byDifficulty[difficulty] = { difficulty, total: 0, correct: 0, wrong: 0, accuracy: 0 };
    byTopic[topic].total += 1;
    byDifficulty[difficulty].total += 1;
    if (item.is_correct === false) {
      byTopic[topic].wrong += 1;
      byDifficulty[difficulty].wrong += 1;
    } else {
      byTopic[topic].correct += 1;
      byDifficulty[difficulty].correct += 1;
    }
  }

  Object.values(byTopic).forEach((entry) => {
    entry.mastery = normalizePercent(entry.total ? entry.correct / entry.total : 0);
  });
  Object.values(byDifficulty).forEach((entry) => {
    entry.accuracy = normalizePercent(entry.total ? entry.correct / entry.total : 0);
  });

  return {
    total,
    correct,
    wrong,
    bookmarked,
    accuracy: normalizePercent(total ? correct / total : 0),
    by_topic: Object.values(byTopic).sort((a, b) => b.wrong - a.wrong || a.topic.localeCompare(b.topic, "zh-Hans-CN")),
    by_difficulty: Object.values(byDifficulty).sort((a, b) => b.total - a.total),
  };
}

function buildWeakPoints(questionStats, sessions = []) {
  const weakTopics = questionStats.by_topic
    .filter((item) => item.wrong > 0 || item.mastery < 0.75)
    .slice(0, 5)
    .map((item) => ({
      topic: item.topic,
      mastery: item.mastery,
      evidence: `${item.total} 道题中错 ${item.wrong} 道`,
      reason: item.wrong ? "最近错题集中在这个知识点" : "练习量不足，掌握度还不稳定",
      next_action: `先复述「${item.topic}」的规则，再做 2 道同类题检查`,
    }));

  if (weakTopics.length) return weakTopics;

  const recentTitle = sessions[0]?.title || "当前学习主题";
  return [{
    topic: recentTitle,
    mastery: questionStats.accuracy || 0.72,
    evidence: "题目记录较少，先按最近学习主题生成保守建议",
    reason: "需要更多真实练习数据来稳定判断",
    next_action: `围绕「${recentTitle}」完成 3 道即时检测题`,
  }];
}

function buildMasteryProfile(questionStats, weakPoints, sessions = []) {
  const activityBoost = Math.min(sessions.length, 8) * 0.015;
  const mastery = normalizePercent(questionStats.accuracy * 0.82 + activityBoost + 0.08);
  const label = mastery >= 0.85 ? "掌握较稳" : mastery >= 0.7 ? "基本掌握" : "需要补强";
  return {
    mastery,
    mastery_percent: Math.round(mastery * 100),
    label,
    confidence: questionStats.total >= 6 ? "较高" : questionStats.total >= 2 ? "中等" : "低，需要更多练习",
    dimensions: [
      { name: "概念理解", score: normalizePercent(mastery + 0.06), evidence: "结合对话主题与错题解释估算" },
      { name: "解题准确率", score: questionStats.accuracy, evidence: `${questionStats.correct}/${questionStats.total || 1} 道题正确` },
      { name: "复盘稳定性", score: normalizePercent(1 - weakPoints.length * 0.12), evidence: `当前识别 ${weakPoints.length} 个薄弱点` },
    ],
  };
}

function buildLearningRecommendations({ masteryProfile, weakPoints, knowledge, questionStats }) {
  const targetTopic = weakPoints[0]?.topic || knowledge[0]?.name || "今日学习主题";
  const minutes = masteryProfile.mastery < 0.7 ? 30 : 20;
  return {
    title: `${minutes} 分钟学习路径：${targetTopic}`,
    target_topic: targetTopic,
    rationale: `当前掌握度约 ${masteryProfile.mastery_percent}%，优先处理最影响正确率的薄弱点。`,
    tasks: [
      {
        id: "review_concept",
        title: `复述「${targetTopic}」核心规则`,
        minutes: 6,
        output: "用自己的话写下 2 条规则和 1 个反例",
      },
      {
        id: "guided_practice",
        title: "完成分层检测题",
        minutes: Math.max(8, minutes - 12),
        output: `至少完成 ${questionStats.wrong > 1 ? 4 : 3} 道题，并标记每道题的错因`,
      },
      {
        id: "parent_sync",
        title: "生成学习摘要",
        minutes: 6,
        output: "说明今天卡点、已完成练习、明天复习动作",
      },
    ],
    success_criteria: ["能说清规则", "同类题正确率达到 80%", "错题有明确错因"],
  };
}

async function loadBookData() {
  const stored = await getList(collections.books, {}, 50);
  const books = stored.length ? stored : demo.books;
  return books
    .map((item) => ({
      book_id: item.book_id || item._id || makeId("book"),
      title: item.title || item.name || "学习资料",
      subject: item.subject || "综合",
      progress_percent: Number(item.progress_percent ?? item.progress ?? 0),
      mastery_percent: Number(item.mastery_percent ?? Math.round(normalizePercent(item.mastery || 0.6) * 100)),
      current_chapter: item.current_chapter || item.chapter || "最近学习",
      source: item.source || "资料库",
      updated_at: item.updated_at || item.created_at || now(),
    }))
    .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
}

async function loadGraphSummary() {
  const nodes = await getList(collections.graphNodes, {}, 120);
  const edges = await getList(collections.graphEdges, {}, 200);
  const graphNodes = nodes.length ? nodes : demo.graphNodes;
  const graphEdges = edges.length ? edges : demo.graphEdges;
  const sortedNodes = [...graphNodes].sort((a, b) => normalizePercent(a.mastery) - normalizePercent(b.mastery));
  const weakNodes = sortedNodes
    .filter((item) => item.status === "weak" || normalizePercent(item.mastery) < 0.7)
    .slice(0, 5)
    .map((item) => ({
      node_id: item.node_id || item._id,
      title: item.title,
      subject: item.subject || "综合",
      mastery_percent: Math.round(normalizePercent(item.mastery) * 100),
      evidence_count: item.evidence_count || 0,
      next_action: `围绕「${item.title}」完成一次追问和两道检测题`,
    }));

  const average = graphNodes.length
    ? graphNodes.reduce((sum, item) => sum + normalizePercent(item.mastery), 0) / graphNodes.length
    : 0.72;

  return {
    node_count: graphNodes.length,
    edge_count: graphEdges.length,
    mastery_percent: Math.round(average * 100),
    updated_nodes: graphNodes.slice(0, 4).map((item) => ({
      node_id: item.node_id || item._id,
      title: item.title,
      subject: item.subject || "综合",
      mastery_percent: Math.round(normalizePercent(item.mastery) * 100),
      status: item.status || "learning",
    })),
    weak_nodes: weakNodes,
  };
}

async function loadAnalyticsData() {
  const questions = await getList(collections.questionEntries, {}, 200);
  const sessions = await getList(collections.sessions, {}, 50);
  const knowledge = await getList(collections.knowledge, {}, 100);
  const questionItems = questions.length ? questions : demo.questionEntries;
  const sessionItems = sessions.length ? sessions : demo.sessions;
  const knowledgeItems = knowledge.length ? knowledge : demo.knowledge;
  const questionStats = buildQuestionStats(questionItems);
  const weakPoints = buildWeakPoints(questionStats, sessionItems);
  const masteryProfile = buildMasteryProfile(questionStats, weakPoints, sessionItems);
  const recommendations = buildLearningRecommendations({ masteryProfile, weakPoints, knowledge: knowledgeItems, questionStats });
  return { questions: questionItems, sessions: sessionItems, knowledge: knowledgeItems, questionStats, weakPoints, masteryProfile, recommendations };
}

async function listKnowledge() {
  const stored = await getList(collections.knowledge, {}, 100);
  const items = stored.length ? stored : demo.knowledge;
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
  const latest = (await getList(collections.knowledge, { name }, 1))[0] || {
    _id: makeId("kb"),
    name,
    files: [],
  };
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
  return ok({
    task_id: makeId("upload"),
    uploaded: files.length,
    status: "ready",
    message: files.length ? "文件已登记，测试期使用 CloudBase 演示处理结果。" : "未收到文件，已保留资料库。",
  });
}

async function listSessions(query) {
  const limit = Math.min(Number(query.limit || 50), 100);
  const stored = await getList(collections.sessions, {}, limit);
  const sessions = stored.length ? stored : demo.sessions.slice(0, limit);
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
  const fallback = demo.sessions.find((item) => item.session_id === sessionId);
  if (!sessions.length && !fallback) return fail(404, "会话不存在");
  if (!sessions.length) sessions.push(fallback);
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
  return ok({
    session_id: sessionId,
    content: reply,
    message: assistantMessage,
    status: "completed",
    fallback: true,
  });
}

async function listNotebooks() {
  const stored = await getList(collections.notebooks, {}, 100);
  const notebooks = stored.length ? stored : demo.notebooks;
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
  return ok({ record, saved: true });
}

async function listQuestionEntries(query) {
  const where = {};
  if (query.bookmarked === "true") where.bookmarked = true;
  if (query.is_correct === "false") where.is_correct = false;
  const stored = await getList(collections.questionEntries, where, 200);
  let items = stored.length ? stored : fallbackList(collections.questionEntries, where, 200);
  if (query.category_id) {
    items = items.filter((item) => item.category_id === query.category_id || (item.categories || []).includes(query.category_id));
  }
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
  if (!items.length && !fallbackList(collections.questionCategories).length) {
    await addDoc(collections.questionCategories, { name: "错题复盘", entry_count: 0, created_at: now() });
    await addDoc(collections.questionCategories, { name: "高频考点", entry_count: 0, created_at: now() });
  }
  const stored = await getList(collections.questionCategories, {}, 100);
  const next = stored.length ? stored : demo.questionCategories;
  return ok(next.map((item) => ({
    id: item._id,
    name: item.name,
    entry_count: item.entry_count || 0,
    created_at: item.created_at,
  })));
}

async function updateQuestionEntry(pathname, data) {
  const id = pathname.split("/").pop();
  const updated = await updateById(collections.questionEntries, id, { ...data, updated_at: now() });
  return ok({ updated, id });
}

async function deleteQuestionEntry(pathname) {
  const id = pathname.split("/").pop();
  const deleted = await removeById(collections.questionEntries, id);
  return ok({ deleted, id });
}

async function mobileOverview(query) {
  const knowledge = await listKnowledge();
  const storedSessions = await getList(collections.sessions, {}, 100);
  const sessions = storedSessions.length ? storedSessions : demo.sessions;
  const storedQuestions = await getList(collections.questionEntries, {}, 100);
  const q = storedQuestions.length ? storedQuestions : demo.questionEntries;
  const analytics = await loadAnalyticsData();
  const books = await loadBookData();
  const graph = await loadGraphSummary();
  return ok({
    active_knowledge_base: query.active_knowledge_base || (knowledge[0] && knowledge[0].name) || "",
    stats: {
      materials: knowledge.length,
      sessions: sessions.length,
      mastery: analytics.masteryProfile.mastery,
      weak_points: analytics.weakPoints.length,
      questions: q.length,
      books: books.length,
      graph_nodes: graph.node_count,
    },
    recommendation: analytics.recommendations,
    books: books.slice(0, 4),
    graph,
    recent_sessions: sessions.slice(0, 4),
  });
}

async function createGuide(data) {
  const minutes = Math.max(10, Math.min(Number(data.minutes || 20), 90));
  const title = data.learning_goal || data.user_input || data.topic || "今日学习路径";
  const analytics = await loadAnalyticsData();
  const doc = {
    session_id: makeId("guide"),
    title,
    topic: title || "完成今日学习并定位薄弱知识点",
    status: "ready",
    knowledge_base: data.knowledge_base || "",
    tasks: analytics.recommendations.tasks.map((task) => `${task.title}（约 ${task.minutes} 分钟）`),
    algorithm: {
      mastery: analytics.masteryProfile.mastery,
      weak_points: analytics.weakPoints.slice(0, 3),
      recommended_minutes: minutes,
    },
    created_at: now(),
    updated_at: now(),
  };
  await addDoc(collections.guideSessions, doc);
  return ok({ session: doc, task_id: doc.session_id });
}

async function listGuideSessions() {
  const stored = await getList(collections.guideSessions, {}, 50);
  const sessions = stored.length ? stored : [...demo.guideSessions];
  sessions.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  return ok({ sessions });
}

async function parentReport() {
  const sessions = await getList(collections.sessions, {}, 6);
  const reports = await getList(collections.parentReports, {}, 1);
  const analytics = await loadAnalyticsData();
  const graph = await loadGraphSummary();
  const latestReport = reports[0] || demo.parentReports[0];
  return ok({
    report: latestReport,
    summary: {
      learning_sessions: sessions.length || demo.sessions.length,
      mastery: analytics.masteryProfile,
      weak_points: analytics.weakPoints.map((item) => `${item.topic}：${item.reason}`),
      review_items: analytics.recommendations.tasks.map((item) => item.title),
      graph,
      next_week: analytics.recommendations.tasks.map((item) => ({
        title: item.title,
        minutes: item.minutes,
      })),
    },
    share_summary: `${latestReport.title || "学习周报"}：掌握度 ${analytics.masteryProfile.mastery_percent}%，重点补强 ${analytics.weakPoints[0]?.topic || "当前学习主题"}。`,
    discussion_prompt: "先复述本周最卡住的一个点，再用一道题说明现在怎么想。",
    recent_sessions: sessions.length ? sessions : demo.sessions,
  });
}

async function booksEndpoint() {
  return ok({ books: await loadBookData() }, { source: "cloudbase-or-demo" });
}

async function graphEndpoint() {
  return ok(await loadGraphSummary(), { source: "cloudbase-or-demo" });
}

async function tutorBots() {
  const stored = await getList(collections.bots, {}, 50);
  const bots = stored.length ? stored : demo.bots;
  return ok(bots);
}

async function settings() {
  const stored = await getList(collections.settings, { key: "mobile_backend_runtime" }, 1);
  const runtime = stored[0] || demo.settings[0];
  return ok({
    cloud_env_id: TARGET_ENV_ID,
    api_mode: "cloud-function",
    database_policy: runtime.database_policy || "test-open",
    seed_version: runtime.seed_version || "not-seeded",
    model: "cloudbase-adapter",
    features: ["聊天", "资料库", "书架", "学习路径", "学习周报", "个人知识图谱", "错题复盘", "掌握度算法", "薄弱点提取"],
    function_name: "apiProxy",
    runtime_note: "apiProxy 优先读取 CloudBase 数据库；集合为空或不可用时返回中文演示数据，保证页面可验收。",
  });
}

async function seedMobileBackend(data = {}) {
  const stamp = now();
  const seedVersion = data.seed_version || "2026-05-mobile-backend";
  const collectionNames = Object.values(collections);
  const collectionResults = [];
  for (const name of collectionNames) {
    collectionResults.push(await createCollection(name));
  }

  const seedMap = {
    [collections.knowledge]: demo.knowledge.map((item) => ({
      id: item._id,
      data: { ...item, description: "测试期 seed 数据：七年级数学资料库", seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.sessions]: demo.sessions.map((item) => ({
      id: item.session_id,
      data: { ...item, _id: item.session_id, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.notebooks]: demo.notebooks.map((item) => ({
      id: item._id,
      data: { ...item, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.questionEntries]: demo.questionEntries.map((item) => ({
      id: item._id,
      data: { ...item, knowledge_point: item.categories?.[0] === "demo_category_wrong" ? "同类项符号处理" : "同类项识别", seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.questionCategories]: demo.questionCategories.map((item) => ({
      id: item._id,
      data: { ...item, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.guideSessions]: demo.guideSessions.map((item) => ({
      id: item.session_id,
      data: { ...item, _id: item.session_id, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.learningPaths]: demo.learningPaths.map((item) => ({
      id: item.path_id,
      data: { ...item, _id: item.path_id, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.parentReports]: demo.parentReports.map((item) => ({
      id: item.report_id,
      data: { ...item, _id: item.report_id, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.books]: demo.books.map((item) => ({
      id: item.book_id,
      data: { ...item, _id: item.book_id, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.graphNodes]: demo.graphNodes.map((item) => ({
      id: item.node_id,
      data: { ...item, _id: item.node_id, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.graphEdges]: demo.graphEdges.map((item) => ({
      id: item._id,
      data: { ...item, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.bots]: demo.bots.map((item) => ({
      id: item.bot_id,
      data: { ...item, _id: item.bot_id, seed_version: seedVersion, updated_at: stamp },
    })),
    [collections.settings]: [{
      id: "mobile_backend_runtime",
      data: {
        ...demo.settings[0],
        _id: "mobile_backend_runtime",
        seed_version: seedVersion,
        seeded_at: stamp,
        updated_at: stamp,
      },
    }],
  };

  const writes = [];
  for (const [collection, docs] of Object.entries(seedMap)) {
    for (const item of docs) {
      writes.push({ collection, ...(await upsertDoc(collection, item.id, item.data)) });
    }
  }

  const analytics = await loadAnalyticsData();
  return ok({
    seed_version: seedVersion,
    env_id: TARGET_ENV_ID,
    collections: collectionResults,
    written: writes.length,
    documents: writes,
    analytics_preview: {
      mastery: analytics.masteryProfile,
      weak_points: analytics.weakPoints,
      recommendation: analytics.recommendations,
      question_stats: analytics.questionStats,
    },
    next_steps: [
      "部署 apiProxy 云函数",
      "调用 /api/v1/mobile/setup/seed 写入测试数据",
      "打开小程序资料、学习、周报、我的页面验证数据库优先读取",
    ],
  });
}

async function masteryEndpoint() {
  const analytics = await loadAnalyticsData();
  return ok(analytics.masteryProfile, {
    source: analytics.questions === demo.questionEntries ? "fallback" : "database",
    algorithm: "deterministic-js-v1",
  });
}

async function weakPointsEndpoint() {
  const analytics = await loadAnalyticsData();
  return ok({ weak_points: analytics.weakPoints }, { algorithm: "deterministic-js-v1" });
}

async function recommendationsEndpoint() {
  const analytics = await loadAnalyticsData();
  return ok({ recommendation: analytics.recommendations }, { algorithm: "deterministic-js-v1" });
}

async function questionStatsEndpoint() {
  const analytics = await loadAnalyticsData();
  return ok(analytics.questionStats, { algorithm: "deterministic-js-v1" });
}

async function settingsPing(data = {}) {
  return ok({
    pong: true,
    cloud_env_id: TARGET_ENV_ID,
    function_name: "apiProxy",
    model: data.modelName || data.model || "cloudbase-adapter",
    received_config: {
      has_api_base_url: !!data.apiBaseUrl,
      has_token_placeholder: !!data.hasToken,
      use_cloud_functions: data.useCloudFunctions !== false,
      enable_rag: data.enableRag !== false,
      enable_web_search: !!data.enableWebSearch,
      enable_math_animation: data.enableMathAnimation !== false,
    },
    runtime_note: "测试期只回显非敏感配置状态，不保存真实 API Key 或 Token。",
    checked_at: now(),
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
    if (pathname === "/api/v1/mobile/setup/seed" && method === "POST") return seedMobileBackend(data);
    if (pathname === "/api/v1/mobile/analytics/mastery" && method === "GET") return masteryEndpoint();
    if (pathname === "/api/v1/mobile/analytics/weak-points" && method === "GET") return weakPointsEndpoint();
    if (pathname === "/api/v1/mobile/analytics/recommendations" && method === "GET") return recommendationsEndpoint();
    if (pathname === "/api/v1/mobile/analytics/question-stats" && method === "GET") return questionStatsEndpoint();
    if (pathname === "/api/v1/mobile/books" && method === "GET") return booksEndpoint();
    if (pathname === "/api/v1/mobile/graph/summary" && method === "GET") return graphEndpoint();
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
    if (pathname === "/api/v1/mobile/settings/ping") return settingsPing(data);
    if (pathname === "/api/v1/mobile/settings/config" && method === "POST") return settingsPing(data);
    return ok({
      message: `接口 ${method} ${pathname} 暂未接入真实服务，当前返回 CloudBase 演示响应。`,
      path: pathname,
      method,
      items: [],
    });
  } catch (error) {
    return ok({
      message: "云函数运行时已启用演示降级，页面可以继续预览。",
      error: error.message || "云函数执行失败",
      path: pathname,
      method,
    });
  }
};
