import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/app/pricing')({
  component: PricingPage,
})

const plans = [
  {
    tag: 'Free', name: 'Starter', blurb: 'Perfect for personal use and testing', tint: 'bg-white ring-1 ring-line',
    features: ['8-day initial lifespan', '+2 days per download', 'Max 60 days lifespan', 'Permanent with 30+ downloads / 60 days'],
    price: '$0', unit: '/ month', cta: { to: '/app/register', label: 'Start for free', style: 'btn-outline' },
  },
  {
    tag: 'Premium', name: 'Professional', blurb: 'For businesses and power users', tint: 'bg-ink text-white', featured: true,
    features: ['Paid in SUI', 'Storage paid per epoch on Walrus', 'Permanent storage', 'Priority support', 'Advanced features', 'Grace period for limits'],
    price: 'Custom', unit: 'based on usage', cta: { to: '/app/contact', label: 'Talk to us', style: 'btn-brand' },
  },
  {
    tag: 'Non-profit', name: 'Community', blurb: 'For verified non-profit organizations', tint: 'bg-mint',
    features: ['Free permanent storage', 'Verified organizations only', 'Priority support', 'Extended features'],
    price: 'Free', unit: 'for eligible organizations', cta: { to: '/app/contact', label: 'Apply now', style: 'btn-ink' },
  },
]

const notes = [
  { title: 'Grace period', text: 'Premium accounts exceeding subscribed limits get a grace period before files revert to Free account rules.', tint: 'bg-ice' },
  { title: 'Automatic renewal', text: 'Storage is billed monthly based on actual usage. You can upgrade or downgrade at any time.', tint: 'bg-lilac' },
  { title: 'Data protection', text: 'All plans include encrypted, decentralized storage on Walrus.', tint: 'bg-butter' },
  { title: 'Support', text: 'Free accounts get community support. Premium includes priority email and chat support.', tint: 'bg-coral' },
]

function PricingPage() {
  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Pricing" title="Simple." accent="Transparent.">
        Choose the plan that fits your needs. No hidden fees.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className={`relative flex flex-col rounded-[2rem] p-8 ${p.tint}`}>
            {p.featured && <span className="chip absolute right-6 top-6 bg-brand text-white">Recommended</span>}
            <p className={`eyebrow ${p.featured ? 'text-white/60' : ''}`}>{p.tag}</p>
            <h2 className="display mt-2 text-5xl">{p.name}</h2>
            <p className={`mt-2 ${p.featured ? 'text-white/70' : 'text-ink-soft'}`}>{p.blurb}</p>
            <ul className="my-8 flex-1 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex gap-3">
                  <Icon name="check" className={`mt-0.5 h-5 w-5 shrink-0 ${p.featured ? 'text-brand' : ''}`} strokeWidth={3} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p>
              <span className="display text-5xl">{p.price}</span>{' '}
              <span className={p.featured ? 'text-white/60' : 'text-ink-soft'}>{p.unit}</span>
            </p>
            <Link to={p.cta.to} className={`btn btn-lg mt-6 w-full ${p.cta.style} ${p.featured ? '' : ''}`}>{p.cta.label}</Link>
          </div>
        ))}
      </div>

      <h2 className="display mt-20 text-5xl">Good to know</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {notes.map((n) => (
          <div key={n.title} className={`card-tint ${n.tint}`}>
            <h3 className="text-xl font-bold">{n.title}</h3>
            <p className="mt-1 text-ink-soft">{n.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-lg text-ink-soft">Need help choosing a plan or have custom requirements?</p>
        <Link to="/app/contact" className="btn btn-lg btn-ink">Contact our team <Icon name="arrow" className="h-5 w-5" /></Link>
      </div>
    </div>
  )
}
