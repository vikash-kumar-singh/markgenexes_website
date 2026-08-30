import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  Eye,
  Factory,
  Gauge,
  GraduationCap,
  HeartPulse,
  Hotel,
  House,
  Inbox,
  Landmark,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogOut,
  MailCheck,
  Menu,
  MessageSquareText,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from './context/auth-context'
import { adminModules, navItems, roles, services } from './data/siteData'
import { getLeadQueue, getLeads, getPublicIndustries, getPublicJobs, getPublicPartners, getServiceEnquiries, updateLead as saveLead, updateLeadQueue } from './lib/api'
import { cn } from './lib/utils'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { buttonVariants } from './components/ui/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Dialog } from './components/ui/dialog'
import { EmptyState } from './components/ui/empty-state'
import { Field, Input, Select, Textarea } from './components/ui/field'
import { SkeletonPanel } from './components/ui/skeleton'
import { BrandLogo } from './components/BrandLogo'
import { LeadForm } from './components/LeadForm'
import { ServiceDiscussionForm } from './components/ServiceDiscussionForm'
import { IndustryManager } from './components/IndustryManager'
import { CareerManager } from './components/CareerManager'
import { JobApplicationForm } from './components/JobApplicationForm'
import { TrackingManager } from './components/TrackingManager'
import { CaseStudiesPage } from './components/CaseStudiesPage'
import { CaseStudyManager } from './components/CaseStudyManager'
import { PartnerManager } from './components/PartnerManager'
import { initializeTracking, trackEvent } from './lib/tracking'

const phoneNumber = '+919875389170'
const phoneDisplay = '+91 98753 89170'
const whatsappUrl = `https://wa.me/919875389170?text=${encodeURIComponent(
  'Hi MarkGenexes, I want to discuss growth and marketing services.',
)}`
const industryIconMap = { Building2, Code2, Factory, GraduationCap, HeartPulse, Hotel, House, Landmark, ShoppingBag }

function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TrackingObserver />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/industries" element={<IndustriesPage />} />
          <Route path="/case-studies" element={<CaseStudiesPage />} />
          <Route path="/consultation" element={<ConsultationPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/partner" element={<PartnerPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <FloatingActions />
    </div>
  )
}

function TrackingObserver() {
  const location = useLocation()
  useEffect(() => { initializeTracking().then(() => trackEvent('page_view')).catch(() => {}) }, [location.pathname, location.search])
  return null
}

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <header className={cn('sticky top-0 z-40 border-b border-violet-100/70 bg-white/90 backdrop-blur-2xl transition-all duration-300', scrolled && 'border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.075)]')}>
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0" aria-label="MarkGenexes home">
          <BrandLogo markClassName="size-11" />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'relative rounded-lg px-2.5 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 xl:px-3',
                  isActive && 'bg-violet-50 text-violet-700 after:absolute after:inset-x-3 after:-bottom-[21px] after:h-0.5 after:rounded-full after:bg-violet-600',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to={isAuthenticated ? '/admin' : '/login'}
            className={({ isActive }) =>
              cn(
                'relative rounded-lg px-2.5 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 xl:px-3',
                isActive && 'bg-violet-50 text-violet-700 after:absolute after:inset-x-3 after:-bottom-[21px] after:h-0.5 after:rounded-full after:bg-violet-600',
              )
            }
          >
            Admin
          </NavLink>
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <a className={buttonVariants({ variant: 'outline', size: 'sm' })} href={whatsappUrl} target="_blank" rel="noreferrer">
            <Users className="size-4" />
            Talk to an Expert
          </a>
          <Link className={buttonVariants({ size: 'sm' })} to="/consultation">
            <CalendarCheck className="size-4" />
            Book a Consultation
          </Link>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <Link className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex')} to="/consultation">Let&apos;s talk</Link>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-lg border border-violet-200 bg-white text-ink shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="animate-enter border-t border-violet-100 bg-white px-4 py-5 shadow-premium xl:hidden">
          <nav className="mx-auto grid max-w-2xl gap-1" aria-label="Mobile navigation">
            {[...navItems, { label: 'Admin', href: isAuthenticated ? '/admin' : '/login' }].map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn('rounded-lg px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-violet-50', isActive && 'bg-violet-50 text-violet-700')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-4 grid gap-2 border-t border-violet-100 pt-4 sm:grid-cols-2">
              <a className={buttonVariants({ variant: 'outline' })} href={whatsappUrl} target="_blank" rel="noreferrer">Talk to an Expert</a>
              <Link className={buttonVariants()} to="/consultation" onClick={() => setOpen(false)}>Book a Consultation</Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-violet-100 bg-white">
        <div className="enterprise-grid absolute inset-0" />
        <div className="pointer-events-none absolute -right-40 top-8 size-[34rem] rounded-full bg-violet-300/20 blur-[110px]" />
        <div className="mx-auto grid min-h-[650px] max-w-[1440px] items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
          <div className="relative z-10 animate-enter">
            <Badge className="w-fit bg-white shadow-sm">
              <Sparkles className="size-3.5" />
              Marketing, technology, and growth consulting
            </Badge>
            <h1 className="mt-6 max-w-3xl text-[2.6rem] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink sm:text-[3.45rem] lg:text-[3.8rem]">
              MarkGenexes builds <span className="gradient-text">lead generation systems</span> for ambitious businesses.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Digital marketing, performance marketing, lead generation, branding, development, SEO, social, AI automation, and business consulting in one accountable growth partner.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className={buttonVariants({ size: 'lg' })} to="/consultation">
                Book a Consultation <ArrowRight className="size-5" />
              </Link>
              <a className={buttonVariants({ variant: 'outline', size: 'lg' })} href={whatsappUrl} target="_blank" rel="noreferrer">
                Talk to an Expert <ArrowUpRight className="size-4" />
              </a>
            </div>
            <div className="mt-9 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
              <div className="flex -space-x-2" aria-hidden="true">
                {[Building2, Code2, TrendingUp].map((Icon, index) => (
                  <span key={index} className="grid size-9 place-items-center rounded-full border-2 border-white bg-violet-50 text-violet-700"><Icon className="size-4" /></span>
                ))}
              </div>
              <p className="max-w-sm text-xs font-semibold leading-5 text-slate-500">Campaigns mapped to measurable outcomes with sales notifications and role-aware operations.</p>
            </div>
          </div>

          <GrowthPlatformVisual />
        </div>
      </section>

      <TrustStrip />
      <ServiceOverview />
      <ConversionSection />
      <AdminPreview />
    </>
  )
}

