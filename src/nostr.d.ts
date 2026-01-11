// Type declarations for Nostr browser extensions (nos2x, Alby, etc.)
interface WindowNostr {
  getPublicKey(): Promise<string>;
  signEvent(event: any): Promise<any>;
  nip04: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

interface Window {
  nostr?: WindowNostr;
}

// Type declarations for nostr-components web components
declare namespace JSX {
  interface IntrinsicElements {
    'nostr-zap-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      nip05?: string;
      npub?: string;
      pubkey?: string;
      text?: string;
      amount?: string;
      'default-amount'?: string;
      url?: string;
      'data-theme'?: string;
      relays?: string;
    };
  }
}
