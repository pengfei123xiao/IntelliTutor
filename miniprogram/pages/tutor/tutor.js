const app = getApp();
const {
  getAssistantCatalog,
  launchAssistant,
} = require("../../utils/api");

const TOOLS = [
  {
    assistantId: "assistant_math",
    title: "深度解题",
    meta: "拆步骤、找卡点、补一组同类题。",
    status: "题目",
    capability: "deep_solve",
    tools: ["reason"],
    prompt: "请带我深度拆解这道题，并在最后给一组同类练习：",
  },
  {
    assistantId: "assistant_writing",
    title: "智能写作",
    meta: "梳理提纲，润色表达，保留自己的观点。",
    status: "作文",
    capability: "co_writer",
    tools: ["reason"],
    prompt: "请帮我梳理这篇作文的提纲和修改方向：",
  },
  {
    assistantId: "assistant_visual",
    title: "数学动画",
    meta: "把抽象变化讲成可观察的过程。",
    status: "可视化",
    capability: "math_animator",
    tools: ["reason"],
    prompt: "请把这个数学概念讲成适合动画演示的步骤：",
  },
  {
    assistantId: "assistant_review",
    title: "资料精讲",
    meta: "围绕已选资料提问、追问和复盘。",
    status: "资料",
    capability: "",
    tools: ["rag"],
    prompt: "请根据我当前的学习资料，讲清楚这个知识点：",
  },
];

function normalizeAssistant(item = {}, fallback = {}) {
  const focus = Array.isArray(item.focus) ? item.focus.filter(Boolean).slice(0, 3) : [];
  return {
    assistantId: item.assistant_id || item.id || fallback.assistantId || "",
    title: item.name || item.short_name || fallback.title || "学习助教",
    meta: item.tone || focus.join("、") || fallback.meta || "先听问题，再推进。",
    status: item.status_label || fallback.status || "可用",
    capability: item.mode || item.capability || fallback.capability || "",
    tools: fallback.tools || (item.mode === "deep_question" ? ["reason"] : []),
    prompt: item.launch_prompt || fallback.prompt || "我想请助教帮我学习。",
  };
}

function normalizeCatalog(result) {
  const assistants = Array.isArray(result)
    ? result
    : Array.isArray(result.assistants)
      ? result.assistants
      : Array.isArray(result.items)
        ? result.items
        : [];
  if (!assistants.length) return TOOLS;
  return assistants.map((item, index) => normalizeAssistant(item, TOOLS[index] || TOOLS[0])).slice(0, 6);
}

Page({
  data: {
    focus: {
      title: "一次函数图像",
      time: "20 分钟",
      copy: "先讲清斜率和截距，再用两道题确认是不是掌握。",
    },
    loading: false,
    tools: TOOLS,
  },

  onShow() {
    this.loadAssistants();
  },

  async loadAssistants() {
    this.setData({ loading: true });
    try {
      const result = await getAssistantCatalog();
      this.setData({
        tools: normalizeCatalog(result),
        loading: false,
      });
    } catch (error) {
      this.setData({
        tools: TOOLS,
        loading: false,
      });
    }
  },

  startFocus() {
    this.openPreset({
      assistantId: "assistant_math",
      capability: "deep_solve",
      tools: ["reason"],
      prompt: "请带我学习一次函数图像，先讲清斜率和截距，再给两道检测题。",
    });
  },

  openTool(event) {
    const index = Number(event.currentTarget.dataset.index);
    const item = this.data.tools[index];
    if (!item) return;
    this.openAssistant(item);
  },

  startMission() {
    this.openPreset({
      assistantId: "assistant_review",
      capability: "deep_question",
      tools: ["rag", "reason"],
      prompt: "请根据我的资料和最近学习记录，生成一个 20 分钟学习任务。",
    });
  },

  async openAssistant(item) {
    const assistantId = item.assistantId || item.assistant_id;
    if (!assistantId) {
      this.openPreset(item);
      return;
    }

    wx.showLoading({ title: "准备中" });
    try {
      const result = await launchAssistant(assistantId, {
        capability: item.capability || "",
        content: item.prompt || "",
      });
      const preset = result.preset || {};
      this.openPreset({
        capability: preset.capability || item.capability || "",
        tools: item.tools || [],
        prompt: preset.content || preset.placeholder || item.prompt || "",
      });
    } catch (error) {
      this.openPreset(item);
    } finally {
      wx.hideLoading();
    }
  },

  openPreset(preset) {
    app.setPendingChatPreset({
      capability: preset.capability || "",
      tools: preset.tools || [],
      prompt: preset.prompt || "",
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },
});
