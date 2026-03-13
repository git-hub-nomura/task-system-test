/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, Component, ReactNode } from 'react';
import { 
  Plus, 
  Minus, 
  Calendar, 
  AlertCircle, 
  MessageSquare, 
  CheckCircle2, 
  MoreVertical,
  ArrowUpDown,
  UserPlus,
  X,
  ChevronRight,
  Menu,
  LogOut,
  User,
  LayoutGrid,
  BarChart2,
  FolderKanban,
  ChevronLeft,
  ChevronDown,
  Search,
  Info,
  PieChart as PieChartIcon,
  Trash2,
  Settings,
  Pencil,
  Lock,
  Bell,
  Palette,
  Globe,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Priority, Status, Task, Assignee, Project, Column } from './types';
import { INITIAL_ASSIGNEES, INITIAL_TASKS, INITIAL_PROJECTS, INITIAL_COLUMNS } from './constants';
import * as api from './api';

// --- Helpers ---
const getTodayStr = () => new Date().toISOString().split('T')[0];
const getEndOfWeekStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
};
const getEndOfMonthStr = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
};

const isOverdue = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return date < today;
};

const priorityValue = (p: Priority) => {
  switch (p) {
    case Priority.HIGH: return 3;
    case Priority.MEDIUM: return 2;
    case Priority.LOW: return 1;
    default: return 0;
  }
};

