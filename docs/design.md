# プロフェッショナル・タスクボード — デザイン仕様書

## 1. 全体アーキテクチャ

### 1.1 アプリケーション構成
```
App (ErrorBoundary)
 └── AppContent（メインコンテナ）
      ├── Login（ログイン画面）
      ├── Sidebar（サイドバー）
      ├── Header（ヘッダー + タブ切り替え）
      ├── DashboardView（ダッシュボード）
      ├── BoardView（カンバンボード — インライン）
      │    ├── Column（カラム）
      │    └── TaskCard（タスクカード）
      ├── GanttChart（ガントチャート）
      ├── AnalyticsView（分析ビュー）
      ├── SettingsView（設定画面）
      │    └── SettingsModal（設定詳細モーダル）
      ├── TaskModal（タスク編集モーダル）
      └── GenericInputModal（汎用入力モーダル）
```

### 1.2 ファイル構成
```
src/
├── App.tsx         # 全コンポーネント（約2,484行の単一ファイル）
├── types.ts        # 型定義（Priority, Status, Task, Assignee, Project, Column）
├── constants.ts    # 初期データ（サンプルプロジェクト・カラム・担当者・タスク）
├── index.css       # グローバルスタイル（Tailwind インポート、スクロールバー）
└── main.tsx        # エントリーポイント
```

## 2. 画面構成

### 2.1 レイアウト
```
┌──────────────────────────────────────────────────┐
│  Sidebar (w-64)  │  Main Content (flex-1)        │
│                  │  ┌────────────────────────┐    │
│  [Logo]          │  │ Header (h-16/h-20)     │    │
│  [User Info]     │  │ [Project] [Tabs] [Time]│    │
│                  │  ├────────────────────────┤    │
│  Projects        │  │ Sub-header (Search)    │    │
│  ├ Project 1     │  ├────────────────────────┤    │
│  ├ Project 2     │  │                        │    │
│  └ Project 3     │  │   Active Tab Content   │    │
│                  │  │   (Board/Gantt/etc.)   │    │
│  Assignees       │  │                        │    │
│  [Avatars Grid]  │  │                        │    │
│                  │  │                        │    │
│  Stats           │  └────────────────────────┘    │
│  [Total] [Over]  │                                │
│                  │         [Warning Popups]        │
│  [Settings]      │         (fixed bottom-right)    │
│  [Logout]        │                                │
│  [Hint]          │                                │
└──────────────────────────────────────────────────┘
```

### 2.2 ナビゲーション（タブ）
| タブ | ID | アイコン | 説明 |
|---|---|---|---|
| ボード | `board` | LayoutGrid | カンバンボード |
| ガント | `gantt` | BarChart2 | ガントチャート |
| 分析 | `analytics` | PieChart | 分析ダッシュボード |

※ ダッシュボードはロゴクリック、設定はサイドバーから遷移。

## 3. カラーシステム

### 3.1 ベースカラー
| 用途 | ライトモード | ダークモード |
|---|---|---|
| 背景（メイン） | `#F4F6F9` | slate-950 |
| 背景（カード） | white | slate-900 |
| 背景（サイドバー） | white | slate-900 |
| テキスト（主） | slate-800 | slate-200 |
| テキスト（副） | slate-500 | slate-400 |
| ボーダー | slate-200 | slate-800 |
| アクセント | indigo-600 (カスタマイズ可) | 同左 |

### 3.2 優先度カラー
| 優先度 | バッジカラー |
|---|---|
| 高 | bg-red-100 / text-red-700 |
| 中 | bg-amber-100 / text-amber-700 |
| 低 | bg-emerald-100 / text-emerald-700 |

### 3.3 ステータスカラー
| ステータス | バッジカラー |
|---|---|
| 未着手 | bg-slate-100 / text-slate-600 |
| 進行中 | bg-blue-100 / text-blue-700 |
| レビュー待ち | bg-orange-100 / text-orange-700 |
| 完了 | bg-emerald-100 / text-emerald-700 |

