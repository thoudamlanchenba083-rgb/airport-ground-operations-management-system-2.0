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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axiosClient.post('/ai/schedule/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSchedule(res.data)
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload the file.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
          <h1 className="text-xl font-bold text-white">AI Assistant</h1>
          <p className="text-sm text-neutral-400">Ask about flight status, delays, gates, maintenance, staffing, or upload a schedule and ask "is there a flight at this time"</p>
        </div>
        <button
          onClick={handleClear}
          className="text-sm bg-slate-200 hover:bg-slate-300 text-neutral-100 px-3 py-1.5 rounded-lg transition"
        >
          Clear Chat
        </button>
      </div>

      <div className="mb-4 bg-neutral-900 rounded-xl border border-neutral-700 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Flight schedule sheet</p>
            {schedule ? (
              <p className="text-xs text-neutral-400 truncate">
                Using <span className="text-neutral-200">{schedule.original_filename}</span> — {schedule.row_count} flight(s) loaded
              </p>
            ) : (
              <p className="text-xs text-neutral-400">
                Upload an Excel/CSV sheet (flight no, from, to, departure time) so I can check it for you.
              </p>
            )}
            {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              id="schedule-file-input"
            />
            <label
              htmlFor="schedule-file-input"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              {uploading ? 'Uploading...' : schedule ? 'Replace file' : 'Upload file'}
            </label>
            {schedule && (
              <button
                onClick={handleRemoveSchedule}
                className="text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-lg transition"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-neutral-900 rounded-xl shadow border border-neutral-700 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-neutral-500">Loading conversation...</p>}

          {!loading && messages.length === 0 && (
            <p className="text-sm text-neutral-500">
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
                    : 'bg-neutral-900 text-white rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-neutral-800 text-neutral-400 px-4 py-2 rounded-2xl rounded-bl-sm text-sm">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-neutral-700 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a flight, gate, or delay..."
            className="flex-1 border border-neutral-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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