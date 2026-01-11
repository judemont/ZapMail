import { useState, useEffect, useRef } from 'react';
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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const backgroundRefreshingRef = useRef(false);

  // Check if already logged in on mount
  useEffect(() => {
    if (nostrService.isLoggedIn()) {
      setIsLoggedIn(true);
    }
  }, []);

  const loadMessagesForeground = async (forceRefresh: boolean = false) => {
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

  const loadMessagesBackground = async () => {
    // Background refresh should not steal focus or show progress UI.
    // Also avoid overlapping refreshes.
    if (loading || backgroundRefreshingRef.current) return;
    backgroundRefreshingRef.current = true;
    try {
      const fetchedMessages = await nostrService.getMessages(undefined, false);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Background refresh failed:', error);
    } finally {
      backgroundRefreshingRef.current = false;
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadMessagesForeground();
      // Refresh messages every 30 seconds
      const interval = setInterval(loadMessagesBackground, 30000);
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
    loadMessagesForeground(true);
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
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${
        showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <Sidebar
          currentFolder={currentFolder}
          onFolderChange={(folder) => {
            handleFolderChange(folder);
            setShowMobileSidebar(false);
          }}
          onLogout={handleLogout}
          messageCount={{
            inbox: inboxMessages.length,
            sent: sentMessages.length,
          }}
        />
      </div>

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
            {/* Message List - hide on mobile when message is selected */}
            <div className={`w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden ${
              selectedMessage ? 'hidden lg:flex' : 'flex'
            }`}>
              <div className="px-4 lg:px-6 py-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition mr-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h2 className="text-lg lg:text-xl font-semibold text-gray-800 capitalize">
                  {currentFolder}
                </h2>
                <button
                  onClick={() => loadMessagesForeground(true)}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                  title="Refresh messages"
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

            {/* Message View - full screen on mobile, side by side on desktop */}
            <div className={`flex-1 ${
              selectedMessage ? 'flex' : 'hidden lg:flex'
            }`}>
              {selectedMessage ? (
                <MessageView 
                  message={selectedMessage} 
                  allMessages={messages}
                  onBack={() => setSelectedMessage(null)}
                  onReply={handleReply}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 p-4">
                  <div className="text-center">
                    <p className="text-base lg:text-lg">No message selected</p>
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
