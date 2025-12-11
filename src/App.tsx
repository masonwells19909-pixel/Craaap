import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { AdsPage } from './pages/AdsPage';
import { MiningPage } from './pages/MiningPage';
import { VIPPage } from './pages/VIPPage';
import { ReferralPage } from './pages/ReferralPage';
import { WithdrawPage } from './pages/WithdrawPage';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<AdsPage />} />
            <Route path="mining" element={<MiningPage />} />
            <Route path="vip" element={<VIPPage />} />
            <Route path="referral" element={<ReferralPage />} />
            <Route path="withdraw" element={<WithdrawPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
