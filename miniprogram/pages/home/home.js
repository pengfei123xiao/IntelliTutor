const app = getApp();
const { getMobileOverview, getTutorBots } = require("../../utils/api");

const CAPABILITY_CARDS = [
  {
    title: "AI 带读",
    icon: "问",
    tone: "coral",
    desc: "像网页端聊天一样，直接问、继续追问、保存笔记。",
    preset: { capability: "", tools: [], prompt: "" },
  },
  {
    title: "深度解题",
    icon: "解",
    tone: "dark",
    desc: "分步推导、易错点、同类题迁移。",
    preset: { capability: "deep_solve", tools: ["reason"], prompt: "请分步骤讲解这道题：" },
  },
  {
    title: "出题测评",
    icon: "测",
    tone: "amber",
    desc: "基于资料生成检测题，适合课堂即时反馈。",
    preset: { capability: "deep_question", tools: ["rag"], prompt: "请根据当前资料生成 3 道检测题。" },
  },
  {
    title: "深度研究",
    icon: "研",
    tone: "teal",
    desc: "把主题拆成提纲、证据、概念和阅读路径。",
    preset: { capability: "deep_research", tools: ["web_search", "reason"], prompt: "请帮我研究这个主题：" },
  },
  {
    title: "数学动画",
    icon: "动",
    tone: "coral",
    desc: "把抽象步骤转成可视化讲解脚本。",
    preset: { capability: "math_animator", tools: ["reason"], prompt: "请把这个数学概念做成动画讲解：" },
  },
  {
    title: "图表可视化",
    icon: "图",
    tone: "dark",
    desc: "流程图、对比表、知识结构图。",
    preset: { capability: "visualize", tools: ["rag"], prompt: "请把下面内容整理成图表：" },
  },
];

Page({
  data: {
    activeKnowledgeBase: "",
    stats: {
      materials: "--",
      sessions: "--",
      mastery: "--",
    },
    capabilities: CAPABILITY_CARDS,
    bots: [],
  },

  onShow() {
    this.setData({
      activeKnowledgeBase: app.globalData.activeKnowledgeBase,
    });
    this.loadOverview();
    this.loadBots();
  },

  async loadOverview() {
    try {
      const overview = await getMobileOverview(app.globalData.activeKnowledgeBase);
      const stats = overview.stats || {};

      this.setData({
        activeKnowledgeBase: overview.active_knowledge_base || app.globalData.activeKnowledgeBase,
        stats: {
          materials: stats.materials ?? "--",
          sessions: stats.sessions ?? "--",
          mastery: stats.mastery ? `${Math.round(stats.mastery * 100)}%` : "--",
        },
      });
    } catch (error) {
      this.setData({
        stats: {
          materials: "--",
          sessions: "--",
          mastery: "--",
        },
      });
    }
  },

  async loadBots() {
    try {
      const bots = await getTutorBots();
      this.setData({ bots: Array.isArray(bots) ? bots.slice(0, 2) : [] });
    } catch (error) {
      this.setData({ bots: [] });
    }
  },

  goKnowledge() {
    wx.switchTab({ url: "/pages/knowledge/knowledge" });
  },

  goChat() {
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  goChatMode(event) {
    const index = Number(event.currentTarget.dataset.index);
    const item = this.data.capabilities[index];
    if (item && item.preset) app.setPendingChatPreset(item.preset);
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  goGuide() {
    wx.navigateTo({ url: "/pages/guide/guide" });
  },

  goParent() {
    wx.switchTab({ url: "/pages/parent/parent" });
  },
});
