import { GoogleGenAI } from "@google/genai"
import { CalendarEvent, formatDateRange } from './googleCalendar'

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' })

function buildSystemInstruction(events: CalendarEvent[], userName: string): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const timeStr = now.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const eventsJson = events.map(e => ({
    title: e.title,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    isAllDay: e.isAllDay,
  }))

  return `
あなたは「スケジュール管理・日程調整に特化したAIアシスタント」です。
以下の前提・ルールを厳密に守り、ユーザーの依頼に応えてください。

【基本情報】
- 現在時刻: ${dateStr} ${timeStr} (JST)
- ユーザー名: ${userName}
- 日本時間（JST）を基準に判断してください。

【${userName}の予定データ】
以下が現在取得できている予定です：
${JSON.stringify(eventsJson, null, 2)}

【役割とルール】
- ユーザーの自然言語の質問を正確に解釈し、予定・空き時間を把握してください。
- 実務でそのまま使える日本語で回答・要約・日程調整文を生成してください。
- 予定・空き時間の抽出対象は 9:00〜19:00（JST）のみとします。これ以外の時間は対象外です。
- 予定が存在する時間は除外し、30分以上の連続した時間のみを「空き時間」として提案してください。
- 土日は基本的に除外してください（ユーザーが明示的に含めるよう指示した場合は除く）。

【出力形式】
- 箇条書きを基本とし、ビジネスシーンで自然な丁寧すぎない日本語を使用してください。
- コピーしてそのままチャット等に貼れる形式にしてください。
- 存在しない予定を創作しないでください。
- カレンダーに予定がない場合は「予定がありません」と正直に伝えてください。
`
}

export type ChatHistory = {
  role: 'user' | 'assistant'
  content: string
}

export async function getAIResponseWithCalendar(
  userMessage: string,
  events: CalendarEvent[],
  userName: string,
  history: ChatHistory[] = []
): Promise<string> {
  try {
    const systemInstruction = buildSystemInstruction(events, userName)

    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    })

    // Send history for context
    for (const h of history) {
      await chat.sendMessage({ message: h.content })
    }

    const response = await chat.sendMessage({ message: userMessage })
    return response.text || '回答を生成できませんでした。'
  } catch (error) {
    console.error("Gemini API Error:", error)
    return "申し訳ありません。エラーが発生しました。しばらく待ってから再度お試しください。"
  }
}

/**
 * 空き時間を自然言語でフォーマット
 */
export function formatFreeSlotsMessage(
  freeSlots: { start: Date; end: Date }[]
): string {
  if (freeSlots.length === 0) {
    return "指定された期間に空き時間が見つかりませんでした。"
  }

  const lines = freeSlots.slice(0, 10).map(slot => `- ${formatDateRange(slot.start, slot.end)}`)

  let message = "以下の時間が空いています：\n\n" + lines.join("\n")

  if (freeSlots.length > 10) {
    message += `\n\n...他 ${freeSlots.length - 10} 件`
  }

  return message
}
