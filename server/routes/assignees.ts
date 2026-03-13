import { Router, Request, Response } from 'express';
import pool from '../database.js';
import { rowsToCamel, keysToCamel } from '../helpers.js';

const router = Router();

// GET /api/assignees
router.get('/', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, avatar, color FROM assignees ORDER BY created_at'
    );
    res.json(rowsToCamel(rows));
  } catch (err) {
    console.error('Get assignees error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// POST /api/assignees
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    if (!name) {
      res.status(400).json({ error: '担当者名は必須です' });
      return;
    }
    const avatar = name.split(' ')[0] || name;
    const { rows } = await pool.query(
      'INSERT INTO assignees (name, avatar, color) VALUES ($1, $2, $3) RETURNING id, name, avatar, color',
      [name, avatar, color || '#4F46E5']
    );
    res.status(201).json(keysToCamel(rows[0]));
  } catch (err) {
    console.error('Create assignee error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// PUT /api/assignees/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    const avatar = name ? (name.split(' ')[0] || name) : undefined;
    const { rows } = await pool.query(
      `UPDATE assignees SET
         name = COALESCE($1, name),
         avatar = COALESCE($2, avatar),
         color = COALESCE($3, color)
       WHERE id = $4
       RETURNING id, name, avatar, color`,
      [name, avatar, color, req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: '担当者が見つかりません' });
      return;
    }
    res.json(keysToCamel(rows[0]));
  } catch (err) {
    console.error('Update assignee error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// DELETE /api/assignees/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM assignees WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete assignee error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

export default router;
