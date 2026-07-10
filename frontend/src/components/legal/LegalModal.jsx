import { useEffect, useState } from 'react'
import { X, HelpCircle, LifeBuoy, ShieldCheck, FileText } from 'lucide-react'
import {
  FAQ_ITEMS,
  HELP_SECTIONS,
  PRIVACY_POLICY_SECTIONS,
  TERMS_SECTIONS,
} from './legalContent'

const TABS = [
  { key: 'faq', label: 'FAQ', icon: HelpCircle },
  { key: 'help', label: 'Help', icon: LifeBuoy },
  { key: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
  { key: 'terms', label: 'Terms & Conditions', icon: FileText },
]

/**
 * Tabbed FAQ / Help / Privacy Policy / Terms & Conditions modal.
 *
 * Props:
 *  - open: boolean
 *  - initialTab: 'faq' | 'help' | 'privacy' | 'terms'
 *  - onClose: () => void
 */
export default function LegalModal({ open, initialTab = 'faq', onClose }) {
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="FAQ, Help, Privacy Policy and Terms & Conditions"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="dark relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col glass-hero rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-white">Legal & Support</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 px-6 pb-4 shrink-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                tab === key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="h-px bg-linear-to-r from-transparent via-white/15 to-transparent shrink-0" />

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm">
          {tab === 'faq' && (
            <>
              {FAQ_ITEMS.map((item, i) => (
                <div key={i}>
                  <p className="text-white font-semibold mb-1">{item.q}</p>
                  <p className="text-neutral-400 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </>
          )}

          {tab === 'help' && (
            <>
              {HELP_SECTIONS.map((s, i) => (
                <div key={i}>
                  <p className="text-white font-semibold mb-1">{s.title}</p>
                  <p className="text-neutral-400 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </>
          )}

          {tab === 'privacy' && (
            <>
              <p className="text-neutral-400 text-xs mb-1">
                Last updated: {new Date().getFullYear()}
              </p>
              {PRIVACY_POLICY_SECTIONS.map((s, i) => (
                <div key={i}>
                  <p className="text-white font-semibold mb-1">{s.title}</p>
                  <p className="text-neutral-400 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </>
          )}

          {tab === 'terms' && (
            <>
              <p className="text-neutral-400 text-xs mb-1">
                Last updated: {new Date().getFullYear()}
              </p>
              {TERMS_SECTIONS.map((s, i) => (
                <div key={i}>
                  <p className="text-white font-semibold mb-1">{s.title}</p>
                  <p className="text-neutral-400 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="h-px bg-linear-to-r from-transparent via-white/15 to-transparent shrink-0" />

        {/* Footer */}
        <div className="px-6 py-4 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
