import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { Transaction } from '@mysten/sui/transactions'
import { getWallets, signAndExecuteTransaction } from '@mysten/wallet-standard'
import { registerUser } from '../../utils/auth'
import { Icon, IconTile, Notice, Plus, Spinner } from '../../components/ui'

// --- Configuration (set by `npm run setup`, see Walrus/README.md) ---
const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK || 'testnet'
const SUI_CHAIN = `sui:${SUI_NETWORK}`
const SUI_GRPC_URL = import.meta.env.VITE_SUI_GRPC_URL || `https://fullnode.${SUI_NETWORK}.sui.io:443`
const SERVICE_WALLET = import.meta.env.VITE_SUI_SERVICE_WALLET || ''
const REGISTRATION_FEE = import.meta.env.VITE_REGISTRATION_FEE_SUI || '0.1'
const SUI_DECIMALS = 9 // 1 SUI = 10^9 MIST
const GAS_RESERVE_SUI = 0.05 // keep some SUI for the transaction's gas

export const Route = createFileRoute('/app/register')({
  component: RegisterComponent,
})

// "0.1" -> 100000000n, without floating point rounding
function suiToMist(sui) {
  const [whole, frac = ''] = String(sui).trim().split('.')
  return BigInt(whole || '0') * 10n ** BigInt(SUI_DECIMALS) + BigInt((frac + '0'.repeat(SUI_DECIMALS)).slice(0, SUI_DECIMALS) || '0')
}

