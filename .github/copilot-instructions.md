# ZapMail Project Instructions

This is a Nostr-based email client application.

## Project Checklist

- [x] Verify that the copilot-instructions.md file in the .github directory is created
- [x] Clarify Project Requirements - Nostr email client with NIP-17 DMs
- [x] Scaffold the Project - Vite React TypeScript project scaffolded
- [x] Customize the Project - All components and Nostr service implemented
- [x] Install Required Extensions - No additional extensions needed
- [x] Compile the Project - Successfully compiled with no errors
- [x] Create and Run Task - Development server running
- [x] Launch the Project - Application running at http://localhost:5173
- [x] Ensure Documentation is Complete - README.md with full documentation

## Architecture

- **Frontend**: React + TypeScript with Tailwind CSS
- **Nostr Protocol**: nostr-tools library for NIP-04/NIP-17 DMs
- **Components**: Login, Sidebar, MessageList, MessageView, Compose
- **Service Layer**: NostrService handles all Nostr operations

## Key Features

- NSEC authentication
- Encrypted direct messages
- Email-like interface (inbox, sent, compose)
- Real-time message updates
- Multi-relay support
