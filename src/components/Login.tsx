import React, { useState, useEffect } from 'react';
import { Mail, Zap } from 'lucide-react';
import { nostrService } from '../nostrService';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-purple-600 p-4 rounded-full">
            <Mail className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          ZapMail
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Secure email-like messaging on Nostr
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="nsec" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your NSEC private key
            </label>
            <input
              id="nsec"
              type="password"
              value={nsec}
              onChange={(e) => setNsec(e.target.value)}
              placeholder="nsec1..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        <button
          onClick={handleExtensionLogin}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Zap className="w-5 h-5" />
          <span>{loading ? 'Connecting...' : 'Connect with Extension (Recommended)'}</span>
        </button>

        <p className="mt-6 text-xs text-gray-500 text-center">
          Your private key is stored locally and never sent to any server.
        </p>
      </div>
    </div>
  );
};
