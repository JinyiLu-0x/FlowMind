import { Router } from 'express';
import { protect, checkAIQuota } from '../auth.middleware.js';

const router = Router();

// 示例：占位 AI 路由
router.post('/analyze', protect, checkAIQuota, async (req, res) => {
  res.json({ success: true, message: 'AI 分析占位接口' });
});

export default router;


