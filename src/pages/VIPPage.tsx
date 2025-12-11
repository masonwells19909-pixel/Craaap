import React from 'react';
import { useApp } from '../context/AppContext';
import { Crown, Check } from 'lucide-react';
import { clsx } from 'clsx';

export const VIPPage = () => {
  const { profile, t } = useApp();
  if (!profile) return null;

  const levels = [
    { level: 1, req: 15000, reward: 0.0005 },
    { level: 2, req: 30000, reward: 0.0008 },
    { level: 3, req: 50000, reward: 0.001 },
  ];

  const currentLevel = profile.vip_level;
  const nextLevel = levels.find(l => l.level > currentLevel);

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="inline-block p-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-[0_0_30px_rgba(192,38,211,0.4)] mb-4">
          <Crown size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">VIP {currentLevel}</h2>
        {nextLevel && (
          <p className="text-sm text-gray-400 mt-2">
            {profile.ads_watched} / {nextLevel.req} {t('ads_count')} {t('next_vip')}
          </p>
        )}
      </div>

      {/* Progress to next level */}
      {nextLevel && (
        <div className="bg-white/5 rounded-full h-4 overflow-hidden border border-white/10">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
            style={{ width: `${Math.min((profile.ads_watched / nextLevel.req) * 100, 100)}%` }}
          ></div>
        </div>
      )}

      <div className="space-y-4 mt-8">
        {levels.map((lvl) => {
          const isUnlocked = currentLevel >= lvl.level;
          const isNext = nextLevel?.level === lvl.level;

          return (
            <div 
              key={lvl.level}
              className={clsx(
                "relative p-4 rounded-xl border transition-all",
                isUnlocked 
                  ? "bg-purple-900/20 border-purple-500/50" 
                  : isNext 
                    ? "bg-white/5 border-white/20" 
                    : "bg-black/20 border-white/5 opacity-50"
              )}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", isUnlocked ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-400")}>
                    {lvl.level}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">VIP {lvl.level}</h3>
                    <p className="text-xs text-gray-400">{lvl.req.toLocaleString()} {t('ads_count')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-purple-400 font-bold">${lvl.reward}</p>
                  <p className="text-[10px] text-gray-500">/ {t('ads_count')}</p>
                </div>
              </div>
              
              {isUnlocked && (
                <div className="absolute top-2 right-2 text-purple-500">
                  <Check size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
