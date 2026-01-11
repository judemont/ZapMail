import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Reply, MoreVertical, Copy, Check } from 'lucide-react';
import type { DecryptedMessage, NostrProfile } from '../types';
import { nostrService } from '../nostrService';

interface MessageViewProps {
  message: DecryptedMessage;
  allMessages: DecryptedMessage[];
  onBack: () => void;
  onReply: (message: DecryptedMessage) => void;
}

export const MessageView: React.FC<MessageViewProps> = ({ message, allMessages, onBack, onReply }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [threadProfiles, setThreadProfiles] = useState<Map<string, NostrProfile>>(new Map());

  // Helper to format recipient list
  const formatRecipients = (recipients: string[] | undefined, profiles: Map<string, NostrProfile>): string => {
    if (!recipients || recipients.length === 0) return '';
    if (recipients.length === 1) {
      return nostrService.getDisplayName(profiles.get(recipients[0]), recipients[0]);
    }
    return `${recipients.length} recipients`;
  };

  const thread = useMemo(() => {
    const byId = new Map<string, DecryptedMessage>();
    for (const m of allMessages) byId.set(m.id, m);
    // Ensure the selected message is present (it should be, but be defensive).
    byId.set(message.id, message);

    const focus = byId.get(message.id);
    if (!focus) return [{ msg: message, depth: 0 }];

    // Find the root by walking replyTo links.
    let root = focus;
    const visited = new Set<string>([root.id]);
    while (root.replyTo && byId.has(root.replyTo) && !visited.has(root.replyTo)) {
      visited.add(root.replyTo);
      root = byId.get(root.replyTo)!;
    }

    // Build children lookup.
    const childrenByParent = new Map<string, DecryptedMessage[]>();
    for (const m of byId.values()) {
      if (!m.replyTo) continue;
      const arr = childrenByParent.get(m.replyTo) ?? [];
      arr.push(m);
      childrenByParent.set(m.replyTo, arr);
    }
    for (const arr of childrenByParent.values()) {
      arr.sort((a, b) => a.timestamp - b.timestamp);
    }

    // DFS to linearize the thread.
    const out: Array<{ msg: DecryptedMessage; depth: number }> = [];
    const pushed = new Set<string>();
    const walk = (node: DecryptedMessage, depth: number) => {
      if (pushed.has(node.id)) return;
      pushed.add(node.id);
      out.push({ msg: node, depth });
      const kids = childrenByParent.get(node.id) ?? [];
      for (const child of kids) walk(child, depth + 1);
    };
    walk(root, 0);

    // Ensure focus is visible even if it was disconnected.
    if (!out.some((x) => x.msg.id === focus.id)) {
      out.unshift({ msg: focus, depth: 0 });
    }

    return out;
  }, [allMessages, message]);

  useEffect(() => {
    const loadThreadProfiles = async () => {
      const unique = new Set<string>();
      
      // Collect all pubkeys from thread messages
      for (const { msg } of thread) {
        unique.add(msg.from);
        unique.add(msg.to);
        if (msg.toRecipients) msg.toRecipients.forEach(r => unique.add(r));
      }
      
      const uniqueArray = Array.from(unique).filter(v => typeof v === 'string' && v.length > 0);
      const map = new Map<string, NostrProfile>();

      // Keep this lightweight: threads are usually small; do sequential to avoid relay bursts.
      for (const pubkey of uniqueArray) {
        try {
          const p = await nostrService.getProfile(pubkey);
          if (p) map.set(pubkey, p);
        } catch {
          // ignore
        }
      }

      setThreadProfiles(map);
    };

    loadThreadProfiles();
  }, [thread]);

  const truncatePubkey = (pubkey: string) => {
    return `${pubkey.slice(0, 16)}...${pubkey.slice(-16)}`;
  };

  const getAvatar = (pubkey: string) => {
    const profile = threadProfiles.get(pubkey);
    const name = nostrService.getDisplayName(profile, pubkey);
    if (profile?.picture) {
      return (
        <img
          src={profile.picture}
          alt={name}
          className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover flex-shrink-0"
        />
      );
    }

    return (
      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
        <span className="text-purple-600 font-semibold text-sm lg:text-base">{name[0]?.toUpperCase() ?? '?'}</span>
      </div>
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyMessageData = () => {
    // Copy the raw Nostr event if available, otherwise fallback to decrypted data
    const messageData = message.rawEvent 
      ? JSON.stringify(message.rawEvent, null, 2)
      : JSON.stringify({
          id: message.id,
          from: message.from,
          to: message.to,
          subject: message.subject,
          content: message.content,
          timestamp: message.timestamp,
          replyTo: message.replyTo
        }, null, 2);
    copyToClipboard(messageData, 'json');
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="border-b border-gray-200 px-3 lg:px-6 py-3 lg:py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0 lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-1 lg:space-x-2 flex-shrink-0">
          <button
            onClick={() => onReply(message)}
            className="flex items-center space-x-1 lg:space-x-2 px-3 lg:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm lg:text-base"
          >
            <Reply className="w-4 h-4" />
            <span className="hidden sm:inline">Reply</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    copyToClipboard(message.id, 'id');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">Copy Message ID</span>
                  {copiedItem === 'id' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(message.content, 'content');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">Copy Content</span>
                  {copiedItem === 'content' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
                <button
                  onClick={() => {
                    copyMessageData();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">Copy Message Data</span>
                  {copiedItem === 'json' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
                <div className="border-t border-gray-200"></div>
                <button
                  onClick={() => {
                    copyToClipboard(message.from, 'sender');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">Copy Sender Pubkey</span>
                  {copiedItem === 'sender' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(message.to, 'recipient');
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between rounded-b-lg"
                >
                  <span className="text-sm text-gray-700">Copy Recipient Pubkey</span>
                  {copiedItem === 'recipient' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {thread.length > 1 ? (
          <>
            {/* Subject Header */}
            <div className="bg-purple-50 border-b border-purple-100 px-3 lg:px-6 py-3 lg:py-4">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 break-words">{message.subject}</h1>
              <div className="mt-2 text-xs lg:text-sm text-purple-700 flex items-center">
                <Reply className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                Thread ({thread.length} messages)
              </div>
            </div>

            {/* Thread */}
            <div className="px-3 lg:px-6 py-4 lg:py-6 space-y-3 lg:space-y-4">
              {thread.map(({ msg: m, depth }) => {
                const isFocus = m.id === message.id;

                const fromProfile = threadProfiles.get(m.from);
                const toProfile = threadProfiles.get(m.to);

                const fromName = nostrService.getDisplayName(fromProfile, m.from);
                const toName = m.toRecipients && m.toRecipients.length > 1 
                  ? formatRecipients(m.toRecipients, threadProfiles)
                  : nostrService.getDisplayName(toProfile, m.to);

                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-3 lg:p-4 ${
                      isFocus ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
                    }`}
                    style={{ marginLeft: `${Math.min(depth * 12, 48)}px` }}
                  >
                    <div className="flex items-start justify-between gap-2 lg:gap-4">
                      <div className="flex items-start gap-2 lg:gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getAvatar(m.from)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs lg:text-sm font-semibold text-gray-900 break-words">
                            {m.subject}
                            {depth > 0 && <span className="ml-1 lg:ml-2 text-xs text-purple-700">↪ Reply</span>}
                            {isFocus && <span className="ml-1 lg:ml-2 text-xs text-purple-700">(selected)</span>}
                          </div>
                          <div className="mt-1 text-xs lg:text-sm text-gray-700 truncate">
                            <span className="font-medium">From:</span> {fromName}
                          </div>
                          <div className="text-xs lg:text-sm text-gray-700 truncate">
                            <span className="font-medium">To:</span> {toName}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 font-mono truncate hidden lg:block">
                            {truncatePubkey(m.from)} → {truncatePubkey(m.to)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap self-start">
                        {new Date(m.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>

                    <div className="mt-2 lg:mt-3 text-xs lg:text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Single message view */}
            <div className="bg-purple-50 border-b border-purple-100 px-3 lg:px-6 py-3 lg:py-4">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 break-words">{message.subject}</h1>
            </div>

            <div className="px-3 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
              <div className="flex items-start justify-between gap-2 lg:gap-4">
                <div className="flex items-start gap-2 lg:gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {getAvatar(message.from)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm lg:text-base font-semibold text-gray-900 truncate">
                      {nostrService.getDisplayName(threadProfiles.get(message.from), message.from)}
                    </div>
                    <div className="text-xs lg:text-sm text-gray-600 truncate">
                      <span className="font-medium">To:</span>{' '}
                      {message.toRecipients && message.toRecipients.length > 1
                        ? formatRecipients(message.toRecipients, threadProfiles)
                        : nostrService.getDisplayName(threadProfiles.get(message.to), message.to)}
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate hidden lg:block">
                      {truncatePubkey(message.from)} → {truncatePubkey(message.to)}
                    </div>
                  </div>
                </div>
                <div className="text-xs lg:text-sm text-gray-500 flex-shrink-0 whitespace-nowrap self-start">
                  {new Date(message.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
            </div>

            <div className="px-3 lg:px-6 py-4 lg:py-6">
              <div className="prose max-w-none">
                <div className="text-sm lg:text-base text-gray-800 whitespace-pre-wrap break-all leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
