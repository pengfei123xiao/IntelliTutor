const { getWsBaseUrl } = require("../config/env");

function buildWsUrl(path) {
  const base = getWsBaseUrl().endsWith("/") ? getWsBaseUrl().slice(0, -1) : getWsBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

class ChatSocket {
  constructor({ onMessage, onOpen, onClose, onError }) {
    this.socket = null;
    this.isOpen = false;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
  }

  connect() {
    if (this.socket && this.isOpen) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const socket = wx.connectSocket({
        url: buildWsUrl("/api/v1/ws"),
        fail: reject,
      });

      this.socket = socket;

      socket.onOpen(() => {
        this.isOpen = true;
        if (this.onOpen) this.onOpen();
        resolve();
      });

      socket.onMessage((event) => {
        let payload = event.data;
        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          payload = { type: "stream", content: event.data };
        }
        if (this.onMessage) this.onMessage(payload);
      });

      socket.onError((error) => {
        this.isOpen = false;
        if (this.onError) this.onError(error);
        reject(error);
      });

      socket.onClose((event) => {
        this.isOpen = false;
        if (this.onClose) this.onClose(event);
      });
    });
  }

  send(payload) {
    if (!this.socket || !this.isOpen) {
      throw new Error("WebSocket is not connected");
    }

    this.socket.send({
      data: JSON.stringify(payload),
    });
  }

  close() {
    if (!this.socket) return;
    this.socket.close({});
    this.socket = null;
    this.isOpen = false;
  }
}

module.exports = {
  ChatSocket,
  buildWsUrl,
};
