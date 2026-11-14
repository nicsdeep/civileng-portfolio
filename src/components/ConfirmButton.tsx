import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  /** Text of the first button, e.g. "Remove résumé". */
  children: ReactNode
  /** Question shown after the first click. */
  question: ReactNode
  /** Text of the button that carries out the action. */
  confirmLabel: string
  onConfirm: () => void
  className?: string
  disabled?: boolean
}

/**
 * Two-step button for actions that remove something: the first click asks,
 * the second click does it. Works the same on phones (no browser pop-ups),
 * and Escape or "Cancel" backs out.
 */
export function ConfirmButton({ children, question, confirmLabel, onConfirm, className = 'btn-quiet', disabled }: Props) {
  const [asking, setAsking] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (asking) confirmRef.current?.focus()
  }, [asking])

  if (!asking) {
    return (
      <button ref={triggerRef} type="button" className={className} disabled={disabled} onClick={() => setAsking(true)}>
        {children}
      </button>
    )
  }

  const cancel = () => {
    setAsking(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <span
      role="group"
      className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm"
      onKeyDown={(e) => e.key === 'Escape' && cancel()}
    >
      <span className="text-ink">{question}</span>
      <button
        ref={confirmRef}
        type="button"
        className="btn h-8 bg-danger px-3 py-0 text-white hover:opacity-90"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn-quiet" onClick={cancel}>Cancel</button>
    </span>
  )
}
