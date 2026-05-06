const app = getApp();
const { getParentReport } = require("../../utils/api");
const { showError } = require("../../utils/format");

Page({
  data: {
    summary: {
      learning_sessions: "--",
      weak_points: [],
      review_items: [],
    },
    discussionPrompt: "让孩子用自己的话解释今天学到的一个概念，再追问它和上一个知识点有什么关系。",
    recentSessions: [],
  },

  onShow() {
    this.loadReport();
  },

  async loadReport() {
    try {
      const report = await getParentReport();
      this.setData({
        summary: report.summary || this.data.summary,
        discussionPrompt: report.discussion_prompt || this.data.discussionPrompt,
        recentSessions: (report.recent_sessions || []).map((item) => ({
          ...item,
          interactionCount: item.message_count || (Array.isArray(item.messages) ? item.messages.length : 0),
        })),
      });
    } catch (error) {
      showError(error, "家长周报加载失败");
    }
  },

  copyPrompt() {
    wx.setClipboardData({
      data: this.data.discussionPrompt,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  goChat() {
    app.setPendingChatPreset({
      capability: "",
      tools: ["rag"],
      prompt: "请根据最近学习记录生成一份家长沟通话术：",
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },
});
