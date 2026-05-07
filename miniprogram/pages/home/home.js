const app = getApp();
const {
  getParentReport,
  getGuideSessions,
  getKnowledgeBases,
  getLearningRecommendations,
  getMasteryAnalytics,
  getMobileOverview,
  getQuestionNotebookEntries,
  getQuestionStats,
  getWeakPointAnalytics,
  listNotebooks,
} = require("../../utils/api");

const FALLBACK_BOOKS = [
  {
    title: "七年级数学上册",
    meta: "教材 · 3 份资料",
    status: "已就绪",
  },
  {
    title: "课堂错题与讲义",
    meta: "复习资料 · 2 份资料",
    status: "整理中",
  },
];

const FALLBACK_GRAPH = {
  mastery: "72%",
  label: "基本掌握",
  weakCount: 1,
  updated: "今日更新",
  focus: "一次函数图像",
  nodes: [
    {
      title: "一次函数",
      masteryText: "72%",
      statusClass: "learning",
      statusLabel: "巩固中",
      evidenceText: "3 条 · 练习、课堂",
      nextAction: "完成今日路径",
    },
    {
      title: "斜率",
      masteryText: "52%",
      statusClass: "weak",
      statusLabel: "需复盘",
      evidenceText: "2 条 · 错题、测验",
      nextAction: "先做 2 道同类题",
    },
    {
      title: "图像",
      masteryText: "78%",
      statusClass: "learning",
      statusLabel: "巩固中",
      evidenceText: "4 条 · 练习、笔记",
      nextAction: "补一道图像题",
    },
    {
      title: "同类题",
      masteryText: "64%",
      statusClass: "weak",
      statusLabel: "需复盘",
      evidenceText: "2 条 · 错题本",
      nextAction: "复盘最近错题",
    },
  ],
};

const FALLBACK_TODAY = {
  title: "20 分钟学习路径",
  meta: "一次函数图像与性质",
  tasks: ["回顾变量关系", "完成 3 道检测题", "复盘斜率含义"],
};

const FALLBACK_REVIEW = {
  count: 1,
  accuracy: "50%",
  focus: "同类题复盘",
};

const FALLBACK_WEEKLY_REPORT = {
  period: "本周",
  sessions: "8 次",
  mastery: "72%",
  weakCount: 2,
  focus: "一次函数图像斜率",
  nextAction: "用 2 道图像题复盘斜率含义",
  shareSummary: "本周学习稳定，重点关注一次函数图像和几何证明理由。",
};

function formatPercent(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return `${Math.round(numeric > 1 ? numeric : numeric * 100)}%`;
}

function firstText(values, fallback) {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim());
  return found === undefined ? fallback : String(found).trim();
}

function normalizeBook(item) {
  const statistics = item.statistics || item.stats || {};
  const count = statistics.document_count || statistics.documents || statistics.file_count || item.record_count || 0;
  return {
    title: firstText([item.title, item.name, item.kb_name], "未命名书籍"),
    meta: count ? `${count} 份资料` : firstText([item.description, item.type_label, item.type], "学习资料"),
    status: firstText([item.status_label, item.status], "已就绪"),
  };
}

function normalizeReportNode(item) {
  if (typeof item === "string") return item.split(/[：:]/)[0] || item;
  return firstText([item.title, item.topic, item.name, item.knowledge_point], FALLBACK_WEEKLY_REPORT.focus);
}

function normalizeAction(item) {
  if (typeof item === "string") return item;
  return firstText([item.next_action, item.title, item.detail, item.name], FALLBACK_WEEKLY_REPORT.nextAction);
}

function formatSessionCount(value) {
  if (Number.isFinite(Number(value))) return `${Number(value)} 次`;
  return firstText([value], FALLBACK_WEEKLY_REPORT.sessions);
}

function normalizeStatusLabel(statusClass) {
  if (statusClass === "weak") return "需复盘";
  if (statusClass === "strong") return "已掌握";
  return "巩固中";
}

function normalizeEvidence(item, fallback) {
  const sources = item.evidence_sources || item.sources || item.source_labels || item.source;
  const sourceText = Array.isArray(sources) ? sources.filter(Boolean).slice(0, 2).join("、") : sources;
  const count = item.evidence_count ?? item.source_count ?? item.record_count ?? item.question_count;
  const countText = Number.isFinite(Number(count)) ? `${Number(count)} 条` : "";
  const detail = firstText([sourceText, item.evidence_label, item.source_label], "");
  if (countText && detail) return `${countText} · ${detail}`;
  return firstText([countText, detail], fallback);
}

