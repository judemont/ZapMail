# ZapMail ⚡📧

A secure, email-like messaging application built on the Nostr protocol. ZapMail provides a familiar Gmail/Outlook-style interface for sending encrypted direct messages using NIP-17 DM standard.

## ⚠️ Security Warning

**This application has NOT been audited by external security experts and may contain vulnerabilities. DO NOT use it for sensitive or confidential messages. Use at your own risk.**

This is an experimental client for educational and testing purposes. For production use with sensitive data, please wait for a security audit or use well-established, audited Nostr clients.

## Features

- 📧 **Email-like Interface**: Familiar inbox, sent folders, and compose view
- 🔐 **End-to-End Encryption**: Messages encrypted using NIP-04 encryption
- 🔑 **NSEC Authentication**: Secure login with Nostr private keys
- ⚡ **Nostr Protocol**: Decentralized messaging over Nostr relays
- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS
- 🔄 **Real-time Updates**: Automatic message refresh every 30 seconds

## Tech Stack

- **React** + **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **nostr-tools** - Nostr protocol implementation
- **Lucide React** - Icons
- **date-fns** - Date formatting

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

## Project Structure

```
src/
├── components/
│   ├── Login.tsx          # Login screen with NSEC input
│   ├── Sidebar.tsx        # Navigation sidebar
│   ├── MessageList.tsx    # List of messages
│   ├── MessageView.tsx    # Single message viewer
│   └── Compose.tsx        # New message composer
├── nostrService.ts        # Nostr protocol service
├── types.ts               # TypeScript type definitions
├── App.tsx                # Main application component
└── main.tsx               # Application entry point
```

## Security Notes

- Your NSEC private key is stored only in browser memory during your session
- All messages are encrypted end-to-end using NIP-04
- Never share your NSEC key with anyone
- The application doesn't store any data on external servers

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

## Future Enhancements

- [ ] Full NIP-17 gift wrapping implementation
- [ ] Contact list management
- [ ] Message search functionality
- [ ] Attachments support
- [ ] Multiple relay management
- [ ] Profile pictures and metadata
- [ ] Message drafts
- [ ] Starred/important messages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Resources

- [Nostr Protocol](https://nostr.com/)
- [NIP-04 (Encrypted Direct Messages)](https://github.com/nostr-protocol/nips/blob/master/04.md)
- [NIP-17 (Private Direct Messages)](https://github.com/nostr-protocol/nips/blob/master/17.md)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)


```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
