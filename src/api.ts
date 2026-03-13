import type { Task, Project, Column, Assignee } from './types';

const API_BASE = '/api';

// --- トークン管理 ---
let token: string | null = localStorage.getItem('authToken');

export function getToken(): string | null {
  return token;
}

export function setToken(t: string | null): void {
  token = t;
  if (t) {
    localStorage.setItem('authToken', t);
  } else {
    localStorage.removeItem('authToken');
  }
}

// --- fetch ラッパー ---
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.reload();
    throw new Error('認証エラー');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// --- 認証 ---
export async function login(username: string, password: string): Promise<{ token: string; user: { id: string; username: string; displayName: string } }> {
  const data = await request<{ token: string; user: { id: string; username: string; displayName: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<{ id: string; username: string; displayName: string }> {
  return request('/auth/me');
}

// --- プロジェクト ---
export async function getProjects(): Promise<Project[]> {
  return request('/projects');
}

export async function createProject(data: { name: string; color?: string; notes?: string }): Promise<Project> {
  return request('/projects', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteProject(id: string): Promise<void> {
  await request(`/projects/${id}`, { method: 'DELETE' });
}

// --- カラム ---
export async function getColumns(): Promise<Column[]> {
  return request('/columns');
}

export async function createColumn(data: { title: string; projectId: string; color?: string }): Promise<Column> {
  return request('/columns', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateColumn(id: string, data: { title?: string; color?: string }): Promise<Column> {
  return request(`/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteColumn(id: string): Promise<void> {
  await request(`/columns/${id}`, { method: 'DELETE' });
}

// --- タスク ---
export async function getTasks(): Promise<Task[]> {
  return request('/tasks');
}

export async function createTask(data: Omit<Task, 'id'>): Promise<Task> {
  return request('/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteTask(id: string): Promise<void> {
  await request(`/tasks/${id}`, { method: 'DELETE' });
}

// --- 担当者 ---
export async function getAssignees(): Promise<Assignee[]> {
  return request('/assignees');
}

export async function createAssignee(data: { name: string; color?: string }): Promise<Assignee> {
  return request('/assignees', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAssignee(id: string, data: { name?: string; color?: string }): Promise<Assignee> {
  return request(`/assignees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteAssignee(id: string): Promise<void> {
  await request(`/assignees/${id}`, { method: 'DELETE' });
}

// --- 設定 ---
export interface Settings {
  theme: 'light' | 'dark' | 'system';
  themeColor: string;
  language: string;
  timezone: string;
  notifyPush: boolean;
  notifyEmail: boolean;
  notifyWeekly: boolean;
}

export async function getSettings(): Promise<Settings> {
  return request('/settings');
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  return request('/settings', { method: 'PUT', body: JSON.stringify(data) });
}
