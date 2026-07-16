# Handoff Codex

## Projeto e servicos

- Projeto local: `D:\DoutrinaHUD\DoutrinaHUD-feature-professional-hud-v2`
- GitHub: `https://github.com/diskcell/DoutrinaHUD.git`
- Branch: `main`
- Railway: `https://doutrinahud-production.up.railway.app`
- GitHub Pages e somente uma demonstracao estatica. Nao possui API, banco, GSI ou Socket.IO.

## Estado publicado

Os commits recentes no `main` sao:

- `66b075b`: download de CFG direta para sessoes online.
- `1090539`: contas, login, workspaces e protecao de times, jogadores e HLTV.
- `7c85ee6`: sair da conta no painel.
- `5912325`: chave privada para comandos do Live Control.

O Railway possui um Volume em `/app/database`. Banco SQLite, uploads manuais e fotos importadas devem persistir nesse Volume. Novos uploads sao salvos em `database/uploads` e expostos em `/uploads`.

## Regras funcionais

- Nao alterar a logica do radar, GSI ou animacoes de granadas sem pedido explicito. Essas areas foram estabilizadas antes da fase multiusuario.
- A overlay e publica para OBS e espectadores.
- O Live Control exige o parametro privado `control` no link da sessao.
- O token da CFG autoriza apenas o envio GSI do CS2 e nao deve ser compartilhado.
- Interfaces administrativas devem usar login e workspace.

## Arquivos importantes

- `backend/auth/authService.ts`: usuarios, senhas com scrypt e sessoes de login.
- `backend/auth/requireAuth.ts`: middleware de autenticacao.
- `backend/routes/auth.ts`: cadastro, login, usuario atual e logout.
- `backend/database/index.ts`: tabelas de usuario/workspace e campos `workspace_id`.
- `backend/routes/teams.ts`, `players.ts`, `hltv.ts`: rotas isoladas por workspace.
- `backend/online/sessionService.ts`: sessoes GSI e tokens.
- `backend/socket/handlers.ts`: controle de comandos Socket.IO.
- `src/frontend/pages/AuthGate.tsx`: pagina de login/cadastro.
- `src/frontend/pages/Dashboard.tsx`: sessoes online, links e CFG.

## Pendencias prioritarias

1. Persistir metadados de sessoes online no SQLite e aplicar expiracao/limpeza.
2. Salvar a ultima sessao no `localStorage` por usuario/workspace, nao globalmente.
3. Confirmar que `upsertFromHltv` sempre filtra por `workspace_id`.
4. Isolar partidas, veto, estado live e modelo de overlay por workspace.
5. Exibir usuario/workspace e permitir gerenciamento de workspace.
6. Testar duas contas para validar isolamento completo.
7. Configurar backups do Volume no Railway.

## Fluxo de trabalho

- Usar `apply_patch` para editar arquivos.
- Rodar `npm.cmd run build` antes de publicar.
- Nao fazer commit ou push sem pedido explicito do usuario.
- Comunicar em portugues e conduzir configuracoes externas uma etapa por vez.