function GrowthPlatformVisual() {
  return (
    <div className="relative z-10 animate-rise lg:pl-6" aria-label="MarkGenexes growth platform visualization">
      <div className="absolute inset-10 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-3 shadow-[0_36px_100px_rgba(49,46,129,0.18)] sm:p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#0B1020]"><img src="/logo-markgenexes.svg" alt="" className="size-7" /></span>
            <div><p className="text-sm font-extrabold text-ink">Growth command center</p><p className="text-[11px] font-semibold text-slate-400">Live performance overview</p></div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-extrabold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" />Systems active</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            ['9+', 'Growth services', TrendingUp],
            ['24/7', 'Lead capture', Activity],
            ['CRM', 'Ready pipeline', Users],
          ].map(([value, label, Icon]) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4">
              <Icon className="size-4 text-violet-600" />
              <p className="mt-3 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold text-ink">Acquisition momentum</p><p className="mt-0.5 text-[10px] text-slate-400">Connected channel activity</p></div><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">Live</span></div>
            <div className="metric-bars mt-6 flex h-28 items-end gap-2 border-b border-slate-100 px-1">
              {[38, 52, 44, 68, 57, 82, 72, 96, 86, 100].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-[linear-gradient(180deg,#8B5CF6,#5B21B6)] opacity-90" style={{ height: `${height}%`, animationDelay: `${index * 50}ms` }} />)}
            </div>
            <div className="mt-3 flex justify-between text-[9px] font-semibold text-slate-400"><span>Discover</span><span>Engage</span><span>Convert</span></div>
          </div>
          <div className="rounded-2xl bg-[#0B1020] p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-300">Automation flow</p>
            <div className="mt-4 grid gap-2.5">
              {['Campaign signal', 'Lead qualified', 'Sales routed'].map((item, index) => (
                <div key={item} className="flex items-center gap-2.5"><span className="grid size-6 shrink-0 place-items-center rounded-lg bg-violet-500/20 text-[10px] font-bold text-violet-200">{index + 1}</span><span className="text-[11px] font-semibold text-slate-200">{item}</span>{index < 2 ? <ChevronRight className="ml-auto size-3 text-violet-400" /> : <Check className="ml-auto size-3 text-emerald-400" />}</div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] text-slate-400">System status</p><p className="mt-1 text-xs font-bold">Optimized & ready</p></div>
          </div>
        </div>
      </div>
      <div className="animate-float absolute -bottom-6 -left-3 hidden items-center gap-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-premium sm:flex"><span className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><MailCheck className="size-4" /></span><div><p className="text-[10px] font-semibold text-slate-400">Lead handoff</p><p className="text-xs font-extrabold text-ink">Sales team notified</p></div></div>
    </div>
  )
}

function TrustStrip() {
  return (
    <section className="border-b border-border bg-[#0B1020] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-px bg-white/10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {[
          [Gauge, 'Performance-first', 'Campaigns mapped to measurable outcomes'],
          [MailCheck, 'Lead handoff ready', 'Sales notifications and acknowledgement flows'],
          [LineChart, 'Tracking native', 'UTM, GA, conversion, and pixel hooks'],
          [ShieldCheck, 'Admin controlled', 'Role-aware publishing and operations'],
        ].map(([Icon, title, text]) => (
          <div key={title} className="flex items-start gap-3 bg-[#0B1020] px-3 py-5 transition hover:bg-[#14132d]">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-400">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ServiceOverview() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="max-w-3xl">
        <p className="section-label">Core services</p>
        <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-5xl">
          Everything MarkGenexes provides, built as a connected system.
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => {
          const Icon = service.icon
          return (
            <article key={service.slug} className="group surface-card interactive-card relative overflow-hidden rounded-2xl p-6">
              <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-[linear-gradient(90deg,#5B21B6,#8B5CF6)] transition-transform duration-300 group-hover:scale-x-100" />
              <span className="absolute right-5 top-5 text-xs font-extrabold tracking-[0.16em] text-slate-300 transition group-hover:text-violet-300">{String(index + 1).padStart(2, '0')}</span>
              <div className="flex items-start gap-4 pr-6">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.description}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-primary transition sm:opacity-0 sm:group-hover:opacity-100">
                    Explore service
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      </div>
    </section>
  )
}

function ConversionSection() {
  return (
    <section className="premium-dark-surface relative overflow-hidden border-y border-violet-900/70 text-white">
      <div className="pointer-events-none absolute -left-40 top-10 size-96 rounded-full bg-violet-600/20 blur-[100px]" />
      <div className="relative mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
        <div>
          <Badge className="border-white/15 bg-white/10 text-white">Lead generation system</Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">Every important page is designed to convert.</h2>
          <div className="mt-7 grid gap-3">
            {[
              'Contact, consultation, service enquiry, career, and partner forms',
              'WhatsApp click-to-chat and mobile call action',
              'Lead source, campaign source, UTM data, date, status, and notes',
              'CRM-ready storage with sales assignment and export flow',
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-md border border-white/10 bg-white/5 p-3 transition hover:border-white/20 hover:bg-white/10">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="text-sm font-medium text-white/86">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <LeadForm title="Start Your Growth Journey" type="consultation" />
      </div>
    </section>
  )
}

function AdminPreview() {
  return (
    <section className="bg-[#F5F3FF]">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="section-label">Operations platform</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-5xl">Content, leads, roles, reports, and operations from one dashboard.</h2>
          <Link className={cn(buttonVariants({ variant: 'dark' }), 'mt-6')} to="/login">
            Open Admin
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {adminModules.map((module) => {
            const Icon = module.icon
            return (
              <Card key={module.title} interactive>
                <CardHeader>
                  <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription>Reusable controls for everyday website operations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {module.items.map((item) => (
                      <Badge key={item}>{item}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div></div>
    </section>
  )
}

function ServicesPage() {
  const [selectedService, setSelectedService] = useState(null)

  return (
    <>
      <PageShell
        eyebrow="Services"
        title="Premium growth services for acquisition, conversion, and automation."
        description="Choose a focused service or combine multiple disciplines into one campaign operating system."
        cta="Request a Proposal"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => {
              const Icon = service.icon
              return (
                <article key={service.slug} className="surface-card interactive-card relative flex flex-col overflow-hidden rounded-2xl p-6">
                  <span className="absolute right-5 top-5 text-xs font-extrabold tracking-[0.16em] text-slate-300">{String(index + 1).padStart(2, '0')}</span>
                  <div className="flex flex-1 gap-4 pr-6">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-ink">{service.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid min-w-0 gap-2 sm:grid-cols-2">
                    <Link className={cn(buttonVariants({ size: 'sm' }), 'h-11 min-w-0 w-full whitespace-nowrap px-2 text-xs xl:text-sm')} to="/consultation">
                      Talk to an Expert
                      <ArrowRight className="size-3.5 shrink-0" />
                    </Link>
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-11 min-w-0 w-full whitespace-nowrap px-2 text-xs xl:text-sm')}
                      onClick={() => setSelectedService(service)}
                      aria-label={`Discuss ${service.title}`}
                    >
                      <MessageSquareText className="size-3.5 shrink-0" />
                      Discuss the Service
                    </button>
                  </div>
                </article>
              )
            })}
        </div>
      </PageShell>
      <Dialog
        open={Boolean(selectedService)}
        onOpenChange={(open) => {
          if (!open) setSelectedService(null)
        }}
        title="Request a proposal"
        description="Share a few details and our team will follow up with a tailored next step."
        className="sm:max-w-3xl"
      >
        {selectedService ? (
          <ServiceDiscussionForm
            key={selectedService.slug}
            serviceTitle={selectedService.title}
            serviceSlug={selectedService.slug}
          />
        ) : null}
      </Dialog>
    </>
  )
}

function IndustriesPage() {
  const [managedIndustries, setManagedIndustries] = useState(null)

  useEffect(() => {
    let mounted = true
    getPublicIndustries()
      .then((items) => {
        if (mounted) setManagedIndustries(items)
      })
      .catch(() => {
        if (mounted) setManagedIndustries(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  const displayedIndustries = managedIndustries || []

  return (
    <PageShell
      eyebrow="Industries"
      title="Industry expertise built around your customer journey."
      description="We combine market context, acquisition strategy, creative, technology, and lead operations to solve the growth challenges specific to your industry."
      cta="Talk to an Industry Specialist"
    >
      <div className="grid gap-6">
        {displayedIndustries.map((industry, index) => {
          const Icon = industryIconMap[industry.icon] || Building2
          const industryTitle = industry.title || industry.name
          const imageSource = industry.mainImage || ''
          return (
            <article
              id={industry.slug}
              key={industry.slug}
              className="surface-card interactive-card group scroll-mt-24 overflow-hidden rounded-lg"
            >
              <div className="grid min-w-0 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="relative flex min-h-56 flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_80%_15%,rgba(168,85,247,0.18),transparent_14rem),linear-gradient(135deg,#0B1020,#312E81,#6D28D9)] p-5 text-white sm:min-h-64 sm:p-7 lg:min-h-full">
                  {imageSource ? (
                    <>
                      <img
                        src={imageSource}
                        alt={industry.imageAlt || `${industryTitle} industry`}
                        className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] rounded-lg object-cover shadow-premium transition duration-500 group-hover:scale-[1.01] sm:inset-5 sm:h-[calc(100%-2.5rem)] sm:w-[calc(100%-2.5rem)]"
                        loading="eager"
                      />
                      <div className="absolute inset-4 rounded-lg bg-gradient-to-t from-ink/55 via-transparent to-ink/20 sm:inset-5" />
                    </>
                  ) : null}
                  <div className="relative z-[1] flex items-center justify-between gap-3">
                    <Badge className="border-white/15 bg-white/10 text-white">{industry.industryNumber || String(index + 1).padStart(2, '0')}</Badge>
                    <span className="grid size-11 place-items-center rounded-md bg-white/10 text-accent backdrop-blur-sm">
                      <Icon className="size-6" />
                    </span>
                  </div>
                  {!imageSource ? (
                    <>
                      <div className="relative mt-12">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Growth systems for</p>
                        <h2 className="mt-2 max-w-md text-3xl font-black leading-tight sm:text-4xl">{industryTitle}</h2>
                      </div>
                      <div className="pointer-events-none absolute -bottom-16 -right-12 size-52 rounded-full border border-white/10 bg-white/5" />
                    </>
                  ) : null}
                </div>

                <div className="min-w-0 p-5 sm:p-7 lg:p-8">
                  <h2 className="text-2xl font-black text-ink sm:text-3xl">{industryTitle}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{industry.description}</p>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">Challenges we solve</h3>
                      <ul className="mt-3 grid gap-3">
                        {industry.challenges.map((challenge, challengeIndex) => (
                          <li key={challenge.text || challenge || challengeIndex} className="flex items-start gap-2 text-sm leading-6 text-ink">
                            <ArrowRight className="mt-1 size-4 shrink-0 text-accent" />
                            <span>{challenge.text || challenge}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">Outcomes we deliver</h3>
                      <ul className="mt-3 grid gap-3">
                        {industry.outcomes.map((outcome, outcomeIndex) => (
                          <li
                            key={outcome.text || outcome || outcomeIndex}
                            className={cn(
                              'flex items-start gap-2 text-sm leading-6',
                              outcome.highlighted === false ? 'text-ink' : 'font-bold text-primary',
                            )}
                          >
                            {outcome.highlighted === false ? <ArrowRight className="mt-1 size-4 shrink-0 text-accent" /> : <Check className="mt-1 size-4 shrink-0" />}
                            <span>{outcome.text || outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/^https?:\/\//i.test(industry.ctaLink || '') ? (
                    <a className={cn(buttonVariants({ variant: 'outline' }), 'mt-7 w-full sm:w-auto')} href={industry.ctaLink} target="_blank" rel="noreferrer">
                      {industry.ctaText || 'Talk to an Industry Specialist'}
                      <ArrowRight className="size-4" />
                    </a>
                  ) : (
                    <Link className={cn(buttonVariants({ variant: 'outline' }), 'mt-7 w-full sm:w-auto')} to={industry.ctaLink || '/consultation'}>
                      {industry.ctaText || 'Talk to an Industry Specialist'}
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          )
        })}
        {!displayedIndustries.length ? (
          <EmptyState
            icon={Building2}
            title="Industry profiles are being updated"
            description="Published industry content will appear here soon."
          />
        ) : null}
      </div>
    </PageShell>
  )
}

function ConsultationPage() {
  return (
    <PageShell
      eyebrow="Consulting"
      title="Book a consultation with a growth strategist."
      description="Bring your business objective, current channels, budget comfort, and timeline. MarkGenexes will map the next best growth path."
      cta="Book a Consultation"
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          {['Growth audit', 'Channel plan', 'Lead routing', 'AI automation map'].map((item, index) => (
            <div key={item} className="surface-card interactive-card rounded-lg p-5">
              <p className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-sm font-black text-primary">0{index + 1}</p>
              <h2 className="mt-2 text-xl font-bold text-ink">{item}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A practical session focused on acquisition, conversion, sales handoff, and measurable next actions.
              </p>
            </div>
          ))}
        </div>
        <LeadForm type="consultation" title="Book a Consultation" />
      </div>
    </PageShell>
  )
}

function CareersPage() {
  const [openRole, setOpenRole] = useState('senior-performance-marketing-manager')
  const [jobs, setJobs] = useState([])
  const [applyingFor, setApplyingFor] = useState(null)
  const benefits = [
    { title: 'Remote-first', description: 'Work from anywhere in India. We have been distributed since 2020 and we mean it.', icon: House },
    { title: 'Learning budget', description: '₹40,000/year for courses, conferences, and books — no approval gauntlet.', icon: GraduationCap },
    { title: 'Health & wellness', description: 'Family health insurance, mental health support, and a quarterly wellness stipend.', icon: HeartPulse },
    { title: 'Real ownership', description: 'You own outcomes, not tasks. We hire seniors and trust them to figure out the how.', icon: ShieldCheck },
    { title: 'Flexible hours', description: 'Core hours of 11am–4pm IST. The rest is yours to structure around your life.', icon: CalendarCheck },
    { title: 'Growth path', description: 'Quarterly career conversations and a transparent promotion framework.', icon: TrendingUp },
  ]
  useEffect(() => { getPublicJobs().then((items) => { setJobs(items); if (items.length) setOpenRole(items[0].id) }).catch(() => setJobs([])) }, [])
  /* Legacy email application flow intentionally replaced by the role-bound form.
    const subject = `Job Application – ${roleName}`
    const body = ['Hello MarkGenexes Hiring Team,', '', `I would like to apply for the ${roleName} role.`, '', 'Name:', 'Phone Number:', 'Experience:', 'Resume / Portfolio Link:', 'Message:', '', 'Thank you,'].join('\n')
    return `mailto:markgenexs@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  } */

  return (
    <PageShell
      eyebrow="Careers"
      title="Do meaningful work with people who trust you."
      description="Join a remote-first team of senior professionals building measurable growth systems for ambitious businesses."
      cta="View Open Positions"
      ctaHref="#open-positions"
    >
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-12">
        <div>
          <Badge>Why MarkGenexes</Badge>
          <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-ink sm:text-4xl lg:text-5xl">
            Senior team. Real autonomy. Outcomes over politics.
          </h2>
          <div className="mt-5 grid max-w-3xl gap-4 text-sm leading-7 text-muted-foreground sm:text-base">
            <p>
              We have spent twelve years building the kind of agency we would want to work at — one where you are trusted to do your best work, surrounded by people who raise your bar, and measured by the impact you create for clients.
            </p>
            <p>
              No timesheets. No layers of approval for a tweet. Just clear goals, great teammates, and the freedom to figure out how to get there.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            ['60', 'Team members'],
            ['4.9/5', 'Employee rating'],
            ['3.1 yrs', 'Avg. tenure'],
            ['6', 'Cities'],
          ].map(([value, label]) => (
            <div key={label} className="surface-card interactive-card grid min-h-32 place-items-center rounded-lg p-4 text-center sm:min-h-40 sm:p-5">
              <div>
                <p className="text-3xl font-black text-primary sm:text-4xl">{value}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground sm:text-sm">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-14 lg:pt-20">
        <div className="text-center">
          <Badge>Benefits & Perks</Badge>
          <h2 className="mt-4 text-3xl font-black text-ink sm:text-4xl">Designed for senior professionals</h2>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <article key={benefit.title} className="surface-card interactive-card rounded-lg p-5 sm:p-6">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" /></span>
                <h3 className="mt-4 text-xl font-bold text-ink">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="open-positions" className="scroll-mt-24 pt-14 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge>Open Positions</Badge>
          <h2 className="mt-4 text-3xl font-black text-ink sm:text-4xl">Come build with us</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Don&apos;t see a perfect fit? Email <a className="font-bold text-primary hover:underline" href="mailto:markgenexs@gmail.com">markgenexs@gmail.com</a> — we are always interested in exceptional people.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl gap-3">
          {jobs.map((job) => {
            const expanded = openRole === job.id
            return (
              <article key={job.id} className="surface-card overflow-hidden rounded-lg">
                <button
                  type="button"
                  className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  onClick={() => setOpenRole(expanded ? null : job.id)}
                  aria-expanded={expanded}
                  aria-controls={`career-${job.id}`}
                >
                  <span className="font-bold text-ink sm:text-lg">{job.title}</span>
                  <span className="flex w-full items-center gap-2 sm:w-auto">
                    <span className="flex min-w-0 flex-1 flex-wrap gap-2 sm:justify-end">
                      {[job.department, `${job.workMode}${job.location ? ` (${job.location})` : ''}`, job.employmentType].filter(Boolean).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                    </span>
                    <ChevronDown className={cn('size-5 shrink-0 text-primary transition-transform', expanded && 'rotate-180')} />
                  </span>
                </button>
                {expanded ? (
                  <div id={`career-${job.id}`} className="animate-enter border-t border-border px-4 pb-5 pt-4 sm:px-5">
                    <p className="max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base">{job.description}</p>
                    <Button className="mt-5 w-full sm:w-auto" onClick={() => setApplyingFor(job)}>
                      Apply for this role
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
      <JobApplicationForm key={applyingFor?.id || 'closed'} job={applyingFor} onClose={() => setApplyingFor(null)} />

    </PageShell>
  )
}

function PartnerPage() {
  const [partners, setPartners] = useState([])
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [partnerError, setPartnerError] = useState('')
  useEffect(() => { let active = true; getPublicPartners().then((items) => active && setPartners(items)).catch((error) => active && setPartnerError(error.message)).finally(() => active && setLoadingPartners(false)); return () => { active = false } }, [])
  return (
    <PageShell
      eyebrow="Partnerships"
      title="Partner with MarkGenexes for clients, universities, and admissions growth."
      description="Built for agencies, referral partners, university partners, and admission partners that need reliable growth execution."
      cta={null}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loadingPartners ? <div className="surface-card grid min-h-40 place-items-center rounded-lg"><Loader2 className="size-6 animate-spin text-primary" /></div> : partnerError ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{partnerError}</div> : partners.map((item) => (
            <div key={item.id} className="surface-card interactive-card rounded-lg p-5">
              <Users className="size-5 text-primary" />
              <h2 className="mt-3 text-xl font-bold text-ink">{item.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}{!loadingPartners && !partnerError && !partners.length ? <div className="surface-card rounded-lg p-5 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">No partner programs are currently published.</div> : null}
      </div>
    </PageShell>
  )
}

function PageShell({ eyebrow, title, description, cta, ctaHref = '/consultation', children }) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-violet-100/80 bg-white">
        <div className="enterprise-grid absolute inset-0" />
        <div className="pointer-events-none absolute -right-24 -top-40 size-[32rem] rounded-full bg-violet-200/35 blur-[100px]" />
        <img src="/logo-markgenexes.svg" alt="" className="pointer-events-none absolute -right-8 top-1/2 hidden size-80 -translate-y-1/2 opacity-[0.035] lg:block" />
        <div className="relative mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-[4.5rem]">
          <p className="section-label">{eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[3.4rem]">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{description}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {cta && (ctaHref.startsWith('#') ? (
              <a className={buttonVariants()} href={ctaHref}>{cta}<ArrowRight className="size-4" /></a>
            ) : (
              <Link className={buttonVariants()} to={ctaHref}>{cta}<ArrowRight className="size-4" /></Link>
            ))}
            <a className={buttonVariants({ variant: 'outline' })} href={whatsappUrl} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </section>
      <section className="animate-enter mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">{children}</section>
    </>
  )
}

function LoginPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [notice, setNotice] = useState('')
  const { login, register, status, error, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) return <Navigate to="/admin" replace />

  function updateValue(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setNotice('')
    if (mode === 'login') {
      await login({ email: form.email, password: form.password })
      navigate('/admin')
    } else {
      const data = await register(form)
      setNotice(data.message || 'Account created. Verify email before logging in.')
      setMode('login')
    }
  }

  return (
    <section className="premium-dark-surface relative grid min-h-[calc(100vh-72px)] place-items-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/25 blur-[120px]" />
      <div className="surface-card animate-rise relative grid w-full max-w-5xl overflow-hidden rounded-3xl lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-[linear-gradient(145deg,#0B1020,#1E1B4B)] p-6 text-white sm:p-10">
          <BrandLogo dark markClassName="size-12" />
          <div className="mt-10 grid size-12 place-items-center rounded-xl bg-white/10 text-violet-300"><LayoutDashboard className="size-6" /></div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-300">Secure workspace</p>
          <h1 className="mt-3 text-3xl font-extrabold">Admin access</h1>
          <p className="mt-3 text-sm leading-6 text-white/75">
            Manage pages, service content, blogs, case studies, leads, sales assignments, roles, reports, and applications.
          </p>
          <div className="mt-6 grid gap-2">
            {roles.slice(0, 6).map((role) => (
              <div key={role} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 p-2 text-sm font-medium text-white/85">
                <ShieldCheck className="size-4 text-accent" />
                {role}
              </div>
            ))}
          </div>
        </div>
        <form onSubmit={submit} className="grid content-center gap-4 p-6 sm:p-10">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-violet-700">Welcome back</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Continue to your dashboard</h2></div>
          <div className="mt-2 flex rounded-xl border border-border bg-muted p-1">
            {['login', 'register'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn(
                  'min-h-10 flex-1 rounded-lg text-sm font-bold capitalize text-muted-foreground transition-all',
                  mode === item && 'bg-white text-violet-700 shadow-sm',
                )}
              >
                {item}
              </button>
            ))}
          </div>
          {mode === 'register' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <Input name="firstName" value={form.firstName} onChange={updateValue} required />
              </Field>
              <Field label="Last name">
                <Input name="lastName" value={form.lastName} onChange={updateValue} required />
              </Field>
            </div>
          ) : null}
          <Field label="Email">
            <Input type="email" name="email" value={form.email} onChange={updateValue} required />
          </Field>
          <Field label="Password">
            <Input type="password" name="password" value={form.password} onChange={updateValue} required />
          </Field>
          {mode === 'register' ? (
            <Field label="Confirm password">
              <Input type="password" name="confirmPassword" value={form.confirmPassword} onChange={updateValue} required />
            </Field>
          ) : null}
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm font-medium text-violet-700">{notice}</p> : null}
          <Button type="submit" disabled={status === 'loading'}>
            <UserRound className="size-4" />
            {mode === 'login' ? 'Login' : 'Create Account'}
          </Button>
        </form>
      </div>
    </section>
  )
}

function ProtectedRoute({ children }) {
  const { status, isAuthenticated } = useAuth()
  if (status === 'loading') {
    return (
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
        <SkeletonPanel />
        <SkeletonPanel />
        <SkeletonPanel />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AdminDashboard() {
  const { user, logout } = useAuth()
  const [leads, setLeads] = useState(() => getLeadQueue())
  const [serviceEnquiries, setServiceEnquiries] = useState(() =>
    getLeadQueue().filter((lead) => ['service', 'service_enquiry'].includes(lead.type)),
  )
  const [serviceFilter, setServiceFilter] = useState('all')
  const [selectedLead, setSelectedLead] = useState(null)
  const [pages, setPages] = useState([
    { id: 'home', title: 'Home', status: 'published', owner: 'Marketing Manager' },
    { id: 'services', title: 'Services', status: 'published', owner: 'Admin' },
    { id: 'case-studies', title: 'Case Studies', status: 'draft', owner: 'Marketing Manager' },
  ])
  const [newPage, setNewPage] = useState('')

  useEffect(() => {
    let mounted = true

    getLeads()
      .then((serverLeads) => {
        if (!mounted) return
        setLeads(serverLeads)
        updateLeadQueue(serverLeads)
      })

    getServiceEnquiries()
      .then((enquiries) => {
        if (mounted) setServiceEnquiries(enquiries)
      })
      .catch(() => {
        if (mounted) {
          setServiceEnquiries(getLeadQueue().filter((lead) => ['service', 'service_enquiry'].includes(lead.type)))
        }
      })
      .catch(() => {
        if (mounted) setLeads(getLeadQueue())
      })

    return () => {
      mounted = false
    }
  }, [])

  const metrics = useMemo(
    () => [
      { label: 'Queued leads', value: leads.length },
      { label: 'Service enquiries', value: serviceEnquiries.length },
      { label: 'Career applications', value: leads.filter((lead) => lead.type === 'career').length },
      { label: 'Published pages', value: pages.filter((page) => page.status === 'published').length },
    ],
    [leads, pages, serviceEnquiries],
  )

  const serviceOptions = useMemo(() => {
    const options = new Map(services.map((service) => [service.slug, { ...service, value: service.slug }]))

    serviceEnquiries.forEach((enquiry) => {
      const slug = enquiry.serviceSlug || enquiry.requiredService
      if (!slug) return
      options.set(slug, {
        slug,
        title: enquiry.requiredService || slug,
        value: enquiry.serviceId || slug,
      })
    })

    return [...options.values()].sort((a, b) => a.title.localeCompare(b.title))
  }, [serviceEnquiries])

  const filteredServiceEnquiries = useMemo(
    () =>
      serviceFilter === 'all'
        ? serviceEnquiries
        : serviceEnquiries.filter(
            (enquiry) => enquiry.serviceId === serviceFilter || enquiry.serviceSlug === serviceFilter,
          ),
    [serviceEnquiries, serviceFilter],
  )

  function updateLead(id, patch) {
    const next = leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead))
    setLeads(next)
    updateLeadQueue(next)
    saveLead(id, patch)
      .then((savedLead) => {
        if (!savedLead) return
        setLeads((current) => {
          const updated = current.map((lead) => (lead.id === id ? { ...lead, ...savedLead } : lead))
          updateLeadQueue(updated)
          return updated
        })
      })
      .catch(() => {})
  }

  function addPage(event) {
    event.preventDefault()
    if (!newPage.trim()) return
    setPages((current) => [
      { id: crypto.randomUUID(), title: newPage.trim(), status: 'draft', owner: 'Admin' },
      ...current,
    ])
    setNewPage('')
  }

  function exportLeads() {
    const headers = ['name', 'phone', 'email', 'companyName', 'industry', 'requiredService', 'budgetRange', 'cityOrLocation', 'leadSource', 'campaignSource', 'enquiredAt', 'leadStatus', 'assignedTo']
    const rows = leads.map((lead) => headers.map((key) => JSON.stringify(lead[key] || '')).join(','))
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'markgenexes-leads.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="bg-[#F1F5F9] px-3 py-5 sm:px-5 lg:py-8">
      <div className="mx-auto grid max-w-[1600px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.10)] lg:grid-cols-[248px_minmax(0,1fr)] lg:rounded-3xl">
        <aside className="premium-dark-surface hidden p-5 text-slate-300 lg:block">
          <div className="sticky top-24">
            <BrandLogo dark markClassName="size-11" />
            <p className="mt-8 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
            <nav className="mt-3 grid gap-1" aria-label="Admin navigation">
              {[
                ['Overview', '#admin-overview', LayoutDashboard],
                ['Lead inbox', '#lead-inbox', Inbox],
                ['Website content', '#website-content', Eye],
                ['Industries', '#content-managers', Building2],
                ['Roles & tracking', '#roles-tracking', Activity],
              ].map(([label, href, Icon], index) => (
                <a key={label} href={href} className={cn('flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition hover:bg-violet-500/10 hover:text-white', index === 0 && 'border-l-2 border-violet-400 bg-violet-600 text-white shadow-lg shadow-violet-950/20')}><Icon className="size-4" />{label}</a>
              ))}
            </nav>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold text-white">Enterprise workspace</p><p className="mt-2 text-[11px] leading-5 text-slate-400">Content, CRM, and operations under one secure system.</p></div>
          </div>
        </aside>
        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div id="admin-overview" className="scroll-mt-28 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge>Secure workspace</Badge>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user?.firstName || user?.email || 'team member'}.
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const icons = [Inbox, MessageSquareText, Building2, Activity]
          const Icon = icons[index]
          return (
            <Card key={metric.label} interactive className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-muted-foreground">{metric.label}</p>
                <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-black text-ink">{metric.value}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                <TrendingUp className="size-3.5" />
                Ready for reporting
              </p>
            </Card>
          )
        })}
      </div>

      <section className="surface-card mt-6 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                <MessageSquareText className="size-4" />
              </span>
              <h2 className="text-xl font-bold text-ink">Service Enquiries</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Review customer requirements grouped by their linked service.
            </p>
          </div>
          <Field label="Filter by service" className="w-full sm:w-72">
            <Select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
              <option value="all">All services ({serviceEnquiries.length})</option>
              {serviceOptions.map((service) => (
                <option key={service.slug} value={service.value}>
                  {service.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {filteredServiceEnquiries.length ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {filteredServiceEnquiries.map((enquiry) => {
              const assignedName =
                typeof enquiry.assignedTo === 'object'
                  ? [enquiry.assignedTo?.firstName, enquiry.assignedTo?.lastName].filter(Boolean).join(' ')
                  : enquiry.assignedTo

              return (
                <article key={enquiry.submissionId || enquiry.id} className="rounded-lg border border-border bg-white p-4 shadow-sm transition hover:border-primary/30 hover:shadow-soft">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-bold text-ink">{enquiry.name || 'Unnamed customer'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {enquiry.companyName || 'Company not provided'}
                      </p>
                    </div>
                    <Badge className="w-fit border-primary/15 bg-primary/5 text-primary">
                      {enquiry.requiredService || 'Service enquiry'}
                    </Badge>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-ink">
                    {enquiry.message || enquiry.businessRequirement || 'No requirements provided.'}
                  </p>

                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-muted-foreground">
                      <span className="font-bold text-ink">Email:</span> {enquiry.email || 'Not provided'}
                    </p>
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-muted-foreground">
                      <span className="font-bold text-ink">Phone:</span> {enquiry.phone || 'Not provided'}
                    </p>
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-muted-foreground">
                      <span className="font-bold text-ink">Budget:</span> {enquiry.budgetRange || 'Not provided'}
                    </p>
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-muted-foreground">
                      <span className="font-bold text-ink">Owner:</span> {assignedName || 'Unassigned'}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{enquiry.leadStatus || 'new'}</Badge>
                      <span className="text-muted-foreground">
                        {enquiry.enquiredAt ? new Date(enquiry.enquiredAt).toLocaleString() : 'Date unavailable'}
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedLead(enquiry)}>
                      View details
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon={MessageSquareText}
              title="No enquiries for this service"
              description="New submissions from the Discuss the Service form will appear here."
            />
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6">
        <section id="lead-inbox" className="surface-card min-w-0 scroll-mt-28 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Lead inbox</h2>
              <p className="mt-1 text-sm text-muted-foreground">Assignments, statuses, notes, campaign source, and export.</p>
            </div>
            <Button className="w-full sm:w-auto" variant="outline" onClick={exportLeads} disabled={!leads.length}>
              <Download className="size-4" />
              Export
            </Button>
          </div>
          {leads.length ? (
            <>
              <div className="mt-4 grid gap-3 lg:hidden">
                {leads.map((lead) => (
                  <article key={lead.id} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{lead.name || 'Unnamed lead'}</p>
                        <p className="mt-1 break-words text-xs text-muted-foreground">{lead.email || lead.phone}</p>
                      </div>
                      <Badge className="w-fit">{lead.leadSource || 'direct'}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md bg-muted/60 p-3">
                        <p className="text-xs font-bold uppercase text-muted-foreground">Service</p>
                        <p className="mt-1 break-words text-sm font-semibold text-ink">{lead.requiredService || lead.type}</p>
                      </div>
                      <Field label="Status">
                        <Select value={lead.leadStatus} onChange={(event) => updateLead(lead.id, { leadStatus: event.target.value })}>
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </Select>
                      </Field>
                      <Field label="Assigned owner">
                        <Input
                          value={typeof lead.assignedTo === 'string' ? lead.assignedTo : ''}
                          onChange={(event) => updateLead(lead.id, { assignedTo: event.target.value })}
                          placeholder="Sales owner"
                        />
                      </Field>
                      <Field label="Notes">
                        <Textarea
                          className="min-h-20"
                          value={lead.noteText || ''}
                          onChange={(event) => updateLead(lead.id, { noteText: event.target.value })}
                          placeholder="Lead notes"
                        />
                      </Field>
                    </div>
                    <Button className="mt-3 w-full sm:w-auto" type="button" variant="outline" size="sm" onClick={() => setSelectedLead(lead)}>
                      View details
                    </Button>
                  </article>
                ))}
              </div>
              <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border lg:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-border bg-muted/70 text-xs uppercase text-muted-foreground">
                  <tr>
                    {['Lead', 'Service', 'Source', 'Status', 'Assigned', 'Notes', ''].map((heading) => (
                      <th key={heading} className="px-3 py-3 font-bold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border bg-white align-top transition hover:bg-muted/45">
                      <td className="px-3 py-3">
                        <p className="font-bold text-ink">{lead.name || 'Unnamed lead'}</p>
                        <p className="text-xs text-muted-foreground">{lead.email || lead.phone}</p>
                      </td>
                      <td className="px-3 py-3">{lead.requiredService || lead.type}</td>
                      <td className="px-3 py-3">
                        <Badge>{lead.leadSource || 'direct'}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Select value={lead.leadStatus} onChange={(event) => updateLead(lead.id, { leadStatus: event.target.value })}>
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </Select>
                      </td>
                      <td className="px-3 py-3">
                        <Input
                          value={lead.assignedTo || ''}
                          onChange={(event) => updateLead(lead.id, { assignedTo: event.target.value })}
                          placeholder="Sales owner"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Textarea
                          className="min-h-20"
                          value={lead.noteText || ''}
                          onChange={(event) => updateLead(lead.id, { noteText: event.target.value })}
                          placeholder="Lead notes"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-border">
              <EmptyState
                icon={Inbox}
                title="No local leads yet"
                description="Submitted forms will appear here if the backend lead routes are unavailable."
              />
            </div>
          )}
        </section>

        <section id="website-content" className="surface-card min-w-0 scroll-mt-28 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-ink">Website content</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Pages, services, blogs, case studies, and media.</p>
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Eye className="size-4" />
            </span>
          </div>
          <form onSubmit={addPage} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input className="min-w-0" value={newPage} onChange={(event) => setNewPage(event.target.value)} placeholder="New page title" />
            <Button className="w-full shrink-0 sm:w-auto" type="submit" aria-label="Add page">
              <Plus className="size-4" />
              Add page
            </Button>
          </form>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => (
              <div key={page.id} className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-white p-3 transition hover:border-primary/30 hover:shadow-soft">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-ink">{page.title}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{page.owner}</p>
                </div>
                <Select
                  className="w-full"
                  aria-label={`${page.title} publication status`}
                  value={page.status}
                  onChange={(event) =>
                    setPages((current) =>
                      current.map((item) => (item.id === page.id ? { ...item, status: event.target.value } : item)),
                    )
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              </div>
            ))}
          </div>
        </section>

        <div id="content-managers" className="scroll-mt-28" />
        <IndustryManager />
        <CaseStudyManager />
        <PartnerManager />
        <CareerManager />
      </div>

      <div id="roles-tracking" className="mt-6 grid scroll-mt-28 gap-4 lg:grid-cols-2">
        <section className="surface-card rounded-lg p-5">
          <h2 className="text-xl font-bold text-ink">Roles and permissions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role}>{role}</Badge>
            ))}
          </div>
        </section>
        <TrackingManager />
      </div>

      <Dialog
        open={Boolean(selectedLead)}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        title={selectedLead?.name || 'Lead details'}
        description="Captured lead profile, source context, and business requirement."
      >
        {selectedLead ? (
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Email', selectedLead.email],
                ['Phone', selectedLead.phone],
                ['Company', selectedLead.companyName],
                ['Industry', selectedLead.industry],
                ['Service', selectedLead.requiredService],
                ['Service ID', selectedLead.serviceId],
                ['Budget', selectedLead.budgetRange],
                ['Location', selectedLead.cityOrLocation],
                ['Source', selectedLead.leadSource],
                [
                  'Submitted',
                  selectedLead.enquiredAt ? new Date(selectedLead.enquiredAt).toLocaleString() : '',
                ],
                ['Status', selectedLead.leadStatus],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{value || 'Not provided'}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-border bg-white p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Requirement</p>
              <p className="mt-2 text-sm leading-6 text-ink">{selectedLead.message || 'No message provided.'}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <a className={buttonVariants({ variant: 'outline' })} href={`mailto:${selectedLead.email || ''}`}>
                Email lead
              </a>
              <a className={buttonVariants()} href={selectedLead.phone ? `tel:${selectedLead.phone}` : `tel:${phoneNumber}`}>
                Call lead
              </a>
            </div>
          </div>
        ) : null}
      </Dialog>
        </div>
      </div>
    </section>
  )
}

function FloatingActions() {
  const location = useLocation()
  if (location.pathname === '/login' || location.pathname.startsWith('/admin')) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 gap-2 border-t border-violet-100 bg-white/92 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden">
      <a className={buttonVariants({ variant: 'dark' })} href={`tel:${phoneNumber}`}>
        <Phone className="size-4" />
        Call
      </a>
      <a className={buttonVariants()} href={whatsappUrl} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
    </div>
  )
}

function Footer() {
  return (
    <footer className="premium-dark-surface border-t border-violet-900/80 pb-20 text-slate-200 md:pb-0">
      <div className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-[linear-gradient(135deg,#1E1B4B,#312E81_58%,#5B21B6)] px-5 py-10 shadow-premium sm:px-10 lg:px-12 xl:flex xl:items-center xl:justify-between">
          <img src="/logo-markgenexes.svg" alt="" className="pointer-events-none absolute -right-16 -top-20 size-72 rotate-6 opacity-[0.10]" />
          <div className="relative"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-200">Book a consultation</p><h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Start Your Growth Journey.</h2><p className="mt-3 max-w-xl leading-7 text-violet-100/75">Share your requirements and the right specialist will respond with next steps.</p></div>
          <div className="relative mt-7 flex flex-col gap-3 sm:flex-row xl:mt-0"><Link className={buttonVariants({ size: 'lg' })} to="/consultation">Book a Consultation <ArrowRight className="size-4" /></Link><a className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/30 bg-white/10 text-white hover:bg-white hover:text-violet-800')} href={whatsappUrl} target="_blank" rel="noreferrer">Talk to an Expert</a></div>
        </div>
        <div className="py-12 lg:py-16">
          <div className="grid min-w-0 gap-10 sm:grid-cols-2 lg:grid-cols-[1.8fr_0.8fr_0.8fr_0.75fr_1fr] lg:gap-7">
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <BrandLogo dark markClassName="size-12" />
              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
                A full-service marketing agency helping brands grow through data-driven strategy, creative storytelling, and digital innovation.
              </p>
              <div className="mt-5 flex flex-wrap gap-3" aria-label="Social media links">
                {[['IN', 'LinkedIn'], ['X', 'X'], ['F', 'Facebook'], ['IG', 'Instagram']].map(([short, label]) => (
                  <a key={label} href="#" aria-label={label} className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-xs font-black text-white transition hover:border-violet-400 hover:bg-violet-600">{short}</a>
                ))}
              </div>
            </div>
            <FooterColumn title="Company" links={[["About Us", "/"], ["Case Studies", "/case-studies"], ["Careers", "/careers"], ["Blog / Insights", "#"], ["Contact Us", "/consultation"]]} />
            <FooterColumn title="Services" links={[["Brand Strategy", "/services"], ["Digital Marketing", "/services"], ["Content & SEO", "/services"], ["Paid Media", "/services"], ["Web & Design", "/services"]]} />
            <FooterColumn title="Legal" links={[["Privacy Policy", "#"], ["Terms & Conditions", "#"]]} />
            <div className="min-w-0">
              <h2 className="text-sm font-black uppercase tracking-wide text-white">Get in touch</h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
                <a className="break-all transition hover:text-violet-400" href="mailto:markgenexs@gmail.com">markgenexs@gmail.com</a>
                <a className="transition hover:text-violet-400" href={`tel:${phoneNumber}`}>{phoneDisplay}</a>
                <address className="not-italic">Prestige Tech Park,<br />Bangalore 560103</address>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <p>© 2026 Markgenexs Solutions Pvt Ltd. All rights reserved.</p>
            <div className="flex gap-6"><a href="#" className="hover:text-violet-400">Privacy</a><a href="#" className="hover:text-violet-400">Terms</a></div>
          </div>
        </div></div>
    </footer>
  )
}

function FooterColumn({ title, links }) {
  return <div className="min-w-0"><h2 className="text-sm font-black uppercase tracking-wide text-white">{title}</h2><div className="mt-4 grid gap-3">{links.map(([label, href]) => href.startsWith('/') ? <Link key={label} className="text-sm text-slate-300 transition hover:text-violet-400" to={href}>{label}</Link> : <a key={label} className="text-sm text-slate-300 transition hover:text-violet-400" href={href}>{label}</a>)}</div></div>
}

function NotFound() {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div>
        <h1 className="text-4xl font-black text-ink">Page not found</h1>
        <p className="mt-3 text-muted-foreground">The page may have moved or is still being prepared.</p>
        <Link className={cn(buttonVariants(), 'mt-6')} to="/">
          Back to home
        </Link>
      </div>
    </section>
  )
}

export default Layout
