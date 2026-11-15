import { createFileRoute, Link } from '@tanstack/react-router'
import { SiteHeader, SiteFooter } from '../components/SiteShell'
import { Icon, IconTile } from '../components/ui'
import { useAuth } from '../utils/auth'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const steps = [
  { n: '01', title: 'Connect a Sui wallet', text: 'Pay a small one-time registration fee in SUI from any Sui wallet extension.', tint: 'bg-ice', icon: 'wallet' },
  { n: '02', title: 'Upload anything', text: 'Drop a file. Block+ encrypts it with AES-256-GCM before it leaves the server.', tint: 'bg-lilac', icon: 'upload' },
  { n: '03', title: 'Get it back anywhere', text: 'Your file lives on Walrus. Download it from any device with your account.', tint: 'bg-butter', icon: 'download' },
]

const features = [
  { icon: 'lock', title: 'Encrypted by default', text: 'Data on Walrus is public, so every file is encrypted before upload. Only Block+ can decrypt it for you.', tint: 'bg-mint' },
  { icon: 'globe', title: 'No single point of failure', text: 'Each file is split into many redundant pieces spread over independent storage nodes worldwide.', tint: 'bg-ice' },
  { icon: 'check', title: 'Verifiable on Sui', text: 'Every stored file gets an on-chain certificate on Sui proving the network committed to keep it.', tint: 'bg-lilac' },
  { icon: 'clock', title: 'You choose how long', text: 'Storage is rented per epoch. Pick the lifetime, and it can be extended by the blob owner.', tint: 'bg-butter' },
]

function LandingPage() {
  const session = useAuth()
  const primary = session ? { to: '/app/upload', label: 'Upload a file' } : { to: '/app/register', label: 'Get started' }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />

      {/* Hero */}
      <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-drift absolute left-[6%] top-24 h-28 w-28 rounded-[2rem] bg-ice sm:h-40 sm:w-40" />
          <div className="animate-drift absolute right-[8%] top-40 h-20 w-20 rounded-full bg-butter [animation-delay:-2s] sm:h-32 sm:w-32" />
          <div className="animate-drift absolute bottom-10 left-[18%] h-16 w-16 rounded-full bg-lilac [animation-delay:-4s] sm:h-24 sm:w-24" />
          <div className="animate-drift absolute bottom-20 right-[20%] h-24 w-24 rotate-12 rounded-[1.5rem] bg-mint [animation-delay:-1s]" />
        </div>

        <div className="mx-auto max-w-5xl text-center animate-rise">
          <span className="chip bg-white ring-1 ring-line">
            <span className="h-2 w-2 rounded-full bg-brand" /> Running on Walrus · Sui testnet
          </span>
          <h1 className="display mt-8 text-[clamp(3.5rem,13vw,10rem)]">
            Store it.
            <br />
            <span className="text-brand">Own it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-soft sm:text-xl">
            Block+ keeps your files encrypted on Walrus, a decentralized storage network built on Sui.
            No single company holds your data.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={primary.to} className="btn btn-lg btn-ink">
              {primary.label} <Icon name="arrow" className="h-5 w-5" />
            </Link>
            <a href="#how" className="btn btn-lg btn-outline">How it works</a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-28 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow mb-3">How it works</p>
          <h2 className="display text-5xl sm:text-7xl">Three steps. That's it.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className={`card-tint ${s.tint} flex min-h-64 flex-col justify-between`}>
                <div className="flex items-start justify-between">
                  <span className="display text-6xl text-ink/15">{s.n}</span>
                  <IconTile name={s.icon} tint="bg-white" />
                </div>
                <div className="mt-8">
                  <h3 className="text-2xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-ink-soft">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-24 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow mb-3">Why Block+</p>
              <h2 className="display text-5xl sm:text-7xl">Storage without<br />the middleman.</h2>
            </div>
            <Link to="/app/about" className="btn btn-soft self-start md:self-auto">Learn more <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="card flex gap-5">
                <IconTile name={f.icon} tint={f.tint} />
                <div>
                  <h3 className="text-xl font-bold">{f.title}</h3>
                  <p className="mt-1 text-ink-soft">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Under the hood */}
      <section className="mt-24 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-brand px-6 py-14 text-white sm:px-12">
          <p className="eyebrow mb-3 text-white/70">Under the hood</p>
          <h2 className="display text-5xl sm:text-7xl">Split. Spread. Certified.</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div>
              <p className="display text-3xl">1 · Split</p>
              <p className="mt-2 text-white/80">Walrus erasure-codes each file into hundreds of redundant "slivers", about 5× the original size in total.</p>
            </div>
            <div>
              <p className="display text-3xl">2 · Spread</p>
              <p className="mt-2 text-white/80">Slivers go to independent storage nodes. Only about a third of them is needed to rebuild the file.</p>
            </div>
            <div>
              <p className="display text-3xl">3 · Certified</p>
              <p className="mt-2 text-white/80">Once enough nodes confirm, Sui records a certificate: public proof your file is stored until its end epoch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 px-4 text-center sm:px-6">
        <h2 className="display mx-auto max-w-4xl text-6xl sm:text-8xl">
          Ready when <span className="text-brand">you are.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">Create an account with a Sui wallet and upload your first file in a minute.</p>
        <Link to={primary.to} className="btn btn-lg btn-ink mt-8">
          {primary.label} <Icon name="arrow" className="h-5 w-5" />
        </Link>
      </section>

      <SiteFooter />
    </div>
  )
}
