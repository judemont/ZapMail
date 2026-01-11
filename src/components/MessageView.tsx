import React, { useEffect, useState } from 'react';
import { ArrowLeft, Reply, MoreVertical, Copy, Check } from 'lucide-react';
import type { DecryptedMessage, NostrProfile } from '../types';
import { nostrService } from '../nostrService';

interface MessageViewProps {
  message: DecryptedMessage;
  onBack: () => void;
  onReply: (message: DecryptedMessage) => void;
}

export const MessageView: React.FC<MessageViewProps> = ({ message, onBack, onReply }) => {
  const [senderProfile, setSenderProfile] = useState<NostrProfile | undefined>();
  const [showMenu, setShowMenu] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [originalMessage, setOriginalMessage] = useState<DecryptedMessage | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await nostrService.getProfile(message.from);
      setSenderProfile(profile || undefined);
    };
    loadProfile();
  }, [message.from]);

  useEffect(() => {
    const loadOriginalMessage = async () => {
      if (message.replyTo) {
        setLoadingOriginal(true);
        try {
          const allMessages = await nostrService.getMessages();
          const original = allMessages.find(m => m.id === message.replyTo);
          if (original) {
            setOriginalMessage(original);
          }
        } catch (error) {
          console.error('Failed to load original message:', error);
        } finally {
          setLoadingOriginal(false);
        }
      } else {
        setOriginalMessage(null);
      }
    };
    loadOriginalMessage();
  }, [message.replyTo]);

  const displayName = nostrService.getDisplayName(senderProfile, message.from);
  const secondaryDisplay = nostrService.getSecondaryDisplay(senderProfile);
  const shouldShowPubkey = nostrService.shouldShowPubkey(senderProfile);
  const truncatePubkey = (pubkey: string) => {
    return `${pubkey.slice(0, 16)}...${pubkey.slice(-16)}`;
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
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => onReply(message)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
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
        {/* Original Message (if this is a reply) */}
        {message.replyTo && originalMessage && (
          <div className="bg-gray-50 border-b-2 border-gray-300 px-6 py-4">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center">
              <Reply className="w-3 h-3 mr-1" />
              Original Message
            </div>
            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="font-semibold text-gray-700 text-sm mb-2">{originalMessage.subject}</div>
              <div className="text-sm text-gray-600 mb-3 line-clamp-3">{originalMessage.content}</div>
              <div className="text-xs text-gray-500">
                From: {nostrService.getDisplayName(undefined, originalMessage.from)} • {new Date(originalMessage.timestamp).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}
        {message.replyTo && loadingOriginal && (
          <div className="bg-gray-50 border-b-2 border-gray-300 px-6 py-4">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center">
              <Reply className="w-3 h-3 mr-1" />
              Loading Original Message...
            </div>
          </div>
        )}

        {/* Subject Header */}
        <div className="bg-purple-50 border-b border-purple-100 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 break-words">{message.subject}</h1>
          {message.replyTo && (
            <div className="mt-2 text-sm text-purple-600 italic flex items-center">
              <Reply className="w-4 h-4 mr-1" />
              Reply to message
            </div>
          )}
        </div>

        {/* Message Metadata */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              {senderProfile?.picture ? (
                <img 
                  src={senderProfile.picture} 
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-semibold text-lg">
                    {displayName[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">{displayName}</div>
                {secondaryDisplay && (
                  <div className="text-sm text-gray-600 truncate">{secondaryDisplay}</div>
                )}
                {shouldShowPubkey && (
                  <div className="text-sm text-gray-500 font-mono truncate">{truncatePubkey(message.from)}</div>
                )}
                {senderProfile?.nip05 && senderProfile.nip05valid && (
                  <div className="text-xs text-green-600 flex items-center mt-1">
                    <span className="mr-1">✓</span>
                    Verified
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500 ml-4 flex-shrink-0">
              {new Date(message.timestamp).toLocaleString()}
            </div>
          </div>
          {shouldShowPubkey && (
            <div className="mt-3 ml-15">
              <div className="text-sm text-gray-500 mb-1">To</div>
              <div className="font-mono text-sm text-gray-800 break-words">{message.to}</div>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="px-6 py-6">
          <div className="prose max-w-none">
            <div className="text-gray-800 whitespace-pre-wrap break-all leading-relaxed">{message.content}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