### 3.4 警告ポップアップカラー
| 種別 | 背景 | アクセント |
|---|---|---|
| 未割当 | amber-50 / amber-200 | amber-600 |
| 期限間近 | blue-50 / blue-200 | blue-600 |
| 期限超過 | red-50 / red-200 | red-600 |

### 3.5 テーマカラー（カスタマイズ可能）
デフォルト: `#4F46E5`（Indigo）
選択肢: `#4F46E5`, `#10B981`, `#F59E0B`, `#EF4444`, `#8B5CF6`, `#EC4899`, `#06B6D4`

CSS変数によるアクセントカラー動的変更:
- `--color-indigo-500`, `--color-indigo-600`, `--color-indigo-700`
- `--accent-color`

## 4. コンポーネント仕様

### 4.1 Login（ログイン画面）
- 中央配置カード（max-w-md）
- ロゴ + タイトル + 説明文
- ID / パスワード入力フィールド
- エラーメッセージ（フェードイン）
- 送信ボタン（押下時スケールアニメーション）
- 認証ロジック: `id === 'admin' && password === 'admin'`

### 4.2 Sidebar（サイドバー）
- **モバイル**: オーバーレイ付きスライドイン（`translate-x`）
- **デスクトップ**: 固定表示（`lg:relative`）
- セクション:
  1. ロゴ（クリックでダッシュボードへ）
  2. ユーザー情報（アバター + 名前）
  3. プロジェクト一覧（追加ボタン付き、ホバーで削除ボタン表示）
  4. 担当者グリッド（4列、アバター、ホバーで編集/削除ボタン）
  5. 統計（全タスク数、期限切れ数）
  6. システム（設定、ログアウト）
  7. ヒントバナー

### 4.3 TaskCard（タスクカード）
- ドラッグ可能（HTML5 Drag & Drop API）
- Motion layoutアニメーション
- 構成:
  - 上部: 優先度バッジ + ステータスバッジ + 期限切れバッジ（条件付き）+ 削除ボタン（ホバー表示）
  - 中部: タスクタイトル（2行クランプ）
  - メモ表示（ある場合、2行クランプ、イタリック）
  - 下部: 担当者アバター群 + メモアイコン + 日付表示
- 期限切れ時: 赤枠ボーダー + 赤背景
- ホバー時: シャドウ強調 + 上方向移動

### 4.4 TaskModal（タスク編集モーダル）
- バックドロップブラー
- フォームフィールド:
  - タスク名（テキスト入力）
  - 開始日 / 期限日（日付ピッカー、2列）
  - プロジェクト / カラム（セレクトボックス、2列、カラムはプロジェクト連動フィルタ）
  - 優先度（セレクトボックス）
  - ステータス（ボタントグル、4択）
  - 担当者（チップトグル、複数選択可）
  - メモ（テキストエリア）
- フッター: 削除リンク + キャンセル + 保存ボタン

### 4.5 GenericInputModal（汎用入力モーダル）
- 名前入力 + カラーピッカー（12色グリッド）
- Enterキーでの確定対応
- 用途: 担当者追加/編集、プロジェクト追加、カラム追加/名前変更

### 4.6 GanttChart（ガントチャート）
- ヘッダー: 年月表示 + 前週/今日/次週ナビゲーション
- 固定左列（w-264px）: タスク名 + 担当者アバター
- スクロール可能な右領域: 31日分のグリッド
- タスクバー: 開始日〜期限日の期間、最小幅1日
- 今日のハイライト: カラム背景 + 縦線インジケーター
- 1セル幅: 48px（w-12）

### 4.7 DashboardView（ダッシュボード）
- 4列統計カード（全タスク / 期限切れ / 完了済み / プロジェクト数）
- 2列チャート（ステータス別ドーナツ / 優先度別棒グラフ）
- 3列下段（最近のタスク5件 + プロジェクト一覧プログレスバー）

### 4.8 AnalyticsView（分析ビュー）
- 2列チャート（割り当て率ドーナツ / 遂行率横棒グラフ）
- 詳細テーブル（担当者名、割り当て数、完了数、割り当て率バー、遂行率バー）

