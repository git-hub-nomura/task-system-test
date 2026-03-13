import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { authMiddleware } from './auth.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import columnRoutes from './routes/columns.js';
import taskRoutes from './routes/tasks.js';
import assigneeRoutes from './routes/assignees.js';
import settingRoutes from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ミドルウェア
app.use(cors());
app.use(express.json());

// 認証不要ルート
app.use('/api/auth', authRoutes);

// 認証必要ルート
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/columns', authMiddleware, columnRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/assignees', authMiddleware, assigneeRoutes);
app.use('/api/settings', authMiddleware, settingRoutes);

// 本番環境: 静的ファイル配信 + SPA フォールバック
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(import.meta.dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 サーバー起動: http://localhost:${PORT}`);
});
