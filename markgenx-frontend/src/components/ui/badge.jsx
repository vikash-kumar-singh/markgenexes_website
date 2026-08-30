import { cn } from '../../lib/utils'

export function Badge({ className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-violet-700',
        className,
      )}
    >
      {children}
    </span>
  )
}