### 4.9 SettingsView（設定画面）
- 2列カード型レイアウト
- アカウント設定: プロフィール / パスワード / セキュリティ
- アプリケーション設定: 通知 / 外観 / 言語
- 各項目クリックでSettingsModal表示
- ログアウトカード（赤アクセント）

## 5. インタラクション

### 5.1 ドラッグ＆ドロップ
- HTML5 Drag & Drop API使用
- ドラッグ開始: 元要素の透明度を0.4に
- ドラッグ中: ターゲットカラムにリング表示 + 背景色変更
- ドロップ: タスクのcolumnIdを更新
- ドラッグ終了: 透明度リセット

### 5.2 アニメーション
- **モーダル**: scale(0.9→1) + fade + y方向移動
- **タスクカード**: layout + fade + y方向移動、exit: scale(0.95)
- **サイドバー（モバイル）**: translateX
- **警告ポップアップ**: x方向スライドイン
- **ログインエラー**: フェードイン

### 5.3 リアルタイム
- 1秒間隔で現在時刻更新（`setInterval`）

## 6. レスポンシブ対応

| ブレークポイント | サイドバー | ヘッダー | ボード |
|---|---|---|---|
| モバイル (< lg) | オーバーレイ（トグル） | h-16、コンパクト | 横スクロール |
| デスクトップ (>= lg) | 固定表示 (w-64) | h-20、フル表示 | 横スクロール |

モバイル時の省略表示:
- タブラベル: 1文字略称（B/G/A）
- プロジェクト名: max-w-[60px] truncate
- 時計: 非表示（`hidden md:flex`）

## 7. 状態管理

全状態は`AppContent`コンポーネントの`useState`で管理（ローカルステート）。

### 主要state一覧
| state | 型 | 用途 |
|---|---|---|
| isLoggedIn | boolean | ログイン状態 |
| isSidebarOpen | boolean | サイドバー表示（モバイル） |
| tasks | Task[] | タスク一覧 |
| projects | Project[] | プロジェクト一覧 |
| columns | Column[] | カラム一覧 |
| assignees | Assignee[] | 担当者一覧 |
| selectedProjectId | string | 選択中プロジェクト |
| selectedAssigneeId | string \| null | フィルタ中担当者 |
| activeTab | string | アクティブタブ |
| editingTask | Task \| null | 編集中タスク |
| draggedTaskId | string \| null | ドラッグ中タスクID |
| dropTargetColumn | string \| null | ドロップターゲットカラムID |
| searchQuery | string | 検索クエリ |
| sortConfig | Record<string, 'asc'\|'desc'\|null> | カラムごとソート状態 |
| currentTime | Date | 現在時刻（1秒更新） |
| theme | 'light'\|'dark'\|'system' | テーマ（localStorage永続化） |
| themeColor | string | テーマカラー（localStorage永続化） |
| notifications | object | 通知設定 |

## 8. データフロー

```
初期データ (constants.ts)
    ↓
useState で保持
    ↓
useMemo でフィルタ・ソート・集計
    ↓
子コンポーネントへ props で渡す
    ↓
コールバックで親の setState を呼び出し
    ↓
再レンダリング
```

※ 現在はバックエンド連携なし。全データはブラウザメモリ内に存在し、リロードで初期値に戻る。

## 9. データベース設計（PostgreSQL）

Render.com + PostgreSQL によるデプロイに向け、フロントエンドのインメモリデータを永続化するためのDB設計。
現在の App.tsx 内の全データモデル・削除動作・設定管理を分析し、PostgreSQL テーブル定義として設計した。

### 9.1 永続化対象データ

| データ | 現在の保管先 | 永続化の必要性 | テーブル名 |
|---|---|---|---|
| ユーザー認証情報 | ハードコード (`admin`/`admin`) | 必須 | `users` |
| ユーザー設定（テーマ・通知等） | localStorage（一部のみ） | 必須 | `user_settings` |
| ログイン履歴 | UIモックのみ | 必要 | `login_history` |
| プロジェクト | インメモリ (`useState`) | 必須 | `projects` |
| カラム（リスト） | インメモリ (`useState`) | 必須 | `columns` |
| タスク | インメモリ (`useState`) | 必須 | `tasks` |
| 担当者 | インメモリ (`useState`) | 必須 | `assignees` |
| タスク↔担当者の紐付け | インメモリ (`assigneeIds`配列) | 必須 | `task_assignees` |

