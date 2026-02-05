import { supabase } from './supabase'
import type { User, Friendship } from '../types/database'

export type FriendWithProfile = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  status: 'pending' | 'accepted'
  isIncoming: boolean // 自分が受け取ったリクエストかどうか
}

/**
 * フレンド一覧を取得（承認済み）
 */
export async function getFriends(userId: string): Promise<FriendWithProfile[]> {
  // 自分が送った & 承認済み
  const { data: sent } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      friend:users!friendships_friend_id_fkey (
        id,
        email,
        display_name,
        avatar_url
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted')

  // 自分が受け取った & 承認済み
  const { data: received } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      friend:users!friendships_user_id_fkey (
        id,
        email,
        display_name,
        avatar_url
      )
    `)
    .eq('friend_id', userId)
    .eq('status', 'accepted')

  const friends: FriendWithProfile[] = []

  if (sent) {
    for (const item of sent) {
      const friend = item.friend as unknown as User
      if (friend) {
        friends.push({
          id: friend.id,
          email: friend.email,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url,
          status: 'accepted',
          isIncoming: false,
        })
      }
    }
  }

  if (received) {
    for (const item of received) {
      const friend = item.friend as unknown as User
      if (friend) {
        friends.push({
          id: friend.id,
          email: friend.email,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url,
          status: 'accepted',
          isIncoming: true,
        })
      }
    }
  }

  return friends
}

/**
 * 保留中のフレンドリクエストを取得
 */
export async function getPendingRequests(userId: string): Promise<FriendWithProfile[]> {
  // 自分が受け取った保留中のリクエスト
  const { data } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      friend:users!friendships_user_id_fkey (
        id,
        email,
        display_name,
        avatar_url
      )
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending')

  if (!data) return []

  return data.map(item => {
    const friend = item.friend as unknown as User
    return {
      id: friend.id,
      email: friend.email,
      display_name: friend.display_name,
      avatar_url: friend.avatar_url,
      status: 'pending' as const,
      isIncoming: true,
    }
  })
}

export type SearchUserResult = {
  id: string
  display_name: string | null
  avatar_url: string | null
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
}

/**
 * ユーザーを検索（メールアドレスまたは表示名）
 * フレンドシップ状態も含めて返す
 */
export async function searchUsers(
  query: string,
  currentUserId: string
): Promise<SearchUserResult[]> {
  if (!query.trim()) return []

  // ユーザー検索（最小限のカラムのみ）
  const { data: users, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq('id', currentUserId)
    .limit(10)

  if (error || !users) {
    console.error('Failed to search users:', error)
    return []
  }

  // 検索結果のユーザーとのフレンドシップ状態を取得
  const userIds = users.map(u => u.id)
  if (userIds.length === 0) return []

  const { data: friendships } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .or(
      userIds.map(id =>
        `and(user_id.eq.${currentUserId},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${currentUserId})`
      ).join(',')
    )

  // フレンドシップ状態をマップ
  const friendshipMap = new Map<string, 'pending_sent' | 'pending_received' | 'accepted'>()
  if (friendships) {
    for (const f of friendships) {
      const otherId = f.user_id === currentUserId ? f.friend_id : f.user_id
      if (f.status === 'accepted') {
        friendshipMap.set(otherId, 'accepted')
      } else if (f.user_id === currentUserId) {
        friendshipMap.set(otherId, 'pending_sent')
      } else {
        friendshipMap.set(otherId, 'pending_received')
      }
    }
  }

  return users.map(u => ({
    id: u.id,
    display_name: u.display_name,
    avatar_url: u.avatar_url,
    friendshipStatus: friendshipMap.get(u.id) || 'none',
  }))
}

/**
 * フレンドリクエストを送信
 */
export async function sendFriendRequest(
  userId: string,
  friendId: string
): Promise<{ success: boolean; error?: string }> {
  // 既存のリクエストをチェック（双方向）
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status, user_id')
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .limit(1)

  if (existing && existing.length > 0) {
    const record = existing[0]
    if (record.status === 'accepted') {
      return { success: false, error: 'すでにフレンドです' }
    }
    if (record.user_id === userId) {
      return { success: false, error: '申請済みです（承認待ち）' }
    }
    return { success: false, error: '相手から申請が届いています' }
  }

  const { error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
    })

  if (error) {
    console.error('Failed to send friend request:', error)
    return { success: false, error: 'リクエストの送信に失敗しました' }
  }

  return { success: true }
}

/**
 * フレンドリクエストを承認
 */
export async function acceptFriendRequest(
  userId: string,
  friendId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('user_id', friendId)
    .eq('friend_id', userId)
    .eq('status', 'pending')

  if (error) {
    console.error('Failed to accept friend request:', error)
    return false
  }

  return true
}

/**
 * フレンドリクエストを拒否 / フレンドを削除
 */
export async function removeFriendship(
  userId: string,
  friendId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)

  if (error) {
    console.error('Failed to remove friendship:', error)
    return false
  }

  return true
}
