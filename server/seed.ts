import bcrypt from 'bcryptjs';
import pool from './database.js';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. admin ユーザー
    const passwordHash = await bcrypt.hash('admin', 10);
    const { rows: [user] } = await client.query(`
      INSERT INTO users (username, password_hash, display_name, email)
      VALUES ('admin', $1, '管理者', 'admin@example.com')
      ON CONFLICT (username) DO UPDATE SET password_hash = $1
      RETURNING id
    `, [passwordHash]);
    const userId = user.id;

    // 2. ユーザー設定
    await client.query(`
      INSERT INTO user_settings (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);

    // 3. プロジェクト
    const projectData = [
      { name: 'Webサイトリニューアル', color: '#4F46E5', notes: 'リニューアルの進捗状況を共有します。' },
      { name: 'モバイルアプリ開発', color: '#10B981', notes: 'アプリのリリーススケジュールを確認してください。' },
      { name: 'マーケティングキャンペーン', color: '#F59E0B', notes: 'キャンペーンの予算管理を徹底しましょう。' },
    ];

    const projectIds: string[] = [];
    for (const p of projectData) {
      const { rows: [proj] } = await client.query(`
        INSERT INTO projects (owner_id, name, color, notes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [userId, p.name, p.color, p.notes]);
      if (proj) projectIds.push(proj.id);
    }

    // プロジェクトが既に存在する場合は既存IDを取得
    if (projectIds.length === 0) {
      const { rows } = await client.query(
        'SELECT id FROM projects WHERE owner_id = $1 ORDER BY created_at',
        [userId]
      );
      projectIds.push(...rows.map((r: { id: string }) => r.id));
    }

    // 4. カラム（各プロジェクトに3列）
    const columnTitles = [
      { title: '今日まで', color: '#4F46E5' },
      { title: '今週まで', color: '#10B981' },
      { title: '今月末まで', color: '#F59E0B' },
    ];

    const columnIds: string[] = [];
    for (let pi = 0; pi < projectIds.length; pi++) {
      for (let ci = 0; ci < columnTitles.length; ci++) {
        const { rows: [col] } = await client.query(`
          INSERT INTO columns (project_id, title, sort_order, color)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [projectIds[pi], columnTitles[ci].title, ci, columnTitles[ci].color]);
        if (col) columnIds.push(col.id);
      }
    }

    // カラムが既に存在する場合
    if (columnIds.length === 0) {
      const { rows } = await client.query(
        'SELECT id FROM columns WHERE project_id = ANY($1) ORDER BY project_id, sort_order',
        [projectIds]
      );
      columnIds.push(...rows.map((r: { id: string }) => r.id));
    }

    // 5. 担当者
    const assigneeData = [
      { name: '田中 太郎', avatar: '田中', color: '#4F46E5' },
      { name: '佐藤 花子', avatar: '佐藤', color: '#10B981' },
      { name: '鈴木 一郎', avatar: '鈴木', color: '#F59E0B' },
      { name: '高橋 健二', avatar: '高橋', color: '#EF4444' },
    ];

    const assigneeIds: string[] = [];
    for (const a of assigneeData) {
      const { rows: [assignee] } = await client.query(`
        INSERT INTO assignees (name, avatar, color)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [a.name, a.avatar, a.color]);
      if (assignee) assigneeIds.push(assignee.id);
    }

    if (assigneeIds.length === 0) {
      const { rows } = await client.query('SELECT id FROM assignees ORDER BY created_at');
      assigneeIds.push(...rows.map((r: { id: string }) => r.id));
    }

    // 6. タスク（カラムIDが十分あれば）
    if (columnIds.length >= 6 && assigneeIds.length >= 4) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const in3days = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
      const in5days = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
      const in10days = new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0];

      const taskData = [
        {
          columnId: columnIds[0], projectId: projectIds[0],
          title: 'プロジェクト要件定義の作成', startDate: today, dueDate: today,
          priority: '高', status: '進行中',
          memo: 'クライアントとの打ち合わせ資料を基に作成する。',
          assigneeIdxs: [0, 1],
        },
        {
          columnId: columnIds[1], projectId: projectIds[0],
          title: 'デザインガイドラインの更新', startDate: tomorrow, dueDate: in3days,
          priority: '中', status: '未着手',
          memo: '新しいカラーパレットを反映させる。',
          assigneeIdxs: [2],
        },
        {
          columnId: columnIds[5], projectId: projectIds[1],
          title: '月次レポートの提出', startDate: in5days, dueDate: in10days,
          priority: '低', status: 'レビュー待ち',
          memo: '',
          assigneeIdxs: [3],
        },
      ];

      for (const t of taskData) {
        const { rows: existing } = await client.query(
          'SELECT id FROM tasks WHERE title = $1 AND project_id = $2',
          [t.title, t.projectId]
        );
        if (existing.length > 0) continue;

        const { rows: [task] } = await client.query(`
          INSERT INTO tasks (column_id, project_id, title, start_date, due_date, priority, status, memo)
          VALUES ($1, $2, $3, $4, $5, $6::priority_level, $7::task_status, $8)
          RETURNING id
        `, [t.columnId, t.projectId, t.title, t.startDate, t.dueDate, t.priority, t.status, t.memo]);

        for (const idx of t.assigneeIdxs) {
          await client.query(`
            INSERT INTO task_assignees (task_id, assignee_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [task.id, assigneeIds[idx]]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('🌱 シードデータ投入完了');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ シード失敗:', err);
  process.exit(1);
});
