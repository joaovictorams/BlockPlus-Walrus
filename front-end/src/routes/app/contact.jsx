import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Icon, IconTile, Notice, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/app/contact')({
  component: ContactPage,
})

const EMAIL = 'joaovictorams@icloud.com'
const topics = {
  support: 'Technical Support',
  billing: 'Billing Inquiry',
  partnership: 'Partnership',
  'non-profit': 'Non-Profit Application',
  other: 'Other',
}

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [error, setError] = useState('')
  const [opened, setOpened] = useState(false)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  // There is no mail server behind Block+, so the form opens the visitor's
  // email app with the message filled in.
  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.message.trim()) {
      setError('Please fill in your name and a message.')
      return
    }
    setError('')
    const subject = `[Block+] ${topics[form.topic] || 'Contact'} from ${form.name.trim()}`
    const body = `${form.message.trim()}\n\n— ${form.name.trim()}${form.email ? ` <${form.email.trim()}>` : ''}`
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setOpened(true)
  }

  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Contact" title="Say" accent="hi.">
        Have questions? We're here to help.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <a href={`mailto:${EMAIL}`} className="card-tint group block bg-ice transition-transform hover:-translate-y-1">
            <IconTile name="mail" tint="bg-white" />
            <h2 className="mt-5 text-xl font-bold">Email support</h2>
            <p className="mt-1 break-all font-bold text-brand group-hover:underline">{EMAIL}</p>
            <p className="mt-2 text-sm text-ink-soft">Typically answered within 24 hours on business days.</p>
          </a>

          <a href="https://discord.com/users/398876527766274052" target="_blank" rel="noopener noreferrer"
            className="card-tint group block bg-lilac transition-transform hover:-translate-y-1">
            <IconTile name="user" tint="bg-white" />
            <h2 className="mt-5 text-xl font-bold">Discord</h2>
            <p className="mt-1 text-ink-soft">@asciacode · @joaovictorms</p>
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold group-hover:underline">Open profile <Icon name="arrow" className="h-4 w-4" /></p>
          </a>

          <a href="https://github.com/joaovictorascia" target="_blank" rel="noopener noreferrer"
            className="card-tint group block bg-butter transition-transform hover:-translate-y-1">
            <IconTile name="layers" tint="bg-white" />
            <h2 className="mt-5 text-xl font-bold">GitHub</h2>
            <p className="mt-1 text-ink-soft">Explore our open-source projects.</p>
          </a>
        </div>

        <form onSubmit={onSubmit} className="card space-y-5" noValidate>
          <div>
            <h2 className="display text-4xl">Send a message</h2>
            <p className="mt-1 text-ink-soft">Mon–Fri, 9:00–18:00 UTC.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="field-label">Your name</label>
              <input id="name" name="name" className="input" value={form.name} onChange={onChange} placeholder="Jane Doe" autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <input id="email" name="email" type="email" className="input" value={form.email} onChange={onChange} placeholder="jane@example.com" autoComplete="email" />
            </div>
          </div>
          <div>
            <label htmlFor="topic" className="field-label">Topic</label>
            <select id="topic" name="topic" className="input" value={form.topic} onChange={onChange}>
              <option value="">Select a topic</option>
              {Object.entries(topics).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="message" className="field-label">Message</label>
            <textarea id="message" name="message" rows={6} className="input resize-y" value={form.message} onChange={onChange} placeholder="Tell us how we can help…" />
          </div>

          {error && <Notice type="bad">{error}</Notice>}
          {opened && !error && <Notice type="ok">Your email app should open with the message ready to send.</Notice>}

          <button type="submit" className="btn btn-lg btn-ink w-full">Send message <Icon name="arrow" className="h-5 w-5" /></button>
        </form>
      </div>
    </div>
  )
}
