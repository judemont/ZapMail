export interface NostrMessage {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface DecryptedMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: number;
  read: boolean;
  replyTo?: string; // ID of message being replied to
  rawEvent?: any; // Original Nostr event as stored in relay
}

export interface NostrProfile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  nip05valid?: boolean;
}

export interface Contact {
  pubkey: string;
  profile?: NostrProfile;
  lastMessage?: number;
}

export type Folder = 'inbox' | 'sent' | 'compose' | 'about' | 'donate';