function normalizeNextAction(item, statusClass, title) {
  return firstText(
    [item.next_action, item.suggestion, item.review_action, item.action],
    statusClass === "weak" ? `复盘「${title}」错题` : `继续练习「${title}」`,
  );
}

function normalizeGraphNode(item, index) {
  const masteryPercent = Number(item.mastery_percent ?? (Number(item.mastery) <= 1 ? Number(item.mastery) * 100 : item.mastery));
  const mastery = Number.isFinite(masteryPercent) ? Math.round(masteryPercent) : Number.parseInt(FALLBACK_GRAPH.mastery, 10);
  const status = item.status || (mastery < 70 ? "weak" : mastery >= 82 ? "strong" : "learning");
  const statusClass = status === "weak" ? "weak" : status === "strong" || mastery >= 82 ? "strong" : "learning";
  const fallbackNode = FALLBACK_GRAPH.nodes[index % FALLBACK_GRAPH.nodes.length];
  const title = firstText([item.title, item.topic, item.name, item.knowledge_point], fallbackNode.title);
  return {
    title,
    masteryText: formatPercent(mastery, fallbackNode.masteryText),
    statusClass,
    statusLabel: firstText([item.status_label], normalizeStatusLabel(statusClass)),
    evidenceText: normalizeEvidence(item, fallbackNode.evidenceText),
    nextAction: normalizeNextAction(item, statusClass, title),
  };
}

