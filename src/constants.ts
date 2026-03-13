import { Priority, Status, Task, Assignee, Project, Column } from './types';

export const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', name: 'Webサイトリニューアル', color: '#4F46E5', notes: 'リニューアルの進捗状況を共有します。' },
  { id: 'p2', name: 'モバイルアプリ開発', color: '#10B981', notes: 'アプリのリリーススケジュールを確認してください。' },
  { id: 'p3', name: 'マーケティングキャンペーン', color: '#F59E0B', notes: 'キャンペーンの予算管理を徹底しましょう。' },
];

export const INITIAL_COLUMNS: Column[] = [
  { id: 'c1', title: '今日まで', projectId: 'p1', order: 0, color: '#4F46E5' },
  { id: 'c2', title: '今週まで', projectId: 'p1', order: 1, color: '#10B981' },
  { id: 'c3', title: '今月末まで', projectId: 'p1', order: 2, color: '#F59E0B' },
  { id: 'c4', title: '今日まで', projectId: 'p2', order: 0, color: '#4F46E5' },
  { id: 'c5', title: '今週まで', projectId: 'p2', order: 1, color: '#10B981' },
  { id: 'c6', title: '今月末まで', projectId: 'p2', order: 2, color: '#F59E0B' },
  { id: 'c7', title: '今日まで', projectId: 'p3', order: 0, color: '#4F46E5' },
  { id: 'c8', title: '今週まで', projectId: 'p3', order: 1, color: '#10B981' },
  { id: 'c9', title: '今月末まで', projectId: 'p3', order: 2, color: '#F59E0B' },
];

export const INITIAL_ASSIGNEES: Assignee[] = [
  { id: '1', name: '田中 太郎', avatar: '田中', color: '#4F46E5' },
  { id: '2', name: '佐藤 花子', avatar: '佐藤', color: '#10B981' },
  { id: '3', name: '鈴木 一郎', avatar: '鈴木', color: '#F59E0B' },
  { id: '4', name: '高橋 健二', avatar: '高橋', color: '#EF4444' },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'プロジェクト要件定義の作成',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    priority: Priority.HIGH,
    status: Status.IN_PROGRESS,
    memo: 'クライアントとの打ち合わせ資料を基に作成する。',
    assigneeIds: ['1', '2'],
    columnId: 'c1',
    projectId: 'p1',
  },
  {
    id: 't2',
    title: 'デザインガイドラインの更新',
    startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    priority: Priority.MEDIUM,
    status: Status.NOT_STARTED,
    memo: '新しいカラーパレットを反映させる。',
    assigneeIds: ['3'],
    columnId: 'c2',
    projectId: 'p1',
  },
  {
    id: 't3',
    title: '月次レポートの提出',
    startDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    priority: Priority.LOW,
    status: Status.REVIEW,
    memo: '',
    assigneeIds: ['4'],
    columnId: 'c6',
    projectId: 'p2',
  },
];
