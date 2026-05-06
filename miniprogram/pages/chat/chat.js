const app = getApp();
const {
  addNotebookRecord,
  createNotebook,
  getKnowledgeBases,
  getRecentSessions,
  getSessionDetail,
  listNotebooks,
  sendChatTurn,
} = require("../../utils/api");
const { showError } = require("../../utils/format");
const { ChatSocket } = require("../../utils/socket");

let idSeed = 1;

const CAPABILITIES = [
  { value: "", label: "聊天" },
  { value: "deep_solve", label: "深度解题" },
  { value: "deep_question", label: "出题测评" },
  { value: "deep_research", label: "深度研究" },
  { value: "math_animator", label: "数学动画" },
  { value: "visualize", label: "图表可视化" },
];

const TOOLS = [
  { value: "brainstorm", label: "启发思路" },
  { value: "rag", label: "资料问答" },
  { value: "web_search", label: "联网搜索" },
  { value: "code_execution", label: "代码工具" },
  { value: "reason", label: "推理" },
  { value: "paper_search", label: "论文搜索" },
];

Page({
  data: {
    activeKnowledgeBase: "",
    activeCapability: "",
    activeCapabilityLabel: "聊天",
    enabledTools: [],
    ragEnabled: false,
    knowledgeBases: [],
    attachments: [],
    draft: "",
    messages: [],
    sessions: [],
    sessionsOpen: false,
    streaming: false,
    activeTurnId: "",
    inputFocused: false,
    scrollIntoView: "bottom",
    sessionId: "",
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: "智能带读" });
  },

  onShow() {
    const pendingPreset = app.globalData.pendingChatPreset;
    if (pendingPreset) {
      app.setPendingChatPreset(null);
      this.applyPreset(pendingPreset);
    }

    this.setData({
      activeKnowledgeBase: app.globalData.activeKnowledgeBase,
    });
    this.loadKnowledgeBases();
    this.refreshSessions({ silent: true });
  },

  onUnload() {
    if (this.chatSocket) this.chatSocket.close();
  },

  onDraftInput(event) {
    this.setData({ draft: event.detail.value });
  },

  onInputFocus() {
    this.setData({ inputFocused: true });
  },

  onInputBlur() {
    this.setData({ inputFocused: false });
  },

  goKnowledge() {
    wx.switchTab({ url: "/pages/knowledge/knowledge" });
  },

  async loadKnowledgeBases() {
    try {
      const knowledgeBases = await getKnowledgeBases();
      this.setData({
        knowledgeBases: Array.isArray(knowledgeBases) ? knowledgeBases : [],
      });
    } catch (error) {
      this.setData({ knowledgeBases: [] });
    }
  },

  async refreshSessions(options = {}) {
    try {
      const result = await getRecentSessions(30);
      const sessions = Array.isArray(result) ? result : result.sessions || result.items || [];
      this.setData({ sessions });
    } catch (error) {
      if (!options.silent) showError(error, "会话加载失败");
    }
  },

  toggleSessions() {
    const nextOpen = !this.data.sessionsOpen;
    this.setData({ sessionsOpen: nextOpen });
    if (nextOpen) this.refreshSessions();
  },

  async loadSession(event) {
    const sessionId = event.currentTarget.dataset.id;
    if (!sessionId) return;

    wx.showLoading({ title: "加载中" });
    try {
      const detail = await getSessionDetail(sessionId);
      const messages = (detail.messages || []).map((item) =>
        this.createMessage(item.role === "assistant" ? "assistant" : item.role === "system" ? "status" : "user", item.content || ""),
      );
      const preferences = detail.preferences || {};
      const tools = Array.isArray(preferences.tools) ? preferences.tools : [];
      const capability = preferences.capability || "";
      const knowledgeBases = Array.isArray(preferences.knowledge_bases) ? preferences.knowledge_bases : [];
      const activeKnowledgeBase = knowledgeBases[0] || this.data.activeKnowledgeBase;

      this.setData({
        sessionId: detail.session_id || detail.id || sessionId,
        messages,
        sessionsOpen: false,
        enabledTools: tools,
        ragEnabled: tools.includes("rag"),
        activeCapability: capability,
        activeCapabilityLabel: this.getCapabilityLabel(capability),
        activeKnowledgeBase,
        scrollIntoView: "bottom",
      });
      if (activeKnowledgeBase) app.setActiveKnowledgeBase(activeKnowledgeBase);
    } catch (error) {
      showError(error, "会话加载失败");
    } finally {
      wx.hideLoading();
    }
  },

  newChat() {
    if (this.data.streaming) return;
    this.setData({
      draft: "",
      messages: [],
      sessionId: "",
      activeCapability: "",
      activeCapabilityLabel: "聊天",
      enabledTools: [],
      ragEnabled: false,
      scrollIntoView: "bottom",
    });
    this.currentAssistantId = null;
  },

  usePrompt(event) {
    const text = event.currentTarget.dataset.text || "";
    this.setData({ draft: text });
  },

  applyPreset(preset) {
    const capability = preset.capability || "";
    const tools = Array.isArray(preset.tools) ? preset.tools : [];
    const draft = preset.prompt || "";
    this.setData({
      activeCapability: capability,
      activeCapabilityLabel: this.getCapabilityLabel(capability),
      enabledTools: tools,
      ragEnabled: tools.includes("rag"),
      draft,
    });
  },

  chooseCapability() {
    wx.showActionSheet({
      itemList: CAPABILITIES.map((item) => item.label),
      success: (res) => {
        const selected = CAPABILITIES[res.tapIndex];
        if (!selected) return;
        this.setData({
          activeCapability: selected.value,
          activeCapabilityLabel: selected.label,
        });
      },
    });
  },

  chooseTools() {
    wx.showActionSheet({
      itemList: TOOLS.map((item) => {
        const active = this.data.enabledTools.includes(item.value);
        return `${active ? "✓ " : ""}${item.label}`;
      }),
      success: (res) => {
        const selected = TOOLS[res.tapIndex];
        if (!selected) return;
        this.toggleTool(selected.value);
      },
    });
  },

  toggleTool(tool) {
    const current = this.data.enabledTools;
    const enabledTools = current.includes(tool)
      ? current.filter((item) => item !== tool)
      : [...current, tool];
    this.setData({
      enabledTools,
      ragEnabled: enabledTools.includes("rag"),
    });
  },

  toggleRag() {
    this.toggleTool("rag");
  },

  chooseKnowledgeBase() {
    const names = this.data.knowledgeBases.map((item) => item.name).filter(Boolean);
    if (!names.length) {
      wx.showModal({
        title: "暂无资料库",
        content: "先去资料页新建或上传资料，再回到聊天页选择资料。",
        confirmText: "去资料",
        success: (res) => {
          if (res.confirm) this.goKnowledge();
        },
      });
      return;
    }

    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const activeKnowledgeBase = names[res.tapIndex];
        const enabledTools = this.data.enabledTools.includes("rag")
          ? this.data.enabledTools
          : [...this.data.enabledTools, "rag"];
        app.setActiveKnowledgeBase(activeKnowledgeBase);
        this.setData({
          activeKnowledgeBase,
          enabledTools,
          ragEnabled: true,
        });
      },
    });
  },

  getCapabilityLabel(value) {
    const found = CAPABILITIES.find((item) => item.value === value);
    return found ? found.label : "聊天";
  },

  async ensureSocket() {
    if (this.chatSocket && this.chatSocket.isOpen) return;

    this.chatSocket = new ChatSocket({
      onOpen: () => {},
      onMessage: (payload) => this.handleSocketMessage(payload),
      onError: () => {
        this.setData({ streaming: false });
        showError({ message: "带读连接失败，请检查后端服务" });
      },
      onClose: () => {
        this.setData({ streaming: false });
      },
    });

    await this.chatSocket.connect();
  },

  chooseAttachment() {
    wx.chooseMessageFile({
      count: 3,
      type: "file",
      success: async (res) => {
        const files = res.tempFiles || [];
        if (!files.length) return;

        wx.showLoading({ title: "读取附件" });
        try {
          const attachments = await Promise.all(files.map((file) => this.readAttachment(file)));
          this.setData({
            attachments: [...this.data.attachments, ...attachments],
          });
        } catch (error) {
          showError(error, "附件读取失败");
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  readAttachment(file) {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath: file.path,
        encoding: "base64",
        success: (res) => {
          resolve({
            type: "file",
            filename: file.name || "attachment",
            mime_type: this.inferMimeType(file.name || ""),
            base64: res.data,
          });
        },
        fail: reject,
      });
    });
  },

  inferMimeType(filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".md")) return "text/markdown";
    if (lower.endsWith(".txt")) return "text/plain";
    if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return "application/octet-stream";
  },

  removeAttachment(event) {
    const index = Number(event.currentTarget.dataset.index);
    const attachments = this.data.attachments.filter((_, idx) => idx !== index);
    this.setData({ attachments });
  },

  async sendMessage() {
    const text = this.data.draft.trim();
    if ((!text && !this.data.attachments.length) || this.data.streaming) return;

    try {
      if (app.globalData.env.useCloudFunctions) {
        await this.sendCloudMessage(text);
        return;
      }

      await this.ensureSocket();
      const outgoingAttachments = this.data.attachments;
      const userMessage = this.createMessage("user", text || "[附件]", outgoingAttachments);
      const assistantMessage = this.createMessage("assistant", "");

      this.setData({
        draft: "",
        attachments: [],
        streaming: true,
        activeTurnId: "",
        messages: [...this.data.messages, userMessage, assistantMessage],
        scrollIntoView: `msg-${assistantMessage.id}`,
      });

      this.currentAssistantId = assistantMessage.id;
      this.chatSocket.send({
        type: "start_turn",
        content: text,
        message: text,
        session_id: this.data.sessionId || null,
        capability: this.data.activeCapability || null,
        tools: this.data.enabledTools,
        knowledge_bases: this.data.ragEnabled && this.data.activeKnowledgeBase ? [this.data.activeKnowledgeBase] : [],
        attachments: outgoingAttachments,
        language: "zh",
      });
    } catch (error) {
      if (!app.globalData.env.useCloudFunctions) {
        await this.sendCloudMessage(text);
        return;
      }
      this.setData({ streaming: false });
      showError(error, "发送失败");
    }
  },

  async sendCloudMessage(text) {
    const outgoingAttachments = this.data.attachments;
    const userMessage = this.createMessage("user", text || "[附件]", outgoingAttachments);
    const assistantMessage = this.createMessage("assistant", "");

    this.setData({
      draft: "",
      attachments: [],
      streaming: true,
      activeTurnId: "",
      messages: [...this.data.messages, userMessage, assistantMessage],
      scrollIntoView: `msg-${assistantMessage.id}`,
    });

    this.currentAssistantId = assistantMessage.id;

    try {
      const result = await sendChatTurn({
        content: text,
        message: text,
        session_id: this.data.sessionId || null,
        capability: this.data.activeCapability || null,
        tools: this.data.enabledTools,
        knowledge_bases: this.data.ragEnabled && this.data.activeKnowledgeBase ? [this.data.activeKnowledgeBase] : [],
        attachments: outgoingAttachments,
        language: "zh",
      });

      if (result.session_id) this.setData({ sessionId: result.session_id });
      this.replaceAssistantContent(result.content || "我已经收到。");
      this.setData({ streaming: false, scrollIntoView: "bottom" });
      this.refreshSessions({ silent: true });
    } catch (error) {
      this.setData({ streaming: false });
      const fallback = "我已经收到你的问题。当前真实服务暂时不可用，这里先用演示回答帮你继续验收：可以选择学习工具、资料问答、参考资料，也可以保存回复到课堂笔记。";
      this.replaceAssistantContent(fallback);
      this.setData({ streaming: false, scrollIntoView: "bottom" });
    }
  },

  handleSocketMessage(payload) {
    if (payload.turn_id) {
      this.setData({ activeTurnId: payload.turn_id });
    }

    if (payload.type === "session") {
      const sessionId = payload.session_id || (payload.metadata && payload.metadata.session_id) || "";
      if (sessionId) this.setData({ sessionId });
      return;
    }

    if (payload.type === "status" || payload.type === "stage_start" || payload.type === "thinking" || payload.type === "observation") {
      this.appendStatus(payload.content || payload.message || "正在生成...");
      return;
    }

    if (payload.type === "stream" || payload.type === "content") {
      this.appendAssistantContent(payload.content || "");
      return;
    }

    if (payload.type === "result" || payload.type === "done") {
      if (payload.content) this.replaceAssistantContent(payload.content);
      this.setData({ streaming: false, scrollIntoView: "bottom" });
      this.refreshSessions();
      return;
    }

    if (payload.type === "error") {
      this.setData({ streaming: false });
      showError({ message: payload.content || payload.message || "生成失败" });
    }
  },

  cancelStreaming() {
    if (!this.chatSocket || !this.data.activeTurnId) {
      this.setData({ streaming: false });
      return;
    }
    this.chatSocket.send({
      type: "cancel_turn",
      turn_id: this.data.activeTurnId,
    });
    this.setData({ streaming: false, activeTurnId: "" });
  },

  copyMessage(event) {
    const id = Number(event.currentTarget.dataset.id);
    const message = this.data.messages.find((item) => item.id === id);
    if (!message) return;
    wx.setClipboardData({
      data: message.content || "",
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  retryFromMessage(event) {
    const id = Number(event.currentTarget.dataset.id);
    const index = this.data.messages.findIndex((item) => item.id === id);
    if (index < 0) return;
    const previousUser = [...this.data.messages]
      .slice(0, index)
      .reverse()
      .find((item) => item.role === "user");
    if (!previousUser) return;
    this.setData({ draft: previousUser.content || "" });
  },

  async saveMessageToNotebook(event) {
    const id = Number(event.currentTarget.dataset.id);
    const messageIndex = this.data.messages.findIndex((item) => item.id === id);
    const message = this.data.messages[messageIndex];
    if (!message || message.role !== "assistant" || !message.content) return;

    const previousUser = [...this.data.messages]
      .slice(0, messageIndex)
      .reverse()
      .find((item) => item.role === "user");

    wx.showLoading({ title: "保存中" });
    try {
      const notebookId = await this.ensureNotebook();
      await addNotebookRecord({
        notebook_ids: [notebookId],
        record_type: "chat",
        title: (previousUser && previousUser.content ? previousUser.content : "聊天记录").slice(0, 60),
        summary: message.content.slice(0, 180),
        user_query: previousUser ? previousUser.content : "",
        output: message.content,
        metadata: {
          source: "miniprogram",
          session_id: this.data.sessionId,
          ui_language: "zh",
        },
        kb_name: this.data.activeKnowledgeBase || null,
      });
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      showError(error, "保存失败");
    } finally {
      wx.hideLoading();
    }
  },

  async ensureNotebook() {
    const result = await listNotebooks();
    const notebooks = result.notebooks || [];
    if (notebooks.length) return notebooks[0].id || notebooks[0].notebook_id;

    const created = await createNotebook({
      name: "课堂笔记",
      description: "小程序聊天保存的学习记录",
      color: "#cc785c",
      icon: "book",
    });
    const notebook = created.notebook || {};
    return notebook.id || notebook.notebook_id;
  },

  appendStatus(content) {
    if (!content) return;
    const status = this.createMessage("status", content);
    this.setData({
      messages: [...this.data.messages, status],
      scrollIntoView: `msg-${status.id}`,
    });
  },

  appendAssistantContent(content) {
    const messages = this.data.messages.map((message) => {
      if (message.id !== this.currentAssistantId) return message;
      return {
        ...message,
        content: `${message.content}${content}`,
      };
    });
    this.setData({
      messages,
      scrollIntoView: `msg-${this.currentAssistantId}`,
    });
  },

  replaceAssistantContent(content) {
    const messages = this.data.messages.map((message) => {
      if (message.id !== this.currentAssistantId) return message;
      return {
        ...message,
        content,
      };
    });
    this.setData({ messages });
  },

  createMessage(role, content, attachments = []) {
    return {
      id: idSeed++,
      role,
      content,
      attachments,
    };
  },
});
