const { mobileLogin } = require("./api");

function getToken() {
  return wx.getStorageSync("authToken") || "";
}

function getUser() {
  return wx.getStorageSync("authUser") || null;
}

function saveAuth(payload) {
  wx.setStorageSync("authToken", payload.token || "");
  wx.setStorageSync("authUser", payload.user || null);
}

function loginWithWechat(role = "student") {
  return new Promise((resolve, reject) => {
    wx.login({
      async success(res) {
        if (!res.code) {
          reject(new Error("未获取到微信登录 code"));
          return;
        }

        try {
          const payload = await mobileLogin({ code: res.code, role });
          saveAuth(payload);
          resolve(payload);
        } catch (error) {
          reject(error);
        }
      },
      fail(error) {
        reject(error);
      },
    });
  });
}

function logout() {
  wx.removeStorageSync("authToken");
  wx.removeStorageSync("authUser");
}

module.exports = {
  getToken,
  getUser,
  saveAuth,
  loginWithWechat,
  logout,
};
