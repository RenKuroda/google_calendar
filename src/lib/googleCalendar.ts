import { supabase } from './supabase'

export type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  isAllDay: boolean
}

type GoogleCalendarEvent = {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

/**
 * Googleカレンダーからイベントを取得
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const session = await supabase.auth.getSession()
  const providerToken = session.data.session?.provider_token

  if (!providerToken) {
    throw new Error('Google認証トークンがありません。再ログインしてください。')
  }

  const timeMin = startDate.toISOString()
  const timeMax = endDate.toISOString()

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${encodeURIComponent(timeMin)}&` +
    `timeMax=${encodeURIComponent(timeMax)}&` +
    `singleEvents=true&` +
    `orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('認証が切れました。再ログインしてください。')
    }
    throw new Error(`カレンダー取得に失敗しました: ${response.status}`)
  }

  const data = await response.json()

  return (data.items || []).map((event: GoogleCalendarEvent) => ({
    id: event.id,
    title: event.summary || '(タイトルなし)',
    start: new Date(event.start.dateTime || event.start.date || ''),
    end: new Date(event.end.dateTime || event.end.date || ''),
    isAllDay: !event.start.dateTime,
  }))
}

/**
 * 指定期間の空き時間を計算
 */
export function calculateFreeSlots(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  options: {
    startHour?: number  // 開始時刻（デフォルト9時）
    endHour?: number    // 終了時刻（デフォルト19時）
    minDuration?: number // 最小時間（分、デフォルト30分）
  } = {}
): { start: Date; end: Date }[] {
  const { startHour = 9, endHour = 19, minDuration = 30 } = options
  const freeSlots: { start: Date; end: Date }[] = []

  // 日付ごとに処理
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const endLimit = new Date(endDate)
  endLimit.setHours(23, 59, 59, 999)

  while (current <= endLimit) {
    // 土日はスキップ（オプションで変更可能）
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dayStart = new Date(current)
      dayStart.setHours(startHour, 0, 0, 0)

      const dayEnd = new Date(current)
      dayEnd.setHours(endHour, 0, 0, 0)

      // その日のイベントを取得
      const dayEvents = events
        .filter(e => {
          const eventStart = new Date(e.start)
          const eventEnd = new Date(e.end)
          return eventStart < dayEnd && eventEnd > dayStart
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime())

      // 空き時間を計算
      let slotStart = dayStart

      for (const event of dayEvents) {
        const eventStart = new Date(Math.max(event.start.getTime(), dayStart.getTime()))
        const eventEnd = new Date(Math.min(event.end.getTime(), dayEnd.getTime()))

        if (slotStart < eventStart) {
          const duration = (eventStart.getTime() - slotStart.getTime()) / (1000 * 60)
          if (duration >= minDuration) {
            freeSlots.push({ start: new Date(slotStart), end: new Date(eventStart) })
          }
        }

        if (eventEnd > slotStart) {
          slotStart = eventEnd
        }
      }

      // 最後のイベント後の空き時間
      if (slotStart < dayEnd) {
        const duration = (dayEnd.getTime() - slotStart.getTime()) / (1000 * 60)
        if (duration >= minDuration) {
          freeSlots.push({ start: new Date(slotStart), end: new Date(dayEnd) })
        }
      }
    }

    // 次の日へ
    current.setDate(current.getDate() + 1)
  }

  return freeSlots
}

/**
 * 複数人の共通空き時間を計算
 */
export function findCommonFreeSlots(
  freeSlotsArray: { start: Date; end: Date }[][],
  minDuration: number = 30
): { start: Date; end: Date }[] {
  if (freeSlotsArray.length === 0) return []
  if (freeSlotsArray.length === 1) return freeSlotsArray[0]

  let commonSlots = freeSlotsArray[0]

  for (let i = 1; i < freeSlotsArray.length; i++) {
    const otherSlots = freeSlotsArray[i]
    const newCommonSlots: { start: Date; end: Date }[] = []

    for (const slot of commonSlots) {
      for (const other of otherSlots) {
        const overlapStart = new Date(Math.max(slot.start.getTime(), other.start.getTime()))
        const overlapEnd = new Date(Math.min(slot.end.getTime(), other.end.getTime()))

        if (overlapStart < overlapEnd) {
          const duration = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
          if (duration >= minDuration) {
            newCommonSlots.push({ start: overlapStart, end: overlapEnd })
          }
        }
      }
    }

    commonSlots = newCommonSlots
  }

  return commonSlots
}

/**
 * 日付をフォーマット
 */
export function formatDateRange(start: Date, end: Date): string {
  const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
  const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const dateStr = dateFormatter.format(start)
  const startTime = timeFormatter.format(start)
  const endTime = timeFormatter.format(end)

  return `${dateStr} ${startTime}〜${endTime}`
}
