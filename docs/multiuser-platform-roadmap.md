# DoutrinaHUD - Plataforma Multiusuario

## Objetivo

Transformar a DoutrinaHUD em uma plataforma online onde cada operador possui uma conta, um espaco de trabalho privado e sessoes de transmissao isoladas. Cada usuario podera cadastrar times e jogadores, importar elencos pelo link da HLTV, gerar a CFG do CS2 e controlar suas proprias overlays sem misturar dados com outros usuarios.

## O que ja esta pronto

### Servidor online e sessoes

- Aplicacao publicada no Railway em `https://doutrinahud-production.up.railway.app`.
- Sessao online criada pelo Dashboard, com ID e token aleatorios.
- Overlay e painel de controle com URL vinculada a uma sessao.
- Endpoint GSI remoto protegido por token.
- Botao para baixar uma `gamestate_integration_doutrinahud.cfg` pronta para enviar o CS2 diretamente ao Railway, sem exigir projeto local ou connector.
- Ultima sessao criada fica salva no navegador do operador.
- Connector local mantido como alternativa para quem preferir a CFG apontando para `127.0.0.1`.

### HUD e dados esportivos

- Cadastro manual de times e jogadores.
- Importacao de elenco por URL de time HLTV, com tentativa de obter fotos e perfis dos jogadores.
- Fotos importadas e uploads sao cacheados pelo servidor, evitando depender da URL externa na overlay.
- Modelos de overlay Professional e Broadcast Arena.

### Persistencia no Railway

- Volume Railway criado e montado em `/app/database`.
- O projeto foi ajustado localmente para guardar o SQLite, logos e fotos no mesmo Volume.
- Isso evita perder registros e imagens em deploys ou reinicios, assim que a alteracao for publicada.

## Em andamento

### Contas e workspaces

Foi iniciada a base de autenticacao no SQLite:

- Tabela `users` para contas.
- Tabela `workspaces` para separar os dados de cada operador.
- Tabela `auth_sessions` para sessoes de login com expiracao.
- Cadastro cria automaticamente um primeiro workspace para o usuario.
- Login usa cookie `HttpOnly`, evitando expor a sessao ao JavaScript do navegador.

Esta base ainda nao foi publicada no Railway porque a separacao dos dados precisa ser concluida antes.

## Proximas implementacoes

### 1. Isolamento de dados por workspace

- Adicionar `workspace_id` aos times e jogadores existentes.
- Migrar os dados atuais para um workspace legado, sem apagar registros existentes.
- Alterar as rotas de times e jogadores para listar, criar, editar e excluir somente dados do workspace autenticado.
- Validar que um jogador so possa ser ligado a um time do mesmo workspace.
- Fazer a importacao HLTV consultar e atualizar somente o time do workspace do usuario logado.

### 2. Interface de conta

- Criar telas de criar conta e entrar.
- Exibir nome do usuario e workspace ativo no painel.
- Adicionar sair da conta.
- Bloquear Dashboard, Times, Jogadores, Live Control e Overlays quando nao houver login.
- Manter a overlay publica sem exigir login, pois ela sera usada pelo OBS e espectadores.

### 3. Sessoes online privadas

- Vincular cada sessao GSI ao workspace que a criou.
- Permitir que apenas o dono veja as sessoes no Dashboard.
- Separar token de GSI e chave de controle do painel.
- Manter a URL da overlay como leitura publica, mas proteger comandos do Live Control.
- Persistir metadados das sessoes no SQLite e definir limpeza de sessoes antigas.

### 4. Modelos, partidas e veto

- Vincular partidas, estados de live, modelos ativos e vetos ao workspace.
- Garantir que a escolha de overlay de um usuario nao altere a transmissao de outro.
- Revisar eventos Socket.IO para restringir comandos ao workspace e a chave de controle correta.

### 5. Fotos e importacao HLTV

- Continuar salvando a copia local da foto no Volume.
- Adicionar acao de atualizar elenco e fotos de um time ja importado.
- Mostrar erros claros quando a HLTV responder `403`, `429` ou nao fornecer imagem.
- Preservar cadastro manual e upload como alternativa quando a HLTV bloquear a importacao.
- Avaliar uma fonte de dados licenciada caso o uso comercial exija maior estabilidade e permissao explicita para imagens.

### 6. Operacao e seguranca

- Configurar backups do Volume no Railway.
- Adicionar limite de tentativas de login e importacao.
- Registrar erros sem gravar tokens ou senhas nos logs.
- Criar variaveis de ambiente para configuracoes sensiveis.
- Testar cadastro, login, isolamento de dois usuarios, GSI remoto, overlay e importacao HLTV antes de publicar.

## Ordem de entrega

1. Finalizar autenticacao e workspaces.
2. Isolar times, jogadores e importacao HLTV.
3. Proteger e vincular sessoes online.
4. Integrar telas de login e conta.
5. Validar tudo localmente e publicar no GitHub/Railway.

## Observacoes importantes

- O token da CFG permite ao CS2 enviar dados para uma sessao. Ele nao deve ser compartilhado.
- O link do painel de controle deve permanecer privado. O link da overlay pode ser usado no OBS.
- A importacao da HLTV depende da disponibilidade do site e pode ser bloqueada ou alterada sem aviso.
- O Volume Railway ja criado e requisito para manter dados e fotos entre deploys.
