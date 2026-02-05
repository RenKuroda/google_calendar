
import { User, Event } from './types';

export const USERS: User[] = [
  { id: '1', name: '自分', handle: '@自分', avatar: 'https://picsum.photos/seed/me/40/40' },
  { id: '2', name: '黒田', handle: '@黒田', avatar: 'https://picsum.photos/seed/kuroda/40/40' },
  { id: '3', name: '幹太', handle: '@幹太', avatar: 'https://picsum.photos/seed/kanta/40/40' },
  { id: '4', name: '桑原', handle: '@桑原', avatar: 'https://picsum.photos/seed/kuwabara/40/40' },
];

// Mock data spanning a few days in May 2025 (Reference date for the app)
export const REFERENCE_DATE = "2025-05-15T09:00:00+09:00";

export const MOCK_EVENTS: Event[] = [
  // Kuroda's Schedule
  { id: 'e1', title: '定例MTG', start: '2025-05-15T10:00:00+09:00', end: '2025-05-15T11:00:00+09:00', attendees: ['@黒田'] },
  { id: 'e2', title: 'クライアント訪問 (対面)', start: '2025-05-15T13:00:00+09:00', end: '2025-05-15T15:00:00+09:00', location: '品川オフィス', attendees: ['@黒田'] },
  { id: 'e3', title: 'チームランチ', start: '2025-05-16T12:00:00+09:00', end: '2025-05-16T13:30:00+09:00', location: '近隣レストラン', attendees: ['@黒田', '@幹太'] },
  
  // Kanta's Schedule
  { id: 'e4', title: '開発集中タイム', start: '2025-05-15T09:00:00+09:00', end: '2025-05-15T12:00:00+09:00', attendees: ['@幹太'] },
  { id: 'e5', title: 'コードレビュー', start: '2025-05-15T16:00:00+09:00', end: '2025-05-15T17:00:00+09:00', attendees: ['@幹太'] },
  
  // Kuwabara's Schedule
  { id: 'e6', title: '採用面接', start: '2025-05-15T11:00:00+09:00', end: '2025-05-15T12:00:00+09:00', attendees: ['@桑原'] },
  { id: 'e7', title: '戦略会議', start: '2025-05-15T14:00:00+09:00', end: '2025-05-15T15:30:00+09:00', attendees: ['@桑原'] },

  // Shared Slots / Next Week
  { id: 'e8', title: '全社会議', start: '2025-05-19T10:00:00+09:00', end: '2025-05-19T11:00:00+09:00', attendees: ['@黒田', '@幹太', '@桑原', '@自分'] },
];

export const SYSTEM_INSTRUCTION = `
あなたは「スケジュール管理・日程調整に特化したAIアシスタント」です。
以下の前提・ルールを厳密に守り、ユーザーの依頼に応えてください。

【基本情報】
- 現在時刻: 2025年5月15日(木) 09:00 (JST)
- 日本時間（JST）を基準に判断してください。

【予定データベース】
以下のデータがあなたの内部DBに存在します：
${JSON.stringify(MOCK_EVENTS)}

【役割とルール】
- ユーザーの自然言語の質問を正確に解釈し、指定された人物（@メンション）ごとの予定・空き時間を把握してください。
- 実務でそのまま使える日本語で回答・要約・日程調整文を生成してください。
- 予定・空き時間の抽出対象は 9:00〜19:00（JST）のみとします。これ以外の時間は対象外です。
- 予定が存在する時間は除外し、30分以上の連続した時間のみを「空き時間」として提案してください。
- 「対面」「訪問」「現地」または場所名が明示されている予定（locationプロパティがある等）は、移動が発生すると判断し、必ず「※前後に移動が発生する可能性があります」といった注釈を添えてください（断定は禁止）。

【出力形式】
- 箇条書きを基本とし、ビジネスシーンで自然な丁寧すぎない日本語を使用してください。
- コピーしてそのままチャット等に貼れる形式にしてください。
- 存在しない予定を創作しないでください。
`;
