import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { nostrService } from '../nostrService';
import type { Contact, DecryptedMessage } from '../types';

interface ComposeProps {
  onBack: () => void;
  onSent: () => void;
  replyTo?: DecryptedMessage;
}

export const Compose: React.FC<ComposeProps> = ({ onBack, onSent, replyTo }) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadContacts = async () => {
      const contactList = await nostrService.getContacts();
      setContacts(contactList);
    };
    loadContacts();

    // If replying, pre-fill fields (no original message content - use protocol-level reply)
    if (replyTo) {
      // Load sender's profile to get NIP-05 if available
      const loadSenderInfo = async () => {
        const profile = await nostrService.getProfile(replyTo.from);
        if (profile?.nip05 && profile.nip05valid) {
          setRecipient(profile.nip05);
        } else {
          setRecipient(replyTo.from);
        }
      };
      loadSenderInfo();
      setSubject(replyTo.subject.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject}`);
      // Don't include original message - NIP-17 handles threading at protocol level
    }
  }, [replyTo]);

  useEffect(() => {
    if (recipient.length > 1 && !replyTo) {
      const searchTerm = recipient.toLowerCase();
      
      const searchGlobal = async () => {
        setIsSearching(true);
        
        try {
          // First, filter contacts
          const contactMatches = contacts.filter(contact => {
            const displayName = nostrService.getDisplayName(contact.profile, contact.pubkey);
            return (
              displayName.toLowerCase().includes(searchTerm) ||
              contact.pubkey.toLowerCase().includes(searchTerm) ||
              (contact.profile?.nip05 && contact.profile.nip05.toLowerCase().includes(searchTerm))
            );
          });
          
          // Then search globally for unknown profiles
          const globalMatches = await nostrService.searchProfiles(searchTerm, 10);
          
          // Filter out contacts we already have
          const contactPubkeys = new Set(contacts.map(c => c.pubkey));
          const unknownMatches = globalMatches.filter(m => !contactPubkeys.has(m.pubkey));
          
          // Combine: contacts first, then global results
          const allMatches = [...contactMatches, ...unknownMatches];
          
          // Sort: exact NIP-05 matches first, then display name matches, then others
          const sortedMatches = allMatches.sort((a, b) => {
            const aNip05 = a.profile?.nip05?.toLowerCase() || '';
            const bNip05 = b.profile?.nip05?.toLowerCase() || '';
            const aName = nostrService.getDisplayName(a.profile, a.pubkey).toLowerCase();
            const bName = nostrService.getDisplayName(b.profile, b.pubkey).toLowerCase();
            
            // Check if it's a contact
            const aIsContact = contactPubkeys.has(a.pubkey);
            const bIsContact = contactPubkeys.has(b.pubkey);
            
            // Contacts always come first
            if (aIsContact && !bIsContact) return -1;
            if (bIsContact && !aIsContact) return 1;
            
            // Exact NIP-05 match gets highest priority
            if (aNip05 === searchTerm) return -1;
            if (bNip05 === searchTerm) return 1;
            
            // NIP-05 starts with search term
            if (aNip05.startsWith(searchTerm) && !bNip05.startsWith(searchTerm)) return -1;
            if (bNip05.startsWith(searchTerm) && !aNip05.startsWith(searchTerm)) return 1;
            
            // Name starts with search term
            if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
            if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1;
            
            // Alphabetical by name
            return aName.localeCompare(bName);
          });
          
          setFilteredContacts(sortedMatches);
          setShowSuggestions(sortedMatches.length > 0);
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setIsSearching(false);
        }
      };
      
      searchGlobal();
    } else {
      setShowSuggestions(false);
      setFilteredContacts([]);
    }
  }, [recipient, contacts, replyTo]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      let recipientPubkey = recipient.trim();
      
      // Check if it's a NIP-05 address (contains @)
      if (recipientPubkey.includes('@') && !recipientPubkey.startsWith('npub')) {
        const resolved = await nostrService.resolveNip05(recipientPubkey);
        if (!resolved) {
          throw new Error('Could not resolve NIP-05 address');
        }
        recipientPubkey = resolved;
      } else if (recipientPubkey.startsWith('npub')) {
        // Convert npub to hex
        const { nip19 } = await import('nostr-tools');
        const decoded = nip19.decode(recipientPubkey);
        if (decoded.type === 'npub') {
          recipientPubkey = decoded.data;
        }
      }

      // Validate hex pubkey (should be 64 characters)
      if (recipientPubkey.length !== 64 || !/^[0-9a-f]+$/i.test(recipientPubkey)) {
        throw new Error('Invalid recipient public key');
      }

      const success = await nostrService.sendMessage(
        recipientPubkey, 
        subject, 
        content,
        replyTo?.id
      );
      
      if (success) {
        setRecipient('');
        setSubject('');
        setContent('');
        onSent();
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectContact = (contact: Contact) => {
    // Use NIP-05 if available and valid, otherwise use pubkey
    if (contact.profile?.nip05 && contact.profile.nip05valid) {
      setRecipient(contact.profile.nip05);
    } else {
      setRecipient(contact.pubkey);
    }
    setShowSuggestions(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b border-gray-200 px-3 lg:px-6 py-3 lg:py-4 flex items-center space-x-2 lg:space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg lg:text-xl font-semibold text-gray-800">
          {replyTo ? 'Reply to Message' : 'New Message'}
        </h2>
      </div>

      <form onSubmit={handleSend} className="flex-1 flex flex-col">
        <div className="p-3 lg:p-6 space-y-3 lg:space-y-4">
          <div className="relative">
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
              To (npub, hex pubkey, or NIP-05 address)
            </label>
            <input
              id="recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onFocus={() => recipient.length > 0 && setShowSuggestions(true)}
              placeholder="npub1..., hex pubkey, or user@domain.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
              disabled={!!replyTo}
            />
            
            {showSuggestions && filteredContacts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {isSearching && (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    Searching...
                  </div>
                )}
                {filteredContacts.map((contact) => {
                  const displayName = nostrService.getDisplayName(contact.profile, contact.pubkey);
                  const secondaryDisplay = nostrService.getSecondaryDisplay(contact.profile);
                  const shouldShowPubkey = nostrService.shouldShowPubkey(contact.profile);
                  const isContact = contacts.some(c => c.pubkey === contact.pubkey);
                  
                  return (
                    <div
                      key={contact.pubkey}
                      onClick={() => selectContact(contact)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center space-x-3"
                    >
                      {contact.profile?.picture ? (
                        <img 
                          src={contact.profile.picture} 
                          alt={displayName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-600 font-semibold text-sm">
                            {displayName[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">{displayName}</span>
                          {isContact && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Contact</span>
                          )}
                        </div>
                        {secondaryDisplay && (
                          <div className="text-xs text-gray-600 truncate">{secondaryDisplay}</div>
                        )}
                        {shouldShowPubkey && (
                          <div className="text-xs text-gray-500 font-mono truncate">
                            {contact.pubkey.slice(0, 16)}...
                          </div>
                        )}
                      </div>
                      {contact.profile?.nip05 && contact.profile.nip05valid && (
                        <span className="text-xs text-green-600 flex-shrink-0">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div className="flex-1">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your message..."
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-3 lg:px-6 py-3 lg:py-4 flex justify-end space-x-2 lg:space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 lg:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm lg:text-base"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="px-4 lg:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm lg:text-base"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
