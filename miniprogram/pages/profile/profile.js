const app = getApp();
const { getSettings, mobileLogin } = require("../../utils/api");
const { showError } = require("../../utils/format");

Page({
  data: {
    user: null,
    avatarText: "I",
    loggingIn: false,
    settings: {
      cloud_env_id: "cloud1-d0gxrvlbc5c9f8145",
      api_mode: "云函数转发",
      database_policy: "演示数据优先，真实后端可接入",
    },
    features: ["聊天", "新对话", "历史记录", "学习工具", "资料问答", "参考资料", "知识库", "学习路径", "家长周报"],
  },

  onShow() {
    const user = app.globalData.user;
    this.setData({
      user,
      avatarText: user && user.nickname ? user.nickname.slice(0, 1) : "I",
    });
    this.loadSettings();
  },

  async loadSettings() {
    try {
      const settings = await getSettings();
      this.setData({
        settings: {
          cloud_env_id: settings.cloud_env_id || "cloud1-d0gxrvlbc5c9f8145",
          api_mode: settings.api_mode || "云函数转发",
          database_policy: settings.database_policy || "演示数据优先，真实后端可接入",
        },
        features: settings.features || this.data.features,
      });
    } catch (error) {
      this.setData({
        settings: {
          cloud_env_id: "cloud1-d0gxrvlbc5c9f8145",
          api_mode: "云函数转发",
          database_policy: "演示数据优先，真实后端可接入",
        },
      });
    }
  },

  async login() {
    this.setData({ loggingIn: true });
    try {
      const loginRes = await wx.login();
      const result = await mobileLogin({ code: loginRes.code });
      wx.setStorageSync("authToken", result.token);
      app.globalData.user = result.user;
      this.setData({
        user: result.user,
        avatarText: result.user && result.user.nickname ? result.user.nickname.slice(0, 1) : "I",
      });
      wx.showToast({ title: "登录成功", icon: "success" });
    } catch (error) {
      showError(error, "登录失败");
    } finally {
      this.setData({ loggingIn: false });
    }
  },

  goKnowledge() {
    wx.switchTab({ url: "/pages/knowledge/knowledge" });
  },

  goParent() {
    wx.switchTab({ url: "/pages/parent/parent" });
  },
});
