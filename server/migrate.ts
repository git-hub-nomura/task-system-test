import fs from 'fs';
import path from 'path';
import pool from './database.js';

async function migrate() {
  const client = await pool.connect();
  try {
    // マイグレーション管理テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // マイグレーションファイルを取得（ソート済み）
    const migrationsDir = path.join(import.meta.dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // 適用済みチェック
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`⏭️  スキップ: ${file}（適用済み）`);
        continue;
      }

      // SQL実行
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`🔄 適用中: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ 完了: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('🎉 マイグレーション完了');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ マイグレーション失敗:', err);
  process.exit(1);
});