const mistToSui = (mist) => Number(BigInt(mist)) / 10 ** SUI_DECIMALS
const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`

// Wallets that can pay on the configured Sui network
function suiWallets() {
  return getWallets()
    .get()
    .filter(
      (w) =>
        w.features['standard:connect'] &&
        (w.features['sui:signAndExecuteTransaction'] || w.features['sui:signAndExecuteTransactionBlock']) &&
        (w.chains || []).some((c) => c === SUI_CHAIN || c.startsWith('sui:'))
    )
}

// --- Hook: Sui wallet connection and fee payment ---
function useSuiWallet() {
  const [api, setApi] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [status, setStatus] = useState('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [walletInfo, setWalletInfo] = useState({ address: '', name: '', balance: 0, symbol: 'SUI', decimals: SUI_DECIMALS })
  const [txHash, setTxHash] = useState('')
  const [txInProgress, setTxInProgress] = useState(false)
  const clientRef = useRef(null)

  // 1. Connect to the Sui network (gRPC; public fullnodes no longer serve JSON-RPC)
  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        if (!SERVICE_WALLET) {
          throw new Error('Registration wallet not configured. Run "npm run setup" in the Walrus folder.')
        }
        setStatusMsg(`Connecting to Sui ${SUI_NETWORK}...`)
        const client = new SuiGrpcClient({ network: SUI_NETWORK, baseUrl: SUI_GRPC_URL })
        // A cheap call to prove the node is reachable
        await client.getBalance({ owner: SERVICE_WALLET })
        if (!mounted) return
        clientRef.current = client
        setApi(client)
        setStatusMsg(`✅ Connected to Sui ${SUI_NETWORK}`)
      } catch (e) {
        console.error('Sui init error:', e)
        if (mounted) {
          setStatus('error')
          setStatusMsg(`❌ ${e.message || `Failed to connect to Sui ${SUI_NETWORK}`}`)
        }
      } finally {
        if (mounted) setIsInitializing(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  // 2. Connect wallet extension(s) and list their accounts
  const connectWallet = async () => {
    try {
      setStatus('connecting')
      setStatusMsg('Looking for a Sui wallet extension...')

      // Extensions register asynchronously; give them a moment.
      let wallets = suiWallets()
      if (!wallets.length) {
        await new Promise((r) => setTimeout(r, 800))
        wallets = suiWallets()
      }
      if (!wallets.length) throw new Error('No Sui wallet found. Install a Sui wallet extension (e.g. Slush) and reload.')

      const found = []
      for (const wallet of wallets) {
        try {
          const { accounts: accs } = await wallet.features['standard:connect'].connect()
          for (const account of accs || wallet.accounts) {
            found.push({
              address: account.address,
              meta: { name: `${account.label || wallet.name} (${shortAddr(account.address)})` },
              wallet,
              account,
            })
          }
        } catch (e) {
          console.warn(`Wallet ${wallet.name} did not connect:`, e)
        }
      }
      if (!found.length) throw new Error('No accounts found (connection rejected?)')

      setAccounts(found)
      setStatus('idle')
      setStatusMsg(`Found ${found.length} account(s)`)
    } catch (err) {
      setStatus('error')
      setStatusMsg(err.message)
    }
  }

  // 3. Select & check balance
  const selectAccount = async (acc) => {
    const client = clientRef.current
    if (!client) {
      setStatus('error')
      setStatusMsg('Network not ready. Please wait...')
      return
    }

    if (acc.address.toLowerCase() === SERVICE_WALLET.toLowerCase()) {
      setStatus('error')
      setStatusMsg('This is the Block+ fee wallet. Choose a different account to pay the registration fee.')
      return
    }

    setStatus('charging')
    setStatusMsg(`Checking balance for ${acc.meta.name}...`)
    setSelectedAccount(acc)

    try {
      const { balance } = await client.getBalance({ owner: acc.address })
      const readableBalance = mistToSui(balance.balance)
      const needed = Number(REGISTRATION_FEE) + GAS_RESERVE_SUI

      if (readableBalance < needed) {
        throw new Error(`Insufficient balance (${readableBalance.toFixed(3)} SUI). Need ${REGISTRATION_FEE} SUI + gas. Get free testnet SUI at faucet.sui.io`)
      }

      setWalletInfo((prev) => ({ ...prev, address: acc.address, name: acc.meta.name, balance: readableBalance }))
      await chargeFee(acc)
    } catch (err) {
      setStatus('error')
      setStatusMsg(err.message)
      setSelectedAccount(null)
    }
  }

  // 4. Charge fee: transfer REGISTRATION_FEE SUI to the service wallet
  const chargeFee = async (acc) => {
    const client = clientRef.current
    if (!client) {
      setStatus('error')
      setStatusMsg('Network not ready. Please try again.')
      return
    }

    setTxInProgress(true)
    setStatus('charging')
    setStatusMsg(`Processing ${REGISTRATION_FEE} SUI registration fee...`)
    setTxHash('')

    try {
      const tx = new Transaction()
      tx.setSender(acc.address)
      const [fee] = tx.splitCoins(tx.gas, [suiToMist(REGISTRATION_FEE)])
      tx.transferObjects([fee], SERVICE_WALLET)

      setStatusMsg('✍️ Confirm the payment in your wallet...')
      const { digest } = await signAndExecuteTransaction(acc.wallet, {
        account: acc.account,
        chain: SUI_CHAIN,
        transaction: { toJSON: () => tx.toJSON({ client }) },
      })

      setStatusMsg('📡 Transaction broadcast, waiting for confirmation...')
      const result = await client.waitForTransaction({ digest, include: { effects: true } })
      const executed = result.Transaction || result.FailedTransaction
      if (result.$kind !== 'Transaction' || !executed?.status?.success) {
        throw new Error(executed?.status?.error?.message || 'Transaction failed on-chain')
      }

      setTxHash(digest)
      setStatus('success')
      setStatusMsg(`✅ Connected & Charged: -${REGISTRATION_FEE} SUI`)
      setTxInProgress(false)
    } catch (err) {
      console.error('Transaction error:', err)
      setStatus('error')
      if (/reject|cancel|denied/i.test(err.message)) {
        setStatusMsg('❌ Transaction was cancelled in wallet')
      } else {
        setStatusMsg(`Error: ${err.message}`)
      }
      setTxInProgress(false)
      setSelectedAccount(null)
      setWalletInfo((prev) => ({ ...prev, address: '', name: '', balance: 0 }))
    }
  }

  const retryTransaction = async () => {
    if (selectedAccount && clientRef.current) await chargeFee(selectedAccount)
  }

  return {
    api,
    isInitializing,
    status,
    statusMsg,
    accounts,
    walletInfo,
    txHash,
    txInProgress,
    selectedAccount,
    connectWallet,
    selectAccount,
    retryTransaction,
  }
}

// --- Component ---
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/

function Step({ n, title, done, active, children }) {
  return (
    <section className={`card transition-opacity ${!active && !done ? 'opacity-60' : ''}`}>
      <div className="mb-5 flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-ok text-white' : active ? 'bg-ink text-white' : 'bg-mist text-muted'}`}>
          {done ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function RegisterComponent() {
  const navigate = useNavigate()
  const {
    isInitializing, status, statusMsg, accounts, walletInfo, txHash, txInProgress,
    selectedAccount, connectWallet, selectAccount, retryTransaction,
  } = useSuiWallet()

  const [form, setForm] = useState({ username: '', password: '', terms: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const isPaid = status === 'success' && !!txHash
  const isProcessing = status === 'charging' || txInProgress
  const isConnecting = status === 'connecting'
  const hasError = status === 'error'
  const usernameOk = USERNAME_RE.test(form.username)
  const canRegister = isPaid && usernameOk && form.password.length >= 6 && form.terms

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canRegister) return
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await registerUser({ wallet: walletInfo.address, username: form.username, password: form.password, transactionHash: txHash })
      navigate({ to: '/app' })
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusType = hasError ? 'bad' : isPaid ? 'ok' : isProcessing || isConnecting ? 'info' : 'info'
  const busy = isConnecting || isProcessing || isInitializing

  return (
    <div className="mx-auto max-w-xl animate-rise">
      <p className="eyebrow mb-3 text-center">Create account</p>
      <h1 className="display text-center text-6xl">Join Block<Plus /></h1>
      <p className="mt-3 text-center text-ink-soft">
        A one-time fee of <span className="font-bold text-ink">{REGISTRATION_FEE} SUI</span> on Sui {SUI_NETWORK}, paid from your Sui wallet.
      </p>

      {(statusMsg || isInitializing) && (
        <Notice type={statusType} className="mt-8 flex items-center justify-center gap-2 text-center">
          {busy && !hasError && !isPaid && <Spinner className="h-4 w-4" />}
          <span>{isInitializing && !statusMsg ? 'Connecting…' : statusMsg}</span>
        </Notice>
      )}

      <div className="mt-6 space-y-4">
        <Step n="1" title="Pay with your Sui wallet" done={isPaid} active={!isPaid}>
          {walletInfo.address ? (
            <div className="flex items-center gap-4 rounded-2xl bg-mist p-4">
              <IconTile name="wallet" tint={isPaid ? 'bg-mint' : 'bg-ice'} />
              <div className="min-w-0">
                <p className="truncate font-bold">{walletInfo.name}</p>
                <p className="text-sm text-ink-soft">
                  {isPaid ? `Fee paid · balance ${walletInfo.balance.toFixed(2)} SUI` : 'Waiting for payment…'}
                </p>
              </div>
            </div>
          ) : accounts.length === 0 ? (
            <button type="button" onClick={connectWallet} disabled={busy} className="btn btn-lg btn-brand w-full">
              {isConnecting ? <><Spinner /> Connecting…</> : <><Icon name="wallet" /> Connect Sui wallet</>}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-ink-soft">Choose the account that pays the fee:</p>
              {accounts.map((acc) => {
                const mine = selectedAccount?.address === acc.address
                return (
                  <button key={acc.address} type="button" onClick={() => selectAccount(acc)} disabled={busy}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left font-bold transition-colors ${mine ? 'border-brand bg-ice' : 'border-line hover:border-ink'}`}>
                    <span className="truncate">{acc.meta.name}</span>
                    {mine && isProcessing ? <Spinner className="h-4 w-4" /> : <Icon name="arrow" className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          )}

          {hasError && selectedAccount && !isPaid && (
            <button type="button" onClick={retryTransaction} disabled={isProcessing} className="btn btn-soft mt-3 w-full">
              <Icon name="refresh" className="h-4 w-4" /> Retry payment
            </button>
          )}
          <p className="mt-4 text-xs text-muted">
            Need testnet SUI? Get it free at{' '}
            <a href="https://faucet.sui.io" target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">faucet.sui.io</a>.
          </p>
        </Step>

        <form onSubmit={onSubmit} noValidate>
          <Step n="2" title="Choose your login" done={false} active={isPaid}>
            <fieldset disabled={!isPaid || isSubmitting} className="space-y-5">
              <div>
                <label htmlFor="username" className="field-label">Username</label>
                <input id="username" name="username" autoComplete="username" className="input" value={form.username}
                  onChange={onChange} placeholder="3–32 letters, numbers, . _ -" />
                {form.username && !usernameOk && (
                  <p className="mt-1.5 text-xs text-bad">Use 3–32 characters: letters, numbers, ".", "_" or "-".</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="field-label">Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" className="input"
                  value={form.password} onChange={onChange} placeholder="At least 6 characters" />
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
                <input type="checkbox" name="terms" checked={form.terms} onChange={onChange} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" />
                <span>
                  I agree to the <Link to="/app/terms" className="font-bold text-ink underline">Terms of Service</Link>.
                </span>
              </label>

              {submitError && <Notice type="bad">{submitError}</Notice>}

              <button type="submit" disabled={!canRegister || isSubmitting} className="btn btn-lg btn-ink w-full">
                {isSubmitting ? <><Spinner /> Creating account…</> : 'Create account'}
              </button>
            </fieldset>
          </Step>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account? <Link to="/app/login" className="font-bold text-brand hover:underline">Log in</Link>
      </p>
    </div>
  )
}
