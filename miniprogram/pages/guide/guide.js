const app = getApp();
const { createGuideSession, createTodayGuide, getGuideSessions } = require("../../utils/api");
const { showError } = require("../../utils/format");

Page({
  data: {
    loading: false,
    creating: false,
    topic: "",
    minutes: 20,
    sessions: [],
    templates: [
      "帮我把这一章拆成 20 分钟学习路径",
      "根据当前资料定位薄弱知识点并安排复习",
      "为明天课堂生成预习、讲解和检测顺序",
    ],
  },

  onShow() {
    this.loadSessions();
  },

  onTopicInput(event) {
    this.setData({ topic: event.detail.value });
  },

  useTemplate(event) {
    this.setData({ topic: event.currentTarget.dataset.text });
  },

  async loadSessions() {
    this.setData({ loading: true });
    try {
      const result = await getGuideSessions();
      const rawSessions = Array.isArray(result) ? result : result.sessions || result.items || [];
      const sessions = rawSessions.map((item) => ({
        ...item,
        tasks: Array.isArray(item.tasks) ? item.tasks : [],
      }));
      this.setData({ sessions, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      showError(error, "学习路径加载失败");
    }
  },

  async startGuide() {
    const kbName = app.globalData.activeKnowledgeBase;
    if (!kbName) {
      wx.showToast({ title: "请先选择学习资料", icon: "none" });
      return;
    }

    const topic = this.data.topic.trim() || "完成今日学习并定位薄弱知识点";
    this.setData({ creating: true });
    try {
      await createTodayGuide({
        knowledge_base: kbName,
        learning_goal: topic,
        minutes: this.data.minutes,
      });
      await createGuideSession({
        topic,
        knowledge_base: kbName,
      });
      wx.showToast({ title: "已创建", icon: "success" });
      this.setData({ topic: "" });
      await this.loadSessions();
    } catch (error) {
      showError(error, "创建学习路径失败");
    } finally {
      this.setData({ creating: false });
    }
  },

  continueInChat(event) {
    const topic = event.currentTarget.dataset.topic || "请继续带我完成这个学习路径";
    app.setPendingChatPreset({
      capability: "",
      tools: ["rag", "reason"],
      prompt: `请按学习路径继续带读：${topic}`,
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },
});
