# スケジュール調整AIアシスタント - 要件定義書

## 1. プロダクト概要

### 1.1 サービス名
AI Scheduler（仮）

### 1.2 コンセプト
自然言語で話しかけるだけで、友人・家族との予定調整ができるAIアシスタント

### 1.3 ターゲットユーザー
- 個人ユーザー（友人・家族との予定調整）
- Googleカレンダーを利用している人

---

## 2. MVP機能要件

### 2.1 ユーザー認証
| 項目 | 内容 |
|------|------|
| 認証方式 | Googleアカウント（Supabase Auth + OAuth 2.0） |
| 必要な権限 | Googleカレンダーの読み取りのみ |
| ユーザー管理 | 全参加者がログイン必須 |

### 2.2 コア機能

#### A. 自分の予定確認
- 「明日の予定を教えて」
- 「来週月曜日は何がある？」
- 「今週の空き時間は？」

#### B. 複数人の空き時間検索
- 「@田中 と @佐藤 の来週の共通空き時間を教えて」
- 「3人で集まれる時間を探して」

#### C. フレンド機能
- ユーザー検索・追加
- フレンド一覧表示
- @メンションでフレンドを指定

#### D. チャット履歴
- 会話履歴の保存・閲覧

> **Note**: 予定の登録（カレンダーへの書き込み）はMVP後に検討

### 2.3 UI/UX
- チャット形式のインターフェース
- クイックアクションボタン
- レスポンシブデザイン（モバイル対応）

---

## 3. 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19 + TypeScript + Vite |
| バックエンド | Supabase（Auth, Database, Edge Functions） |
| AI | Gemini API |
| 外部連携 | Google Calendar API |
| ホスティング | Vercel |

### 3.1 Supabase構成
- **Auth**: Google OAuth（カレンダー権限付き）
- **Database**: ユーザー情報、フレンド関係、チャット履歴
- **Edge Functions**: カレンダーAPI呼び出し、トークン管理

---

## 4. データベース設計（案）

```sql
-- ユーザー（Supabase Auth と連携）
users
├── id (UUID, PK) -- auth.users.id と同じ
├── email
├── display_name
├── avatar_url
├── google_refresh_token (encrypted)
├── created_at
└── updated_at

-- フレンド関係
friendships
├── id (UUID, PK)
├── user_id (FK -> users)
├── friend_id (FK -> users)
├── status (pending / accepted)
├── created_at
└── UNIQUE (user_id, friend_id)

-- チャット履歴
chat_messages
├── id (UUID, PK)
├── user_id (FK -> users)
├── role (user / assistant)
├── content (text)
├── created_at
└── INDEX (user_id, created_at)
```

---

## 5. 画面構成（MVP）

```
1. ログイン画面
   └── Googleアカウントでログイン

2. メイン画面（チャット）
   ├── サイドバー: フレンド一覧
   ├── チャットエリア: AIとの会話（履歴付き）
   └── 入力エリア: テキスト入力 + クイックアクション

3. フレンド管理
   ├── ユーザー検索
   └── フレンドリクエスト送信/承認

4. 設定画面
   └── Google連携の管理、プロフィール編集
```

---

## 6. 非機能要件

### セキュリティ
- OAuthトークンはSupabaseで暗号化保存
- RLS（Row Level Security）でデータアクセス制御
- カレンダー読み取り権限のみ

### パフォーマンス
- AIレスポンス: 5秒以内目標
- カレンダーデータ取得: 3秒以内目標

---

## 7. 未決定事項

- [ ] フレンド申請の通知方法（メール？アプリ内？）
- [ ] チャット履歴の保存期間
- [ ] 同時に検索できるフレンドの上限人数

---

## 8. 今後の拡張候補（MVP後）

- Microsoft 365 / Outlook連携
- Slack / LINE連携
- 定期ミーティングの自動提案
- 移動時間を考慮した提案

---

*最終更新: 2026-02-05*
