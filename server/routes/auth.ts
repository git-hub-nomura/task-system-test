import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database.js';
import { signToken } from '../auth.js';
import { keysToCamel } from '../helpers.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'ユーザー名とパスワードを入力してください' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT id, username, password_hash, display_name FROM users WHERE username = $1 AND is_active = TRUE',
      [username]
    );
    if (rows.length === 0) {
      res.status(401).json({ error: 'IDまたはパスワードが正しくありません' });
      return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'IDまたはパスワードが正しくありません' });
      return;
    }

    // ログイン履歴を記録
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    await pool.query(
      'INSERT INTO login_history (user_id, ip_address, user_agent) VALUES ($1, $2::inet, $3)',
      [user.id, typeof ip === 'string' ? ip.split(',')[0].trim() : null, userAgent]
    );

    const token = signToken({ userId: user.id, username: user.username });
    res.json({
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, display_name, email, avatar_url, two_factor_enabled FROM users WHERE id = $1',
      [req.userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'ユーザーが見つかりません' });
      return;
    }
    res.json(keysToCamel(rows[0]));
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

export default router;
