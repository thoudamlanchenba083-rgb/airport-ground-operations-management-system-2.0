import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Trash2, FileSpreadsheet, X, Upload, Loader2, Lock } from 'lucide-react'
import axiosClient from '../api/axiosClient'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'
import { useAuth } from '../context/AuthContext'

function getSessionId() {
  let id = localStorage.getItem('chat_session_id')
  if (!id) {
    id = 'session-' + Date.now()
    localStorage.setItem('chat_session_id', id)
  }
  return id
}

export default function Chatbot() {
  const { user } = useAuth()
  const isViewer = user?.role === 'VIEWER'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
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

  const uploadFile = async (file) => {
    if (!file) return
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setUploadError('Please upload a .xlsx, .xls, or .csv file.')
      return
    }
    setUploading(true)
    setUploadError('')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axiosClient.post('/ai/schedule/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSchedule(res.data)
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload the schedule sheet.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e) => {
    uploadFile(e.target.files?.[0])
    e.target.value = '' // allow re-selecting the same file later
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    if (isViewer || uploading) return
    uploadFile(e.dataTransfer.files?.[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (isViewer || uploading) return
    setDragActive(true)
  }

  const handleDragLeave = () => setDragActive(false)

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

  usePageMeta('AeroGround AI', 'Ask AeroGround AI about flight status, delays, gates, maintenance and staffing.')

  return (
    <div className="p-6 h-screen flex flex-col max-w-[1400px] mx-auto w-full">
      <div className="mb-5">
        <PageHeader
          icon={Sparkles}
          chip="icon-chip-violet"
          title="AeroGround AI"
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

      <div
        className="mb-4 glass rounded-[26px] p-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex items-center gap-3">
            <div className="icon-chip icon-chip-sky w-10! h-10! rounded-xl! shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Flight schedule sheet</p>
              {schedule ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  Using <span className="text-neutral-800 dark:text-neutral-200">{schedule.original_filename}</span> — {schedule.row_count} flight(s) loaded
                </p>
              ) : isViewer ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No schedule loaded. Ask an admin or ops staff member to upload one here.
                </p>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  No schedule loaded. Drag a .xlsx/.xls/.csv file in, or browse to upload one.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isViewer && !schedule && (
              <span className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                <Lock size={13} /> View only
              </span>
            )}
            {!isViewer && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploading ? 'Uploading…' : schedule ? 'Replace' : 'Upload Sheet'}
                </button>
              </>
            )}
            {schedule && !isViewer && (
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

        {!isViewer && dragActive && (
          <div className="mt-3 rounded-xl border-2 border-dashed border-blue-500/50 bg-blue-500/5 py-4 text-center text-xs font-medium text-blue-600 dark:text-blue-300">
            Drop the .xlsx / .xls / .csv file to upload
          </div>
        )}
        {uploadError && (
          <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">{uploadError}</p>
        )}
      </div>


      <div className="flex-1 glass rounded-[26px] flex flex-col overflow-hidden">
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
                className={`max-w-[75%] px-4 py-2 rounded-[26px] text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-br-sm shadow-md shadow-blue-600/20'
                    : 'glass-hairline bg-black/3 dark:bg-white/6 text-neutral-900 dark:text-white rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="glass-hairline bg-black/3 dark:bg-white/6 text-neutral-500 dark:text-neutral-400 px-4 py-2 rounded-[26px] rounded-bl-sm text-sm flex items-center gap-1.5">
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