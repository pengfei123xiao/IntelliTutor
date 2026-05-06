const { env } = require("./config/env");

App({
  globalData: {
    env,
    user: null,
    activeKnowledgeBase: "",
  },

  onLaunch() {
    if (env.useCloudFunctions && wx.cloud) {
      wx.cloud.init({
        env: env.cloudEnvId,
        traceUser: true,
      });
    }

    const activeKnowledgeBase = wx.getStorageSync("activeKnowledgeBase") || "";
    this.globalData.activeKnowledgeBase = activeKnowledgeBase;
  },

  setPendingChatPreset(preset) {
    this.globalData.pendingChatPreset = preset || null;
  },

  setActiveKnowledgeBase(name) {
    this.globalData.activeKnowledgeBase = name || "";
    wx.setStorageSync("activeKnowledgeBase", this.globalData.activeKnowledgeBase);
  },
});
