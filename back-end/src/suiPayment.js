// Verifies on the Sui blockchain that a registration fee was really paid.
//
// A registration is accepted only if the transaction:
//   - exists and executed successfully,
//   - debited at least the fee from the user's wallet, and
//   - credited at least the fee to SUI_SERVICE_WALLET.
// The digest is stored with the user, so the same payment can't register twice.

import { SuiGrpcClient } from '@mysten/sui/grpc'
import { normalizeSuiAddress, parseToMist, isValidTransactionDigest, isValidSuiAddress } from '@mysten/sui/utils'

const SUI_COIN = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'

let client = null
function sui() {
    if (!client) {
        const network = process.env.SUI_NETWORK || 'testnet'
        const baseUrl = process.env.SUI_GRPC_URL || `https://fullnode.${network}.sui.io:443`
        client = new SuiGrpcClient({ network, baseUrl })
    }
    return client
}

export class PaymentError extends Error {}

export async function verifyRegistrationPayment({ digest, wallet }) {
    const serviceWallet = process.env.SUI_SERVICE_WALLET
    if (!serviceWallet || !isValidSuiAddress(serviceWallet)) {
        throw new Error('SUI_SERVICE_WALLET is not configured on the server')
    }
    if (typeof digest !== 'string' || !isValidTransactionDigest(digest)) {
        throw new PaymentError('Missing or invalid payment transaction')
    }
    if (typeof wallet !== 'string' || !isValidSuiAddress(wallet)) {
        throw new PaymentError('Missing or invalid wallet address')
    }

    const fee = parseToMist(process.env.REGISTRATION_FEE_SUI || '0.1')

    let result
    try {
        // The wallet returns right after execution; give the node a moment to index it.
        result = await sui().waitForTransaction({ digest, include: { balanceChanges: true }, timeout: 30000 })
    } catch (e) {
        throw new PaymentError(`Payment transaction not found on Sui ${process.env.SUI_NETWORK || 'testnet'}`)
    }

    const tx = result.Transaction
    if (result.$kind !== 'Transaction' || !tx?.status?.success) {
        throw new PaymentError('Payment transaction failed on-chain')
    }

    const change = (address) =>
        (tx.balanceChanges || [])
            .filter((c) => c.coinType === SUI_COIN && normalizeSuiAddress(c.address) === normalizeSuiAddress(address))
            .reduce((sum, c) => sum + BigInt(c.amount), 0n)

    const self = normalizeSuiAddress(wallet) === normalizeSuiAddress(serviceWallet)
    if (self) {
        // Paying yourself moves no money (only gas), so it can't be verified: any successful
        // transaction of the fee wallet would pass. Only allowed when explicitly enabled for testing.
        if (process.env.ALLOW_SELF_PAYMENT === 'true') return { digest, amount: 0n }
        throw new PaymentError('Use a different wallet than the Block+ fee wallet to pay the registration fee.')
    }
    if (change(serviceWallet) < fee) {
        throw new PaymentError('Payment did not send the registration fee to the Block+ wallet')
    }
    if (change(wallet) > -fee) {
        throw new PaymentError('Payment was not made from the connected wallet')
    }
    return { digest, amount: fee }
}
