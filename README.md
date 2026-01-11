# ZapMail ⚡📧

A secure, email-like messaging application built on the Nostr protocol. ZapMail provides a familiar Gmail/Outlook-style interface for sending encrypted direct messages using the NIP-17 standard (Private Direct Messages with gift wrapping).

## ⚠️ Security Warning

**This application has NOT been audited by external security experts and may contain vulnerabilities. DO NOT use it for sensitive or confidential messages. Use at your own risk.**

This is an experimental client for educational and testing purposes. For production use with sensitive data, please wait for a security audit or use well-established, audited Nostr clients.

## Features

- 📧 **Email-like Interface**: Familiar inbox, sent folders, and compose view
- 🔐 **End-to-End Encryption**: Messages encrypted using NIP-44 (NIP-17 gift wrapping)
- 🔑 **NSEC/Extension Authentication**: Login with Nostr private keys or browser extensions (Alby, nos2x)
- ⚡ **Nostr Protocol**: Decentralized messaging over multiple Nostr relays
- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS
- 🔄 **Real-time Updates**: Automatic message refresh every 30 seconds
- ✅ **NIP-05 Verification**: Display verified human-readable identifiers

## Technology

### Nostr Protocol

Nostr (Notes and Other Stuff Transmitted by Relays) is a simple, open protocol that enables truly decentralized social networking. Unlike centralized platforms, Nostr:

- **No central server**: Messages are distributed across multiple independent relays
- **Censorship-resistant**: No single entity can block or delete your messages
- **Portable identity**: Your identity (keypair) works across all Nostr applications
- **Simple protocol**: Easy to implement and understand

### NIP-17: Private Direct Messages

ZapMail uses **NIP-17** (Private Direct Messages) which provides enhanced privacy over the older NIP-04 standard:

**How NIP-17 Works:**

1. **Rumor (kind 14)**: The actual message content with subject and recipient
2. **Seal (kind 13)**: The signed rumor, encrypted to the recipient
3. **Gift Wrap (kind 1059)**: The seal encrypted with a one-time ephemeral key

**Key Benefits:**

- 🔒 **Minimal metadata leakage**: Timestamps are randomized, recipient is hidden
- 🔐 **NIP-44 encryption**: Modern encryption scheme (XChaCha20 + HMAC-SHA256)
- 👁️ **Sender privacy**: Messages appear to come from random ephemeral keys
- 🚫 **Relay can't correlate**: Impossible for relays to link sender and recipient

### NIP-05: DNS-based Verification

Users can verify their identity using a human-readable identifier (like email):

- Format: `username@domain.com`
- Verified through DNS records
- No centralized control - domain owners can verify identities
- Easier to share than long public keys

## Tech Stack

- **React** + **TypeScript** - UI framework with type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **nostr-tools** - Official Nostr protocol implementation
- **NIP-17** - Private Direct Messages with gift wrapping
- **NIP-44** - Modern encryption scheme (XChaCha20-Poly1305)
- **NIP-05** - DNS-based identity verification
- **Lucide React** - Beautiful icon library
- **date-fns** - Modern date formatting

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- A Nostr NSEC private key (you can generate one at https://nostr.how or use a Nostr client)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Usage

1. **Login**: Enter your NSEC private key on the login screen
   - Your key is stored locally and never sent to any server
   - Example format: `nsec1...`

2. **Compose Message**: Click the "Compose" button to create a new message
   - Enter recipient's npub or hex public key
   - Add subject and message content
   - Click "Send"

3. **Read Messages**: 
   - View received messages in the Inbox
   - View sent messages in the Sent folder
   - Click on any message to read the full content

4. **Logout**: Click the "Logout" button to clear your session



## Security Notes

- **Private Key Storage**: Your NSEC is encrypted in localStorage using AES-GCM with PBKDF2 key derivation
- **End-to-End Encryption**: All messages use NIP-44 encryption (XChaCha20-Poly1305 + HMAC-SHA256)
- **Gift Wrapping**: NIP-17 provides metadata protection with ephemeral keys
- **Browser Extension Support**: Use Alby or nos2x for additional security (your key never touches the app)
- **No Server Storage**: Everything runs client-side, no data sent to external servers
- **Multi-Relay**: Messages distributed across 5+ relays for redundancy

**Important**: Never share your NSEC key with anyone. Treat it like a password - anyone with your NSEC can send messages as you.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Development

- Run dev server: `npm run dev`
- Build: `npm run build`
- Preview production build: `npm run preview`
- Lint: `npm run lint`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Resources

- [Nostr Protocol](https://nostr.com/)
- [NIP-17 (Private Direct Messages)](https://github.com/nostr-protocol/nips/blob/master/17.md) - Gift wrapping standard
- [NIP-44 (Encrypted Payloads)](https://github.com/nostr-protocol/nips/blob/master/44.md) - Encryption scheme
- [NIP-05 (DNS-based Verification)](https://github.com/nostr-protocol/nips/blob/master/05.md) - Identity verification
- [NIP-59 (Gift Wrap)](https://github.com/nostr-protocol/nips/blob/master/59.md) - Base gift wrapping spec
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) - JavaScript library
- [Email is Broken — Can Nostr Fix It?](https://habla.news/a/naddr1qvzqqqr4gupzppna0k8s3az5vx8l2rkfs80p5e46c52fmz938pvf5zrp0zwwtvz0qqsk2mtpd9kz66tn9438ymmtv4hz6ttrv9hz6mn0wd68yttxd9uz66t5e5vhcr) - Article explaining the vision
