import { Router, Request, Response } from 'express';
import pool from '../database.js';
import { keysToCamel } from '../helpers.js';

const router = Router();

// GET /api/settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT theme, theme_color, language, timezone, notify_push, notify_email, notify_weekly
       FROM user_settings WHERE user_id = $1`,
      [req.userId]
    );
    if (rows.length === 0) {
      // 設定がない場合はデフォルトを返す
      res.json({
        theme: 'light',
        themeColor: '#4F46E5',
        language: '日本語',
        timezone: 'Asia/Tokyo',
        notifyPush: true,
        notifyEmail: false,
        notifyWeekly: false,
      });
      return;
    }
    res.json(keysToCamel(rows[0]));
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const { theme, themeColor, language, timezone, notifyPush, notifyEmail, notifyWeekly } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO user_settings (user_id, theme, theme_color, language, timezone, notify_push, notify_email, notify_weekly)
       VALUES ($1,
         COALESCE($2::theme_type, 'light'),
         COALESCE($3, '#4F46E5'),
         COALESCE($4, '日本語'),
         COALESCE($5, 'Asia/Tokyo'),
         COALESCE($6, TRUE),
         COALESCE($7, FALSE),
         COALESCE($8, FALSE)
       )
       ON CONFLICT (user_id) DO UPDATE SET
         theme = COALESCE($2::theme_type, user_settings.theme),
         theme_color = COALESCE($3, user_settings.theme_color),
         language = COALESCE($4, user_settings.language),
         timezone = COALESCE($5, user_settings.timezone),
         notify_push = COALESCE($6, user_settings.notify_push),
         notify_email = COALESCE($7, user_settings.notify_email),
         notify_weekly = COALESCE($8, user_settings.notify_weekly)
       RETURNING theme, theme_color, language, timezone, notify_push, notify_email, notify_weekly`,
      [req.userId, theme, themeColor, language, timezone, notifyPush, notifyEmail, notifyWeekly]
    );
    res.json(keysToCamel(rows[0]));
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

export default router;
