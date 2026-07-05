import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Trash2, FileSpreadsheet, X } from 'lucide-react'
import axiosClient from '../api/axiosClient'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

function getSessionId() {
  let id = localStorage.getItem('chat_session_id')
  if (!id) {
    id = 'session-' + Date.now()
    localStorage.setItem('chat_session_id', id)
  }
  return id
}

export default function Chatbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState(null)
  const bottomRef = useRef(null)
  const sessionId = getSessionId()

  useEffect(() => {
    loadHistory()
    loadSchedule()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadHistory = async () => {
    try {
      const res = await axiosClient.get('/ai/chat/', {
        params: { session_id: sessionId },
      })
      setMessages(res.data)
    } catch (err) {
      console.error('Failed to load chat history', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSchedule = async () => {
    try {
      const res = await axiosClient.get('/ai/schedule/')
      setSchedule(res.data.active ? res.data : null)
    } catch (err) {
      console.error('Failed to load schedule status', err)
    }
  }

  const handleRemoveSchedule = async () => {
    try {
      await axiosClient.delete('/ai/schedule/clear/')
      setSchedule(null)
    } catch (err) {
      console.error('Failed to clear schedule', err)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return

    setInput('')
    setSending(true)
    setMessages((prev) => [
      ...prev,
      { id: 'temp-' + Date.now(), role: 'user', content, created_at: new Date().toISOString() },
    ])

    try {
      const res = await axiosClient.post('/ai/chat/send/', {
        content,
        session_id: sessionId,
      })
      setMessages((prev) => [...prev, res.data])
    } catch (err) {
      console.error('Failed to send message', err)
      setMessages((prev) => [
        ...prev,
        { id: 'err-' + Date.now(), role: 'assistant', content: 'Something went wrong sending that message.', created_at: new Date().toISOString() },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleClear = async () => {
    try {
      await axiosClient.delete('/ai/chat/clear/', { data: { session_id: sessionId } })
      setMessages([])
    } catch (err) {
      console.error('Failed to clear chat', err)
    }
  }

  usePageMeta('AI Assistant', 'Ask the AI assistant about flight status, delays, gates, maintenance and staffing.')

  return (
    <div className="p-6 h-screen flex flex-col max-w-[1400px] mx-auto w-full">
      <div className="mb-5">
        <PageHeader
          icon={Sparkles}
          chip="icon-chip-violet"
          title="AI Assistant"
          subtitle='Ask about flight status, delays, gates, maintenance, staffing, or "is there a flight at this time"'
          actions={
            <button
              onClick={handleClear}
              className="glass glass-interactive flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 px-4 py-2.5 rounded-xl"
            >
              <Trash2 size={15} />
              Clear Chat
            </button>
          }
        />
      </div>

      <div className="mb-4 glass rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex items-center gap-3">
            <div className="icon-chip icon-chip-sky !w-10 !h-10 !rounded-xl shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Flight schedule sheet</p>
              {schedule ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  Using <span className="text-neutral-800 dark:text-neutral-200">{schedule.original_filename}</span> — {schedule.row_count} flight(s) loaded
                </p>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No schedule loaded. Drop a .xlsx/.xls/.csv file into <code className="text-neutral-700 dark:text-neutral-300">ai_module/schedule_data/</code> and
                  run <code className="text-neutral-700 dark:text-neutral-300">python manage.py import_schedule</code>, then refresh this page.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {schedule && (
              <button
                onClick={handleRemoveSchedule}
                className="flex items-center gap-1.5 text-sm bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 px-3 py-1.5 rounded-lg transition"
              >
                <X size={13} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading conversation...</p>}

          {!loading && messages.length === 0 && (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              No messages yet. Try "what's the status of AI202" or "show available gates".
            </p>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-br-sm shadow-md shadow-blue-600/20'
                    : 'glass-hairline bg-black/[0.03] dark:bg-white/[0.06] text-neutral-900 dark:text-white rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="glass-hairline bg-black/[0.03] dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400 px-4 py-2 rounded-2xl rounded-bl-sm text-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-black/5 dark:border-white/10 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a flight, gate, or delay..."
            className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center gap-1.5 bg-gradient-to-br from-blue-500 to-blue-700 hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50 disabled:hover:shadow-none text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Send size={14} />
            Send
          </button>
        </form>
      </div>
    </div>
  )
}