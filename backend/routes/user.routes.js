import { Router } from 'express';
import { protect } from '../auth.middleware.js';

const router = Router();

// 示例：占位用户数据路由，前端可替换为真实实现
router.get('/data', protect, async (req, res) => {
  res.json({ success: true, tasks: [], ideas: [] });
});

export default router;


