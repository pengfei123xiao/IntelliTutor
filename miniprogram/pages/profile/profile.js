const app = getApp();
const { getSettings, mobileLogin } = require("../../utils/api");
const { showError } = require("../../utils/format");

Page({
  data: {
    user: null,
    avatarText: "I",
    loggingIn: false,
    settings: null,
    features: ["聊天", "资料库", "笔记", "错题本", "学习路径", "家长周报"],
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
        settings,
        features: settings.features || this.data.features,
      });
    } catch (error) {
      this.setData({ settings: null });
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
});
