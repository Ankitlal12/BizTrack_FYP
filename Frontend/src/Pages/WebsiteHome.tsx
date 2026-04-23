import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  Clock3,
  Globe,
  LineChart,
  MessageCircleHeart,
  PackageSearch,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react'

const WebsiteHome = () => {
  const trustBadges = [
    'Trusted by modern Nepal retailers',
    'Private and secure tenant workspace',
    'Team-ready onboarding in minutes',
  ]

  const testimonials = [
    {
      name: 'Sanjay Adhikari',
      role: 'Store Owner',
      quote:
        'We moved from spreadsheets to BizTrack in one week. Billing is faster and I finally trust my stock numbers.',
    },
    {
      name: 'Rita Shrestha',
      role: 'Operations Manager',
      quote:
        'The team adopted it immediately. Alerts, purchase planning, and role-based access made our daily work cleaner.',
    },
  ]

  return (
    <div className="biz-home min-h-screen overflow-x-hidden bg-white">
      <header className="sticky top-0 z-30 border-b border-[#d5e6df] bg-[#f7fbf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0e7a5f] text-white shadow-sm">
              <Boxes size={18} />
            </div>
            <div>
              <p className="biz-brand text-lg leading-tight">BizTrack</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#45695d]">Retail Growth OS</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg border border-[#b5d3c7] px-3 py-2 text-sm font-semibold text-[#0f5f4c] transition hover:bg-[#e8f5ef]"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-[#0e7a5f] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0b624c]"
            >
              Create Workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#bbdbcf] bg-[#e8f6ef] px-3 py-1 text-xs font-semibold text-[#0f5f4c]">
              <Sparkles size={14} />
              Built to convert daily chaos into growth
            </p>

            <h2 className="biz-heading mt-5 text-4xl leading-[1.06] text-[#122b24] sm:text-5xl lg:text-6xl">
              Run your store
              <span className="block text-[#0e7a5f]">with speed, clarity, and zero guesswork.</span>
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#3c5b50] sm:text-lg">
              BizTrack unifies billing, inventory, purchases, team roles, and insights in one workspace so you can
              close sales faster, avoid stockouts, and make better decisions every day.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0e7a5f] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-[1px] hover:bg-[#0b624c]"
              >
                Start My Workspace Now
                <ArrowRight size={15} />
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-[#b4c9bf] px-5 py-3 text-sm font-bold text-[#28443a] transition hover:bg-[#f0f6f3]"
              >
                I Already Use BizTrack
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-[#35584c]">
              {trustBadges.map((badge) => (
                <span key={badge} className="rounded-full bg-[#eaf4ef] px-3 py-1">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full bg-[#f3cc7f]/60 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-[#8fdcc4]/55 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-[#c6ddd3] bg-[#f8fcfa] p-6 sm:p-8 shadow-[0_20px_50px_rgba(13,70,54,0.15)]">
              <div className="biz-grid-overlay" />
              <div className="rounded-2xl border border-[#d6e7df] bg-white p-6 sm:p-7">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-[#5c7f72]">Today</p>
                    <p className="mt-1 text-2xl font-bold text-[#122b24]">Rs 42,580 Revenue</p>
                  </div>
                  <div className="rounded-lg bg-[#eaf7f1] p-3 text-[#0e7a5f] flex-shrink-0">
                    <LineChart size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                  <StatCard label="Orders Today" value="128" />
                  <StatCard label="Avg Bill Value" value="Rs 332" />
                  <StatCard label="Low Stock" value="7" />
                  <StatCard label="Pending Due" value="Rs 8,900" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MiniPill icon={<BadgeCheck size={14} />} text="Private owner workspace" />
                <MiniPill icon={<Clock3 size={14} />} text="Go live in under 15 minutes" />
              </div>

              <div className="pointer-events-none absolute -right-2 top-12 sm:top-16 biz-float">
                <div className="rounded-xl border border-[#bfd8cc] bg-white/95 px-4 py-2.5 text-xs font-semibold text-[#1f4f41] shadow-lg whitespace-nowrap">
                  +18% Monthly Sales Growth
                </div>
              </div>

              <div className="pointer-events-none absolute -left-2 bottom-12 sm:bottom-16 biz-float-delayed">
                <div className="rounded-xl border border-[#bfd8cc] bg-white/95 px-4 py-2.5 text-xs font-semibold text-[#1f4f41] shadow-lg whitespace-nowrap">
                  0 Critical Stockouts This Week
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-3 rounded-2xl border border-[#d4e5de] bg-white p-6 sm:grid-cols-3 sm:p-8">
          <MetricCard icon={<Users size={18} />} label="Active Teams" value="2,500+" />
          <MetricCard icon={<BarChart3 size={18} />} label="Invoices Processed" value="1.2M+" />
          <MetricCard icon={<Rocket size={18} />} label="Faster Operations" value="Up to 37%" />
        </section>

        <section className="mt-16 rounded-3xl border border-[#d4e5de] bg-[#f8fbfa] p-8 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#5b7c70]">Why BizTrack</p>
              <h3 className="biz-heading mt-2 text-3xl text-[#163129]">Everything your retail team needs. Nothing it does not.</h3>
            </div>
            <p className="max-w-xl text-sm text-[#47685c]">
              BizTrack removes bulky ERP complexity and gives your team focused workflows that are easy to learn,
              fast to use, and reliable during peak hours.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={<Users size={18} />} title="Role-Based Team" text="Owner, manager, and staff permissions mapped to real store responsibilities." />
            <Feature icon={<Wallet size={18} />} title="Smart Billing" text="Lightning-fast checkout with payment tracking and due visibility in one view." />
            <Feature icon={<PackageSearch size={18} />} title="Inventory Control" text="Real-time stock, reorder signal, and purchase flow without spreadsheet chaos." />
            <Feature icon={<ShieldCheck size={18} />} title="Workspace Secure" text="Tenant-isolated architecture so each business sees only its own data." />
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#d3e5de] bg-white p-8 sm:p-9 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-[#5f7e73]">How It Works</p>
            <h3 className="biz-heading mt-3 text-2xl text-[#15342c]">Go live in 3 clean steps</h3>
            <ol className="mt-6 space-y-4 text-sm text-[#3b5f53]">
              <li className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-[#e7f4ee] font-bold text-[#0f6c55]">1</span><span>Create your owner workspace and invite team members.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-[#e7f4ee] font-bold text-[#0f6c55]">2</span><span>Add products, suppliers, and customer data once.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-[#e7f4ee] font-bold text-[#0f6c55]">3</span><span>Run daily billing, purchasing, and insights from one dashboard.</span></li>
            </ol>
          </div>

          <div className="rounded-3xl border border-[#174b3d] bg-[#123d32] p-8 text-white sm:p-9 shadow-[0_16px_35px_rgba(9,56,43,0.3)]">
            <p className="text-xs uppercase tracking-[0.12em] text-[#b7d8cc]">Simple Pricing</p>
            <h3 className="biz-heading mt-3 text-3xl text-white">One plan. No confusion.</h3>
            <p className="mt-3 text-sm text-[#d6e9e1]">Full retail operations stack in one predictable monthly plan.</p>

            <div className="mt-6 rounded-2xl bg-[#0f332a] p-6">
              <p className="text-sm text-[#bee1d5]">BizTrack Business</p>
              <p className="mt-2 text-4xl font-black">NPR 999</p>
              <p className="text-xs text-[#b9d8ce]">Per month, per workspace</p>
              <ul className="mt-5 space-y-2 text-sm text-[#deefe9]">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} /> Private owner workspace</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} /> Unlimited daily billing and operations</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} /> Manager and staff role access</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} /> Billing, inventory, purchases, and reports</li>
              </ul>
            </div>

            <Link
              to="/signup"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f3cc7f] px-6 py-3 text-sm font-bold text-[#143228] transition hover:bg-[#ebc06a]"
            >
              Activate My Workspace
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-2">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="rounded-2xl border border-[#d9e7e2] bg-white p-6 sm:p-7 shadow-sm transition-shadow hover:shadow-md h-full flex flex-col">
              <div className="mb-3 flex items-center gap-1 text-[#f2a93b]">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </div>
              <p className="text-sm leading-7 text-[#31584b] flex-grow">"{testimonial.quote}"</p>
              <div className="mt-4 border-t border-[#e9f1ed] pt-3">
                <p className="text-sm font-bold text-[#1d3f34]">{testimonial.name}</p>
                <p className="text-xs text-[#5f7d72]">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-[#d6e6df] bg-white p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#5f8174]">Final Call</p>
              <h3 className="biz-heading mt-3 text-3xl text-[#15322a]">Ready to scale with confidence?</h3>
              <p className="mt-4 text-sm leading-6 text-[#47675c]">Launch a modern workspace your team adopts quickly and your customers feel in every fast, smooth checkout.</p>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#315c4f]">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf7f2] px-3 py-1.5"><Building2 size={13} /> Owner Ready</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf7f2] px-3 py-1.5"><Globe size={13} /> Multi-location ready</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf7f2] px-3 py-1.5"><MessageCircleHeart size={13} /> Team-loved UX</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <Link to="/signup" className="rounded-xl bg-[#0e7a5f] px-6 py-3 text-sm font-bold text-white text-center transition hover:bg-[#0b624c]">Create Workspace</Link>
              <Link to="/login" className="rounded-xl border border-[#bbd0c7] px-6 py-3 text-sm font-bold text-[#25453a] text-center transition hover:bg-[#f1f7f4]">Open Login</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#dceae4] bg-[#fbfefd] p-4 sm:p-5">
    <p className="text-xs font-semibold text-[#5c7f72]">{label}</p>
    <p className="mt-2 text-lg sm:text-xl font-bold text-[#163228]">{value}</p>
  </div>
)

const MiniPill = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="inline-flex w-full items-center gap-2 rounded-xl border border-[#d3e4dc] bg-white px-4 py-3 text-xs font-semibold text-[#355f52]">
    <span className="text-[#0e7a5f] flex-shrink-0">{icon}</span>
    <span>{text}</span>
  </div>
)

const Feature = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="reveal-card rounded-2xl border border-[#d7e8e2] bg-white p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md h-full">
    <div className="inline-flex rounded-lg bg-[#e8f6ef] p-2 text-[#0e7a5f]">{icon}</div>
    <h3 className="mt-3 text-base font-bold text-[#18362d]">{title}</h3>
    <p className="mt-1 text-sm text-[#4a6b60]">{text}</p>
  </div>
)

const MetricCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-[#d9e8e2] bg-[#f8fcfa] p-5 sm:p-6 transition-shadow hover:bg-white hover:shadow-sm h-full">
    <div className="mb-3 inline-flex rounded-lg bg-[#eaf6f1] p-2.5 text-[#0e7a5f]">{icon}</div>
    <p className="text-xs font-semibold text-[#5f7e73]">{label}</p>
    <p className="mt-2 text-2xl font-extrabold text-[#153a2f]">{value}</p>
  </div>
)

export default WebsiteHome
