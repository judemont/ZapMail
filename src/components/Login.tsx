import React, { useState, useEffect } from 'react';
import { Zap, Sun, Moon } from 'lucide-react';
import { nostrService } from '../nostrService';

interface LoginProps {
  onLogin: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isDarkMode, onToggleTheme }) => {
  const [nsec, setNsec] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [_hasExtension, setHasExtension] = useState(false);

  useEffect(() => {
    // Check if Nostr extension is available
    setHasExtension(!!window.nostr);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = nostrService.login(nsec);
      if (success) {
        onLogin();
      } else {
        setError('Invalid NSEC key. Please check and try again.');
      }
    } catch (err) {
      setError('Failed to login. Please check your NSEC key.');
    } finally {
      setLoading(false);
    }
  };

  const handleExtensionLogin = async () => {
    setError('');
    
    if (!window.nostr) {
      setError('No Nostr extension found. Please install Alby, nos2x, or another Nostr extension.');
      return;
    }
    
    setLoading(true);

    try {
      const success = await nostrService.loginWithExtension();
      if (success) {
        onLogin();
      } else {
        setError('Failed to connect with Nostr extension.');
      }
    } catch (err) {
      setError('Failed to connect. Please make sure your Nostr extension is unlocked.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-3 lg:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 lg:p-8 w-full max-w-md relative">
        <button
          onClick={onToggleTheme}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>

        <div className="flex justify-center mb-4 lg:mb-6">
          <img 
            src={isDarkMode ? "/icon-dark.png" : "/icon-light.png"} 
            alt="ZapMail Logo" 
            className="w-16 h-16 lg:w-20 lg:h-20" 
          />
        </div>
        
        <h1 className="text-2xl lg:text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">
          ZapMail
        </h1>
        <p className="text-sm lg:text-base text-center text-gray-600 dark:text-gray-400 mb-6 lg:mb-8">
          Secure email-like messaging on Nostr
        </p>

        <form onSubmit={handleLogin} className="space-y-3 lg:space-y-4">
          <div>
            <label htmlFor="nsec" className="block text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter your NSEC private key
            </label>
            <input
              id="nsec"
              type="password"
              value={nsec}
              onChange={(e) => setNsec(e.target.value)}
              placeholder="nsec1..."
              className="w-full px-3 lg:px-4 py-2 lg:py-3 text-sm lg:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-xs lg:text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 dark:bg-purple-500 text-white py-2 lg:py-3 rounded-lg text-sm lg:text-base font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="relative my-4 lg:my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-xs lg:text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
          </div>
        </div>

        <button
          onClick={handleExtensionLogin}
          disabled={loading}
          className="w-full bg-purple-600 dark:bg-purple-500 text-white py-2 lg:py-3 rounded-lg text-sm lg:text-base font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Zap className="w-4 h-4 lg:w-5 lg:h-5" />
          <span>{loading ? 'Connecting...' : 'Connect with Extension'}</span>
        </button>

        <p className="mt-4 lg:mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          Your private key is stored locally and never sent to any server.
        </p>
      </div>
    </div>
  );
};
