import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { DecryptedMessage, NostrProfile } from '../types';
import { nostrService } from '../nostrService';

interface MessageListProps {
  messages: DecryptedMessage[];
  onMessageSelect: (message: DecryptedMessage) => void;
  selectedMessageId?: string;
  showRecipient?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  onMessageSelect,
  selectedMessageId 
}) => {
  const [profiles, setProfiles] = useState<Map<string, NostrProfile>>(new Map());

  // Group messages into threads
  const organizeThreads = () => {
    const messageMap = new Map<string, DecryptedMessage>();
    const threads: DecryptedMessage[][] = [];
    const processedIds = new Set<string>();
    
    // Build message map
    messages.forEach(msg => messageMap.set(msg.id, msg));
    
    // Find root messages and build threads
    messages.forEach(message => {
      if (processedIds.has(message.id)) return;
      
      // If this is a root message (no replyTo or replyTo not in current messages)
      if (!message.replyTo || !messageMap.has(message.replyTo)) {
        const thread: DecryptedMessage[] = [message];
        processedIds.add(message.id);
        
        // Find all replies to this message
        const findReplies = (parentId: string) => {
          messages.forEach(msg => {
            if (msg.replyTo === parentId && !processedIds.has(msg.id)) {
              thread.push(msg);
              processedIds.add(msg.id);
              findReplies(msg.id); // Recursively find replies to this reply
            }
          });
        };
        
        findReplies(message.id);
        threads.push(thread);
      }
    });
    
    // Sort threads by most recent message
    threads.sort((a, b) => {
      const aLatest = Math.max(...a.map(m => m.timestamp));
      const bLatest = Math.max(...b.map(m => m.timestamp));
      return bLatest - aLatest;
    });
    
    return threads;
  };

  const threads = organizeThreads();

  useEffect(() => {
    const loadProfiles = async () => {
      const profileMap = new Map<string, NostrProfile>();
      const uniquePubkeys = [...new Set(messages.map(m => m.from))];
      
      for (const pubkey of uniquePubkeys) {
        const profile = await nostrService.getProfile(pubkey);
        if (profile) {
          profileMap.set(pubkey, profile);
        }
      }
      
      setProfiles(profileMap);
    };
    
    if (messages.length > 0) {
      loadProfiles();
    }
  }, [messages]);

  const formatTime = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  const getDisplayName = (pubkey: string) => {
    const profile = profiles.get(pubkey);
    return nostrService.getDisplayName(profile, pubkey);
  };

  const getSecondaryDisplay = (pubkey: string) => {
    const profile = profiles.get(pubkey);
    return nostrService.getSecondaryDisplay(profile);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg">No messages</p>
          <p className="text-sm mt-2">Your messages will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {threads.map((thread, threadIndex) => (
        <div key={`thread-${threadIndex}`} className="border-b-2 border-gray-300">
          {thread.map((message, msgIndex) => {
            const profile = profiles.get(message.from);
            const displayName = getDisplayName(message.from);
            const secondaryDisplay = getSecondaryDisplay(message.from);
            const isReply = msgIndex > 0;
            
            return (
              <div
                key={message.id}
                onClick={() => onMessageSelect(message)}
                className={`border-b border-gray-200 px-6 py-4 cursor-pointer hover:bg-gray-50 transition ${
                  selectedMessageId === message.id ? 'bg-blue-50' : ''
                } ${isReply ? 'bg-gray-50 ml-8' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  {profile?.picture ? (
                    <img 
                      src={profile.picture} 
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-semibold">
                        {displayName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-gray-900 truncate">
                            {displayName}
                          </span>
                          {profile?.nip05 && profile.nip05valid && (
                            <span className="text-xs text-green-600 flex-shrink-0">✓</span>
                          )}
                          {isReply && (
                            <span className="text-xs text-purple-600 flex-shrink-0">↪ Reply</span>
                          )}
                        </div>
                        {secondaryDisplay && (
                          <div className="text-xs text-gray-600 truncate">{secondaryDisplay}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                    <div className="font-medium text-gray-800 mb-1 break-all line-clamp-2">
                      {message.subject}
                    </div>
                    <div className="text-sm text-gray-600 break-all line-clamp-2">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
