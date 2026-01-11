import React from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

interface AboutProps {
  onBack: () => void;
}

export const About: React.FC<AboutProps> = ({ onBack }) => {
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4 flex items-center space-x-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">About ZapMail</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto prose prose-purple">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-purple-600 p-3 rounded-lg">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 m-0">ZapMail</h1>
              <p className="text-gray-600 m-0">A Nostr-based Email Client</p>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why ZapMail?</h2>
            <p className="text-gray-700 mb-4">
              Email is fundamentally broken. While it was designed to be decentralized, in practice it has become 
              controlled by a handful of large providers like Google and Microsoft. Our emails are not private, 
              not secure, and the protocols haven't meaningfully evolved since the 1980s.
            </p>
            <p className="text-gray-700">
              ZapMail brings email into the modern era by leveraging the Nostr protocol to create a truly 
              decentralized, private, and secure messaging experience that feels like email but works better.
            </p>
          </section>

          <section className="mb-8">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <h2 className="text-xl font-bold text-red-800 mb-2 flex items-center">
                <span className="text-2xl mr-2">⚠️</span>
                Security Warning
              </h2>
              <p className="text-red-700 font-semibold mb-2">
                This application has NOT been audited by external security experts and may contain vulnerabilities.
              </p>
              <p className="text-red-700">
                <strong>DO NOT use it for sensitive or confidential messages.</strong> This is an experimental client 
                for educational and testing purposes. For production use with sensitive data, please wait for a 
                security audit or use well-established, audited Nostr clients.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-600 mb-2">🔒 End-to-End Encrypted</h3>
                <p className="text-gray-700 text-sm">
                  All messages are encrypted using NIP-17 with minimal metadata exposure. Only you and your 
                  recipient can read the messages.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-600 mb-2">🌐 Truly Decentralized</h3>
                <p className="text-gray-700 text-sm">
                  No single company controls your messages. Connect to multiple relays for redundancy and 
                  censorship resistance.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-600 mb-2">✓ NIP-05 Verification</h3>
                <p className="text-gray-700 text-sm">
                  Use human-readable identifiers like user@domain.com that are verified by domain providers 
                  without giving them control over your messages.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-600 mb-2">📧 Email-like Interface</h3>
                <p className="text-gray-700 text-sm">
                  Familiar inbox/sent structure with subjects, formal message composition, and threading. 
                  Perfect for professional communication.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <p className="text-gray-700 mb-2">
                <strong>1. Authentication:</strong> Log in with your Nostr private key (nsec). Your key never 
                leaves your device.
              </p>
              <p className="text-gray-700 mb-2">
                <strong>2. Encryption:</strong> Messages are encrypted using NIP-17 gift wrapping, which provides 
                strong privacy with minimal metadata.
              </p>
              <p className="text-gray-700 mb-2">
                <strong>3. Distribution:</strong> Encrypted messages are distributed across multiple Nostr relays 
                for redundancy.
              </p>
              <p className="text-gray-700">
                <strong>4. Delivery:</strong> Recipients decrypt messages using their private key. Only the 
                intended recipient can read them.
              </p>
            </div>
          </section>


          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Technology Stack</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Nostr Protocol:</strong> Decentralized social networking protocol</li>
              <li><strong>NIP-17:</strong> Private Direct Messages with gift wrapping (kind 1059)</li>
              <li><strong>NIP-05:</strong> DNS-based verification for human-readable identifiers</li>
              <li><strong>Multi-Relay:</strong> Connected to multiple relays for redundancy and censorship resistance</li>
            </ul>
          </section>


          <section className="border-t border-gray-200 pt-6">
            <p className="text-gray-600 text-sm">
              ZapMail is open source and built on the Nostr protocol. For more information about how email 
              is broken and how Nostr can fix it, read the full article: 
              <a 
                href="https://habla.news/a/naddr1qvzqqqr4gupzppna0k8s3az5vx8l2rkfs80p5e46c52fmz938pvf5zrp0zwwtvz0qqsk2mtpd9kz66tn9438ymmtv4hz6ttrv9hz6mn0wd68yttxd9uz66t5e5vhcr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 ml-1"
              >
                Email is Broken — Can Nostr Fix It?
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