### 9.2 テーブル一覧と目的

| # | テーブル名 | 目的 | 主キー |
|---|---|---|---|
| 1 | `users` | 認証・プロフィール管理 | UUID |
| 2 | `user_settings` | ユーザーごとの設定（テーマ、カラー、言語、通知） | UUID（1:1） |
| 3 | `login_history` | ログイン履歴（デバイス、IP、場所） | UUID |
| 4 | `projects` | プロジェクト管理 | UUID |
| 5 | `columns` | カラム/リスト管理（プロジェクトに紐付け） | UUID |
| 6 | `assignees` | 担当者マスタ | UUID |
| 7 | `tasks` | タスク本体 | UUID |
| 8 | `task_assignees` | タスク↔担当者の多対多中間テーブル | 複合主キー |

### 9.3 ER図（テキスト）

```
users ─────────┬──── 1:1 ──── user_settings
               │
               ├──── 1:N ──── login_history
               │
               └──── 1:N ──── projects
                                 │
                                 ├──── 1:N ──── columns
                                 │                 │
                                 │                 └──── 1:N ──── tasks
                                 │                                  │
                                 └─── (FK) ────────────────────────┘
                                                                    │
assignees ────────────────── N:M ──── task_assignees ──── N:M ─────┘
     │
     └──── (user_id NULLable: 将来のユーザー紐付け用)
```

### 9.4 ENUM型定義

```sql
-- ============================================================
-- ENUM型定義
-- ============================================================

-- 優先度（フロントエンド Priority enum に対応）
CREATE TYPE priority_level AS ENUM ('高', '中', '低');

-- ステータス（フロントエンド Status enum に対応）
CREATE TYPE task_status AS ENUM ('未着手', '進行中', 'レビュー待ち', '完了');

-- テーマ（SettingsView の外観設定に対応）
CREATE TYPE theme_type AS ENUM ('light', 'dark', 'system');
```

### 9.5 テーブル定義（CREATE TABLE）