Page({
  data: {
    loading: false,
    stats: {
      books: "--",
      mastery: "--",
      wrong: "--",
    },
    books: FALLBACK_BOOKS,
    graph: FALLBACK_GRAPH,
    selectedGraphNode: null,
    today: FALLBACK_TODAY,
    review: FALLBACK_REVIEW,
    weeklyReport: FALLBACK_WEEKLY_REPORT,
    notesLabel: "0 本笔记",
  },

  onShow() {
    this.loadLearningHome();
  },

  async loadLearningHome() {
    this.setData({ loading: true });
    const activeKnowledgeBase = app.globalData.activeKnowledgeBase || "";
    try {
      const [
        overview,
        knowledgeBases,
        notebooks,
        mastery,
        weakPoints,
        recommendations,
        questionStats,
        wrongEntries,
        guideSessions,
        weeklyReportData,
      ] = await Promise.all([
        getMobileOverview(activeKnowledgeBase),
        getKnowledgeBases(),
        listNotebooks(),
        getMasteryAnalytics(),
        getWeakPointAnalytics(),
        getLearningRecommendations(),
        getQuestionStats(),
        getQuestionNotebookEntries({ is_correct: false }),
        getGuideSessions(),
        getParentReport(),
      ]);

      const overviewStats = overview.stats || {};
      const books = this.buildBooks(overview, knowledgeBases);
      const graph = this.buildGraph({ ...overviewStats, graph: overview.graph || {} }, mastery, weakPoints);
      const today = this.buildToday(recommendations, guideSessions, overview);
      const review = this.buildReview(questionStats, wrongEntries);
      const weeklyReport = this.buildWeeklyReport(weeklyReportData);
      const noteCount = (notebooks.notebooks || notebooks.items || []).length;

      this.setData({
        loading: false,
        stats: {
          books: books.length || overviewStats.materials || "--",
          mastery: graph.mastery,
          wrong: review.count,
        },
        books,
        graph,
        selectedGraphNode: null,
        today,
        review,
        weeklyReport,
        notesLabel: `${noteCount} 本笔记`,
      });
    } catch (error) {
      this.setData({ loading: false });
    }
  },

  buildBooks(overview, knowledgeBases) {
    const fromOverview = Array.isArray(overview.books)
      ? overview.books
      : Array.isArray(overview.knowledge_bases)
        ? overview.knowledge_bases
        : [];
    const fromApi = Array.isArray(knowledgeBases) ? knowledgeBases : knowledgeBases.items || [];
    const merged = fromOverview.length ? fromOverview : fromApi;
    const books = merged.map((item) => normalizeBook(item)).slice(0, 3);
    return books.length ? books : FALLBACK_BOOKS;
  },

  buildGraph(stats, mastery, weakPoints) {
    const graph = stats.graph || {};
    const weakList = graph.weak_nodes || weakPoints.weak_points || weakPoints.items || stats.weak_points || [];
    const weakCount = Array.isArray(weakList) ? weakList.length : Number(weakList) || 0;
    const firstWeak = Array.isArray(weakList) ? weakList[0] || {} : {};
    const rawNodes = Array.isArray(graph.updated_nodes) && graph.updated_nodes.length
      ? graph.updated_nodes
      : Array.isArray(graph.nodes) && graph.nodes.length
        ? graph.nodes
        : [];
    const nodes = rawNodes.length
      ? rawNodes.map((item, index) => normalizeGraphNode(item, index)).slice(0, 4)
      : FALLBACK_GRAPH.nodes;
    return {
      mastery: formatPercent(graph.mastery_percent ?? mastery.mastery ?? stats.mastery, FALLBACK_GRAPH.mastery),
      label: firstText([mastery.label, mastery.status_label], FALLBACK_GRAPH.label),
      weakCount,
      updated: firstText([mastery.updated_label, mastery.confidence, graph.node_count ? `${graph.node_count} 个节点` : ""], FALLBACK_GRAPH.updated),
      focus: firstText([firstWeak.topic, firstWeak.name, firstWeak.title], FALLBACK_GRAPH.focus),
      nodes,
    };
  },

  buildToday(recommendations, guideSessions, overview) {
    const recommendation = recommendations.recommendation || recommendations;
    const sessions = guideSessions.sessions || guideSessions.items || [];
    const latest = sessions[0] || {};
    const tasks = recommendation.tasks || latest.tasks || FALLBACK_TODAY.tasks;
    return {
      title: firstText([recommendation.title, latest.title, overview.recommendation && overview.recommendation.title], FALLBACK_TODAY.title),
      meta: firstText([recommendation.target_topic, latest.topic, latest.knowledge_base], FALLBACK_TODAY.meta),
      tasks: tasks.map((task) => (typeof task === "string" ? task : task.title || task.name)).filter(Boolean).slice(0, 3),
    };
  },

  buildReview(questionStats, wrongEntries) {
    const wrongItems = wrongEntries.items || [];
    const byTopic = questionStats.by_topic || [];
    const firstTopic = byTopic[0] || wrongItems[0] || {};
    return {
      count: questionStats.wrong ?? wrongItems.length ?? FALLBACK_REVIEW.count,
      accuracy: formatPercent(questionStats.accuracy, FALLBACK_REVIEW.accuracy),
      focus: firstText([firstTopic.topic, firstTopic.knowledge_point, firstTopic.category_name, firstTopic.question], FALLBACK_REVIEW.focus),
    };
  },

  buildWeeklyReport(report) {
    const summary = report.summary || {};
    const graph = summary.graph || {};
    const mastery = summary.mastery || summary.mastery_profile || {};
    const weakNodes = Array.isArray(graph.weak_nodes) && graph.weak_nodes.length
      ? graph.weak_nodes
      : summary.weak_points || [];
    const nextItems = summary.next_week || summary.review_items || [];
    const focus = weakNodes.length ? normalizeReportNode(weakNodes[0]) : FALLBACK_WEEKLY_REPORT.focus;
    const nextAction = nextItems.length ? normalizeAction(nextItems[0]) : FALLBACK_WEEKLY_REPORT.nextAction;

    return {
      period: firstText([summary.period_label, report.period_label], FALLBACK_WEEKLY_REPORT.period),
      sessions: formatSessionCount(summary.learning_sessions),
      mastery: formatPercent(summary.mastery_percent ?? mastery.mastery_percent ?? mastery.mastery, FALLBACK_WEEKLY_REPORT.mastery),
      weakCount: Array.isArray(weakNodes) ? weakNodes.length : Number(weakNodes) || FALLBACK_WEEKLY_REPORT.weakCount,
      focus,
      nextAction,
      shareSummary: firstText([summary.share_summary], `重点关注「${focus}」，下一步：${nextAction}`),
    };
  },

  goKnowledge() {
    wx.switchTab({ url: "/pages/knowledge/knowledge" });
  },

  openGraphNode(event) {
    const index = Number(event.currentTarget.dataset.index);
    const node = this.data.graph.nodes[index];
    if (!node) return;
    this.setData({ selectedGraphNode: node });
  },

  closeGraphNode() {
    this.setData({ selectedGraphNode: null });
  },

  goGraphAction() {
    const node = this.data.selectedGraphNode;
    if (!node) return;
    app.setPendingChatPreset({
      capability: "deep_question",
      tools: ["rag", "reason"],
      prompt: `请围绕「${node.title}」安排一次短复习。下一步：${node.nextAction}`,
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  goGuide() {
    app.setPendingChatPreset({
      capability: "deep_question",
      tools: ["rag", "reason"],
      prompt: `请围绕「${this.data.today.meta}」继续今天的学习路径。`,
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },

});
