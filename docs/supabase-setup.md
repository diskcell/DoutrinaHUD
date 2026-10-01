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

## Sessoes ao vivo e GSI online

No SQL Editor, crie uma consulta chamada
`03 - Sessoes ao vivo e GSI online` e execute:

```text
supabase/migrations/202610010003_live_sessions.sql
```

Essa migracao cria sessoes exclusivas com validade de sete dias. O token GSI e
o token de controle sao gerados no navegador; o banco recebe apenas os hashes
SHA-256. O token original nao e gravado no Postgres.

Depois, publique a Edge Function:

```powershell
npx supabase login
npx supabase link --project-ref ckbjuasdwouzveidcidw
npx supabase functions deploy super-api --no-verify-jwt
```

O `--no-verify-jwt` e necessario porque o Counter-Strike envia o token GSI no
corpo JSON e nao consegue enviar um JWT do Supabase. A funcao valida o hash com
a chave privada do ambiente antes de transmitir qualquer dado.

Fluxo para o operador:

1. Entrar no DoutrinaHUD e clicar em `Nova Sessao`.
2. Baixar o CFG exclusivo e coloca-lo na pasta `game/csgo/cfg` do CS2.
3. Copiar o link do overlay para uma fonte de navegador do OBS.
4. Abrir o painel da sessao em outra aba para selecionar times e controlar a HUD.

O CFG usa `throttle 0.20`, limitado a aproximadamente cinco atualizacoes por
segundo, para reduzir o consumo do plano gratuito sem prejudicar a HUD.

## Proximas etapas

1. Publicar e testar a Edge Function GSI.
2. Migrar o fluxo de veto para o Supabase.
3. Criar a Edge Function de importacao HLTV.
4. Importar o SQLite e os uploads locais, se ainda houver dados antigos.

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