```sql
-- ============================================================
-- 拡張機能
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. users — 認証・プロフィール
-- ============================================================
-- 現在: admin/admin ハードコード → bcryptパスワードハッシュに移行
-- 設定画面: displayName='管理者', email='admin@example.com'
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(50)  NOT NULL UNIQUE,          -- ログインID（現在 'admin'）
    password_hash   TEXT         NOT NULL,                  -- bcrypt ハッシュ（pgcrypto使用）
    display_name    VARCHAR(100) NOT NULL DEFAULT '',       -- 表示名（設定画面の「管理者」）
    email           VARCHAR(255) UNIQUE,                    -- メールアドレス
    avatar_url      TEXT,                                   -- プロフィール画像URL
    two_factor_enabled BOOLEAN  NOT NULL DEFAULT FALSE,     -- 2段階認証（設定画面 twoFactorEnabled）
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,     -- アカウント有効フラグ
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. user_settings — ユーザーごとの設定
-- ============================================================
-- 現在: theme/themeColor は localStorage、notifications/language は useState
-- 1ユーザー1レコード（1:1）
CREATE TABLE user_settings (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme             theme_type   NOT NULL DEFAULT 'light',       -- 'light'|'dark'|'system'
    theme_color       VARCHAR(7)   NOT NULL DEFAULT '#4F46E5',     -- HEXカラーコード
    language          VARCHAR(20)  NOT NULL DEFAULT '日本語',       -- 言語設定
    timezone          VARCHAR(50)  NOT NULL DEFAULT 'Asia/Tokyo',  -- タイムゾーン
    notify_push       BOOLEAN      NOT NULL DEFAULT TRUE,          -- プッシュ通知
    notify_email      BOOLEAN      NOT NULL DEFAULT FALSE,         -- メール通知
    notify_weekly     BOOLEAN      NOT NULL DEFAULT FALSE,         -- 週次レポート
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. login_history — ログイン履歴
-- ============================================================
-- 現在: 設定画面のセキュリティセクションにUIモックのみ存在
CREATE TABLE login_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_in_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ip_address      INET,                                    -- IPv4/IPv6対応
    user_agent      TEXT,                                    -- ブラウザ情報
    device_type     VARCHAR(50),                             -- 'desktop'|'mobile'|'tablet'
    location        VARCHAR(100)                             -- おおよその地理情報
);

-- ============================================================
-- 4. projects — プロジェクト
-- ============================================================
-- 現在: { id, name, color, notes? } — useStateで管理
-- owner_id でユーザーに紐付け（マルチユーザー対応準備）
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    color           VARCHAR(7)   NOT NULL DEFAULT '#4F46E5',  -- HEXカラーコード
    notes           TEXT,                                     -- 共有事項メモ（Project.notes）
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. columns — カラム/リスト
-- ============================================================
-- 現在: { id, title, projectId, order, color? }
-- sort_order で表示順を管理
CREATE TABLE columns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    sort_order      INTEGER      NOT NULL DEFAULT 0,          -- Column.order に対応
    color           VARCHAR(7),                               -- ヘッダーカラー（オプション）
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. assignees — 担当者マスタ
-- ============================================================
-- 現在: { id, name, avatar, color }
-- user_id: 将来ユーザーアカウントと紐付け可能（NULLable）
CREATE TABLE assignees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         REFERENCES users(id) ON DELETE SET NULL,  -- 将来の紐付け用
    name            VARCHAR(100) NOT NULL,
    avatar          VARCHAR(50)  NOT NULL,                    -- アバター表示テキスト（姓）
    color           VARCHAR(7)   NOT NULL DEFAULT '#4F46E5',  -- HEXカラーコード
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. tasks — タスク
-- ============================================================
-- 現在: { id, title, startDate, dueDate, priority, status, memo, assigneeIds[], columnId, projectId }
-- assigneeIds は task_assignees テーブルに正規化
CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_id       UUID         NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    start_date      DATE         NOT NULL,
    due_date        DATE         NOT NULL,
    priority        priority_level NOT NULL DEFAULT '中',
    status          task_status    NOT NULL DEFAULT '未着手',
    memo            TEXT         NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- 開始日 ≤ 期限日の制約
    CONSTRAINT chk_dates CHECK (start_date <= due_date)
);

-- ============================================================
-- 8. task_assignees — タスク↔担当者 多対多中間テーブル
-- ============================================================
-- 現在: Task.assigneeIds: string[] を正規化
-- 複合主キーで重複防止
CREATE TABLE task_assignees (
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assignee_id     UUID NOT NULL REFERENCES assignees(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (task_id, assignee_id)
);
```

### 9.6 updated_at 自動更新トリガー

```sql
-- ============================================================
-- updated_at 自動更新トリガー関数
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを適用
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_columns_updated_at
    BEFORE UPDATE ON columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_assignees_updated_at
    BEFORE UPDATE ON assignees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 9.7 インデックス戦略

```sql
-- ============================================================
-- インデックス
-- ============================================================

-- users: ログイン時のユーザー名検索
CREATE INDEX idx_users_username ON users(username);

-- user_settings: ユーザーIDでの設定取得
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- login_history: ユーザーごとの履歴取得（新しい順）
CREATE INDEX idx_login_history_user_id ON login_history(user_id, logged_in_at DESC);

-- projects: オーナーごとのプロジェクト一覧
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- columns: プロジェクトごとのカラム一覧（表示順）
CREATE INDEX idx_columns_project_id ON columns(project_id, sort_order);

-- tasks: カラムごとのタスク一覧
CREATE INDEX idx_tasks_column_id ON tasks(column_id);

-- tasks: プロジェクトごとのタスク一覧
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

-- tasks: 期限切れ検索（ステータスが完了でないタスクの期限日）
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != '完了';

-- tasks: ステータス別の集計・フィルタ
CREATE INDEX idx_tasks_status ON tasks(status);

