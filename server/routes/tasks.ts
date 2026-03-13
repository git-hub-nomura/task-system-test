import { Router, Request, Response } from 'express';
import pool from '../database.js';
import { keysToCamel } from '../helpers.js';

const router = Router();

/** タスク行 + assigneeIds を組み立てるヘルパー */
async function enrichTask(taskRow: Record<string, unknown>) {
  const { rows: assigneeRows } = await pool.query(
    'SELECT assignee_id FROM task_assignees WHERE task_id = $1',
    [taskRow.id]
  );
  const camel = keysToCamel(taskRow);
  return {
    ...camel,
    startDate: formatDate(taskRow.start_date),
    dueDate: formatDate(taskRow.due_date),
    assigneeIds: assigneeRows.map((r: { assignee_id: string }) => r.assignee_id),
  };
}

function formatDate(val: unknown): string {
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
}

// GET /api/tasks?projectId=
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    let query = `
      SELECT t.id, t.title, t.start_date, t.due_date, t.priority, t.status, t.memo, t.column_id, t.project_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE p.owner_id = $1
    `;
    const params: unknown[] = [req.userId];

    if (projectId) {
      query += ' AND t.project_id = $2';
      params.push(projectId);
    }
    query += ' ORDER BY t.created_at';

    const { rows } = await pool.query(query, params);
    const tasks = await Promise.all(rows.map(enrichTask));
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// POST /api/tasks
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, startDate, dueDate, priority, status, memo, assigneeIds, columnId, projectId } = req.body;
    if (!title || !columnId || !projectId) {
      res.status(400).json({ error: 'タイトル、カラムID、プロジェクトIDは必須です' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO tasks (title, start_date, due_date, priority, status, memo, column_id, project_id)
         VALUES ($1, $2, $3, $4::priority_level, $5::task_status, $6, $7, $8)
         RETURNING id, title, start_date, due_date, priority, status, memo, column_id, project_id`,
        [title, startDate, dueDate, priority || '中', status || '未着手', memo || '', columnId, projectId]
      );

      const taskId = rows[0].id;
      if (assigneeIds && assigneeIds.length > 0) {
        for (const aid of assigneeIds) {
          await client.query(
            'INSERT INTO task_assignees (task_id, assignee_id) VALUES ($1, $2)',
            [taskId, aid]
          );
        }
      }

      await client.query('COMMIT');
      const task = await enrichTask(rows[0]);
      res.status(201).json(task);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, startDate, dueDate, priority, status, memo, assigneeIds, columnId, projectId } = req.body;
    const taskId = req.params.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE tasks SET
           title = COALESCE($1, title),
           start_date = COALESCE($2, start_date),
           due_date = COALESCE($3, due_date),
           priority = COALESCE($4::priority_level, priority),
           status = COALESCE($5::task_status, status),
           memo = COALESCE($6, memo),
           column_id = COALESCE($7, column_id),
           project_id = COALESCE($8, project_id)
         WHERE id = $9
         RETURNING id, title, start_date, due_date, priority, status, memo, column_id, project_id`,
        [title, startDate, dueDate, priority, status, memo, columnId, projectId, taskId]
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'タスクが見つかりません' });
        return;
      }

      // assigneeIds が指定された場合は同期
      if (assigneeIds !== undefined) {
        await client.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
        for (const aid of assigneeIds) {
          await client.query(
            'INSERT INTO task_assignees (task_id, assignee_id) VALUES ($1, $2)',
            [taskId, aid]
          );
        }
      }

      await client.query('COMMIT');
      const task = await enrichTask(rows[0]);
      res.json(task);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'サーバーエラー' });
  }
});

export default router;
