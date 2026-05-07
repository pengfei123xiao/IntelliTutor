const app = getApp();
const {
  getGuideSessions,
  getKnowledgeBases,
  getLearningRecommendations,
  getMasteryAnalytics,
  getMobileOverview,
  getQuestionNotebookEntries,
  getQuestionStats,
  getRecentSessions,
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

const FALLBACK_RECENT = [
  {
    title: "一次函数图像与性质",
    meta: "6 次互动 · 今天",
  },
  {
    title: "三角形全等复习",
    meta: "4 次互动 · 最近",
  },
];

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

function formatDateLabel(value) {
  if (!value) return "最近";
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  if (Number.isNaN(timestamp)) return "最近";
  const now = new Date();
  const date = new Date(timestamp);
  if (date.toDateString() === now.toDateString()) return "今天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
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

function normalizeRecent(item) {
  const count = item.message_count || item.interaction_count || (Array.isArray(item.messages) ? item.messages.length : 0);
  return {
    title: firstText([item.title, item.topic], "最近学习"),
    meta: `${count || "--"} 次互动 · ${formatDateLabel(item.updated_at || item.created_at)}`,
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
    today: FALLBACK_TODAY,
    review: FALLBACK_REVIEW,
    recentLearning: FALLBACK_RECENT,
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
        recentSessions,
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
        getRecentSessions(5),
      ]);

      const overviewStats = overview.stats || {};
      const books = this.buildBooks(overview, knowledgeBases);
      const graph = this.buildGraph({ ...overviewStats, graph: overview.graph || {} }, mastery, weakPoints);
      const today = this.buildToday(recommendations, guideSessions, overview);
      const review = this.buildReview(questionStats, wrongEntries);
      const recentLearning = this.buildRecent(overview, recentSessions, guideSessions);
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
        today,
        review,
        recentLearning,
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
    return {
      mastery: formatPercent(graph.mastery_percent ?? mastery.mastery ?? stats.mastery, FALLBACK_GRAPH.mastery),
      label: firstText([mastery.label, mastery.status_label], FALLBACK_GRAPH.label),
      weakCount,
      updated: firstText([mastery.updated_label, mastery.confidence, graph.node_count ? `${graph.node_count} 个节点` : ""], FALLBACK_GRAPH.updated),
      focus: firstText([firstWeak.topic, firstWeak.name, firstWeak.title], FALLBACK_GRAPH.focus),
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

  buildRecent(overview, recentSessions, guideSessions) {
    const sessions = overview.recent_sessions || recentSessions || [];
    const guideList = guideSessions.sessions || guideSessions.items || [];
    const combined = [...sessions, ...guideList].map((item) => normalizeRecent(item)).slice(0, 4);
    return combined.length ? combined : FALLBACK_RECENT;
  },

  goKnowledge() {
    wx.switchTab({ url: "/pages/knowledge/knowledge" });
  },

  goGuide() {
    wx.navigateTo({ url: "/pages/guide/guide" });
  },

  goReport() {
    wx.switchTab({ url: "/pages/parent/parent" });
  },
});
