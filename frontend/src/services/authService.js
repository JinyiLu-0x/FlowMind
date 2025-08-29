// 2. src/services/authService.js - 认证相关API调用
import api from './api.js';

export const authService = {
  // 注册
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    const { token, refreshToken, user } = response.data || {};
    if (token) localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },

  // 登录
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    const { token, refreshToken, user } = response.data || {};
    if (token) localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },

  // 登出
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.clear();
    }
  },

  // 获取当前用户
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    if (response?.data?.data) {
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data.data;
  },

  // 忘记密码
  async forgotPassword(email) {
    const response = await api.post('/auth/forgotpassword', { email });
    return response.data;
  },

  // 重置密码
  async resetPassword(token, password, confirmPassword) {
    const response = await api.put(`/auth/resetpassword/${token}`, {
      password,
      confirmPassword
    });
    return response.data;
  },

  // 验证邮箱
  async verifyEmail(token) {
    const response = await api.get(`/auth/verifyemail/${token}`);
    return response.data;
  },

  // 检查登录状态
  isAuthenticated() {
    // 仅依据 token 判断，避免 user 残留导致误判
    return !!localStorage.getItem('token');
  },

  // 获取本地用户
  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};