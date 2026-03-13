import { Router, Request, Response } from 'express';
import pool from '../database.js';
import { rowsToCamel, keysToCamel } from '../helpers.js';

const router = Router();

// GET /api/projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, color, notes FROM projects WHERE owner_id = $1 ORDER BY created_at',
      [req.userId]
    );
    res.json(rowsToCamel(rows));
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color, notes } = req.body;
    if (!name) {
      res.status(400).json({ error: 'プロジェクト名は必須です' });
      return;
    }
    const { rows } = await pool.query(
      'INSERT INTO projects (owner_id, name, color, notes) VALUES ($1, $2, $3, $4) RETURNING id, name, color, notes',
      [req.userId, name, color || '#4F46E5', notes || '']
    );
    res.status(201).json(keysToCamel(rows[0]));
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // 最低1件制約
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) as cnt FROM projects WHERE owner_id = $1',
      [req.userId]
    );
    if (parseInt(countRows[0].cnt) <= 1) {
      res.status(400).json({ error: 'プロジェクトは最低1件必要です' });
      return;
    }

    await pool.query(
      'DELETE FROM projects WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

export default router;
