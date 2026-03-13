# プロフェッショナル・タスクボード — 実装TODO

## フェーズ1: コード品質・構造改善（リファクタリング）

### 1.1 ファイル分割
- [ ] App.tsx（約2,484行）をコンポーネント単位に分割
  - [ ] `components/Login.tsx` — ログイン画面
  - [ ] `components/Sidebar.tsx` — サイドバー
  - [ ] `components/Header.tsx` — ヘッダー
  - [ ] `components/DashboardView.tsx` — ダッシュボード
  - [ ] `components/BoardView.tsx` — ボードビュー
  - [ ] `components/TaskCard.tsx` — タスクカード
  - [ ] `components/GanttChart.tsx` — ガントチャート
  - [ ] `components/AnalyticsView.tsx` — 分析ビュー
  - [ ] `components/SettingsView.tsx` — 設定画面
  - [ ] `components/modals/TaskModal.tsx` — タスク編集モーダル
  - [ ] `components/modals/GenericInputModal.tsx` — 汎用入力モーダル
  - [ ] `components/modals/SettingsModal.tsx` — 設定モーダル

### 1.2 状態管理の整理
- [ ] useReducerまたはContext APIへの移行検討
- [ ] カスタムフック抽出（`useTaskManager`, `useProjectManager`, `useTheme` など）

### 1.3 ヘルパー関数の分離
- [ ] `utils/date.ts` — 日付関連ユーティリティ
- [ ] `utils/sort.ts` — ソート関連ユーティリティ

---

## フェーズ2: バックエンド実装（データ永続化）

### 2.1 データベース設計
- [ ] SQLiteスキーマ定義（projects, columns, tasks, assignees, users テーブル）
- [ ] マイグレーション仕組みの構築

### 2.2 APIサーバー構築
- [ ] Express サーバーセットアップ（`server/index.ts`）
- [ ] RESTful APIエンドポイント設計
  - [ ] `GET/POST /api/projects` — プロジェクトCRUD
  - [ ] `GET/POST /api/columns` — カラムCRUD
  - [ ] `GET/POST /api/tasks` — タスクCRUD
  - [ ] `GET/POST /api/assignees` — 担当者CRUD
  - [ ] `PATCH /api/tasks/:id/move` — タスク移動（D&D用）
- [ ] better-sqlite3 による DB操作実装

### 2.3 フロントエンド連携
- [ ] APIクライアント作成（fetch ラッパー）
- [ ] インメモリ状態 → API呼び出しへの置き換え
- [ ] ローディング状態・エラーハンドリング追加

---

## フェーズ3: 認証システム

### 3.1 認証基盤
- [ ] ハードコードログイン → 実認証への置き換え
- [ ] ユーザーテーブル設計（パスワードハッシュ化）
- [ ] JWTトークン認証の実装
- [ ] セッション管理

### 3.2 認証関連UI
- [ ] ユーザー登録画面
- [ ] パスワードリセット機能
- [ ] プロフィール編集の実保存処理
- [ ] パスワード変更の実保存処理

---

## フェーズ4: 機能拡充

### 4.1 ボードビュー強化
- [ ] カラム内タスクの並べ替え（ドラッグ＆ドロップ）
- [ ] カラムの並べ替え（ドラッグ＆ドロップ）
- [ ] タスクのサブタスク対応

### 4.2 ガントチャート強化
- [ ] タスクバーのドラッグリサイズ（期間変更）
- [ ] タスクバーのドラッグ移動（日程変更）
- [ ] 表示スケール切替（日/週/月）
- [ ] 依存関係の矢印表示

### 4.3 通知機能
- [ ] ブラウザプッシュ通知の実装
- [ ] 期限間近タスクのメール通知（バックエンド）
- [ ] 週次レポート自動生成

### 4.4 設定の完全実装
- [ ] 全設定項目のDB永続化
- [ ] 2段階認証（TOTP）の実装
- [ ] ログイン履歴の実データ表示
- [ ] 言語切り替えのi18n対応

---

## フェーズ5: AI連携

### 5.1 Google Generative AI 統合
- [ ] .env 設定（GEMINI_API_KEY）
- [ ] タスク自動分類・優先度提案
- [ ] タスク説明文の自動生成
- [ ] プロジェクト進捗のAIサマリー

---

## フェーズ6: 品質保証

### 6.1 テスト
- [ ] ユニットテスト（Vitest）
- [ ] コンポーネントテスト（React Testing Library）
- [ ] E2Eテスト（Playwright）

### 6.2 アクセシビリティ
- [ ] キーボードナビゲーション対応
- [ ] ARIA属性の追加
- [ ] スクリーンリーダー対応
- [ ] フォーカス管理の改善

### 6.3 パフォーマンス
- [ ] React.memoによるコンポーネントメモ化
- [ ] 仮想スクロール（大量タスク対応）
- [ ] コード分割（React.lazy + Suspense）

---

## 優先度ガイド

| 優先度 | フェーズ | 理由 |
|---|---|---|
| 最高 | フェーズ1 (リファクタリング) | 2,484行の単一ファイルは保守困難。他の改修の前提条件。 |
| 高 | フェーズ2 (バックエンド) | データ永続化なしでは実用不可。 |
| 高 | フェーズ3 (認証) | セキュリティ上必須。 |
| 中 | フェーズ4 (機能拡充) | UX向上。ユーザーフィードバックに応じて優先度調整。 |
| 低 | フェーズ5 (AI連携) | 付加価値機能。コア機能安定後に着手。 |
| 中 | フェーズ6 (品質保証) | 各フェーズと並行して段階的に実施。 |
