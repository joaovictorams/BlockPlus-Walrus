import { createFileRoute } from '@tanstack/react-router'
import { Notice, PageHeader } from '../../components/ui'

export const Route = createFileRoute('/app/terms')({
  component: TermsPage,
})

// NOTE for the Block+ owner: this is a plain-language draft that describes how the
// service actually works. Have it reviewed before offering Block+ to real users.
const sections = [
  {
    title: '1. The service',
    body: 'Block+ lets you store files on Walrus, a decentralized storage network built on the Sui blockchain. Block+ currently runs on the Sui and Walrus test networks, which are meant for development and testing.',
  },
  {
    title: '2. Your account',
    body: 'You create an account by paying a one-time registration fee in SUI from a Sui wallet and choosing a username and password. You are responsible for keeping your password safe. Sessions expire after 24 hours.',
  },
  {
    title: '3. How your files are stored',
    body: 'Data on Walrus is publicly readable by anyone who knows its blob ID. Block+ therefore encrypts every file with AES-256-GCM before uploading it. The encryption key is held by the Block+ server, which decrypts files when you download them.',
  },
  {
    title: '4. Storage period and deletion',
    body: 'Each file is stored for a fixed number of Walrus epochs. When that period ends, the file can no longer be retrieved. Removing a file in Block+ removes it from your account immediately; the encrypted copy remains on Walrus until its storage period ends.',
  },
  {
    title: '5. Test networks',
    body: 'Walrus periodically wipes data on its test network without notice, and testnet SUI has no monetary value. Do not use Block+ on testnet for files you cannot afford to lose.',
  },
  {
    title: '6. Acceptable use',
    body: 'Do not upload content that is illegal, infringes the rights of others, or contains malware. Block+ may close accounts that break these rules.',
  },
  {
    title: '7. No warranty',
    body: 'Block+ is provided "as is", without warranties of any kind. Availability depends on the Walrus and Sui networks, which Block+ does not control.',
  },
  {
    title: '8. Contact',
    body: 'Questions about these terms? Reach us through the Contact page.',
  },
]

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <PageHeader eyebrow="Legal" title="Terms of" accent="service." />
      <Notice type="warn" className="mb-8">
        Draft terms written in plain language. They describe how Block+ works today and are not legal advice.
      </Notice>
      <div className="card space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-bold">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
