const app = getApp();
const {
  createKnowledgeBase,
  getMobileBooks,
  getKnowledgeBases,
  uploadKnowledgeFile,
  listNotebooks,
  getQuestionNotebookEntries,
  getQuestionCategories,
  updateQuestionEntry,
  deleteQuestionEntry,
} = require("../../utils/api");
const { showError } = require("../../utils/format");

function firstText(values, fallback) {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim());
  return found === undefined ? fallback : String(found).trim();
}

function normalizePercent(value, fallbackNumber) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallbackNumber;
  return Math.max(0, Math.min(100, Math.round(numeric > 1 ? numeric : numeric * 100)));
}

function normalizeBookMap(result) {
  const source = Array.isArray(result) ? result : result.books || result.items || [];
  return source.reduce((map, item) => {
    const name = firstText([item.title, item.name, item.kb_name], "");
    if (name) map[name] = item;
    return map;
  }, {});
}

Page({
  data: {
    tab: "knowledge",
    activeKnowledgeBase: "",
    knowledgeBases: [],
    notebooks: [],
    questionItems: [],
    categories: [],
    qFilter: "all",
    loading: false,
  },

  normalizeKnowledgeBase(item) {
    const statistics = item.statistics || {};
    const documentCount = statistics.document_count || statistics.documents || statistics.file_count || item.document_count || 0;
    const chunkCount = statistics.chunk_count || statistics.chunks || item.chunk_count || 0;
    const fallbackProgress = documentCount ? 24 : 0;
    const progressPercent = normalizePercent(item.progress_percent ?? item.progress, fallbackProgress);
    const masteryPercent = normalizePercent(item.mastery_percent ?? item.mastery, documentCount ? 60 : 0);
    return {
      ...item,
      name: item.name || item.kb_name || "未命名资料库",
      statusLabel: item.status_label || item.status || "已就绪",
      chapterLabel: firstText([item.current_chapter, item.chapter, item.topic, item.last_chapter], documentCount ? "继续学习" : "等待资料"),
      progressPercent,
      progressText: documentCount ? `${progressPercent}%` : "未开始",
      masteryPercent,
      masteryText: documentCount ? `${masteryPercent}%` : "待测",
      documentText: `${documentCount} 份资料`,
      statistics: {
        document_count: documentCount,
        chunk_count: chunkCount,
      },
    };
  },

  onShow() {
    this.setData({
      activeKnowledgeBase: app.globalData.activeKnowledgeBase,
    });
    this.refreshAll();
  },

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab;
    this.setData({ tab });
    this.refreshAll();
  },

  async refreshAll() {
    if (this.data.tab === "knowledge") return this.loadKnowledgeBases();
    if (this.data.tab === "notebooks") return this.loadNotebooks();
    return this.loadQuestions();
  },

  async loadKnowledgeBases() {
    this.setData({ loading: true });
    try {
      const [knowledgeBases, booksResult] = await Promise.all([getKnowledgeBases(), getMobileBooks()]);
      const bookMap = normalizeBookMap(booksResult);
      const list = (Array.isArray(knowledgeBases) ? knowledgeBases : knowledgeBases.items || []).map((item) => {
        const name = item.name || item.kb_name || item.title || "";
        return this.normalizeKnowledgeBase({
          ...item,
          ...(bookMap[name] || {}),
          name: name || (bookMap[name] && bookMap[name].title),
        });
      });
      this.setData({
        knowledgeBases: list,
        loading: false,
      });
      if (!this.data.activeKnowledgeBase && list[0]) {
        app.setActiveKnowledgeBase(list[0].name);
        this.setData({ activeKnowledgeBase: list[0].name });
      }
    } catch (error) {
      this.setData({ loading: false });
      showError(error, "资料库加载失败");
    }
  },

  async loadNotebooks() {
    this.setData({ loading: true });
    try {
      const result = await listNotebooks();
      this.setData({
        notebooks: result.notebooks || [],
        loading: false,
      });
    } catch (error) {
      this.setData({ loading: false, notebooks: [] });
    }
  },

  async loadQuestions() {
    this.setData({ loading: true });
    try {
      const filter = {};
      if (this.data.qFilter === "bookmarked") filter.bookmarked = true;
      if (this.data.qFilter === "wrong") filter.is_correct = false;
      const [entries, categories] = await Promise.all([
        getQuestionNotebookEntries(filter),
        getQuestionCategories(),
      ]);
      this.setData({
        questionItems: entries.items || [],
        categories: Array.isArray(categories) ? categories : [],
        loading: false,
      });
    } catch (error) {
      this.setData({ loading: false, questionItems: [], categories: [] });
    }
  },

  selectKb(event) {
    const name = event.currentTarget.dataset.name;
    app.setActiveKnowledgeBase(name);
    this.setData({ activeKnowledgeBase: name });
    wx.showToast({ title: "已设为当前", icon: "success" });
  },

  continueKnowledgeBase(event) {
    const name = event.currentTarget.dataset.name;
    const chapter = event.currentTarget.dataset.chapter || "当前章节";
    if (!name) return;

    app.setActiveKnowledgeBase(name);
    app.setPendingChatPreset({
      capability: "",
      tools: ["rag"],
      prompt: `请围绕《${name}》的「${chapter}」回答我的问题。`,
    });
    this.setData({ activeKnowledgeBase: name });
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  createKb() {
    wx.showModal({
      title: "新建资料库",
      editable: true,
      placeholderText: "例如：七年级数学上册",
      success: async (res) => {
        if (!res.confirm || !res.content) return;
        const name = res.content.trim();
        if (!name) return;

        wx.showLoading({ title: "创建中" });
        try {
          await createKnowledgeBase(name);
          app.setActiveKnowledgeBase(name);
          const exists = this.data.knowledgeBases.some((item) => item.name === name);
          this.setData({
            activeKnowledgeBase: name,
            knowledgeBases: exists
              ? this.data.knowledgeBases
              : [
                  this.normalizeKnowledgeBase({
                    name,
                    status: "已创建",
                    statistics: { document_count: 0, chunk_count: 0 },
                  }),
                  ...this.data.knowledgeBases,
                ],
          });
          await this.loadKnowledgeBases();
          wx.showToast({ title: "创建成功", icon: "success" });
        } catch (error) {
          showError(error, "创建失败");
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  chooseAndUpload() {
    if (!this.data.activeKnowledgeBase) {
      wx.showToast({ title: "请先选择资料库", icon: "none" });
      return;
    }

    wx.chooseMessageFile({
      count: 3,
      type: "file",
      extension: ["pdf", "txt", "md", "docx"],
      success: async (res) => {
        const files = res.tempFiles || [];
        if (!files.length) return;

        wx.showLoading({ title: "上传中" });
        try {
          for (const file of files) {
            await uploadKnowledgeFile(this.data.activeKnowledgeBase, file.path);
          }
          const knowledgeBases = this.data.knowledgeBases.map((item) => {
            if (item.name !== this.data.activeKnowledgeBase) return item;
            return {
              ...item,
              statusLabel: "处理中",
              statistics: {
                ...item.statistics,
                document_count: (item.statistics.document_count || 0) + files.length,
              },
            };
          });
          this.setData({ knowledgeBases });
          wx.showToast({ title: "已开始处理", icon: "success" });
          await this.loadKnowledgeBases();
        } catch (error) {
          showError(error, "上传失败");
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  setQFilter(event) {
    this.setData({ qFilter: event.currentTarget.dataset.filter });
    this.loadQuestions();
  },

  async toggleBookmark(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.questionItems.find((entry) => entry.id === id);
    if (!item) return;
    this.setData({
      questionItems: this.data.questionItems.map((entry) =>
        entry.id === id ? { ...entry, bookmarked: !entry.bookmarked } : entry,
      ),
    });
    await updateQuestionEntry(id, { bookmarked: !item.bookmarked });
  },

  async removeQuestion(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({
      questionItems: this.data.questionItems.filter((entry) => entry.id !== id),
    });
    await deleteQuestionEntry(id);
  },

  askQuestion(event) {
    const text = event.currentTarget.dataset.text || "请帮我复盘这道错题。";
    app.setPendingChatPreset({
      capability: "deep_solve",
      tools: ["reason"],
      prompt: `请带我复盘这道题：${text}`,
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  continueNotebook(event) {
    const name = event.currentTarget.dataset.name || "课堂笔记";
    app.setPendingChatPreset({
      capability: "",
      tools: ["rag"],
      prompt: `请根据「${name}」里的学习记录，帮我总结下一步复习重点。`,
    });
    wx.switchTab({ url: "/pages/chat/chat" });
  },
});
