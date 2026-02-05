import { supabase } from './supabase'
import type { ChatMessage } from '../types/database'

export type MessageRole = 'user' | 'assistant'

/**
 * チャットメッセージを保存
 */
export async function saveMessage(
  userId: string,
  role: MessageRole,
  content: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      role,
      content,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to save message:', error)
    return null
  }

  return data
}

/**
 * チャット履歴を取得（最新から指定件数）
 */
export async function getChatHistory(
  userId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch chat history:', error)
    return []
  }

  // 古い順に並び替えて返す
  return (data || []).reverse()
}

/**
 * チャット履歴をクリア
 */
export async function clearChatHistory(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to clear chat history:', error)
    return false
  }

  return true
}
