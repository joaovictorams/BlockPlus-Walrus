import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon, IconTile, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/app/about')({
  component: AboutPage,
})

const walrusPoints = [
  'AES-256 encryption for every stored file',
  'Data redundancy across many independent storage nodes',
  'On-chain proof of storage, certified on Sui',
  'Resistance to censorship and single points of failure',
]

const pillars = [
  { icon: 'lock', title: 'Privacy first', text: 'Files are encrypted before they are stored on the decentralized network, so only Block+ can read them back for you.', tint: 'bg-mint' },
  { icon: 'layers', title: 'Built to survive', text: 'Walrus erasure-codes each file, so it can be rebuilt even if many storage nodes go offline.', tint: 'bg-ice' },
  { icon: 'globe', title: 'Global network', text: 'Files are stored across a worldwide network of independent nodes for maximum availability.', tint: 'bg-lilac' },
  { icon: 'sparkle', title: 'Fair pricing', text: 'Storage is rented for the time you need, paid on-chain, with no middleman markup.', tint: 'bg-butter' },
]

const values = [
  { title: 'Transparency', text: 'Open-source principles and clear communication.' },
  { title: 'Security', text: 'Strong encryption and verifiable storage on Sui.' },
  { title: 'Innovation', text: 'Constantly evolving with blockchain technology.' },
]

function AboutPage() {
  return (
    <div className="animate-rise">
      <PageHeader eyebrow="About" title="Storage," accent="reimagined.">
        Decentralized storage for the modern web.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-tint bg-ink text-white">
          <p className="eyebrow text-white/60">Our mission</p>
          <p className="mt-4 text-2xl font-bold leading-snug">
            To provide accessible, secure and decentralized file storage that empowers people to take control of their data.
          </p>
          <p className="mt-4 text-white/70">
            We believe in a future where everyone can store and share files without compromising privacy or relying on centralized entities.
          </p>
        </section>

        <section className="card">
          <p className="eyebrow">Built on Walrus</p>
          <p className="mt-4 text-lg text-ink-soft">
            Block+ stores files on <span className="font-bold text-ink">Walrus</span>, a decentralized storage network built on the
            <span className="font-bold text-ink"> Sui</span> blockchain, which gives you:
          </p>
          <ul className="mt-5 space-y-3">
            {walrusPoints.map((p) => (
              <li key={p} className="flex gap-3"><Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={3} />{p}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => (
          <div key={p.title} className="card flex gap-5">
            <IconTile name={p.icon} tint={p.tint} />
            <div>
              <h3 className="text-xl font-bold">{p.title}</h3>
              <p className="mt-1 text-ink-soft">{p.text}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="display mt-20 text-5xl">What we stand for</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {values.map((v, i) => (
          <div key={v.title} className={`card-tint ${['bg-ice', 'bg-lilac', 'bg-butter'][i]}`}>
            <p className="display text-6xl text-ink/15">0{i + 1}</p>
            <h3 className="mt-4 text-2xl font-bold">{v.title}</h3>
            <p className="mt-1 text-ink-soft">{v.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <p className="text-lg text-ink-soft">Have questions or want to learn more?</p>
        <Link to="/app/contact" className="btn btn-lg btn-ink">Get in touch <Icon name="arrow" className="h-5 w-5" /></Link>
      </div>
    </div>
  )
}
