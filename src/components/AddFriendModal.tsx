import { useState } from 'react'
import { searchUsers, sendFriendRequest, SearchUserResult } from '../lib/friendService'

type Props = {
  userId: string
  onClose: () => void
  onSuccess: () => void
}

export function AddFriendModal({ userId, onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setSearching(true)
    setMessage(null)
    const users = await searchUsers(query, userId)
    setResults(users)
    setSearching(false)

    if (users.length === 0) {
      setMessage({ type: 'error', text: 'ユーザーが見つかりませんでした' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSendRequest = async (friendId: string) => {
    setSending(friendId)
    setMessage(null)

    const result = await sendFriendRequest(userId, friendId)

    if (result.success) {
      setMessage({ type: 'success', text: 'フレンドリクエストを送信しました' })
      setResults(results.filter(u => u.id !== friendId))
      onSuccess()
    } else {
      setMessage({ type: 'error', text: result.error || 'エラーが発生しました' })
    }

    setSending(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">フレンドを追加</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メールアドレスまたは名前で検索"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {searching ? '...' : '検索'}
            </button>
          </div>

          {message && (
            <p className={`mt-2 text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">
              メールアドレスや名前でユーザーを検索してください
            </p>
          ) : (
            <div className="space-y-2">
              {results.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {(user.display_name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {user.display_name || '(名前未設定)'}
                    </p>
                  </div>
                  {user.friendshipStatus === 'accepted' ? (
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                      フレンド
                    </span>
                  ) : user.friendshipStatus === 'pending_sent' ? (
                    <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                      申請済み
                    </span>
                  ) : user.friendshipStatus === 'pending_received' ? (
                    <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                      承認待ち
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      disabled={sending === user.id}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending === user.id ? '送信中...' : 'リクエスト'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
