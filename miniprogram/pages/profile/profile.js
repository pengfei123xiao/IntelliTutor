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
const DEVELOPER_EMAIL = "734738695@qq.com";
const DEVELOPER_PHONE = "13138112934";

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
    runtime_note: settings.runtime_note || "测试期支持演示数据，正式服务接入后可在这里验证。",
  };
}

function modeText(value) {
  return value === "cloud-function" ? "在线服务" : "本地服务";
}

function policyText(value) {
  if (value === "test-open") return "测试期演示数据优先";
  if (value === "production") return "正式服务与权限策略";
  return value || "测试期演示数据优先";
}

Page({
  data: {
    user: null,
    avatarText: "I",
    loggingIn: false,
    loadingSettings: true,
    testing: false,
    developerSettingsOpen: false,
    privacyAccepted: !!wx.getStorageSync("privacyAccepted"),
    developer: {
      email: DEVELOPER_EMAIL,
      phone: DEVELOPER_PHONE,
    },
    settings: normalizeSettings({}),
    localSettings: getProfileSettings(),
    tokenInput: "",
    tokenMasked: "未设置",
    features: ["聊天", "新对话", "历史记录", "书架", "资料问答", "个人知识图谱", "学习路径", "学习周报"],
    connection: {
      status: "idle",
      label: "尚未测试",
      detail: "点击下方按钮，检查学习服务是否可用。",
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

  onPrivacyCheck(event) {
    const accepted = (event.detail.value || []).includes("accepted");
    wx.setStorageSync("privacyAccepted", accepted);
    this.setData({ privacyAccepted: accepted });
  },

  toggleDeveloperSettings() {
    this.setData({ developerSettingsOpen: !this.data.developerSettingsOpen });
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
        detail: "正在检查学习服务，请稍候。",
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
          detail: error.message || "学习服务暂不可用，请检查服务地址或稍后再试。",
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
      content: "会恢复默认服务地址、学习助手和功能开关，并清除本地访问口令。",
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
      content: "测试期会清理本地选择和草稿，演示数据会在下次打开页面时重新生成。",
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
    if (!this.data.privacyAccepted) {
      wx.showModal({
        title: "需要先确认隐私说明",
        content: "登录会使用微信登录凭证生成测试账号，并保存必要的学习会话状态。请先阅读并勾选隐私说明。",
        confirmText: "查看说明",
        success: (res) => {
          if (res.confirm) this.showPrivacy();
        },
      });
      return;
    }

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
    wx.switchTab({ url: "/pages/home/home" });
  },

  showPrivacy() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => this.showPrivacyFallback(),
      });
      return;
    }
    this.showPrivacyFallback();
  },

  showPrivacyFallback() {
    wx.showModal({
      title: "隐私说明",
      content: "测试期仅使用微信登录凭证、学习资料选择、聊天记录和本地服务配置来提供学习辅助。AI 生成内容仅供参考，不用于自动评价、排名或处分。你可以在“我的”页清理本地缓存或联系开发者处理反馈。",
      showCancel: false,
      confirmText: "知道了",
    });
  },

  copyEmail() {
    wx.setClipboardData({
      data: DEVELOPER_EMAIL,
      success: () => wx.showToast({ title: "邮箱已复制", icon: "success" }),
    });
  },

  callDeveloper() {
    wx.makePhoneCall({ phoneNumber: DEVELOPER_PHONE });
  },

  handleFeedback() {
    wx.showActionSheet({
      itemList: ["复制反馈邮箱", "拨打开发者电话", "复制反馈模板"],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.copyEmail();
          return;
        }
        if (res.tapIndex === 1) {
          this.callDeveloper();
          return;
        }
        wx.setClipboardData({
          data: `问题页面：\n操作步骤：\n期望结果：\n实际结果：\n联系方式：\n\n发送至 ${DEVELOPER_EMAIL}`,
          success: () => wx.showToast({ title: "模板已复制", icon: "success" }),
        });
      },
    });
  },
});