// --- Error Boundary ---
class ErrorBoundary extends Component<any, any> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">予期せぬエラーが発生しました</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              アプリケーションの読み込み中に問題が発生しました。ページを再読み込みしてください。
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!api.getToken());
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'gantt' | 'analytics' | 'settings'>('dashboard');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null); // columnId
  const [isAddingAssignee, setIsAddingAssignee] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingAssigneeId, setEditingAssigneeId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<Record<string, 'asc' | 'desc' | null>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);

  // Settings States
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    }
    return 'light';
  });
  const [language, setLanguage] = useState('日本語');
  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    weekly: false
  });
  const [themeColor, setThemeColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('themeColor') || '#4F46E5';
    }
    return '#4F46E5';
  });

  // ログイン後にAPIからデータを一括取得
  useEffect(() => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    Promise.all([
      api.getProjects(),
      api.getColumns(),
      api.getTasks(),
      api.getAssignees(),
      api.getSettings(),
    ])
      .then(([proj, cols, tsk, asgn, settings]) => {
        setProjects(proj);
        setColumns(cols);
        setTasks(tsk);
        setAssignees(asgn);
        if (proj.length > 0 && !selectedProjectId) {
          setSelectedProjectId(proj[0].id);
        }
        // 設定を反映
        setTheme(settings.theme);
        setThemeColor(settings.themeColor);
        setLanguage(settings.language);
        setNotifications({
          push: settings.notifyPush,
          email: settings.notifyEmail,
          weekly: settings.notifyWeekly,
        });
      })
      .catch((err) => {
        console.error('データ取得エラー:', err);
        // トークン無効の場合はログアウト
        if (!api.getToken()) setIsLoggedIn(false);
      })
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  // Warning Popup States
  const [showUnassignedWarning, setShowUnassignedWarning] = useState(true);
  const [showUpcomingWarning, setShowUpcomingWarning] = useState(true);
  const [showOverdueWarning, setShowOverdueWarning] = useState(true);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Persist Settings (localStorage + API)
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (isLoggedIn) api.updateSettings({ theme }).catch(() => {});
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('themeColor', themeColor);
    if (isLoggedIn) api.updateSettings({ themeColor }).catch(() => {});
  }, [themeColor]);

  // Apply Theme and Theme Color
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (mode: 'light' | 'dark') => {
      if (mode === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
      
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme as 'light' | 'dark');
    }
    
    // Tailwind v4 uses --color-* variables
    root.style.setProperty('--color-indigo-500', themeColor + 'cc');
    root.style.setProperty('--color-indigo-600', themeColor);
    root.style.setProperty('--color-indigo-700', themeColor + 'ee');
    
    // Also set a generic accent color if needed
    root.style.setProperty('--accent-color', themeColor);
  }, [theme, themeColor]);

  // --- Actions ---
  const addTask = async (columnId: string) => {
    try {
      const newTask = await api.createTask({
        title: '新しいタスク',
        startDate: getTodayStr(),
        dueDate: getTodayStr(),
        priority: Priority.MEDIUM,
        status: Status.NOT_STARTED,
        memo: '',
        assigneeIds: [],
        columnId,
        projectId: selectedProjectId,
      });
      setTasks([...tasks, newTask]);
      setEditingTask(newTask);
    } catch (err) { console.error('タスク追加エラー:', err); }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      const saved = await api.updateTask(updatedTask.id, updatedTask);
      setTasks(tasks.map(t => t.id === saved.id ? saved : t));
      setEditingTask(null);
    } catch (err) { console.error('タスク更新エラー:', err); }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      setEditingTask(null);
    } catch (err) { console.error('タスク削除エラー:', err); }
  };

  const addAssignee = async (name: string, color: string) => {
    try {
      const newAssignee = await api.createAssignee({ name, color: color || undefined });
      setAssignees([...assignees, newAssignee]);
      setIsAddingAssignee(false);
    } catch (err) { console.error('担当者追加エラー:', err); }
  };

  const updateAssignee = async (id: string, name: string, color: string) => {
    try {
      const saved = await api.updateAssignee(id, { name, color });
      setAssignees(assignees.map(a => a.id === id ? saved : a));
      setEditingAssigneeId(null);
    } catch (err) { console.error('担当者更新エラー:', err); }
  };

  const addProject = async (name: string, color?: string) => {
    try {
      const newProject = await api.createProject({ name, color: color || undefined });
      setProjects([...projects, newProject]);
      setIsAddingProject(false);
      setSelectedProjectId(newProject.id);
    } catch (err) { console.error('プロジェクト追加エラー:', err); }
  };

  const removeProject = async (id: string) => {
    if (projects.length <= 1) return;
    try {
      await api.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      setColumns(columns.filter(c => c.projectId !== id));
      setTasks(tasks.filter(t => t.projectId !== id));
      if (selectedProjectId === id) {
        setSelectedProjectId(projects.find(p => p.id !== id)!.id);
      }
    } catch (err) { console.error('プロジェクト削除エラー:', err); }
  };

  const removeAssignee = async (id: string) => {
    try {
      await api.deleteAssignee(id);
      setAssignees(assignees.filter(a => a.id !== id));
      setTasks(tasks.map(t => ({
        ...t,
        assigneeIds: t.assigneeIds.filter(aid => aid !== id)
      })));
    } catch (err) { console.error('担当者削除エラー:', err); }
  };

  const addColumn = async (title: string, color?: string) => {
    try {
      const newColumn = await api.createColumn({ title, projectId: selectedProjectId, color: color || undefined });
      setColumns([...columns, newColumn]);
      setIsAddingColumn(false);
    } catch (err) { console.error('カラム追加エラー:', err); }
  };

  const deleteColumn = async (id: string) => {
    try {
      await api.deleteColumn(id);
      setColumns(columns.filter(c => c.id !== id));
      setTasks(tasks.filter(t => t.columnId !== id));
    } catch (err) { console.error('カラム削除エラー:', err); }
  };

  const renameColumn = async (id: string, newTitle: string, color?: string) => {
    try {
      const saved = await api.updateColumn(id, { title: newTitle, color });
      setColumns(columns.map(c => c.id === id ? saved : c));
      setEditingColumnId(null);
    } catch (err) { console.error('カラム名変更エラー:', err); }
  };

  const toggleSort = (columnId: string) => {
    setSortConfig(prev => ({
      ...prev,
      [columnId]: prev[columnId] === 'desc' ? 'asc' : prev[columnId] === 'asc' ? null : 'desc'
    }));
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    // Use a small delay to make the original element semi-transparent
    setTimeout(() => {
      const el = e.target as HTMLElement;
      el.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null);
    setDropTargetColumn(null);
    const el = e.target as HTMLElement;
    el.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDropTargetColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.columnId !== columnId) {
      // 楽観的更新
      setTasks(tasks.map(t => t.id === taskId ? { ...t, columnId } : t));
      try {
        await api.updateTask(taskId, { columnId });
      } catch (err) {
        // 失敗時はロールバック
        setTasks(tasks.map(t => t.id === taskId ? { ...t, columnId: task.columnId } : t));
        console.error('タスク移動エラー:', err);
      }
    }
    setDropTargetColumn(null);
  };

  // --- Filtering & Sorting ---
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => t.projectId === selectedProjectId);
    if (selectedAssigneeId) {
      result = result.filter(t => t.assigneeIds.includes(selectedAssigneeId));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.memo.toLowerCase().includes(query)
      );
    }
    return result;
  }, [tasks, selectedAssigneeId, selectedProjectId, searchQuery]);

  const getColumnTasks = (columnId: string) => {
    const columnTasks = filteredTasks.filter(t => t.columnId === columnId);
    const sortDir = sortConfig[columnId];
    
    if (!sortDir) return columnTasks;

    return [...columnTasks].sort((a, b) => {
      const valA = priorityValue(a.priority);
      const valB = priorityValue(b.priority);
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });
  };

  const currentProjectColumns = useMemo(() => {
    return columns
      .filter(c => c.projectId === selectedProjectId)
      .sort((a, b) => a.order - b.order);
  }, [columns, selectedProjectId]);

  // --- Analytics Calculations ---
  const analyticsData = useMemo(() => {
    const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);
    const totalTasks = projectTasks.length;
    
    return assignees.map(assignee => {
      const assignedTasks = projectTasks.filter(t => t.assigneeIds.includes(assignee.id));
      const completedTasks = assignedTasks.filter(t => t.status === Status.COMPLETED);
      
      const allocationRate = totalTasks > 0 ? (assignedTasks.length / totalTasks) * 100 : 0;
      const completionRate = assignedTasks.length > 0 ? (completedTasks.length / assignedTasks.length) * 100 : 0;
      
      return {
        name: assignee.name,
        assigned: assignedTasks.length,
        completed: completedTasks.length,
        allocationRate: Math.round(allocationRate),
        completionRate: Math.round(completionRate),
        color: assignee.color
      };
    });
  }, [tasks, assignees, selectedProjectId]);

  // --- Warning Calculations ---
  const unassignedCount = useMemo(() => tasks.filter(t => t.assigneeIds.length === 0).length, [tasks]);
  
  const upcomingCount = useMemo(() => tasks.filter(t => {
    if (t.status === Status.COMPLETED) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(t.dueDate);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length, [tasks]);

  const overdueCount = useMemo(() => tasks.filter(t => isOverdue(t.dueDate) && t.status !== Status.COMPLETED && t.projectId === selectedProjectId).length, [tasks, selectedProjectId]);

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    api.setToken(null);
    setIsLoggedIn(false);
    setProjects([]);
    setColumns([]);
    setTasks([]);
    setAssignees([]);
    setSelectedProjectId('');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (isLoading || projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-bold">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F6F9] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-hidden relative">
      {/* Warning Popups Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {showUnassignedWarning && unassignedCount > 0 && (
            <motion.div
              key="unassigned-warning"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="pointer-events-auto bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-lg flex items-start gap-3 w-80"
            >
              <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                <UserPlus size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">未割当タスク警告</p>
                <p className="text-xs text-amber-700 mt-1">
                  担当者が設定されていないタスクが <span className="font-bold">{unassignedCount}件</span> あります。
                </p>
              </div>
              <button onClick={() => setShowUnassignedWarning(false)} className="text-amber-400 hover:text-amber-600">
                <X size={16} />
              </button>
            </motion.div>
          )}

          {showUpcomingWarning && upcomingCount > 0 && (
            <motion.div
              key="upcoming-warning"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="pointer-events-auto bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-lg flex items-start gap-3 w-80"
            >
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Calendar size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900">期限間近警告</p>
                <p className="text-xs text-blue-700 mt-1">
                  期限が3日以内の未完了タスクが <span className="font-bold">{upcomingCount}件</span> あります。
                </p>
              </div>
              <button onClick={() => setShowUpcomingWarning(false)} className="text-blue-400 hover:text-blue-600">
                <X size={16} />
              </button>
            </motion.div>
          )}

          {showOverdueWarning && overdueCount > 0 && (
            <motion.div
              key="overdue-warning"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="pointer-events-auto bg-red-50 border border-red-200 p-4 rounded-xl shadow-lg flex items-start gap-3 w-80"
            >
              <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">期限超過警告</p>
                <p className="text-xs text-red-700 mt-1">
                  期限を過ぎている未完了タスクが <span className="font-bold">{overdueCount}件</span> あります。
                </p>
              </div>
              <button onClick={() => setShowOverdueWarning(false)} className="text-red-400 hover:text-red-600">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Mobile Header (Hidden as we integrated it into the main header) */}
      <div className="hidden lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="text-indigo-600" size={20} />
          タスク管理
        </h1>
        <div className="w-10"></div>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm z-50 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-10
      `}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <CheckCircle2 className="text-indigo-600" size={24} />
            タスク管理
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">管理者</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          {/* Projects Section */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">プロジェクト</h2>
              <button 
                onClick={() => setIsAddingProject(true)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1">
              {projects.length > 0 ? (
                projects.map(p => (
                  <div key={p.id} className="group flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        if (activeTab === 'settings') setActiveTab('board');
                      }}
                      className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedProjectId === p.id 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      style={selectedProjectId === p.id ? { color: themeColor, backgroundColor: themeColor + '11' } : {}}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </button>
                    {projects.length > 1 && (
                      <button 
                        onClick={() => removeProject(p.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">プロジェクトなし</p>
                </div>
              )}
            </div>
          </section>

          {/* Assignees Section */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">担当者</h2>
              <button 
                onClick={() => setIsAddingAssignee(true)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 px-2">
              {assignees.map(a => (
                <div key={a.id} className="relative group">
                  <button
                    onClick={() => setSelectedAssigneeId(selectedAssigneeId === a.id ? null : a.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium transition-all duration-200 ${
                      selectedAssigneeId === a.id ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: a.color }}
                    title={a.name}
                  >
                    {a.avatar}
                  </button>
                  <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingAssigneeId(a.id); }}
                      className="bg-white text-slate-400 rounded-full p-0.5 shadow-sm border border-slate-100 hover:text-indigo-600"
                    >
                      <Pencil size={10} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeAssignee(a.id); }}
                      className="bg-white text-slate-400 rounded-full p-0.5 shadow-sm border border-slate-100 hover:text-red-500"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {selectedAssigneeId && (
              <button 
                onClick={() => setSelectedAssigneeId(null)}
                className="mt-4 w-full text-xs text-indigo-600 font-medium hover:underline px-2 text-left"
              >
                フィルターを解除
              </button>
            )}
          </section>

          {/* Stats Section */}
          <section className="px-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">統計</h2>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <LayoutGrid size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-600">全タスク</span>
                </div>
                <span className="text-sm font-black text-slate-900">{tasks.length}</span>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertCircle size={16} />
                  </div>
                  <span className="text-xs font-bold text-red-600">期限切れ</span>
                </div>
                <span className="text-sm font-black text-red-600">{overdueCount}</span>
              </div>
            </div>
          </section>

          {/* Settings Section */}
          <section>
            <div className="px-2 mb-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">システム</h2>
            </div>
            <button
              onClick={() => {
                setActiveTab('settings');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'settings' 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings size={18} />
              <span>設定</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all mt-1"
            >
              <LogOut size={18} />
              <span>ログアウト</span>
            </button>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-xs text-indigo-700 font-medium mb-1">ヒント</p>
            <p className="text-[11px] text-indigo-600 leading-relaxed">
              タスクをドラッグして期限を自動更新できます。
            </p>
          </div>
        </div>
      </aside>

      {/* Main Board */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F4F6F9] dark:bg-slate-950 transition-colors">
        {/* Header with Tabs */}
        <header className="h-16 lg:h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shrink-0 z-20 transition-colors">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400 shrink-0">
              <Menu size={18} />
            </button>
            
            <div className="relative shrink-0">
              <button 
                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all group"
              >
                <FolderKanban size={14} className="text-indigo-600 shrink-0 lg:w-4 lg:h-4" />
                <span className="text-[10px] lg:text-sm font-black text-indigo-900 dark:text-indigo-100 truncate max-w-[60px] sm:max-w-[120px] lg:max-w-none">
                  {currentProject.name}
                </span>
                <ChevronDown size={12} className={`text-indigo-400 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isProjectMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsProjectMenuOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-40 overflow-hidden"
                    >
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                        <div className="px-3 py-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">プロジェクト切替</p>
                        </div>
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedProjectId(p.id);
                              setIsProjectMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              selectedProjectId === p.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${selectedProjectId === p.id ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setIsAddingProject(true);
                            setIsProjectMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                        >
                          <Plus size={14} />
                          <span>新規プロジェクト</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 lg:p-1 rounded-xl shrink-0">
              <button
                onClick={() => setActiveTab('board')}
                className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1 lg:py-1.5 rounded-lg text-[10px] lg:text-sm font-bold transition-all ${
                  activeTab === 'board' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid size={12} className="lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">ボード</span>
                <span className="sm:hidden">B</span>
              </button>
              <button
                onClick={() => setActiveTab('gantt')}
                className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1 lg:py-1.5 rounded-lg text-[10px] lg:text-sm font-bold transition-all ${
                  activeTab === 'gantt' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <BarChart2 size={12} className="lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">ガント</span>
                <span className="sm:hidden">G</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1 lg:py-1.5 rounded-lg text-[10px] lg:text-sm font-bold transition-all ${
                  activeTab === 'analytics' 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <PieChartIcon size={12} className="lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">分析</span>
                <span className="sm:hidden">A</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-6 shrink-0 ml-2">
            {/* Clock */}
            <div className="hidden md:flex flex-col items-end px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mb-1">現在時刻</p>
              <p className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">
                {format(currentTime, 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
              </p>
            </div>

            {/* Stats Summary */}
            <div className="flex items-center gap-2 lg:gap-6">
              <div className="flex flex-col items-center lg:items-end">
                <p className="text-[8px] lg:text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tighter">タスク合計</p>
                <p className="text-xs lg:text-base font-black text-slate-900 dark:text-white leading-none">{filteredTasks.length}</p>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-col items-center lg:items-end">
                <p className="text-[8px] lg:text-[10px] text-red-400 dark:text-red-500/70 font-black uppercase tracking-tighter">期限切れ</p>
                <p className="text-xs lg:text-base font-black text-red-500 dark:text-red-400 leading-none">{overdueCount}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-header for Search and Notes */}
        {(activeTab === 'board' || activeTab === 'gantt') && (
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 flex flex-col sm:flex-row items-center gap-4 shrink-0 transition-colors">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                placeholder="タスクを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Project Notes */}
            {currentProject.notes && (
              <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30 w-full sm:w-auto overflow-hidden">
                <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-amber-500 dark:text-amber-500/80 uppercase tracking-wider leading-none mb-0.5">共有事項</p>
                  <p className="text-xs text-amber-900 dark:text-amber-100 truncate font-medium">{currentProject.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'dashboard' ? (
            <DashboardView 
              tasks={tasks} 
              projects={projects} 
              assignees={assignees} 
              themeColor={themeColor}
              theme={theme}
              onNavigateToProject={(id) => {
                setSelectedProjectId(id);
                setActiveTab('board');
              }}
            />
          ) : activeTab === 'board' ? (
            <div className="absolute inset-0 overflow-x-auto p-4 lg:p-8">
              <div className="flex gap-4 h-full pr-12">
                {currentProjectColumns.map(col => {
                  const colTasks = getColumnTasks(col.id);
                  const isOver = dropTargetColumn === col.id;
                  const sortDir = sortConfig[col.id];

                  return (
                    <div 
                      key={col.id}
                      className={`w-60 flex flex-col rounded-2xl border-2 transition-all duration-200 ${isOver ? 'ring-2 ring-indigo-400 ring-dashed bg-indigo-50/50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDrop={(e) => handleDrop(e, col.id)}
                    >
                      {/* Column Header */}
                      <div 
                        className={`p-4 rounded-t-2xl border-b flex flex-col gap-3 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800`}
                        style={{ borderTop: col.color ? `4px solid ${col.color}` : 'none' }}
                      >
                        {/* Top Row: Name, Edit, Count */}
                        <div className="flex items-center justify-between min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-bold text-slate-800 dark:text-white truncate">
                              {col.title}
                            </h3>
                            <button 
                              onClick={() => setEditingColumnId(col.id)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                              title="リスト名を変更"
                            >
                              <Pencil size={14} />
                            </button>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 dark:text-slate-400 shrink-0`}>
                              {colTasks.length}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Sort, Add, Delete */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleSort(col.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${sortDir ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}
                            title="優先度でソート"
                          >
                            <ArrowUpDown size={12} className={sortDir === 'asc' ? 'rotate-180' : ''} />
                            <span>ソート</span>
                          </button>
                          <button 
                            onClick={() => addTask(col.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:opacity-90 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm shadow-indigo-100 dark:shadow-none"
                            style={{ backgroundColor: themeColor }}
                          >
                            <Plus size={12} />
                            <span>追加</span>
                          </button>
                          <button 
                            onClick={() => deleteColumn(col.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-slate-300 hover:text-red-500 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                            title="リストを削除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Task List */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl">
                        <AnimatePresence mode="popLayout">
                          {colTasks.map(task => (
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              assignees={assignees}
                              onEdit={() => setEditingTask(task)}
                              onDelete={() => deleteTask(task.id)}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                            />
                          ))}
                        </AnimatePresence>
                        {colTasks.length === 0 && (
                          <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                            {searchQuery ? (
                              <>
                                <Search size={20} className="mb-1 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">一致なし</p>
                              </>
                            ) : (
                              <p className="text-sm">タスクがありません</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add Column Button */}
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="w-60 h-16 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all shrink-0"
                >
                  <Plus size={20} />
                  <span className="font-bold">リストを追加</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'gantt' ? (
            <GanttChart tasks={filteredTasks} assignees={assignees} onEditTask={setEditingTask} />
          ) : activeTab === 'analytics' ? (
            <AnalyticsView data={analyticsData} />
          ) : (
            <SettingsView 
              onLogout={handleLogout}
              theme={theme}
              setTheme={setTheme}
              language={language}
              setLanguage={setLanguage}
              notifications={notifications}
              setNotifications={setNotifications}
              themeColor={themeColor}
              setThemeColor={setThemeColor}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {editingTask && (
          <TaskModal 
            key={editingTask.id}
            task={editingTask} 
            assignees={assignees}
            projects={projects}
            columns={columns}
            themeColor={themeColor}
            onClose={() => setEditingTask(null)}
            onSave={updateTask}
            onDelete={deleteTask}
          />
        )}
        {isAddingAssignee && (
          <GenericInputModal 
            key="add-assignee-modal"
            onClose={() => setIsAddingAssignee(false)}
            onConfirm={addAssignee}
          />
        )}
        {editingAssigneeId && (
          <GenericInputModal 
            key="edit-assignee-modal"
            onClose={() => setEditingAssigneeId(null)}
            onConfirm={(name, color) => updateAssignee(editingAssigneeId, name, color)}
            title="担当者を編集"
            initialName={assignees.find(a => a.id === editingAssigneeId)?.name}
            initialColor={assignees.find(a => a.id === editingAssigneeId)?.color}
          />
        )}
        {isAddingProject && (
          <GenericInputModal 
            key="add-project-modal"
            onClose={() => setIsAddingProject(false)}
            onConfirm={addProject}
            title="プロジェクトを追加"
            placeholder="プロジェクト名を入力..."
          />
        )}
        {isAddingColumn && (
          <GenericInputModal 
            key="add-column-modal"
            onClose={() => setIsAddingColumn(false)}
            onConfirm={addColumn}
            title="リストを追加"
            placeholder="リスト名を入力..."
          />
        )}
        {editingColumnId && (
          <GenericInputModal 
            key="rename-column-modal"
            onClose={() => setEditingColumnId(null)}
            onConfirm={(title, color) => renameColumn(editingColumnId, title, color)}
            title="リスト名を変更"
            placeholder="新しいリスト名を入力..."
            initialName={columns.find(c => c.id === editingColumnId)?.title}
            initialColor={columns.find(c => c.id === editingColumnId)?.color}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Analytics View Component ---

interface AnalyticsViewProps {
  data: {
    name: string;
    assigned: number;
    completed: number;
    allocationRate: number;
    completionRate: number;
    color: string;
  }[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  return (
    <div className="h-full overflow-y-auto p-4 lg:p-8 space-y-8 bg-[#F4F6F9] dark:bg-slate-950 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Allocation Chart */}
        <section className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <PieChartIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
            タスク割り当て率 (%)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="allocationRate"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Task Completion Rate Chart */}
        <section className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart2 size={20} className="text-emerald-600 dark:text-emerald-400" />
            タスク遂行率 (%)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                <Bar dataKey="completionRate" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Detailed Table */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">担当者別詳細</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">担当者</th>
                <th className="px-6 py-4">割り当て数</th>
                <th className="px-6 py-4">完了数</th>
                <th className="px-6 py-4">割り当て率</th>
                <th className="px-6 py-4">遂行率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map(row => (
                <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: row.color }}>
                      {row.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{row.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{row.assigned} 件</td>
                  <td className="px-6 py-4 text-sm text-emerald-600 dark:text-emerald-400 font-mono">{row.completed} 件</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${row.allocationRate}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white w-10">{row.allocationRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${row.completionRate}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white w-10">{row.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// --- Gantt Chart Component ---

interface GanttChartProps {
  tasks: Task[];
  assignees: Assignee[];
  onEditTask: (t: Task) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, assignees, onEditTask }) => {
  const [viewDate, setViewDate] = useState(new Date());
  
  const days = useMemo(() => {
    const start = startOfWeek(viewDate, { weekStartsOn: 1 });
    const end = addDays(start, 30);
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [tasks]);

  return (
    <div className="h-full flex flex-col bg-[#F4F6F9] dark:bg-slate-950 transition-colors">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {format(viewDate, 'yyyy年 M月', { locale: ja })}
          </h2>
          <div className="flex gap-1">
            <button 
              onClick={() => setViewDate(addDays(viewDate, -7))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setViewDate(new Date())}
              className="px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
            >
              今日
            </button>
            <button 
              onClick={() => setViewDate(addDays(viewDate, 7))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Header Row */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors">
            <div className="w-64 p-4 font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider border-r border-slate-100 dark:border-slate-800 shrink-0">
              タスク
            </div>
            {days.map(day => (
              <div 
                key={day.toISOString()} 
                className={`w-12 p-2 text-center border-r border-slate-50 dark:border-slate-800 shrink-0 ${
                  isSameDay(day, new Date()) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
              >
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {format(day, 'E', { locale: ja })}
                </p>
                <p className={`text-xs font-bold ${
                  isSameDay(day, new Date()) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {sortedTasks.map(task => {
              const start = new Date(task.startDate);
              const end = new Date(task.dueDate);
              const taskAssignees = assignees.filter(a => task.assigneeIds.includes(a.id));
              
              // Calculate position
              const chartStart = days[0];
              const leftOffset = differenceInDays(start, chartStart);
              const duration = Math.max(1, differenceInDays(end, start) + 1);

              return (
                <div key={task.id} className="flex group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <div 
                    className="w-64 p-4 border-r border-slate-100 dark:border-slate-800 shrink-0 cursor-pointer"
                    onClick={() => onEditTask(task)}
                  >
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {task.title}
                    </p>
                    <div className="flex -space-x-1 mt-1">
                      {taskAssignees.map(a => (
                        <div 
                          key={a.id} 
                          className="w-5 h-5 rounded-full border border-white dark:border-slate-800 flex items-center justify-center text-[8px] text-white font-bold"
                          style={{ backgroundColor: a.color }}
                        >
                          {a.avatar.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex relative h-16 items-center">
                    {days.map(day => (
                      <div key={day.toISOString()} className="w-12 h-full border-r border-slate-50 dark:border-slate-800 shrink-0" />
                    ))}
                    
                    {/* Task Bar */}
                    <div 
                      className="absolute h-8 rounded-lg shadow-sm flex items-center px-3 cursor-pointer transition-transform hover:scale-[1.02] z-20"
                      style={{
                        left: `${leftOffset * 48}px`,
                        width: `${duration * 48}px`,
                        backgroundColor: task.status === Status.COMPLETED ? '#10B981' : '#4F46E5',
                        opacity: 0.9
                      }}
                      onClick={() => onEditTask(task)}
                    >
                      <span className="text-[10px] font-bold text-white truncate">
                        {task.title}
                      </span>
                    </div>

                    {/* Today Indicator Line */}
                    {days.some(d => isSameDay(d, new Date())) && (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-indigo-500/30 z-10 pointer-events-none"
                        style={{
                          left: `${differenceInDays(new Date(), days[0]) * 48 + 24}px`
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {sortedTasks.length === 0 && (
              <div className="p-12 text-center text-slate-400 dark:text-slate-600 text-sm">
                表示するタスクがありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  assignees: Assignee[];
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, assignees, onEdit, onDelete, onDragStart, onDragEnd }) => {
  const overdue = isOverdue(task.dueDate) && task.status !== Status.COMPLETED;
  const taskAssignees = assignees.filter(a => task.assigneeIds.includes(a.id));

  const priorityColor = (p: Priority) => {
    switch (p) {
      case Priority.HIGH: return 'bg-red-100 text-red-700';
      case Priority.MEDIUM: return 'bg-amber-100 text-amber-700';
      case Priority.LOW: return 'bg-emerald-100 text-emerald-700';
    }
  };

  const statusColor = (s: Status) => {
    switch (s) {
      case Status.NOT_STARTED: return 'bg-slate-100 text-slate-600';
      case Status.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
      case Status.REVIEW: return 'bg-orange-100 text-orange-700';
      case Status.COMPLETED: return 'bg-emerald-100 text-emerald-700';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className={`group bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-2 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
        overdue ? 'border-red-500 bg-red-50/30 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${priorityColor(task.priority)}`}>
            {task.priority}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColor(task.status)}`}>
            {task.status}
          </span>
          {overdue && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1">
              <AlertCircle size={10} /> 期限切れ
            </span>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>

      <h4 className="font-semibold text-slate-800 dark:text-white mb-2 line-clamp-2">{task.title}</h4>

      {task.memo && (
        <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
            📝 {task.memo}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex -space-x-2">
          {taskAssignees.map(a => (
            <div 
              key={a.id}
              className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden"
              style={{ backgroundColor: a.color }}
              title={a.name}
            >
              <span className="truncate px-1">{a.avatar}</span>
            </div>
          ))}
          {taskAssignees.length === 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600">
              <UserPlus size={12} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
          {task.memo && <MessageSquare size={14} className="text-indigo-400 dark:text-indigo-500" />}
          <div className={`flex items-center gap-1 text-[11px] font-medium ${overdue ? 'text-red-500' : ''}`}>
            <Calendar size={12} />
            {task.startDate === task.dueDate 
              ? task.dueDate.split('-').slice(1).join('/')
              : `${task.startDate.split('-').slice(1).join('/')} - ${task.dueDate.split('-').slice(1).join('/')}`
            }
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface TaskModalProps {
  task: Task;
  assignees: Assignee[];
  projects: Project[];
  columns: Column[];
  onClose: () => void;
  onSave: (t: Task) => void;
  onDelete: (id: string) => void;
  themeColor: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, assignees, projects, columns, onClose, onSave, onDelete, themeColor }) => {
  const [formData, setFormData] = useState<Task>(task);

  const toggleAssignee = (id: string) => {
    const newIds = formData.assigneeIds.includes(id)
      ? formData.assigneeIds.filter(aid => aid !== id)
      : [...formData.assigneeIds, id];
    setFormData({ ...formData, assigneeIds: newIds });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transition-colors"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">タスクを編集</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">タスク名</label>
            <input 
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="タスク名を入力..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">開始日</label>
              <input 
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">期限日</label>
              <input 
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">プロジェクト</label>
              <select 
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">リスト</label>
              <select 
                value={formData.columnId}
                onChange={e => setFormData({ ...formData, columnId: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                {columns.filter(c => c.projectId === formData.projectId).map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">優先度</label>
              <select 
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ステータス</label>
            <div className="flex gap-2">
              {Object.values(Status).map(s => (
                <button
                  key={s}
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                    formData.status === s 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">担当者</label>
            <div className="flex flex-wrap gap-2">
              {assignees.map(a => (
                <button
                  key={a.id}
                  onClick={() => toggleAssignee(a.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                    formData.assigneeIds.includes(a.id)
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold" style={{ backgroundColor: a.color }}>
                    {a.avatar}
                  </div>
                  <span className="text-xs font-medium">{a.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">メモ</label>
            <textarea 
              value={formData.memo}
              onChange={e => setFormData({ ...formData, memo: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="詳細を入力..."
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center transition-colors">
          <button 
            onClick={() => onDelete(task.id)}
            className="text-red-500 dark:text-red-400 text-sm font-bold hover:underline"
          >
            削除する
          </button>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              キャンセル
            </button>
            <button 
              onClick={() => onSave(formData)}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
              style={{ backgroundColor: themeColor }}
            >
              保存する
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#334155', '#71717A'
];

interface GenericInputModalProps {
  onClose: () => void;
  onConfirm: (name: string, color: string) => void;
  title?: string;
  placeholder?: string;
  initialName?: string;
  initialColor?: string;
}

const GenericInputModal: React.FC<GenericInputModalProps> = ({ 
  onClose, 
  onConfirm, 
  title = "担当者を追加", 
  placeholder = "名前を入力...",
  initialName = "",
  initialColor = ""
}) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor || COLORS[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 transition-colors"
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{title}</h3>
        
        <div className="space-y-6 mb-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">名前</label>
            <input 
              type="text"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name && onConfirm(name, color)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder={placeholder}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">カラー</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            キャンセル
          </button>
          <button 
            disabled={!name}
            onClick={() => onConfirm(name, color)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            {initialName ? '更新' : '追加'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DashboardView({ 
  tasks, 
  projects, 
  assignees, 
  onNavigateToProject,
  themeColor,
  theme
}: { 
  tasks: Task[], 
  projects: Project[], 
  assignees: Assignee[],
  onNavigateToProject: (id: string) => void,
  themeColor: string,
  theme: 'light' | 'dark' | 'system'
}) {
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, overdue: 0, completed: 0, statusData: [], priorityData: [], recentTasks: [] };
    
    const total = tasks.length;
    const overdue = tasks.filter(t => isOverdue(t.dueDate) && t.status !== Status.COMPLETED).length;
    const completed = tasks.filter(t => t.status === Status.COMPLETED).length;
    const inProgress = tasks.filter(t => t.status === Status.IN_PROGRESS).length;
    
    const statusData = [
      { name: '未着手', value: tasks.filter(t => t.status === Status.NOT_STARTED).length, color: '#94a3b8' },
      { name: '進行中', value: inProgress, color: themeColor },
      { name: '完了', value: completed, color: '#10b981' },
    ];

    const priorityData = [
      { name: '高', value: tasks.filter(t => t.priority === Priority.HIGH).length, color: '#ef4444' },
      { name: '中', value: tasks.filter(t => t.priority === Priority.MEDIUM).length, color: '#f59e0b' },
      { name: '低', value: tasks.filter(t => t.priority === Priority.LOW).length, color: '#10b981' },
    ];

    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      .slice(0, 5);

    return { total, overdue, completed, statusData, priorityData, recentTasks };
  }, [tasks]);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">ダッシュボード</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">プロジェクト全体の進捗状況を確認できます。</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <LayoutGrid size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">全タスク</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">期限切れ</p>
                <p className="text-2xl font-black text-red-600 dark:text-red-400">{stats.overdue}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">完了済み</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <BarChart2 size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">プロジェクト数</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{projects.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6">ステータス別タスク</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#fff' : '#000' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6">優先度別タスク</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.priorityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                  <Tooltip cursor={{ fill: theme === 'dark' ? '#334155' : '#f8fafc' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#fff' : '#000' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">最近のタスク</h3>
              <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">すべて見る</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recentTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                return (
                  <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project?.color }} />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{task.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{project?.name} • 期限: {task.dueDate}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      task.status === Status.COMPLETED ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                      task.status === Status.IN_PROGRESS ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {task.status === Status.COMPLETED ? '完了' :
                       task.status === Status.IN_PROGRESS ? '進行中' : '未着手'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">プロジェクト一覧</h3>
            </div>
            <div className="p-4 space-y-3">
              {projects.map(project => {
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                const progress = projectTasks.length > 0 
                  ? Math.round((projectTasks.filter(t => t.status === Status.COMPLETED).length / projectTasks.length) * 100)
                  : 0;
                
                return (
                  <button 
                    key={project.id}
                    onClick={() => onNavigateToProject(project.id)}
                    className="w-full p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{project.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-500" 
                        style={{ width: `${progress}%`, backgroundColor: project.color }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ 
  onLogout,
  theme,
  setTheme,
  language,
  setLanguage,
  notifications,
  setNotifications,
  themeColor,
  setThemeColor
}: { 
  onLogout: () => void,
  theme: 'light' | 'dark' | 'system',
  setTheme: (t: 'light' | 'dark' | 'system') => void,
  language: string,
  setLanguage: (l: string) => void,
  notifications: { push: boolean, email: boolean, weekly: boolean },
  setNotifications: (n: { push: boolean, email: boolean, weekly: boolean }) => void,
  themeColor: string,
  setThemeColor: (c: string) => void
}) {
  const [activeModal, setActiveModal] = useState<'profile' | 'password' | 'security' | 'notifications' | 'appearance' | 'language' | null>(null);
  
  const settingsGroups = [
    {
      title: 'アカウント設定',
      items: [
        { icon: User, label: 'プロフィール編集', description: '名前、アバター、表示名の設定', type: 'profile' as const },
        { icon: Lock, label: 'パスワード変更', description: 'セキュリティ向上のための定期的な変更', type: 'password' as const },
        { icon: Shield, label: 'セキュリティ設定', description: '2段階認証、ログイン履歴の確認', type: 'security' as const },
      ]
    },
    {
      title: 'アプリケーション設定',
      items: [
        { icon: Bell, label: '通知設定', description: 'プッシュ通知、メール通知のON/OFF', type: 'notifications' as const },
        { icon: Palette, label: '外観設定', description: 'ダークモード、テーマカラーの変更', type: 'appearance' as const },
        { icon: Globe, label: '言語・地域', description: '表示言語、タイムゾーンの設定', type: 'language' as const },
      ]
    }
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">設定</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">アカウントとアプリケーションのカスタマイズを行います。</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <Settings className="text-slate-400 dark:text-slate-500" size={24} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsGroups.map((group, idx) => (
            <div key={idx} className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">{group.title}</h3>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                {group.items.map((item, iIdx) => (
                  <button
                    key={iIdx}
                    onClick={() => setActiveModal(item.type)}
                    className={`w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      iIdx !== group.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                      <item.icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
              <LogOut size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">ログアウト</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">現在のセッションを終了します</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="px-6 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>

      <AnimatePresence>
        {activeModal && (
          <SettingsModal 
            type={activeModal} 
            onClose={() => setActiveModal(null)}
            theme={theme}
            setTheme={setTheme}
            language={language}
            setLanguage={setLanguage}
            notifications={notifications}
            setNotifications={setNotifications}
            themeColor={themeColor}
            setThemeColor={setThemeColor}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface SettingsModalProps {
  type: 'profile' | 'password' | 'security' | 'notifications' | 'appearance' | 'language';
  onClose: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  language: string;
  setLanguage: (l: string) => void;
  notifications: { push: boolean, email: boolean, weekly: boolean };
  setNotifications: (n: { push: boolean, email: boolean, weekly: boolean }) => void;
  themeColor: string;
  setThemeColor: (c: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  type, 
  onClose,
  theme,
  setTheme,
  language,
  setLanguage,
  notifications,
  setNotifications,
  themeColor,
  setThemeColor
}) => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const renderContent = () => {
    switch (type) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg dark:shadow-none" style={{ backgroundColor: themeColor }}>
                管
              </div>
              <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline" style={{ color: themeColor }}>アバターを変更</button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ユーザー名</label>
                <input type="text" defaultValue="admin" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">表示名</label>
                <input type="text" defaultValue="管理者" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">メールアドレス</label>
                <input type="email" defaultValue="admin@example.com" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" />
              </div>
            </div>
          </div>
        );
      case 'password':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">現在のパスワード</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">新しいパスワード</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">新しいパスワード（確認）</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" />
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">2段階認証</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">ログイン時のセキュリティを強化します</p>
              </div>
              <div 
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${twoFactorEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                style={{ backgroundColor: twoFactorEnabled ? themeColor : undefined }}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${twoFactorEnabled ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ログイン履歴</label>
              <div className="space-y-2">
                {[
                  { device: 'MacBook Pro', location: 'Tokyo, JP', time: '2時間前' },
                  { device: 'iPhone 15', location: 'Tokyo, JP', time: '5時間前' },
                ].map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{h.device}</p>
                      <p className="text-slate-400 dark:text-slate-500">{h.location}</p>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-4">
            {[
              { key: 'push', label: 'プッシュ通知', desc: 'ブラウザでのデスクトップ通知' },
              { key: 'email', label: 'メール通知', desc: 'タスクの期限や更新をメールで受け取る' },
              { key: 'weekly', label: '週次レポート', desc: '1週間の進捗サマリーを受け取る' },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{n.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{n.desc}</p>
                </div>
                <div 
                  onClick={() => setNotifications({ ...notifications, [n.key]: !notifications[n.key as keyof typeof notifications] })}
                  className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${notifications[n.key as keyof typeof notifications] ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                  style={{ backgroundColor: notifications[n.key as keyof typeof notifications] ? themeColor : undefined }}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notifications[n.key as keyof typeof notifications] ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
            ))}
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">テーマモード</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', label: 'ライト' },
                  { id: 'dark', label: 'ダーク' },
                  { id: 'system', label: 'システム' }
                ].map((m) => (
                  <button 
                    key={m.id} 
                    onClick={() => setTheme(m.id as any)}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all ${theme === m.id ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    style={theme === m.id ? { color: themeColor, borderColor: themeColor + '44' } : {}}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">テーマカラー</label>
              <div className="flex flex-wrap gap-3">
                {['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'].map((c) => (
                  <button 
                    key={c} 
                    onClick={() => setThemeColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${themeColor === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-110'}`} 
                    style={{ backgroundColor: c, ringColor: c }} 
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case 'language':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">表示言語</label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              >
                <option>日本語</option>
                <option>English</option>
                <option>中文</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">タイムゾーン</label>
              <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors">
                <option>(GMT+09:00) Tokyo, Osaka, Sapporo</option>
                <option>(GMT+00:00) London, Dublin, Lisbon</option>
                <option>(GMT-05:00) New York, Miami, Toronto</option>
              </select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const titles = {
    profile: 'プロフィール編集',
    password: 'パスワード変更',
    security: 'セキュリティ設定',
    notifications: '通知設定',
    appearance: '外観設定',
    language: '言語・地域設定',
  };

  const icons = {
    profile: User,
    password: Lock,
    security: Shield,
    notifications: Bell,
    appearance: Palette,
    language: Globe,
  };

  const Icon = icons[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transition-colors"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Icon size={18} />
            </div>
            {titles[type]}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {renderContent()}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 transition-colors">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            キャンセル
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
            style={{ backgroundColor: themeColor }}
          >
            保存する
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(id, password);
      onLogin();
    } catch {
      setError('IDまたはパスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 transition-colors"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200 dark:shadow-none">
            <CheckCircle2 className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">タスク管理システム</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">アカウントにログインしてください</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ID</label>
            <input 
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="ユーザーIDを入力"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">パスワード</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="パスワードを入力"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs font-bold text-center"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]"
          >
            ログイン
          </button>
        </form>
      </motion.div>
    </div>
  );
}
