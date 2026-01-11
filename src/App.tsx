import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { MessageList } from './components/MessageList';
import { MessageView } from './components/MessageView';
import { Compose } from './components/Compose';
import { About } from './components/About';
import { Donate } from './components/Donate';
import { nostrService } from './nostrService';
import type { Folder, DecryptedMessage } from './types';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<Folder>('inbox');
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<DecryptedMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<DecryptedMessage | undefined>();

  // Check if already logged in on mount
  useEffect(() => {
    if (nostrService.isLoggedIn()) {
      setIsLoggedIn(true);
    }
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const fetchedMessages = await nostrService.getMessages();
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadMessages();
      // Refresh messages every 30 seconds
      const interval = setInterval(loadMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    nostrService.logout();
    setIsLoggedIn(false);
    setMessages([]);
    setSelectedMessage(null);
    setCurrentFolder('inbox');
  };

  const handleFolderChange = (folder: Folder) => {
    setCurrentFolder(folder);
    setSelectedMessage(null);
    setReplyToMessage(undefined);
  };

  const handleMessageSent = () => {
    setCurrentFolder('sent');
    setReplyToMessage(undefined);
    loadMessages();
  };

  const handleReply = (message: DecryptedMessage) => {
    setReplyToMessage(message);
    setCurrentFolder('compose');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const userPubkey = nostrService.getPublicKey();
  const inboxMessages = messages.filter(m => m.to === userPubkey);
  const sentMessages = messages.filter(m => m.from === userPubkey && m.to !== userPubkey);

  const currentMessages = currentFolder === 'inbox' ? inboxMessages : sentMessages;

  return (
    <div className="h-screen flex bg-gray-100">
      <Sidebar
        currentFolder={currentFolder}
        onFolderChange={handleFolderChange}
        onLogout={handleLogout}
        messageCount={{
          inbox: inboxMessages.length,
          sent: sentMessages.length,
        }}
      />

      <div className="flex-1 flex flex-col">
        {currentFolder === 'compose' ? (
          <Compose 
            onBack={() => {
              setCurrentFolder('inbox');
              setReplyToMessage(undefined);
            }} 
            onSent={handleMessageSent}
            replyTo={replyToMessage}
          />
        ) : currentFolder === 'about' ? (
          <About onBack={() => setCurrentFolder('inbox')} />
        ) : currentFolder === 'donate' ? (
          <Donate onBack={() => setCurrentFolder('inbox')} />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-800 capitalize">
                  {currentFolder}
                </h2>
              </div>
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-400">Loading messages...</div>
                </div>
              ) : (
                <MessageList
                  messages={currentMessages}
                  onMessageSelect={setSelectedMessage}
                  selectedMessageId={selectedMessage?.id}
                />
              )}
            </div>

            <div className="flex-1">
              {selectedMessage ? (
                <MessageView 
                  message={selectedMessage} 
                  onBack={() => setSelectedMessage(null)}
                  onReply={handleReply}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-lg">No message selected</p>
                    <p className="text-sm mt-2">Select a message to read</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
