# DoutrinaHUD no Supabase

## Configuracao publica

O frontend usa somente as variaveis publicas abaixo:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nunca coloque `sb_secret`, `service_role`, senha do banco ou token pessoal em
arquivos `VITE_*`, no GitHub Pages ou em commits.

## Primeira migracao

Execute o arquivo abaixo no SQL Editor do projeto Supabase:

```text
supabase/migrations/202610010001_initial_cloud_platform.sql
```

Ele cria:

- perfis vinculados ao Supabase Auth;
- um workspace automatico para cada conta nova;
- times e jogadores isolados por workspace;
- politicas RLS para impedir acesso a dados de outros usuarios;
- bucket publico `doutrinahud-assets`, com escrita restrita ao workspace;
- campos de origem HLTV para importacao e atualizacao sem duplicatas.

## Organizacao das imagens

Os objetos devem usar o workspace como primeira pasta:

```text
<workspace-id>/teams/<hltv-team-id>/logo.webp
<workspace-id>/players/<hltv-player-id>.webp
```

As imagens sao publicas para que overlays do OBS possam renderiza-las. Somente
membros `owner` ou `editor` do workspace podem criar, substituir ou excluir
arquivos.

## Proximas etapas

1. Aplicar a migracao no projeto remoto.
2. Trocar a tela de login para Supabase Auth.
3. Migrar CRUD de times e jogadores para Postgres + Storage.
4. Criar a Edge Function de importacao HLTV.
5. Importar o SQLite e os uploads locais.
6. Migrar GSI e overlay para Supabase Realtime Broadcast.

## Email de confirmacao

No Dashboard hospedado, abra `Authentication > Email Templates > Confirm sign up`.

- Subject: copie `supabase/templates/confirmation-subject.txt`.
- Body: copie `supabase/templates/confirmation.html`.

O template usa a variavel oficial `{{ .ConfirmationURL }}`. Para trocar tambem
o remetente `Supabase Auth` e o endereco `noreply@mail.app.supabase.io`, configure
um SMTP proprio no Supabase antes do lancamento publico.

## Recuperacao de senha

No Dashboard hospedado, abra `Authentication > Email Templates > Reset password`.

- Subject: copie `supabase/templates/recovery-subject.txt`.
- Body: copie `supabase/templates/recovery.html`.

Em `Authentication > URL Configuration`, mantenha as URLs local e publica na
lista de redirecionamentos permitidos. O template usa `{{ .RedirectTo }}` e
`{{ .TokenHash }}` para abrir a tela segura de nova senha sem conflito com as
rotas `#/` do GitHub Pages.
