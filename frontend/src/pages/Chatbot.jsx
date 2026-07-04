import { useState, useEffect, useRef } from 'react'
import axiosClient from '../api/axiosClient'

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

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Ask about flight status, delays, gates, maintenance, staffing, or load a schedule to ask "is there a flight at this time"</p>
        </div>
        <button
          onClick={handleClear}
          className="text-sm bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-neutral-100 px-3 py-1.5 rounded-lg transition"
        >
          Clear Chat
        </button>
      </div>

      <div className="mb-4 bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Flight schedule sheet</p>
            {schedule ? (
              <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                Using <span className="text-gray-800 dark:text-neutral-200">{schedule.original_filename}</span> — {schedule.row_count} flight(s) loaded
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                No schedule loaded. Drop a .xlsx/.xls/.csv file into <code className="text-gray-700 dark:text-neutral-300">ai_module/schedule_data/</code> and
                run <code className="text-gray-700 dark:text-neutral-300">python manage.py import_schedule</code>, then refresh this page.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {schedule && (
              <button
                onClick={handleRemoveSchedule}
                className="text-sm bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-800 dark:text-neutral-200 px-3 py-1.5 rounded-lg transition"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl shadow border border-gray-200 dark:border-neutral-700 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-gray-400 dark:text-neutral-500">Loading conversation...</p>}

          {!loading && messages.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-neutral-500">
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
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 px-4 py-2 rounded-2xl rounded-bl-sm text-sm">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-gray-200 dark:border-neutral-700 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a flight, gate, or delay..."
            className="flex-1 border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}