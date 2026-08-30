import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border border-violet-500/30 bg-[linear-gradient(135deg,#5B21B6,#7C3AED)] text-white shadow-[0_8px_22px_rgba(91,33,182,0.22)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_30px_rgba(91,33,182,0.3)]',
        secondary: 'border border-violet-200 bg-white text-violet-700 shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50',
        outline: 'border border-violet-300 bg-white text-violet-700 shadow-[0_2px_8px_rgba(49,46,129,0.05)] hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-50 hover:shadow-[0_8px_20px_rgba(49,46,129,0.09)]',
        ghost: 'text-violet-700 hover:bg-violet-50',
        dark: 'bg-[#0B1020] text-white shadow-md hover:-translate-y-0.5 hover:bg-[#312E81] hover:shadow-lg hover:shadow-violet-500/15',
      },
      size: {
        default: 'px-5 py-2.5',
        sm: 'min-h-10 px-3.5 py-2 text-xs',
        lg: 'min-h-12 px-6 py-3 text-base',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
