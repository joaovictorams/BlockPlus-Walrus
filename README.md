# Block+ (Walrus)

Encrypted file storage on **Walrus**, the decentralized storage network built on Sui. Sign up with a Sui wallet, then upload, download and delete files.

> Looking for the CESS version? See [../README.MD](../README.MD).

## Requirements

- **Node.js 22.13+**

No Docker, WSL or local gateway needed.

## Run

```bash
cd Walrus
npm install   # first time only
npm start     # every time
```

That's it. `npm start` asks for any missing settings, then opens the app at **http://localhost:3000**. Press `Ctrl+C` to stop.

To **change** a saved setting, run `npm run setup` instead.

## Settings

Asked by `npm start` / `npm run setup` and saved in `Walrus/back-end/.env`:

| Setting | Default |
|---|---|
| Sui network | `testnet` |
| Walrus publisher URL (uploads) | `https://publisher.walrus-testnet.walrus.space` |
| Walrus aggregator URL (downloads) | `https://aggregator.walrus-testnet.walrus.space` |
| Storage epochs per upload | `5` (1 epoch = 1 day on testnet, max 53) |
| Your Sui wallet (receives the sign-up fee) | *(required)* |
| Sign-up fee | `0.1` SUI |
| Owner of stored blobs | your wallet |

- 🔑 **Back up `WALRUS_ENCRYPTION_KEY`** in `Walrus/back-end/.env`. Files are encrypted with it before upload; without it they can't be recovered.
- 👛 To sign up, users need a Sui wallet extension (e.g. Slush) on **Testnet** with free SUI from https://faucet.sui.io. Paying from the fee wallet itself is rejected; for single-wallet testing add `ALLOW_SELF_PAYMENT="true"` to the `.env`.

## How Walrus works

- **Upload:** Block+ encrypts the file and sends it to a publisher. The publisher splits it into many redundant pieces and spreads them over independent storage nodes. Sui then records a certificate that the file is stored.
- **Download:** an aggregator collects enough pieces (about a third is enough) to rebuild the file, and Block+ decrypts it.
- **Storage period:** space is rented per epoch. When it ends the file expires; the blob owner can extend it.
- **Public data:** anyone with a blob ID can download it. That's why Block+ encrypts everything first.
- **Testnet:** tokens are free, but Walrus wipes testnet data from time to time.

## Notes

- Ports: web app `3000`, API `5000`. Only one Block+ (CESS or Walrus) can run at a time.
- Deleting a file removes it from Block+; the encrypted copy expires on Walrus at the end of its epochs.
- Max upload size: 100 MB.
- Never commit `Walrus/back-end/.env`. It's git-ignored.
