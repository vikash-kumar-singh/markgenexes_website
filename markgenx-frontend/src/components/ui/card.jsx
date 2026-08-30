import { cn } from '../../lib/utils'

export function Card({ className, interactive = false, ...props }) {
  return <div className={cn('surface-card rounded-2xl', interactive && 'interactive-card', className)} {...props} />
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('space-y-1.5 p-5 pb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-lg font-bold tracking-tight text-ink', className)} {...props} />
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-6 text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}
