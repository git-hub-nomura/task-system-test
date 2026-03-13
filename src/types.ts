export enum Priority {
  HIGH = '高',
  MEDIUM = '中',
  LOW = '低',
}

export enum Status {
  NOT_STARTED = '未着手',
  IN_PROGRESS = '進行中',
  REVIEW = 'レビュー待ち',
  COMPLETED = '完了',
}

export interface Assignee {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Column {
  id: string;
  title: string;
  projectId: string;
  order: number;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  startDate: string;
  dueDate: string;
  priority: Priority;
  status: Status;
  memo: string;
  assigneeIds: string[];
  columnId: string;
  projectId: string;
}

export type SortOption = 'priority' | 'dueDate';
