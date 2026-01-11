import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { MessageList } from './components/MessageList';
import { MessageView } from './components/MessageView';
import { Compose } from './components/Compose';
import { About } from './components/About';
import { Donate } from './components/Donate';
import { nostrService } from './nostrService';
import { RefreshCw } from 'lucide-react';
import type { Folder, DecryptedMessage } from './types';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<Folder>('inbox');
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<DecryptedMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<DecryptedMessage | undefined>();

  // Check if already logged in on mount
  useEffect(() => {
    if (nostrService.isLoggedIn()) {
      setIsLoggedIn(true);
    }
  }, []);

  const loadMessages = async (forceRefresh: boolean = false) => {
    setLoading(true);
    setLoadingProgress(null);
    try {
      const fetchedMessages = await nostrService.getMessages((current, total) => {
        setLoadingProgress({ current, total });
      }, forceRefresh);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
      setLoadingProgress(null);
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

  console.log('Messages filtering:', {
    total: messages.length,
    userPubkey,
    inbox: inboxMessages.length,
    sent: sentMessages.length,
    allFrom: messages.filter(m => m.from === userPubkey).length,
    sampleMessages: messages.slice(0, 3).map(m => ({ from: m.from.substring(0,8), to: m.to.substring(0,8), subject: m.subject }))
  });

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
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 capitalize">
                  {currentFolder}
                </h2>
                <button
                  onClick={() => loadMessages(true)}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                  title="Rechercher nouveaux messages"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {loading ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center w-full max-w-md">
                    <div className="text-gray-600 mb-4">
                        {loadingProgress ? 'Decrypting messages...' : 'Loading messages...'}
                    </div>
                    {loadingProgress && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                          <div 
                            className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                          />
                        </div>
                        <div className="text-sm text-gray-500">
                          {loadingProgress.current} / {loadingProgress.total} messages
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <MessageList
                  messages={currentMessages}
                  onMessageSelect={setSelectedMessage}
                  selectedMessageId={selectedMessage?.id}
                  showRecipient={currentFolder === 'sent'}
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
