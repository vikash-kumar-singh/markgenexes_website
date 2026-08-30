import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from '../../lib/utils'

export function Dialog({ open, onOpenChange, title, description, children, className }) {
  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onOpenChange(false)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-end overflow-hidden bg-[#0B1020]/70 p-3 backdrop-blur-md sm:place-items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <div className={cn('animate-rise max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto overscroll-contain rounded-2xl border border-violet-100 bg-white shadow-premium sm:max-h-[calc(100dvh-3rem)] sm:max-w-2xl sm:rounded-3xl', className)}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-violet-100 bg-white/95 p-5 backdrop-blur">
          <div>
            <div className="mb-2 h-1 w-10 rounded-full bg-[linear-gradient(90deg,#5B21B6,#8B5CF6)]" />
            <h2 className="text-xl font-extrabold text-ink">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close dialog">
            <X className="size-5" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
