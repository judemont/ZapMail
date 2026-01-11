import { SimplePool, nip19, getPublicKey, nip44, finalizeEvent } from 'nostr-tools';
import type { DecryptedMessage, NostrProfile, Contact } from './types';

const RELAYS = [
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nostr.mom',
  'wss://relay.nostr.band'
];

export class NostrService {
  private pool: SimplePool;
  private secretKey: Uint8Array | null = null;
  private publicKey: string | null = null;
  private usingExtension: boolean = false;
  private profileCache: Map<string, NostrProfile> = new Map();
  private nip05Cache: Map<string, string> = new Map(); // nip05 -> pubkey

  constructor() {
    this.pool = new SimplePool();
    this.loadSession();
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    // Get or create a device-specific salt
    let salt = localStorage.getItem('zapmail_salt');
    if (!salt) {
      const saltArray = crypto.getRandomValues(new Uint8Array(16));
      salt = Array.from(saltArray).map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('zapmail_salt', salt);
    }

    const saltBytes = new Uint8Array(salt.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Derive a key using PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('zapmail-encryption-v1'),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptData(data: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  private async decryptData(encryptedData: string): Promise<string> {
    const key = await this.getEncryptionKey();
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  }

  private async saveSession() {
    if (this.usingExtension) {
      localStorage.setItem('zapmail_auth', JSON.stringify({
        type: 'extension',
        publicKey: this.publicKey
      }));
    } else if (this.secretKey) {
      const nsec = nip19.nsecEncode(this.secretKey);
      const encryptedNsec = await this.encryptData(nsec);
      localStorage.setItem('zapmail_auth', JSON.stringify({
        type: 'nsec',
        encrypted: encryptedNsec
      }));
    }
  }

  private async loadSession() {
    try {
      const stored = localStorage.getItem('zapmail_auth');
      if (!stored) return;

      const auth = JSON.parse(stored);
      if (auth.type === 'extension') {
        // Verify extension is actually available
        if (window.nostr) {
          this.publicKey = auth.publicKey;
          this.usingExtension = true;
        } else {
          console.warn('Extension auth stored but window.nostr not available');
          // Clear the stored session since extension is not available
          localStorage.removeItem('zapmail_auth');
        }
      } else if (auth.type === 'nsec' && auth.encrypted) {
        const nsec = await this.decryptData(auth.encrypted);
        this.login(nsec);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      localStorage.removeItem('zapmail_auth');
    }
  }

  login(nsec: string): boolean {
    try {
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid nsec format');
      }
      this.secretKey = decoded.data;
      this.publicKey = getPublicKey(this.secretKey);
      this.usingExtension = false;
      // Don't await - save in background
      this.saveSession();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async loginWithExtension(): Promise<boolean> {
    try {
      if (!window.nostr) {
        throw new Error('Nostr extension not found');
      }
      
      this.publicKey = await window.nostr.getPublicKey();
      this.usingExtension = true;
      this.secretKey = null; // Don't store key when using extension
      await this.saveSession();
      return true;
    } catch (error) {
      console.error('Extension login error:', error);
      return false;
    }
  }

  logout() {
    this.secretKey = null;
    this.publicKey = null;
    this.usingExtension = false;
    localStorage.removeItem('zapmail_auth');
    localStorage.removeItem('zapmail_salt');
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  getNpub(): string | null {
    if (!this.publicKey) return null;
    return nip19.npubEncode(this.publicKey);
  }

  isLoggedIn(): boolean {
    return this.publicKey !== null;
  }

  private getCacheKey(): string {
    return `zapmail_messages_${this.publicKey}`;
  }

  private getLastFetchKey(): string {
    return `zapmail_last_fetch_${this.publicKey}`;
  }

  private loadMessagesFromCache(): DecryptedMessage[] {
    try {
      const cacheKey = this.getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to load messages from cache:', error);
    }
    return [];
  }

  private saveMessagesToCache(messages: DecryptedMessage[]) {
    try {
      const cacheKey = this.getCacheKey();
      localStorage.setItem(cacheKey, JSON.stringify(messages));
      
      // Save last fetch timestamp
      const lastFetchKey = this.getLastFetchKey();
      localStorage.setItem(lastFetchKey, Date.now().toString());
    } catch (error) {
      console.error('Failed to save messages to cache:', error);
    }
  }

  private getLastFetchTimestamp(): number {
    try {
      const lastFetchKey = this.getLastFetchKey();
      const timestamp = localStorage.getItem(lastFetchKey);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  private saveSentMessageLocally(recipientPubkey: string, subject: string, content: string, replyTo?: string) {
    try {
      const sentMessage: DecryptedMessage = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        from: this.publicKey!,
        to: recipientPubkey,
        subject,
        content,
        timestamp: Date.now(),
        read: true,
        replyTo
      };

      // Add to current cache
      const cachedMessages = this.loadMessagesFromCache();
      cachedMessages.unshift(sentMessage);
      this.saveMessagesToCache(cachedMessages);
      
      console.log('Saved sent message locally:', { id: sentMessage.id, to: recipientPubkey, subject });
    } catch (error) {
      console.error('Failed to save sent message locally:', error);
    }
  }

  async getProfile(pubkey: string, forceRefresh = false): Promise<NostrProfile | null> {
    // Check cache first
    if (!forceRefresh && this.profileCache.has(pubkey)) {
      return this.profileCache.get(pubkey)!;
    }

    const events = await this.pool.querySync(RELAYS, {
      kinds: [0],
      authors: [pubkey],
      limit: 1
    });

    if (events.length > 0) {
      try {
        const profile = JSON.parse(events[0].content);
        
        // Verify NIP-05 if present
        if (profile.nip05) {
          profile.nip05valid = await this.verifyNip05(profile.nip05, pubkey);
        }
        
        this.profileCache.set(pubkey, profile);
        return profile;
      } catch (error) {
        console.error('Failed to parse profile:', error);
      }
    }
    return null;
  }

  async verifyNip05(nip05: string, pubkey: string): Promise<boolean> {
    try {
      const [name, domain] = nip05.split('@');
      if (!name || !domain) return false;

      const url = `https://${domain}/.well-known/nostr.json?name=${name}`;
      const response = await fetch(url);
      const data = await response.json();

      return data.names && data.names[name] === pubkey;
    } catch (error) {
      console.error('NIP-05 verification failed:', error);
      return false;
    }
  }

  async resolveNip05(nip05: string): Promise<string | null> {
    // Check cache first
    if (this.nip05Cache.has(nip05)) {
      return this.nip05Cache.get(nip05)!;
    }

    try {
      const [name, domain] = nip05.split('@');
      if (!name || !domain) return null;

      const url = `https://${domain}/.well-known/nostr.json?name=${name}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.names && data.names[name]) {
        const pubkey = data.names[name];
        this.nip05Cache.set(nip05, pubkey);
        return pubkey;
      }
    } catch (error) {
      console.error('Failed to resolve NIP-05:', error);
    }
    return null;
  }

  async sendMessage(recipientPubkey: string, subject: string, content: string, replyTo?: string): Promise<boolean> {
    if (!this.publicKey) {
      throw new Error('Not logged in');
    }

    try {
      // Create rumor (kind 14 event)
      const rumor: any = {
        kind: 14,
        content: content,
        tags: [
          ['p', recipientPubkey],
          ['subject', subject],
          ...(replyTo ? [['e', replyTo, '', 'reply']] : [])
        ],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: this.publicKey
      };

      let wrappedEvent: any;

      if (this.usingExtension) {
        if (!window.nostr) {
          throw new Error('Nostr extension not available');
        }

        // For extensions, we need to manually create the gift wrap
        // since they might not have nip17.wrapEvent
        
        // Generate random keys for the wrapper
        const wrapperKey = crypto.getRandomValues(new Uint8Array(32));
        const wrapperPubkey = getPublicKey(wrapperKey);
        
        // Sign the rumor
        const signedRumor = await window.nostr.signEvent(rumor);
        
        // Create the seal (kind 13)
        const sealContent = JSON.stringify(signedRumor);
        let encryptedSeal: string;
        
        if (window.nostr.nip44?.encrypt) {
          encryptedSeal = await window.nostr.nip44.encrypt(recipientPubkey, sealContent);
        } else {
          throw new Error('Extension does not support NIP-44 encryption required for NIP-17');
        }
        
        const seal = {
          kind: 13,
          content: encryptedSeal,
          tags: [],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: this.publicKey
        };
        
        const signedSeal = await window.nostr.signEvent(seal);
        
        // Create the gift wrap (kind 1059) using the wrapper key
        // Get the conversation key between wrapper and recipient
        const conversationKey = nip44.getConversationKey(wrapperKey, recipientPubkey);
        const giftWrapContent = nip44.encrypt(JSON.stringify(signedSeal), conversationKey);
        
        wrappedEvent = {
          kind: 1059,
          content: giftWrapContent,
          // NIP-17 privacy: do not include recipient routing metadata in cleartext.
          // Delivery is done by clients fetching gift wraps and attempting local decryption.
          tags: [],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: wrapperPubkey
        };
        
        // Sign with wrapper key (can't use extension for this)
        wrappedEvent = finalizeEvent(wrappedEvent, wrapperKey);
      } else {
        if (!this.secretKey) {
          throw new Error('Not logged in');
        }

        // Wrap manually using NIP-44 + ephemeral gift wrap key.
        // This matches the extension path and avoids API/version mismatches in nip17 helpers.
        const signedRumor = finalizeEvent(rumor, this.secretKey);

        // Seal (kind 13): encrypt the signed rumor to the recipient using sender<->recipient conversation key
        const sealContent = JSON.stringify(signedRumor);
        const senderToRecipientKey = nip44.getConversationKey(this.secretKey, recipientPubkey);
        const encryptedSeal = nip44.encrypt(sealContent, senderToRecipientKey);

        const sealTemplate: any = {
          kind: 13,
          content: encryptedSeal,
          tags: [],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: this.publicKey
        };
        const signedSeal = finalizeEvent(sealTemplate, this.secretKey);

        // Gift wrap (kind 1059): encrypt the seal to the recipient using wrapper<->recipient conversation key
        const wrapperKey = crypto.getRandomValues(new Uint8Array(32));
        const wrapperPubkey = getPublicKey(wrapperKey);
        const wrapperToRecipientKey = nip44.getConversationKey(wrapperKey, recipientPubkey);
        const giftWrapContent = nip44.encrypt(JSON.stringify(signedSeal), wrapperToRecipientKey);

        const giftWrapTemplate: any = {
          kind: 1059,
          content: giftWrapContent,
          // NIP-17 privacy: do not include recipient routing metadata in cleartext.
          tags: [],
          created_at: Math.floor(Date.now() / 1000),
          pubkey: wrapperPubkey
        };

        wrappedEvent = finalizeEvent(giftWrapTemplate, wrapperKey);
      }
      
      // Publish the wrapped event
      await this.pool.publish(RELAYS, wrappedEvent);

      // Save sent message locally (NIP-17 doesn't allow retrieving sent messages)
      this.saveSentMessageLocally(recipientPubkey, subject, content, replyTo);

      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  async getMessages(onProgress?: (current: number, total: number) => void, forceRefresh: boolean = false): Promise<DecryptedMessage[]> {
    if (!this.publicKey) {
      return [];
    }

    // Verify extension is available if using extension mode
    if (this.usingExtension && !window.nostr) {
      console.error('Extension mode active but window.nostr not available');
      return this.loadMessagesFromCache();
    }

    // Load from cache first
    const cachedMessages = this.loadMessagesFromCache();
    const lastFetch = this.getLastFetchTimestamp();
    const now = Date.now();
    
    // If cache is fresh (less than 20 seconds old) and not forcing refresh, return cache immediately
    if (!forceRefresh && cachedMessages.length > 0 && (now - lastFetch) < 20 * 1000) {
      return cachedMessages;
    }

    // Otherwise, fetch only NEW messages since last fetch
    const newMessages: DecryptedMessage[] = [];

    try {
      // Report that we're starting to fetch
      if (onProgress) {
        onProgress(0, 100); // Show initial progress
      }
      
      // Determine fetch range
      // IMPORTANT: NIP-17 gift wrap events (kind 1059) may have randomized timestamps
      // for privacy, so we cannot rely on 'since' to catch new messages!
      // Delivery is done by attempting local decryption; do NOT filter by recipient tags.
      // We fetch from far back and rely on deduplication by ID.
      const since = Math.floor(Date.now() / 1000) - (100 * 24 * 60 * 60);
      
      const wrappedEvents = await this.pool.querySync(RELAYS, {
        kinds: [1059],
        since,
        limit: 1000
      });

      const total = wrappedEvents.length;
      
      // Report initial progress to show we're starting
      if (onProgress && total > 0) {
        onProgress(0, total);
      }

      for (let i = 0; i < wrappedEvents.length; i++) {
        const wrappedEvent = wrappedEvents[i];
        
        // Report progress
        if (onProgress) {
          onProgress(i + 1, total);
        }
        
        // Allow UI to update every 10 messages (important for nsec which is synchronous)
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        try {
          let rumor: any;
          
          if (this.usingExtension) {
            if (!window.nostr) {
              console.warn('Using extension mode but window.nostr not available');
              continue;
            }
            
            // Manual unwrapping for extension using NIP-44
            try {
              if (!window.nostr.nip44?.decrypt) {
                continue;
              }
              
              // Decrypt the gift wrap (kind 1059)
              const sealJson = await window.nostr.nip44.decrypt(wrappedEvent.pubkey, wrappedEvent.content);
              if (!sealJson) continue;
              
              const seal = JSON.parse(sealJson);
              
              // Decrypt the seal (kind 13) to get the rumor
              const rumorJson = await window.nostr.nip44.decrypt(seal.pubkey, seal.content);
              if (!rumorJson) continue;
              
              rumor = JSON.parse(rumorJson);
            } catch (decryptError) {
              // Expected - message not for us or decryption failed
              continue;
            }
          } else if (this.secretKey) {
            // Manual unwrapping using NIP-44 to match wrapping logic above.
            // 1) Decrypt gift wrap using recipient<->wrapper conversation key.
            const wrapperToRecipientKey = nip44.getConversationKey(this.secretKey, wrappedEvent.pubkey);
            const sealJson = nip44.decrypt(wrappedEvent.content, wrapperToRecipientKey);
            const seal = JSON.parse(sealJson);

            // 2) Decrypt seal using recipient<->sender conversation key.
            const senderToRecipientKey = nip44.getConversationKey(this.secretKey, seal.pubkey);
            const rumorJson = nip44.decrypt(seal.content, senderToRecipientKey);
            rumor = JSON.parse(rumorJson);
          } else {
            continue;
          }
          
          if (!rumor) continue;

          const subjectTag = rumor.tags.find((t: string[]) => t[0] === 'subject');
          const subject = subjectTag ? subjectTag[1] : 'No Subject';
          const replyTag = rumor.tags.find((t: string[]) => t[0] === 'e' && t[3] === 'reply');
          const replyTo = replyTag ? replyTag[1] : undefined;
          const recipientTag = rumor.tags.find((t: string[]) => t[0] === 'p');
          const recipient = recipientTag ? recipientTag[1] : this.publicKey;

          newMessages.push({
            id: rumor.id || wrappedEvent.id,
            from: rumor.pubkey,
            to: recipient,
            subject,
            content: rumor.content,
            timestamp: rumor.created_at * 1000,
            read: false,
            replyTo,
            rawEvent: wrappedEvent
          });
        } catch (error) {
          // Silent fail - this is expected when trying to decrypt messages not for us
        }
      }

      // Merge new messages with existing cache (deduplicate by ID)
      const mergedMessages = [...cachedMessages];
      for (const newMsg of newMessages) {
        if (!mergedMessages.some(m => m.id === newMsg.id)) {
          mergedMessages.push(newMsg);
        }
      }
      
      // Sort by timestamp (newest first)
      mergedMessages.sort((a, b) => b.timestamp - a.timestamp);
      
      // Save merged cache and update last fetch timestamp
      this.saveMessagesToCache(mergedMessages);
      localStorage.setItem(this.getLastFetchKey(), Date.now().toString());
      
      return mergedMessages;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Always return cache on error
      return cachedMessages;
    }
  }

  async getContacts(): Promise<Contact[]> {
    if (!this.publicKey) return [];

    const messages = await this.getMessages();
    const contactMap = new Map<string, Contact>();

    for (const msg of messages) {
      const contactPubkey = msg.from === this.publicKey ? msg.to : msg.from;
      
      if (!contactMap.has(contactPubkey)) {
        const profile = await this.getProfile(contactPubkey);
        contactMap.set(contactPubkey, {
          pubkey: contactPubkey,
          profile: profile || undefined,
          lastMessage: msg.timestamp
        });
      }
    }

    return Array.from(contactMap.values()).sort((a, b) => 
      (b.lastMessage || 0) - (a.lastMessage || 0)
    );
  }

  getDisplayName(profile: NostrProfile | undefined, pubkey: string): string {
    if (!profile) {
      return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
    }

    // Prioritize verified NIP-05 first
    if (profile.nip05 && profile.nip05valid) {
      return profile.nip05;
    }

    // Then display_name or name
    if (profile.display_name) {
      return profile.display_name;
    }

    if (profile.name) {
      return profile.name;
    }

    // Fall back to truncated pubkey only if no other info
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
  }

  // Get secondary display info (name when NIP-05 is primary, or NIP-05 when name is primary)
  getSecondaryDisplay(profile: NostrProfile | undefined): string | null {
    if (!profile) return null;

    // If NIP-05 is primary display, show name as secondary
    if (profile.nip05 && profile.nip05valid) {
      return profile.display_name || profile.name || null;
    }

    return null;
  }

  // Check if we should show npub (only when no NIP-05)
  shouldShowPubkey(profile: NostrProfile | undefined): boolean {
    return !profile || !profile.nip05 || !profile.nip05valid;
  }

  // Search for profiles globally by NIP-05 or name
  async searchProfiles(query: string, limit = 10): Promise<Contact[]> {
    if (query.length < 2) return [];

    try {
      const events = await this.pool.querySync(RELAYS, {
        kinds: [0], // Profile metadata
        limit: limit * 2, // Get more to filter
      });

      const searchTerm = query.toLowerCase();
      const matches: Contact[] = [];
      const seenPubkeys = new Set<string>();

      for (const event of events) {
        if (seenPubkeys.has(event.pubkey) || matches.length >= limit) break;
        
        try {
          const profile = JSON.parse(event.content);
          const displayName = this.getDisplayName(profile, event.pubkey).toLowerCase();
          const nip05 = profile.nip05?.toLowerCase() || '';
          const name = profile.name?.toLowerCase() || '';
          
          if (
            displayName.includes(searchTerm) ||
            nip05.includes(searchTerm) ||
            name.includes(searchTerm) ||
            event.pubkey.toLowerCase().includes(searchTerm)
          ) {
            // Verify NIP-05 if present
            if (profile.nip05 && !profile.nip05valid) {
              profile.nip05valid = await this.verifyNip05(profile.nip05, event.pubkey);
            }
            
            matches.push({
              pubkey: event.pubkey,
              profile: profile
            });
            seenPubkeys.add(event.pubkey);
          }
        } catch (err) {
          // Skip invalid profiles
        }
      }

      return matches;
    } catch (error) {
      console.error('Profile search failed:', error);
      return [];
    }
  }

  disconnect() {
    this.pool.close(RELAYS);
  }
}

export const nostrService = new NostrService();
