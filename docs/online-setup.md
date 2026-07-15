# DoutrinaHUD Online

## O que fica online

O servidor online hospeda o painel, a API e o Socket.IO. O CS2 pode enviar o GSI diretamente para a sessao online, sem instalar o projeto localmente.

```
CS2 -> servidor DoutrinaHUD -> painel e overlay
```

O Connector local continua disponivel somente como alternativa para operadores que preferirem manter a CFG apontando para `127.0.0.1`.

## Publicar o servidor

1. Envie este projeto para o GitHub.
2. No Railway, crie um projeto a partir do repositorio.
3. O `Dockerfile` configura a compilacao e inicia o servidor automaticamente.
4. Defina `NODE_ENV=production` nas variaveis do servico.
5. Crie um Volume do Railway montado em `/app/database` para manter os dados SQLite entre reinicios.
6. Crie outro Volume montado em `/app/public/uploads` para preservar logos e fotos enviadas ou importadas.
7. Gere um dominio publico do Railway, por exemplo `https://doutrinahud-production.up.railway.app`.

Abra esse dominio e use o painel remoto. GitHub Pages pode continuar como demonstracao visual, mas nao executa a API, Socket.IO ou banco de dados.

## Criar uma sessao

1. No painel remoto, abra `Dashboard`.
2. Em `Sessao Online`, clique em `Nova Sessao`.
3. Guarde o ID e o token exibidos. O token e privado e deve ficar apenas com o operador do CS2.
4. Abra o link `Overlay publico` no OBS ou envie-o para quem vai assistir.
5. Use o link `Painel da sessao` para controlar somente essa partida.

As sessoes atuais sao temporarias e permanecem disponiveis enquanto o servidor online estiver ligado.

## Configurar o CS2 sem projeto local

No painel, depois de criar a sessao, clique em `Baixar CFG do CS2`. O arquivo ja contem o endereco HTTPS, ID e token privados da sessao.

1. Copie o arquivo baixado para `game/csgo/cfg` na instalacao do Counter-Strike 2.
2. Confirme que o nome e `gamestate_integration_doutrinahud.cfg`.
3. Inicie ou reinicie o CS2 e abra o link da overlay no OBS.

Esse e o fluxo indicado para qualquer pessoa que nao tenha o projeto DoutrinaHUD instalado. Nao compartilhe o arquivo CFG, pois ele contem o token que autoriza o envio dos dados da partida.

## Rodar o Connector (alternativa)

No computador que esta executando ou observando o CS2, dentro da pasta do projeto:

```powershell
npm install
npm run connector -- --remote https://SEU-DOMINIO --session ID_DA_SESSAO --token TOKEN_DA_SESSAO
```

O Connector deve permanecer aberto durante a partida. Ele recebe o GSI em `127.0.0.1:3000` e envia os dados para a sessao criada no painel.

## Configurar o CS2 com Connector

Mantenha o arquivo `gamestate_integration_doutrinahud.cfg` na pasta `game/csgo/cfg` e use a URI local:

```cfg
"uri" "http://127.0.0.1:3000/gsi"
```

Nao e necessario usar ngrok nesse fluxo. O token da sessao e informado ao Connector pelo comando, e nao precisa ficar dentro da CFG do CS2.

## Uso local

Para continuar usando tudo no mesmo computador, inicie normalmente:

```powershell
npm run dev
```

O painel e o overlay continuam usando a sessao `local` e o arquivo GSI atual sem nenhuma alteracao.
