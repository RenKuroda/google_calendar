
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from './types';
import { useAuth } from './src/hooks/useAuth';
import { LoginPage } from './src/components/LoginPage';
import { FriendList } from './src/components/FriendList';
import { AddFriendModal } from './src/components/AddFriendModal';
import { getCalendarEvents, CalendarEvent } from './src/lib/googleCalendar';
import { getAIResponseWithCalendar } from './src/lib/aiService';
import { saveMessage, getChatHistory, clearChatHistory } from './src/lib/chatHistory';

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <MainApp user={user} onSignOut={signOut} />;
};

type MainAppProps = {
  user: { id: string; email?: string; user_metadata?: { full_name?: string; avatar_url?: string } };
  onSignOut: () => Promise<void>;
};

const MainApp: React.FC<MainAppProps> = ({ user, onSignOut }) => {
  const userName = user.user_metadata?.full_name || user.email || 'ユーザー';
  const userId = user.id;

  const getWelcomeMessage = useCallback((): Message => ({
    role: 'assistant',
    content: `こんにちは、${userName}さん！スケジュール調整アシスタントです。\n\n「明日の予定は？」「来週の空き時間を教えて」など、お気軽にお聞きください。`,
    timestamp: new Date()
  }), [userName]);

  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendListKey, setFriendListKey] = useState(0); // フレンド一覧の再読み込み用
  const scrollRef = useRef<HTMLDivElement>(null);

  // チャット履歴を読み込み
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      const history = await getChatHistory(userId, 50);

      if (history.length > 0) {
        const loadedMessages: Message[] = history.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
      } else {
        setMessages([getWelcomeMessage()]);
      }
      setIsLoadingHistory(false);
    };

    loadHistory();
  }, [userId, getWelcomeMessage]);

  // カレンダーデータを取得
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const now = new Date();
        const twoWeeksLater = new Date(now);
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

        const calendarEvents = await getCalendarEvents(now, twoWeeksLater);
        setEvents(calendarEvents);
        setCalendarError(null);
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
        setCalendarError(error instanceof Error ? error.message : 'カレンダーの取得に失敗しました');
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    setInputValue('');
    const newMsg: Message = { role: 'user', content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    // ユーザーメッセージを保存
    saveMessage(userId, 'user', userMessage);

    try {
      // カレンダーが取得できていない場合は再取得を試みる
      let currentEvents = events;
      if (currentEvents.length === 0 && !calendarError) {
        const now = new Date();
        const twoWeeksLater = new Date(now);
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
        currentEvents = await getCalendarEvents(now, twoWeeksLater);
        setEvents(currentEvents);
      }

      const history = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const aiResponse = await getAIResponseWithCalendar(userMessage, currentEvents, userName, history);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }]);

      // AIレスポンスを保存
      saveMessage(userId, 'assistant', aiResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました。';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      }]);

      // エラーメッセージも保存
      saveMessage(userId, 'assistant', errorMessage);
    }

    setIsLoading(false);
  };

  const handleClearHistory = async () => {
    if (window.confirm('チャット履歴をすべて削除しますか？')) {
      const success = await clearChatHistory(userId);
      if (success) {
        setMessages([getWelcomeMessage()]);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Data Visualizer */}
      <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            AI Scheduler
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {calendarError ? (
              <span className="text-red-500">{calendarError}</span>
            ) : (
              <span className="text-green-600">Googleカレンダー連携中</span>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* フレンド一覧 */}
          <section>
            <FriendList
              key={friendListKey}
              userId={userId}
              onAddFriend={() => setShowAddFriend(true)}
            />
          </section>

          {/* 予定一覧 */}
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
              今後の予定 ({events.length}件)
            </h2>
            {events.length === 0 && !calendarError ? (
              <p className="text-xs text-slate-400 px-2">予定がありません</p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 5).map(event => (
                  <div key={event.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-bold text-slate-700 truncate">{event.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {event.start.toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {!event.isAllDay && (
                        <span>
                          〜{event.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
                {events.length > 5 && (
                  <p className="text-[10px] text-center text-slate-400 italic">
                    他 {events.length - 5} 件
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
        
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearHistory}
              className="flex-1 text-xs text-slate-500 hover:text-red-600 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              履歴削除
            </button>
            <button
              onClick={onSignOut}
              className="flex-1 text-xs text-slate-500 hover:text-slate-700 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-white lg:bg-transparent">
        {/* Header (Mobile-ish) */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <h1 className="text-lg font-bold text-slate-800">AI Scheduler</h1>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
        >
          {isLoadingHistory ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-slate-400 text-sm">履歴を読み込み中...</div>
            </div>
          ) : messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-200'}`}>
                  {msg.role === 'user' ? (
                    <UserIcon className="w-5 h-5 text-white" />
                  ) : (
                    <BotIcon className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {!isLoadingHistory && isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[70%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center animate-pulse">
                  <BotIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
          <div className="max-w-4xl mx-auto relative group">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例：明日の予定は？ / 来週の空き時間を教えて"
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 pr-16 shadow-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none h-24"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={`absolute right-4 bottom-4 p-3 rounded-xl transition-all ${
                !inputValue.trim() || isLoading 
                ? 'bg-slate-100 text-slate-400' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
              }`}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-4xl mx-auto mt-3 flex gap-2 overflow-x-auto pb-2">
             <QuickAction label="今日の予定" onClick={() => setInputValue("今日の予定を教えて")} />
             <QuickAction label="明日の予定" onClick={() => setInputValue("明日の予定を教えて")} />
             <QuickAction label="今週の空き時間" onClick={() => setInputValue("今週の空き時間を教えて")} />
             <QuickAction label="来週の空き時間" onClick={() => setInputValue("来週の空き時間を教えて")} />
          </div>
        </div>
      </main>

      {/* フレンド追加モーダル */}
      {showAddFriend && (
        <AddFriendModal
          userId={userId}
          onClose={() => setShowAddFriend(false)}
          onSuccess={() => setFriendListKey(k => k + 1)}
        />
      )}
    </div>
  );
};

const QuickAction: React.FC<{ label: string, onClick: () => void }> = ({ label, onClick }) => (
  <button 
    onClick={onClick}
    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
  >
    {label}
  </button>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const BotIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

export default App;
