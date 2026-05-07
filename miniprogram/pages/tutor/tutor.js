const app = getApp();

const TOOLS = [
  {
    title: "深度解题",
    meta: "拆步骤、找卡点、补一组同类题。",
    status: "题目",
    capability: "deep_solve",
    tools: ["reason"],
    prompt: "请带我深度拆解这道题，并在最后给一组同类练习：",
  },
  {
    title: "智能写作",
    meta: "梳理提纲，润色表达，保留自己的观点。",
    status: "作文",
    capability: "writing",
    tools: ["reason"],
    prompt: "请帮我梳理这篇作文的提纲和修改方向：",
  },
  {
    title: "数学动画",
    meta: "把抽象变化讲成可观察的过程。",
    status: "可视化",
    capability: "math_animator",
    tools: ["reason"],
    prompt: "请把这个数学概念讲成适合动画演示的步骤：",
  },
  {
    title: "资料精讲",
    meta: "围绕已选资料提问、追问和复盘。",
    status: "资料",
    capability: "",
    tools: ["rag"],
    prompt: "请根据我当前的学习资料，讲清楚这个知识点：",
  },
];

Page({
  data: {
    focus: {
      title: "一次函数图像",
      time: "20 分钟",
      copy: "先讲清斜率和截距，再用两道题确认是不是掌握。",
    },
    tools: TOOLS,
  },

  startFocus() {
    this.openPreset({
      capability: "deep_solve",
      tools: ["reason"],
      prompt: "请带我学习一次函数图像，先讲清斜率和截距，再给两道检测题。",
    });
  },

  openTool(event) {
    const index = Number(event.currentTarget.dataset.index);
    const item = this.data.tools[index];
    if (!item) return;
    this.openPreset(item);
  },

  startMission() {
    this.openPreset({
      capability: "deep_question",
      tools: ["rag", "reason"],
      prompt: "请根据我的资料和最近学习记录，生成一个 20 分钟学习任务。",
    });
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
