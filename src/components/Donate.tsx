import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Bitcoin } from 'lucide-react';

interface DonateProps {
  onBack: () => void;
}

export const Donate: React.FC<DonateProps> = ({ onBack }) => {
  const [copied, setCopied] = useState<string | null>(null);

  // Bitcoin donation addresses
  const lightningAddress = 'jdm@sbpc.ch';
  const onchainAddress = 'bc1qqraasmw0t30svc99rpdvu8kjp3740t8zy4ydg4';

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="border-b border-gray-200 px-3 lg:px-6 py-3 lg:py-4 flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg lg:text-xl font-semibold text-gray-800">Support ZapMail</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">Support the Future of Email</h1>
            <p className="text-gray-600">
              ZapMail is open source and free to use. Your support helps maintain and improve the project.
            </p>
          </div>

          {/* Lightning Address Section */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 lg:p-6 mb-4 lg:mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-400 p-2 rounded-lg">
                <span className="text-xl lg:text-2xl">⚡</span>
              </div>
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Lightning Network</h2>
                <p className="text-xs lg:text-sm text-gray-600">Instant, low-fee donations</p>
              </div>
            </div>

            <div className="space-y-3 lg:space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-3 lg:p-4 rounded-lg border-2 border-gray-300">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=lightning:${lightningAddress}`}
                    alt="Lightning Address QR Code"
                    className="w-36 h-36 lg:w-48 lg:h-48"
                  />
                </div>
              </div>

              {/* Lightning Address */}
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                  Lightning Address:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="text"
                    value={lightningAddress}
                    readOnly
                    className="flex-1 px-3 lg:px-4 py-2 border border-gray-300 rounded-lg bg-white font-mono text-xs lg:text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(lightningAddress, 'lightning')}
                    className="px-3 lg:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center space-x-2 flex-shrink-0 text-sm"
                  >
                    {copied === 'lightning' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* On-chain Bitcoin Section */}
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 lg:p-6 mb-4 lg:mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Bitcoin className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Bitcoin On-Chain</h2>
              </div>
            </div>

            <div className="space-y-3 lg:space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-3 lg:p-4 rounded-lg border-2 border-gray-300">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${onchainAddress}`}
                    alt="Bitcoin Address QR Code"
                    className="w-36 h-36 lg:w-48 lg:h-48"
                  />
                </div>
              </div>

              {/* Bitcoin Address */}
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
                  Bitcoin Address:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="text"
                    value={onchainAddress}
                    readOnly
                    className="flex-1 px-3 lg:px-4 py-2 border border-gray-300 rounded-lg bg-white font-mono text-xs lg:text-sm break-all"
                  />
                  <button
                    onClick={() => copyToClipboard(onchainAddress, 'onchain')}
                    className="px-3 lg:px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center justify-center space-x-2 flex-shrink-0 text-sm"
                  >
                    {copied === 'onchain' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};