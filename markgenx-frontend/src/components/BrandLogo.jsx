import { cn } from '../lib/utils'

export function BrandLogo({ className, markClassName, dark = false, compact = false }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-3', className)}>
      <img src="/logo-markgenexes.svg" alt="" className={cn('size-10 shrink-0 object-contain', markClassName)} />
      {!compact ? (
        <span className={cn('truncate text-[1.08rem] font-extrabold tracking-[-0.035em]', dark ? 'text-white' : 'text-[#111827]')}>
          <span className={dark ? 'text-white' : 'text-[#312E81]'}>Mark</span>
          <span className={dark ? 'text-violet-300' : 'text-[#6D28D9]'}>Genexes</span>
        </span>
      ) : null}
    </span>
  )
}
