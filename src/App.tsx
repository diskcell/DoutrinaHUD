/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AdminLayout } from './frontend/components/AdminLayout';
import { Dashboard } from './frontend/pages/Dashboard';
import { Teams } from './frontend/pages/Teams';
import { Players } from './frontend/pages/Players';
import { LiveControl } from './frontend/pages/LiveControl';
import { Overlays } from './frontend/pages/Overlays';
import { Settings } from './frontend/pages/Settings';
import { CaptainVetoView } from './frontend/pages/CaptainVetoView';
import { OverlayView } from './overlay/OverlayView';
import { VetoOverlayView } from './overlay/VetoOverlayView';
import { AuthGate } from './frontend/pages/AuthGate';

export default function App() {
  return (
    <SocketProvider>
      <HashRouter>
        <Routes>
          {/* Rota raiz redireciona para o admin se acessada diretamente */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          
          {/* Rotas de Administração */}
          <Route path="/admin" element={<AuthGate><AdminLayout /></AuthGate>}>
            <Route index element={<Dashboard />} />
            {/* Placeholders for future routes */}
            <Route path="matches" element={<div className="text-neutral-400">Gerenciamento de Partidas (Em breve)</div>} />
            <Route path="teams" element={<Teams />} />
            <Route path="players" element={<Players />} />
            <Route path="live" element={<LiveControl />} />
            <Route path="overlays" element={<Overlays />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Rotas do Capitão (Veto) */}
          <Route path="/captain-veto/:matchId/:teamToken" element={<CaptainVetoView />} />

          {/* Rotas do OBS Overlay */}
          <Route path="/overlay" element={<OverlayView />} />
          <Route path="/overlay/professional" element={<OverlayView variant="professional" />} />
          <Route path="/overlay/broadcast" element={<OverlayView variant="broadcast" />} />
          <Route path="/veto" element={<VetoOverlayView />} />
        </Routes>
      </HashRouter>
    </SocketProvider>
  );
}
