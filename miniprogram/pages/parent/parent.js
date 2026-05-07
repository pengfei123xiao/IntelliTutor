const app = getApp();
const { getParentReport } = require("../../utils/api");
const { showError } = require("../../utils/format");

Page({
  data: {
    loading: false,
    summary: {
      learning_sessions: "--",
      weak_points: [],
      review_items: [],
    },
    discussionPrompt: "用自己的话复述本周最关键的一个概念，再说明它和上一个知识点的关系。",
    report: buildReport({}, [], ""),
    recentSessions: [],
  },

  onShow() {
    this.loadReport();
  },

  async loadReport() {
    this.setData({ loading: true });
    try {
      const report = await getParentReport();
      const summary = normalizeSummary(report.summary, this.data.summary);
      const recentSessions = (report.recent_sessions || []).map((item) => ({
        ...item,
        interactionCount: item.message_count || (Array.isArray(item.messages) ? item.messages.length : 0),
      }));
      const discussionPrompt = report.discussion_prompt || this.data.discussionPrompt;
      this.setData({
        loading: false,
        summary,
        discussionPrompt,
        report: buildReport(summary, recentSessions, discussionPrompt),
        recentSessions,
      });
    } catch (error) {
      this.setData({ loading: false });
      showError(error, "学习周报加载失败");
    }
  },

  copyShareSummary() {
    wx.setClipboardData({
      data: this.data.report.shareSummary,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  goChat() {
    app.setPendingChatPreset({
      capability: "",
      tools: ["rag"],
      prompt: "请根据最近学习记录生成一份学习周报摘要：",
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  askAboutItem(event) {
    const text = event.currentTarget.dataset.text || "最近学习情况";
    app.setPendingChatPreset({
      capability: "",
      tools: ["rag", "reason"],
      prompt: `请把这项内容转成可执行的复盘建议：${text}`,
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  openSession(event) {
    const title = event.currentTarget.dataset.title || "最近学习";
    app.setPendingChatPreset({
      capability: "",
      tools: ["rag"],
      prompt: `请总结「${title}」这次学习的关键收获和下一步建议。`,
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },
});

function buildReport(summary = {}, recentSessions = [], discussionPrompt = "") {
  const weakPoints = Array.isArray(summary.weak_points) ? summary.weak_points : [];
  const reviewItems = Array.isArray(summary.review_items) ? summary.review_items : [];
  const graph = summary.graph || {};
  const mastery = normalizeMastery(summary);
  const sessions = normalizeSessions(summary.learning_sessions);
  const weakNodes = (Array.isArray(graph.weak_nodes) && graph.weak_nodes.length
    ? graph.weak_nodes.map((item) => ({
      title: item.title || item.topic || "待复盘知识点",
      detail: item.next_action || item.detail || `掌握度 ${item.mastery_percent || "--"}%`,
    }))
    : weakPoints.slice(0, 3).map((item) => splitNodeText(item))).slice(0, 3);
  const nextWeek = Array.isArray(summary.next_week) ? summary.next_week : [];
  const nextSuggestions = nextWeek.length
    ? nextWeek.map((item) => (typeof item === "string" ? item : `${item.title}${item.minutes ? `（${item.minutes} 分钟）` : ""}`)).slice(0, 3)
    : reviewItems.length
      ? reviewItems.slice(0, 3)
    : [discussionPrompt || "复盘本周最卡住的概念，再完成一次短测。"];
  const graphTopic = weakNodes[0] ? weakNodes[0].title : (recentSessions[0] && recentSessions[0].title) || "核心知识点";
  const shareSummary = summary.share_summary || `本周完成 ${sessions.text}，掌握度${mastery.text}。重点关注「${graphTopic}」，下周建议：${nextSuggestions[0]}`;

  return {
    mastery,
    weakNodes,
    graphUpdates: [
      {
        label: "记录入图",
        value: `${graph.node_count || recentSessions.length || sessions.count} 个`,
        detail: "学习记录已用于更新节点状态。",
      },
      {
        label: "重点变化",
        value: graphTopic,
        detail: mastery.percent === "--" ? "等待更多测评后刷新掌握度。" : `当前掌握度 ${mastery.text}。`,
      },
    ],
    nextSuggestions,
    shareSummary,
  };
}

function normalizeSummary(summary = {}, fallback = {}) {
  const source = summary || {};
  const base = fallback || {};
  return {
    ...base,
    ...source,
    learning_sessions: source.learning_sessions ?? base.learning_sessions ?? "--",
    weak_points: Array.isArray(source.weak_points) ? source.weak_points : [],
    review_items: Array.isArray(source.review_items) ? source.review_items : [],
    graph: source.graph || base.graph || {},
    next_week: source.next_week || base.next_week || [],
    share_summary: source.share_summary || base.share_summary || "",
  };
}

function normalizeMastery(summary) {
  const profile = summary.mastery || summary.mastery_profile || {};
  const raw = pickNumber(summary.mastery_percent, profile.mastery_percent, profile.mastery);
  const percent = raw === null ? "--" : Math.round(raw <= 1 ? raw * 100 : raw);
  return {
    percent,
    text: percent === "--" ? "待更新" : `${percent}%`,
    label: profile.label || summary.mastery_label || "本周掌握度",
    confidence: profile.confidence || summary.confidence || "根据学习记录估算",
  };
}

function normalizeSessions(value) {
  const count = Number.isFinite(Number(value)) ? Number(value) : 0;
  return {
    count,
    text: count > 0 ? `${count} 次学习` : "学习记录待同步",
  };
}

function pickNumber(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)));
  return value === undefined ? null : Number(value);
}

function splitNodeText(value) {
  const text = String(value || "待复盘知识点");
  const parts = text.split(/[：:]/);
  return {
    title: parts[0] || text,
    detail: parts.slice(1).join("：") || "需要结合练习记录继续观察。",
  };
}
