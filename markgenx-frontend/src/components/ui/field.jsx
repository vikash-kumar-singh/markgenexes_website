import { cn } from '../../lib/utils'

export function Field({ label, children, className }) {
  return (
    <label className={cn('grid gap-2 text-sm font-bold text-[#111827]', className)}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'min-h-12 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition-all placeholder:text-slate-400 hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'min-h-12 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition-all hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
