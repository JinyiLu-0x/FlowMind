import { Router } from 'express';
import { register, login, logout, getMe, forgotPassword, resetPassword, verifyEmail, refreshToken } from '../auth.controller.js';
import { protect, validateRefreshToken } from '../auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/verifyemail/:token', verifyEmail);
router.post('/refresh', validateRefreshToken, refreshToken);

export default router;


