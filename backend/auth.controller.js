// controllers/auth.controller.js
import User from './models/User.model.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendEmail } from './utils/email.js';
import { validateEmail, validatePassword } from './utils/validators.js';

// 生成JWT令牌
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// 生成刷新令牌
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '90d'
  });
};

// 发送令牌响应
const sendTokenResponse = (user, statusCode, res, message = '操作成功') => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };
  
  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .cookie('refreshToken', refreshToken, { ...cookieOptions, expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) })
    .json({
      success: true,
      message,
      token,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        preferences: user.preferences
      }
    });
};

// @desc    注册用户
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供所有必需字段'
      });
    }
    
    // 验证密码匹配
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '密码不匹配'
      });
    }
    
    // 验证邮箱格式
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的邮箱地址'
      });
    }
    
    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? '该邮箱已被注册' 
          : '该用户名已被使用'
      });
    }
    
    // 创建用户
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password
    });
    
    // 生成邮箱验证令牌
    const verifyToken = user.generateEmailVerificationToken();
    await user.save();
    
    // 发送验证邮件
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
    const emailContent = {
      to: user.email,
      subject: 'FlowMind - 验证您的邮箱',
      html: `
        <h2>欢迎加入 FlowMind！</h2>
        <p>请点击下面的链接验证您的邮箱：</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">验证邮箱</a>
        <p>或复制以下链接到浏览器：</p>
        <p>${verifyUrl}</p>
        <p>此链接将在24小时后失效。</p>
      `
    };
    
    await sendEmail(emailContent);
    
    sendTokenResponse(user, 201, res, '注册成功！请查看您的邮箱进行验证。');
    
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
};

// @desc    登录用户
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body;
    
    // 验证输入
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供邮箱/用户名和密码'
      });
    }
    
    // 查找用户
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername }
      ]
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名/邮箱或密码错误'
      });
    }
    
    // 检查账户是否被锁定
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: '账户已被锁定，请稍后再试'
      });
    }
    
    // 验证密码
    const isPasswordMatch = await user.matchPassword(password);
    
    if (!isPasswordMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: '用户名/邮箱或密码错误'
      });
    }
    
    // 重置登录尝试
    await user.resetLoginAttempts();
    
    sendTokenResponse(user, 200, res, '登录成功');
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
};

// @desc    登出用户
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  res
    .cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    })
    .cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    })
    .status(200)
    .json({
      success: true,
      message: '登出成功'
    });
};

// @desc    获取当前用户
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
};

// @desc    忘记密码
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '请提供邮箱地址'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '该邮箱未注册'
      });
    }
    
    // 生成重置令牌
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    
    // 发送重置邮件
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailContent = {
      to: user.email,
      subject: 'FlowMind - 重置密码',
      html: `
        <h2>密码重置请求</h2>
        <p>您收到此邮件是因为您（或其他人）请求重置 FlowMind 账户的密码。</p>
        <p>请点击下面的链接重置密码：</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">重置密码</a>
        <p>或复制以下链接到浏览器：</p>
        <p>${resetUrl}</p>
        <p>此链接将在1小时后失效。</p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
      `
    };
    
    await sendEmail(emailContent);
    
    res.status(200).json({
      success: true,
      message: '重置密码邮件已发送'
    });
    
  } catch (error) {
    console.error('忘记密码错误:', error);
    res.status(500).json({
      success: false,
      message: '发送重置邮件失败'
    });
  }
};

// @desc    重置密码
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;
    const { resettoken } = req.params;
    
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供新密码'
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '密码不匹配'
      });
    }
    
    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }
    
    // 获取哈希令牌
    const hashedToken = crypto
      .createHash('sha256')
      .update(resettoken)
      .digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '无效或过期的重置令牌'
      });
    }
    
    // 设置新密码
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    sendTokenResponse(user, 200, res, '密码重置成功');
    
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      success: false,
      message: '重置密码失败'
    });
  }
};

// @desc    验证邮箱
// @route   GET /api/auth/verifyemail/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    // 获取哈希令牌
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '无效或过期的验证令牌'
      });
    }
    
    // 验证邮箱
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '邮箱验证成功'
    });
    
  } catch (error) {
    console.error('验证邮箱错误:', error);
    res.status(500).json({
      success: false,
      message: '邮箱验证失败'
    });
  }
};

// @desc    刷新令牌
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: '请提供刷新令牌'
      });
    }
    
    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }
    
    sendTokenResponse(user, 200, res, '令牌刷新成功');
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '无效或过期的刷新令牌'
    });
  }
};