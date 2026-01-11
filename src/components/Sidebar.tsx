import React, { useEffect, useState } from 'react';
import { Inbox, Send, PenSquare, LogOut, Mail, Info, Heart } from 'lucide-react';
import type { Folder, NostrProfile } from '../types';
import { nostrService } from '../nostrService';

interface SidebarProps {
  currentFolder: Folder;
  onFolderChange: (folder: Folder) => void;
  onLogout: () => void;
  messageCount: {
    inbox: number;
    sent: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentFolder, 
  onFolderChange, 
  onLogout,
  messageCount 
}) => {
  const [userProfile, setUserProfile] = useState<NostrProfile | undefined>();
  const userPubkey = nostrService.getPublicKey();

  useEffect(() => {
    const loadUserProfile = async () => {
      if (userPubkey) {
        const profile = await nostrService.getProfile(userPubkey);
        setUserProfile(profile || undefined);
      }
    };
    loadUserProfile();
  }, [userPubkey]);

  const displayName = nostrService.getDisplayName(userProfile, userPubkey || '');
  const secondaryDisplay = nostrService.getSecondaryDisplay(userProfile);

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <div className="bg-purple-600 p-2 rounded-lg">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">ZapMail</h1>
        </div>
        
        {/* User Profile Display */}
        <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
          {userProfile?.picture ? (
            <img 
              src={userProfile.picture} 
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-semibold">
                {displayName[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">
              {displayName}
            </div>
            {secondaryDisplay && (
              <div className="text-xs text-gray-600 truncate">{secondaryDisplay}</div>
            )}
            {userProfile?.nip05 && userProfile.nip05valid && (
              <div className="text-xs text-green-600 flex items-center">
                <span className="mr-1">✓</span>
                Verified
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => onFolderChange('compose')}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center space-x-2"
        >
          <PenSquare className="w-5 h-5" />
          <span>Compose</span>
        </button>
      </div>

      <nav className="flex-1 px-2">
        <button
          onClick={() => onFolderChange('inbox')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
            currentFolder === 'inbox'
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Inbox className="w-5 h-5" />
          <span className="flex-1 text-left">Inbox</span>
          {messageCount.inbox > 0 && (
            <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1">
              {messageCount.inbox}
            </span>
          )}
        </button>

        <button
          onClick={() => onFolderChange('sent')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
            currentFolder === 'sent'
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Send className="w-5 h-5" />
          <span className="flex-1 text-left">Sent</span>
          {messageCount.sent > 0 && (
            <span className="bg-gray-400 text-white text-xs rounded-full px-2 py-1">
              {messageCount.sent}
            </span>
          )}
        </button>        
        <button
          onClick={() => onFolderChange('about')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
            currentFolder === 'about'
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Info className="w-5 h-5" />
          <span className="flex-1 text-left">About</span>
        </button>
        
        <button
          onClick={() => onFolderChange('donate')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
            currentFolder === 'donate'
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Heart className="w-5 h-5" />
          <span className="flex-1 text-left">Donate</span>
        </button>
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <a
          href="https://github.com/judemont/zapmail"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center px-4 py-2 text-sm text-gray-600 hover:text-purple-600 transition"
        >
          <span>View Source Code</span>
        </a>
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
