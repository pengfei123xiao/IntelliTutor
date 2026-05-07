const app = getApp();
const {
  getSettings,
  mobileLogin,
  getProfileSettings,
  saveProfileSettings,
  resetProfileSettings,
  getProfileApiToken,
  saveProfileApiToken,
  maskToken,
  testBackendConnection,
  clearProfileCache,
} = require("../../utils/api");
const { showError } = require("../../utils/format");

const DEFAULT_CLOUD_ENV = "cloud1-d0gxrvlbc5c9f8145";

function normalizeSettings(settings) {
  const apiMode = settings.api_mode || "cloud-function";
  const databasePolicy = settings.database_policy || "test-open";
  return {
    cloud_env_id: settings.cloud_env_id || DEFAULT_CLOUD_ENV,
    api_mode: apiMode,
    api_mode_label: modeText(apiMode),
    database_policy: databasePolicy,
    database_policy_label: policyText(databasePolicy),
    model: settings.model || "cloudbase-adapter",
    function_name: settings.function_name || "apiProxy",
    runtime_note: settings.runtime_note || "测试期支持演示数据降级，真实后端部署后可在这里验证。",
  };
}

function modeText(value) {
  return value === "cloud-function" ? "云函数转发" : "直连后端";
}

function policyText(value) {
  if (value === "test-open") return "测试期演示数据优先";
  if (value === "production") return "正式后端与权限策略";
  return value || "测试期演示数据优先";
}

Page({
  data: {
    user: null,
    avatarText: "I",
    loggingIn: false,
    loadingSettings: true,
    testing: false,
    settings: normalizeSettings({}),
    localSettings: getProfileSettings(),
    tokenInput: "",
    tokenMasked: "未设置",
    features: ["聊天", "新对话", "历史记录", "学习工具", "资料问答", "参考资料", "知识库", "学习路径", "家长周报"],
    connection: {
      status: "idle",
      label: "尚未测试",
      detail: "点击下方按钮，检查 CloudBase 或后端服务是否可访问。",
      latency: "",
    },
  },

  onShow() {
    this.refreshUser();
    this.loadLocalSettings();
    this.loadSettings();
  },

  refreshUser() {
    const user = app.globalData.user;
    this.setData({
      user,
      avatarText: user && user.nickname ? user.nickname.slice(0, 1) : "I",
    });
  },

  loadLocalSettings() {
    const localSettings = getProfileSettings();
    const token = getProfileApiToken();
    this.setData({
      localSettings,
      tokenMasked: maskToken(token),
      tokenInput: "",
    });
  },

  async loadSettings() {
    this.setData({ loadingSettings: true });
    try {
      const settings = await getSettings();
      this.setData({
        settings: normalizeSettings(settings),
        features: settings.features || this.data.features,
      });
    } catch (error) {
      this.setData({ settings: normalizeSettings({}) });
    } finally {
      this.setData({ loadingSettings: false });
    }
  },

  onSettingInput(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    this.setData({
      [`localSettings.${field}`]: value,
    });
  },

  onTokenInput(event) {
    this.setData({ tokenInput: event.detail.value });
  },

  onSettingSwitch(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`localSettings.${field}`]: !!event.detail.value,
    });
  },

  saveSettings() {
    const localSettings = saveProfileSettings(this.data.localSettings);
    if (this.data.tokenInput) {
      saveProfileApiToken(this.data.tokenInput);
    }
    this.setData({
      localSettings,
      tokenMasked: maskToken(getProfileApiToken()),
      tokenInput: "",
    });
    wx.showToast({ title: "设置已保存", icon: "success" });
  },

  async testConnection() {
    this.saveSettings();
    this.setData({
      testing: true,
      connection: {
        status: "testing",
        label: "正在测试",
        detail: "正在访问移动端设置接口，请稍候。",
        latency: "",
      },
    });
    try {
      const result = await testBackendConnection();
      wx.setStorageSync("lastBackendTest", {
        ok: true,
        latency: result.latency,
        tested_at: Date.now(),
      });
      this.setData({
        connection: {
          status: "success",
          label: "连接成功",
          detail: "已获取移动端设置，当前配置可以继续预览。",
          latency: `${result.latency} ms`,
        },
        settings: normalizeSettings(result.settings || {}),
      });
    } catch (error) {
      this.setData({
        connection: {
          status: "error",
          label: "连接失败",
          detail: error.message || "后端暂不可达，请检查 API 地址、云函数部署或本地服务。",
          latency: "",
        },
      });
    } finally {
      this.setData({ testing: false });
    }
  },

  resetSettings() {
    wx.showModal({
      title: "重置测试配置",
      content: "会恢复默认 API 地址、模型和功能开关，并清除本地测试 Token。",
      confirmText: "重置",
      success: (res) => {
        if (!res.confirm) return;
        const localSettings = resetProfileSettings();
        this.setData({
          localSettings,
          tokenInput: "",
          tokenMasked: "未设置",
        });
        wx.showToast({ title: "已重置", icon: "success" });
      },
    });
  },

  clearCache() {
    clearProfileCache();
    wx.showToast({ title: "缓存已清理", icon: "success" });
  },

  resetDemoData() {
    wx.showModal({
      title: "重置演示数据",
      content: "测试期会清理本地选择和草稿，云端演示数据会在下次打开页面时重新生成。",
      confirmText: "重置",
      success: (res) => {
        if (!res.confirm) return;
        clearProfileCache();
        this.loadSettings();
        wx.showToast({ title: "演示状态已重置", icon: "success" });
      },
    });
  },

  async login() {
    this.setData({ loggingIn: true });
    try {
      const loginRes = await wx.login();
      const result = await mobileLogin({ code: loginRes.code });
      wx.setStorageSync("authToken", result.token);
      app.globalData.user = result.user;
      this.refreshUser();
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
