import React, { useState } from 'react';
import { Copy, Share2, Check, Link as LinkIcon } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useApp } from '../context/AppContext';

interface ReferralLinkCardProps {
  referralCode: string;
}

export const ReferralLinkCard: React.FC<ReferralLinkCardProps> = ({ referralCode }) => {
  const { t } = useApp();
  const { tg, haptic } = useTelegram();
  const [copied, setCopied] = useState(false);

  // FIX: Hardcoded bot username to ensure it updates immediately
  // This bypasses any caching issues with environment variables
  const BOT_USERNAME = 'Earningcryptocurrencybot';
  
  // Construct the deep link
  // Format: https://t.me/Earningcryptocurrencybot?start={code}
  const inviteLink = `https://t.me/${BOT_USERNAME}?start=${referralCode}`;
  
  const shareText = `Join me and earn crypto! Use my code: ${referralCode}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    if (haptic) haptic.selection();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (haptic) haptic.impact('medium');
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(telegramShareUrl);
    } else {
      window.open(telegramShareUrl, '_blank');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#1f2937] border border-white/10 rounded-2xl p-5 shadow-xl relative overflow-hidden group mb-6">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-500/10 p-2.5 rounded-xl">
            <LinkIcon size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">{t('your_code')}</h3>
            <p className="text-gray-400 text-[10px] opacity-80">@{BOT_USERNAME}</p>
          </div>
        </div>

        {/* Read-only Input Field */}
        <div className="relative mb-4 group-hover:scale-[1.01] transition-transform duration-200">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-xs text-gray-300 font-mono outline-none focus:border-blue-500/50 transition-colors truncate text-left dir-ltr"
            dir="ltr"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
             {copied && <span className="text-[10px] text-green-400 font-bold mr-2 animate-fade-in bg-black/50 px-2 py-1 rounded">Copied!</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
              copied 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
            }`}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? t('link_copied') : t('copy_link')}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
            <Share2 size={18} />
            <span>{t('share_link')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
