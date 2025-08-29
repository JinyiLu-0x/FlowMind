// middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import User from './models/User.model.js';

// 保护路由 - 验证用户登录状态
export const protect = async (req, res, next) => {
  let token;
  
  try {
    // 从请求头或cookie获取令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // 确保令牌存在
    if (!token || token === 'none') {
      return res.status(401).json({
        success: false,
        message: '未授权访问，请先登录'
      });
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查账户是否被锁定
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: '账户已被锁定，请稍后再试'
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    next();
    
  } catch (error) {
    console.error('认证错误:', error);
    
    // 根据错误类型返回不同的响应
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期，请重新登录'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
};

// 可选认证 - 如果有token则验证，没有也允许通过
export const optionalAuth = async (req, res, next) => {
  let token;
  
  try {
    // 从请求头或cookie获取令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // 如果没有令牌，继续执行但不设置用户
    if (!token || token === 'none') {
      req.user = null;
      return next();
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    // 如果用户存在且未被锁定，设置用户信息
    if (user && !user.isLocked) {
      req.user = user;
    } else {
      req.user = null;
    }
    
    next();
    
  } catch (error) {
    // 认证失败但不阻止请求继续
    req.user = null;
    next();
  }
};

// 角色授权中间件
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    next();
  };
};

// 验证邮箱状态
export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: '请先验证您的邮箱'
    });
  }
  
  next();
};

// 检查AI使用额度
export const checkAIQuota = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问'
      });
    }
    
    // 刷新用户数据以获取最新的使用情况
    const user = await User.findById(req.user.id);
    
    if (!user.checkAIQuota()) {
      return res.status(429).json({
        success: false,
        message: '本月AI使用额度已用完，请升级套餐或等待下月重置',
        quota: {
          used: user.aiUsage.monthlyRequests,
          limit: user.aiUsage.quotaLimit,
          resetDate: new Date(user.aiUsage.lastResetDate.getFullYear(), user.aiUsage.lastResetDate.getMonth() + 1, 1)
        }
      });
    }
    
    // 更新用户信息到请求对象
    req.user = user;
    next();
    
  } catch (error) {
    console.error('检查AI额度错误:', error);
    res.status(500).json({
      success: false,
      message: '检查使用额度失败'
    });
  }
};

// 刷新令牌验证
export const validateRefreshToken = async (req, res, next) => {
  try {
    let refreshToken;
    
    // 从请求体或cookie获取刷新令牌
    if (req.body.refreshToken) {
      refreshToken = req.body.refreshToken;
    } else if (req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }
    
    if (!refreshToken || refreshToken === 'none') {
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
    
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: '账户已被锁定'
      });
    }
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error('刷新令牌验证错误:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '刷新令牌已过期，请重新登录'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '验证刷新令牌失败'
      });
    }
  }
};

// 检查用户是否为自己或管理员
export const checkOwnershipOrAdmin = (req, res, next) => {
  const userId = req.params.userId || req.params.id;
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  // 如果是管理员或用户本人，允许访问
  if (req.user.role === 'admin' || req.user.id === userId) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: '权限不足'
  });
};

// 套餐验证中间件
export const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  const premiumRoles = ['premium', 'pro', 'enterprise', 'admin'];
  
  if (!premiumRoles.includes(req.user.role) && !premiumRoles.includes(req.user.subscription?.plan)) {
    return res.status(403).json({
      success: false,
      message: '此功能需要高级套餐',
      upgrade: {
        message: '升级到高级套餐以解锁更多功能',
        availablePlans: ['basic', 'pro', 'enterprise']
      }
    });
  }
  
  // 检查套餐是否过期
  if (req.user.subscription?.endDate && new Date(req.user.subscription.endDate) < new Date()) {
    return res.status(403).json({
      success: false,
      message: '套餐已过期，请续费'
    });
  }
  
  next();
};

// API访问频率限制（用户级别）
export const userRateLimit = async (req, res, next) => {
  if (!req.user) {
    return next();
  }
  
  try {
    const user = await User.findById(req.user.id);
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // 1分钟窗口
    
    // 这里可以添加更复杂的频率限制逻辑
    // 例如：检查用户在过去1分钟内的请求次数
    // 目前先简单通过
    
    next();
  } catch (error) {
    console.error('用户频率限制检查错误:', error);
    next();
  }
};

// 开发环境跳过认证（仅用于测试）
export const devBypass = (req, res, next) => {
  if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
    // 在开发环境下，可以跳过认证
    req.user = {
      id: 'dev-user',
      role: 'admin',
      isEmailVerified: true
    };
    return next();
  }
  
  // 非开发环境或未启用跳过，继续正常认证流程
  return protect(req, res, next);
};