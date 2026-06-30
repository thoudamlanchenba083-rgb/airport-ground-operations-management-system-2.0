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
  const bottomRef = useRef(null)
  const sessionId = getSessionId()

  useEffect(() => {
    loadHistory()
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
          <h1 className="text-xl font-bold text-slate-800">AI Assistant</h1>
          <p className="text-sm text-slate-500">Ask about flight status, delays, gates, maintenance, or staffing</p>
        </div>
        <button
          onClick={handleClear}
          className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg transition"
        >
          Clear Chat
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow border border-slate-200 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-slate-400">Loading conversation...</p>}

          {!loading && messages.length === 0 && (
            <p className="text-sm text-slate-400">
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
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-400 px-4 py-2 rounded-2xl rounded-bl-sm text-sm">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-slate-200 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a flight, gate, or delay..."
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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