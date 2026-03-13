import { Router, Request, Response } from 'express';
import pool from '../database.js';
import { rowsToCamel, keysToCamel } from '../helpers.js';

const router = Router();

// GET /api/columns?projectId=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    let query = `
      SELECT c.id, c.title, c.project_id, c.sort_order as "order", c.color
      FROM columns c
      JOIN projects p ON c.project_id = p.id
      WHERE p.owner_id = $1
    `;
    const params: unknown[] = [req.userId];

    if (projectId) {
      query += ' AND c.project_id = $2';
      params.push(projectId);
    }
    query += ' ORDER BY c.project_id, c.sort_order';

    const { rows } = await pool.query(query, params);
    res.json(rowsToCamel(rows));
  } catch (err) {
    console.error('Get columns error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// POST /api/columns
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, projectId, color } = req.body;
    if (!title || !projectId) {
      res.status(400).json({ error: 'タイトルとプロジェクトIDは必須です' });
      return;
    }

    // sort_order を自動算出
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) as cnt FROM columns WHERE project_id = $1',
      [projectId]
    );
    const order = parseInt(countRows[0].cnt);

    const { rows } = await pool.query(
      `INSERT INTO columns (project_id, title, sort_order, color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, project_id, sort_order as "order", color`,
      [projectId, title, order, color || '#4F46E5']
    );
    res.status(201).json(keysToCamel(rows[0]));
  } catch (err) {
    console.error('Create column error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// PUT /api/columns/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, color } = req.body;
    const { rows } = await pool.query(
      `UPDATE columns SET title = COALESCE($1, title), color = COALESCE($2, color)
       WHERE id = $3
       RETURNING id, title, project_id, sort_order as "order", color`,
      [title, color, req.params.id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'カラムが見つかりません' });
      return;
    }
    res.json(keysToCamel(rows[0]));
  } catch (err) {
    console.error('Update column error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// DELETE /api/columns/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM columns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete column error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

export default router;
