// 统一错误处理中间件
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  res.status(statusCode).json({ success: false, message });
};


