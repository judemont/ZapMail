import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, X } from 'lucide-react';
import { nostrService } from '../nostrService';
import type { Contact, DecryptedMessage } from '../types';

interface ComposeProps {
  onBack: () => void;
  onSent: () => void;
  replyTo?: DecryptedMessage;
}

interface SelectedRecipient {
  pubkey: string;
  displayName: string;
  profile?: any;
}

export const Compose: React.FC<ComposeProps> = ({ onBack, onSent, replyTo }) => {
  const [toRecipients, setToRecipients] = useState<SelectedRecipient[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [toSuggestions, setToSuggestions] = useState<Contact[]>([]);

  useEffect(() => {
    const loadContacts = async () => {
      const contactList = await nostrService.getContacts();
      setContacts(contactList);
    };
    loadContacts();

    // If replying, pre-fill fields
    if (replyTo) {
      const loadReplyInfo = async () => {
        // Add sender to To field
        const profile = await nostrService.getProfile(replyTo.from);
        const displayName = nostrService.getDisplayName(profile || undefined, replyTo.from);
        setToRecipients([{ pubkey: replyTo.from, displayName, profile: profile || undefined }]);

        // Add all other recipients from original message to To field
        const otherRecipients: SelectedRecipient[] = [];
        const allOriginalRecipients = [
          ...(replyTo.toRecipients || [replyTo.to])
        ];
        
        const currentUserPubkey = nostrService.getPublicKey();
        for (const pubkey of allOriginalRecipients) {
          if (pubkey !== replyTo.from && pubkey !== currentUserPubkey) {
            const p = await nostrService.getProfile(pubkey);
            const name = nostrService.getDisplayName(p || undefined, pubkey);
            otherRecipients.push({ pubkey, displayName: name, profile: p || undefined });
          }
        }
        
        if (otherRecipients.length > 0) {
          setToRecipients([...toRecipients, ...otherRecipients]);
        }

        setSubject(replyTo.subject.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject}`);
      };
      loadReplyInfo();
    }
  }, [replyTo]);

  const searchContacts = async (searchTerm: string): Promise<Contact[]> => {
    if (searchTerm.length < 2) return [];

    const term = searchTerm.toLowerCase();
    let decodedPubkey: string | null = null;
    
    // Try to decode if it looks like an npub
    if (term.startsWith('npub1')) {
      try {
        const decoded = nostrService.decodeNpub(term);
        if (decoded) {
          decodedPubkey = decoded;
        }
      } catch {
        // Not a valid npub, continue with text search
      }
    }
    
    // First, filter existing contacts
    const contactMatches = contacts.filter(contact => {
      const displayName = nostrService.getDisplayName(contact.profile, contact.pubkey);
      return (
        displayName.toLowerCase().includes(term) ||
        contact.pubkey.toLowerCase().includes(term) ||
        (contact.profile?.nip05 && contact.profile.nip05.toLowerCase().includes(term)) ||
        (decodedPubkey && contact.pubkey === decodedPubkey)
      );
    });

    // If we decoded an npub and found it in contacts, return early
    if (decodedPubkey && contactMatches.length > 0) {
      return contactMatches;
    }

    // Then search globally
    const globalMatches = await nostrService.searchProfiles(term, 10);
    const contactPubkeys = new Set(contacts.map(c => c.pubkey));
    const unknownMatches = globalMatches.filter(m => !contactPubkeys.has(m.pubkey));

    return [...contactMatches, ...unknownMatches];
  };

  useEffect(() => {
    if (toInput.length > 1) {
      searchContacts(toInput).then(results => {
        const alreadySelected = new Set(toRecipients.map(r => r.pubkey));
        setToSuggestions(results.filter(c => !alreadySelected.has(c.pubkey)));
        setShowToSuggestions(true);
      });
    } else {
      setShowToSuggestions(false);
    }
  }, [toInput, toRecipients]);

  const addRecipient = (contact: Contact) => {
    const displayName = nostrService.getDisplayName(contact.profile, contact.pubkey);
    const recipient: SelectedRecipient = {
      pubkey: contact.pubkey,
      displayName,
      profile: contact.profile
    };

    setToRecipients([...toRecipients, recipient]);
    setToInput('');
    setShowToSuggestions(false);
  };

  const addRecipientByInput = async () => {
    if (!toInput.trim()) return;

    let pubkey: string | null = null;
    const input = toInput.trim();

    // Try to decode as npub
    if (input.startsWith('npub1')) {
      pubkey = nostrService.decodeNpub(input);
      if (!pubkey) {
        setError('Invalid npub format');
        setTimeout(() => setError(''), 3000);
        return;
      }
    } 
    // Check if it's a hex pubkey (64 characters)
    else if (input.length === 64 && /^[0-9a-f]+$/i.test(input)) {
      pubkey = input.toLowerCase();
    }
    // Check if it looks like a NIP-05 address (user@domain.com)
    else if (input.includes('@') && input.includes('.')) {
      setError('Resolving NIP-05 address...');
      try {
        pubkey = await nostrService.resolveNip05(input);
        if (!pubkey) {
          setError('NIP-05 address not found or invalid');
          setTimeout(() => setError(''), 4000);
          return;
        }
      } catch (err) {
        setError('Failed to resolve NIP-05 address');
        setTimeout(() => setError(''), 3000);
        return;
      }
    } else {
      setError('Invalid format. Use npub, hex pubkey, or NIP-05 address (user@domain.com)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Check if already added
    if (toRecipients.some(r => r.pubkey === pubkey)) {
      setToInput('');
      setShowToSuggestions(false);
      setError('');
      return;
    }

    // Try to load profile
    const profile = await nostrService.getProfile(pubkey);
    const displayName = nostrService.getDisplayName(profile || undefined, pubkey);
    
    const recipient: SelectedRecipient = {
      pubkey,
      displayName,
      profile: profile || undefined
    };

    setToRecipients([...toRecipients, recipient]);
    setToInput('');
    setShowToSuggestions(false);
    setError('');
  };

  const removeRecipient = (pubkey: string) => {
    setToRecipients(toRecipients.filter(r => r.pubkey !== pubkey));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (toRecipients.length === 0) {
      setError('Please add at least one recipient');
      return;
    }

    setSending(true);

    try {
      const success = await nostrService.sendMessage(
        toRecipients.map(r => r.pubkey),
        subject,
        content,
        replyTo?.id
      );

      if (success) {
        setToRecipients([]);
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

  const RecipientTag: React.FC<{ recipient: SelectedRecipient; onRemove: () => void; disabled?: boolean }> = ({ recipient, onRemove, disabled }) => (
    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
      <span className="truncate max-w-[150px]">{recipient.displayName}</span>
      {!disabled && (
        <button type="button" onClick={onRemove} className="hover:text-purple-600">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );

  const SuggestionList: React.FC<{ suggestions: Contact[]; onSelect: (contact: Contact) => void }> = ({ suggestions, onSelect }) => (
    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
      {suggestions.map((contact) => {
        const displayName = nostrService.getDisplayName(contact.profile, contact.pubkey);
        const secondaryDisplay = nostrService.getSecondaryDisplay(contact.profile);
        
        return (
          <div
            key={contact.pubkey}
            onClick={() => onSelect(contact)}
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
                {contact.profile?.nip05 && contact.profile.nip05valid && (
                  <span className="text-xs text-green-600">✓</span>
                )}
              </div>
              {secondaryDisplay && (
                <div className="text-xs text-gray-500 truncate">{secondaryDisplay}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

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

      <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
        <div className="overflow-y-auto flex-1">
          <div className="p-3 lg:p-6 space-y-3 lg:space-y-4">
            {/* To Field */}
            <div className="relative">
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                To
              </label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent min-h-[42px]">
                {toRecipients.map(recipient => (
                  <RecipientTag
                    key={recipient.pubkey}
                    recipient={recipient}
                    onRemove={() => removeRecipient(recipient.pubkey)}
                    disabled={!!replyTo}
                  />
                ))}
                <input
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onFocus={() => toInput.length > 1 && setShowToSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // If there are suggestions and one is highlighted, select it
                      if (showToSuggestions && toSuggestions.length > 0) {
                        addRecipient(toSuggestions[0]);
                      } else {
                        // Otherwise try to add by direct input (npub/hex)
                        addRecipientByInput();
                      }
                    } else if (e.key === 'Escape') {
                      setShowToSuggestions(false);
                    }
                  }}
                  placeholder={toRecipients.length === 0 ? "Enter name, npub, or NIP-05..." : ""}
                  className="flex-1 min-w-[200px] outline-none text-sm"
                  disabled={!!replyTo}
                />
              </div>
              {showToSuggestions && toSuggestions.length > 0 && (
                <SuggestionList suggestions={toSuggestions} onSelect={(c) => addRecipient(c)} />
              )}
            </div>

            {/* Subject Field */}
            <div>
              <label htmlFor="subject" className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Message subject"
                className="w-full px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm lg:text-base"
                required
              />
            </div>

            {/* Message Field */}
            <div className="flex-1">
              <label htmlFor="content" className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your message..."
                rows={12}
                className="w-full px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-sm lg:text-base"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs lg:text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-3 lg:px-6 py-3 lg:py-4 flex justify-end space-x-2 lg:space-x-3 flex-shrink-0">
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
