import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Wallet } from 'lucide-react';

export const WithdrawPage = () => {
  const { profile, t, refreshProfile } = useApp();
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('TRC20');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  if (!profile) return null;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    
    if (val < 1 || val > 25) {
      setMessage({ type: 'error', text: `${t('min_withdraw')} - ${t('max_withdraw')}` });
      return;
    }
    if (profile.balance < val) {
      setMessage({ type: 'error', text: t('insufficient_balance') });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Use secure RPC instead of direct insert/update
      const { error } = await supabase.rpc('request_withdrawal', {
        amount: val,
        wallet_addr: address,
        network_type: network
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Withdrawal requested successfully!' });
      setAmount('');
      setAddress('');
      refreshProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('error');
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-900 to-emerald-900 p-6 rounded-2xl border border-green-500/30 shadow-lg">
        <p className="text-green-200 text-sm">{t('balance')}</p>
        <h2 className="text-3xl font-bold text-white mt-1">${profile.balance.toFixed(5)}</h2>
      </div>

      <form onSubmit={handleWithdraw} className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 block mb-2">{t('wallet_address')} (USDT)</label>
          <input 
            type="text" 
            required
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition-colors"
            placeholder="T..."
          />
        </div>

        <div className="flex gap-2">
          {['TRC20', 'BEP20'].map(net => (
            <button
              key={net}
              type="button"
              onClick={() => setNetwork(net)}
              className={`flex-1 py-2 rounded-lg text-sm border ${network === net ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-transparent border-white/10 text-gray-400'}`}
            >
              {net}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-2">{t('amount')} ($)</label>
          <div className="relative">
            <input 
              type="number" 
              required
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 transition-colors"
              placeholder="1.00"
            />
            <button 
              type="button"
              onClick={() => setAmount(Math.min(profile.balance, 25).toString())}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 font-bold"
            >
              MAX
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-right">{t('min_withdraw')} / {t('max_withdraw')}</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            {message.text}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white shadow-lg shadow-green-900/20 transition-all disabled:opacity-50"
        >
          {loading ? 'Processing...' : t('withdraw_title')}
        </button>
      </form>
    </div>
  );
};