-- task_assignees: 担当者からのタスク逆引き
CREATE INDEX idx_task_assignees_assignee_id ON task_assignees(assignee_id);

-- assignees: ユーザー紐付け検索
CREATE INDEX idx_assignees_user_id ON assignees(user_id) WHERE user_id IS NOT NULL;
```

### 9.8 ON DELETE 戦略

フロントエンドの削除動作と一致させる設計。

| 親テーブル | 子テーブル | ON DELETE | フロントエンドの対応動作 |
|---|---|---|---|
| `users` | `user_settings` | CASCADE | — |
| `users` | `login_history` | CASCADE | — |
| `users` | `projects` | CASCADE | — |
| `users` | `assignees.user_id` | SET NULL | 担当者自体は残し、ユーザー紐付けのみ解除 |
| `projects` | `columns` | CASCADE | `removeProject()`: プロジェクト配下を全削除 |
| `projects` | `tasks` | CASCADE | `removeProject()`: `tasks.filter(t => t.projectId !== id)` |
| `columns` | `tasks` | CASCADE | `deleteColumn()`: `tasks.filter(t => t.columnId !== id)` |
| `tasks` | `task_assignees` | CASCADE | `deleteTask()`: タスク削除で紐付けも消える |
| `assignees` | `task_assignees` | CASCADE | `removeAssignee()`: 担当者削除でタスクとの紐付けを解除（タスク自体は残る） |

**フロントエンド動作との対応表:**

```
removeProject(id):
  App.tsx   → setProjects(filter), setTasks(filter)
  DB        → DELETE FROM projects WHERE id = ? → CASCADE で columns, tasks, task_assignees 全削除

deleteColumn(id):
  App.tsx   → setColumns(filter), setTasks(filter)
  DB        → DELETE FROM columns WHERE id = ? → CASCADE で tasks, task_assignees 削除

removeAssignee(id):
  App.tsx   → setAssignees(filter), setTasks(map: assigneeIds.filter)
  DB        → DELETE FROM assignees WHERE id = ? → CASCADE で task_assignees のみ削除（タスク自体は残る）

deleteTask(id):
  App.tsx   → setTasks(filter)
  DB        → DELETE FROM tasks WHERE id = ? → CASCADE で task_assignees 削除
```

### 9.9 設計補足

#### フロントエンドとの命名対応

| フロントエンド（TypeScript） | データベース（PostgreSQL） | 備考 |
|---|---|---|
| `Task.assigneeIds: string[]` | `task_assignees` テーブル | 配列 → 正規化（中間テーブル） |
| `Column.order: number` | `columns.sort_order` | `order` はSQL予約語のため `sort_order` に変更 |
| `Column.projectId` | `columns.project_id` | camelCase → snake_case |
| `Task.columnId` | `tasks.column_id` | 同上 |
| `Task.projectId` | `tasks.project_id` | 同上 |
| `Priority` enum (高/中/低) | `priority_level` 型 | PostgreSQL ENUM として定義 |
| `Status` enum (未着手/進行中/レビュー待ち/完了) | `task_status` 型 | 同上 |

#### 注意: tasks テーブルの project_id 冗長性

`tasks.project_id` は `columns.project_id` から導出可能（タスクはカラムに属し、カラムはプロジェクトに属する）だが、以下の理由で保持する:

1. **フロントエンドとの整合性**: 現在の `Task` 型が `projectId` を持つ
2. **クエリ効率**: プロジェクト単位でのタスク取得が頻繁に行われる（`tasks.filter(t => t.projectId === selectedProjectId)`）
3. **将来の柔軟性**: タスクのプロジェクト間移動に対応可能

整合性を保つため、アプリケーション層で `tasks.project_id` と `columns.project_id` の一致を保証する。

#### フロントエンドの既知の問題

- `removeProject()` は `columns` を削除していない（`setColumns` の更新がない）。DB側では `ON DELETE CASCADE` で自動削除されるため問題ないが、フロントエンド側は修正が望ましい。
- `removeProject()` に最低1件の制約（`if (projects.length <= 1) return`）があるが、DB側にはこの制約を設けていない。アプリケーション層で制御する。
