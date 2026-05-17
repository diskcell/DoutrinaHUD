/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AdminLayout } from './frontend/components/AdminLayout';
import { Dashboard } from './frontend/pages/Dashboard';
import { OverlayView } from './overlay/OverlayView';

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota raiz redireciona para o admin se acessada diretamente */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          
          {/* Rotas de Administração */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            {/* Placeholders for future routes */}
            <Route path="matches" element={<div className="text-neutral-400">Gerenciamento de Partidas (Em breve)</div>} />
            <Route path="teams" element={<div className="text-neutral-400">Gerenciamento de Times (Em breve)</div>} />
            <Route path="players" element={<div className="text-neutral-400">Gerenciamento de Jogadores (Em breve)</div>} />
            <Route path="live" element={<div className="text-neutral-400">Controle ao Vivo (Em breve)</div>} />
            <Route path="settings" element={<div className="text-neutral-400">Configurações (Em breve)</div>} />
          </Route>

          {/* Rota do OBS Overlay */}
          <Route path="/overlay" element={<OverlayView />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
