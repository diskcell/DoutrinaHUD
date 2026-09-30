# DoutrinaHUD — Contexto para o Codex

## Uso rápido no Windows

Requisitos:

- Node.js 22 ou mais recente
- Counter-Strike 2 e OBS, quando usados na transmissão

Na pasta do projeto, instale as dependências e inicie o servidor:

```powershell
npm install
npm run dev
```

O servidor usa a porta `3000`. Endereços principais:

- Painel: `http://127.0.0.1:3000/#/admin`
- Overlay ativa: `http://127.0.0.1:3000/#/overlay`
- Overlay Professional: `http://127.0.0.1:3000/#/overlay/professional`
- Overlay Broadcast: `http://127.0.0.1:3000/#/overlay/broadcast`
- Veto: `http://127.0.0.1:3000/#/veto`

No OBS, use uma Fonte de Navegador com resolução `1920x1080` e uma das URLs de overlay.

Copie `gamestate_integration_doutrinahud.cfg` para a pasta `game/csgo/cfg` da instalação do CS2. O arquivo envia o GSI localmente para `http://127.0.0.1:3000/gsi`. Reinicie o CS2 depois de copiar ou alterar a CFG.

### Acesso temporário com ngrok

Com o servidor local aberto, execute em outro terminal:

```powershell
ngrok http 3000
```

Use a URL HTTPS gerada pelo ngrok seguida de `/#/overlay`. O CS2 no mesmo computador deve continuar usando o endpoint local `127.0.0.1`, sem expor a CFG ou tokens pela internet.

### Validação antes de publicar

```powershell
npm run lint
npm run build
npm audit
```

## Projeto

DoutrinaHUD é uma HUD/overlay profissional para transmissões de CS2.

O projeto usa:
- React + TypeScript no frontend
- Vite
- Node/Express no backend
- Socket.io para comunicação em tempo real
- CS2 Game State Integration no endpoint `/gsi`
- SQLite/better-sqlite3 para dados locais
- ngrok para expor localmente quando necessário

Rotas principais:
- `/#/overlay` — overlay principal da partida
- `/#/veto` — overlay de veto de mapas
- `/#/captain-veto/:matchId/:teamToken` — tela dos capitães
- `/#/admin/live` — painel de controle da live

## Regras importantes

Nunca quebrar:
- GSI
- Socket.io
- LiveControl
- overlay principal
- radar
- player panels
- economy panels
- bomb HUD
- clutch HUD
- MVP/round end HUD
- veto system
- Steam avatar fallback
- GitHub Pages/ngrok workflow

Não mexer em `server.ts` sem necessidade clara.

Sempre fazer mudanças pequenas, focadas e seguras.

Quando alterar lógica complexa, explicar quais arquivos foram alterados.

## GSI

O CS2 envia dados para:

`http://127.0.0.1:3000/gsi`

A CFG precisa conter dados de:
- map
- round
- player
- allplayers
- phase_countdowns
- bomb
- grenades/allgrenades

## Radar

O radar usa:
- `worldToRadar`
- configs por mapa
- `RadarMinimap.tsx`
- `RadarPlayerIcon.tsx`
- `RadarBombIcon.tsx`
- `RadarGrenadeLayer.tsx`
- `RadarGrenadeIcon.tsx`

Não criar outro sistema de coordenadas.
Sempre usar `worldToRadar`.

## Sistema de granadas

Arquivos principais:
- `src/frontend/lib/gsi/parseGrenades.ts`
- `src/frontend/lib/gsi/grenadeTracker.ts`
- `src/frontend/components/overlay/RadarGrenadeLayer.tsx`
- `src/frontend/components/overlay/RadarGrenadeIcon.tsx`
- `src/frontend/components/overlay/RadarMinimap.tsx`

Objetivo:
- granadas voando devem mostrar ícone + trajetória
- smoke deve virar círculo/fumaça no radar quando ativada
- molotov deve virar fogo no radar somente quando explodir/ativar
- HE deve fazer pequena explosão e sumir rápido
- flash deve piscar/estourar e sumir rápido
- decoy deve pulsar por tempo limitado
- nenhuma utilitária pode ficar infinita no radar

Tempos aproximados CS2:
- Smoke: 20s
- Molotov/incendiary: 7s
- Decoy: 15s
- HE: explosão rápida, menos de 1s
- Flash: efeito visual rápido no radar, menos de 1s

Problemas conhecidos recentes:
- HE e flash estavam explodindo perto do jogador antes de seguir trajetória
- Molotov estava virando fogo enquanto ainda estava voando
- Molotov/flash/HE às vezes ficavam presas infinitamente no radar em demo/replay

Regra correta:
- enquanto a granada existe no GSI e está se movendo, renderizar como projétil
- quando sumir do GSI ou estado indicar explosão/ativação, renderizar efeito final
- efeitos finais devem ter duração limitada e depois sumir
- limpar granadas ao trocar round/freezetime/warmup/gameover
- em demo/replay, bloquear IDs/efeitos antigos para não recriar utilitárias infinitas

## Veto de mapas

O sistema de veto já existe.

Formato ativo:
- BO1 / MD1
- BO3 / MD3

Map pool ativo:
- Ancient
- Anubis
- Dust2
- Inferno
- Mirage
- Nuke
- Overpass

BO3:
1. Time da esquerda bane
2. Time da direita bane
3. Time da esquerda escolhe mapa 1
4. Time da esquerda escolhe lado CT/TR
5. Time da direita escolhe mapa 2
6. Time da direita escolhe lado CT/TR
7. Time da esquerda bane
8. Time da direita bane
9. mapa restante é decider

Regra importante:
Quem escolhe o mapa também escolhe o lado.

## Steam avatar fallback

O projeto tem fallback de avatar da Steam.

Prioridade:
1. foto cadastrada manualmente no DoutrinaHUD
2. avatar Steam via backend
3. placeholder

Nunca sobrescrever foto cadastrada com avatar Steam.

`STEAM_API_KEY` fica no `.env`, nunca no frontend.

## Estilo visual

A HUD deve parecer transmissão profissional de CS2:
- visual escuro
- limpo
- compacto
- sem poluição
- sem elementos gigantes no meio da gameplay
- CT azul/ciano
- TR amarelo/laranja

Textos visíveis devem ficar em português do Brasil.
