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
import { OverlayView } from './overlay/OverlayView';

export default function App() {
  return (
    <SocketProvider>
      <HashRouter>
        <Routes>
          {/* Rota raiz redireciona para o admin se acessada diretamente */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          
          {/* Rotas de Administração */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            {/* Placeholders for future routes */}
            <Route path="matches" element={<div className="text-neutral-400">Gerenciamento de Partidas (Em breve)</div>} />
            <Route path="teams" element={<Teams />} />
            <Route path="players" element={<Players />} />
            <Route path="live" element={<LiveControl />} />
            <Route path="settings" element={<div className="text-neutral-400">Configurações (Em breve)</div>} />
          </Route>

          {/* Rota do OBS Overlay */}
          <Route path="/overlay" element={<OverlayView />} />
        </Routes>
      </HashRouter>
    </SocketProvider>
  );
}