import { useState, useEffect } from 'react'
import {
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  removeFriendship,
  FriendWithProfile,
} from '../lib/friendService'

type Props = {
  userId: string
  onAddFriend: () => void
}

export function FriendList({ userId, onAddFriend }: Props) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  const loadFriends = async () => {
    setLoading(true)
    const [friendsList, pending] = await Promise.all([
      getFriends(userId),
      getPendingRequests(userId),
    ])
    setFriends(friendsList)
    setPendingRequests(pending)
    setLoading(false)
  }

  useEffect(() => {
    loadFriends()
  }, [userId])

  const handleAccept = async (friendId: string) => {
    const success = await acceptFriendRequest(userId, friendId)
    if (success) {
      loadFriends()
    }
  }

  const handleReject = async (friendId: string) => {
    const success = await removeFriendship(userId, friendId)
    if (success) {
      loadFriends()
    }
  }

  if (loading) {
    return (
      <div className="text-xs text-slate-400 px-2">読み込み中...</div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 保留中のリクエスト */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-orange-600 mb-2 px-2">
            リクエスト ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map(request => (
              <div
                key={request.id}
                className="p-2 bg-orange-50 rounded-lg border border-orange-100"
              >
                <div className="flex items-center gap-2">
                  {request.avatar_url ? (
                    <img
                      src={request.avatar_url}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center">
                      <span className="text-orange-700 text-xs">
                        {(request.display_name || request.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {request.display_name || request.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleAccept(request.id)}
                    className="flex-1 text-[10px] bg-blue-600 text-white py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    承認
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="flex-1 text-[10px] bg-slate-200 text-slate-600 py-1 rounded hover:bg-slate-300 transition-colors"
                  >
                    拒否
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* フレンド一覧 */}
      <div>
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-xs font-semibold text-slate-400">
            フレンド ({friends.length})
          </h3>
          <button
            onClick={onAddFriend}
            className="text-[10px] text-blue-600 hover:text-blue-700"
          >
            + 追加
          </button>
        </div>

        {friends.length === 0 ? (
          <p className="text-xs text-slate-400 px-2">
            まだフレンドがいません
          </p>
        ) : (
          <div className="space-y-1">
            {friends.map(friend => (
              <div
                key={friend.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                {friend.avatar_url ? (
                  <img
                    src={friend.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xs">
                      {(friend.display_name || friend.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {friend.display_name || friend.email.split('@')[0]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
