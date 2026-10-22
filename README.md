# Prupru

Vários serviços — WhatsApp, Gmail, Outlook, Teams, Notion, Discord, Instagram, ChatGPT, Claude e qualquer
site — em um só aplicativo de desktop para Windows. Cada conta roda isolada, com o seu próprio login, então dá
para ter quatro WhatsApps, dois Gmails e um Teams lado a lado.

Feito com [Electron](https://www.electronjs.org/) e TypeScript.

---

## Sumário

- [Instalação](#instalação)
- [Como usar](#como-usar)
- [Recursos](#recursos)
- [Onde ficam os dados](#onde-ficam-os-dados)
- [Desinstalar](#desinstalar)
- [Problemas comuns](#problemas-comuns)
- [Desenvolvimento](#desenvolvimento)
- [Gerar o instalador](#gerar-o-instalador)
- [Como funciona por dentro](#como-funciona-por-dentro)

---

## Instalação

1. Execute `Prupru-Setup-<versão>.exe` (gerado em `release/`, veja [Gerar o instalador](#gerar-o-instalador)).
2. Se o Windows mostrar **"O Windows protegeu o computador"**, clique em **Mais informações → Executar assim
   mesmo**. O aviso aparece porque o instalador não tem assinatura digital paga; não é vírus.
3. Escolha a pasta (o padrão é `%LOCALAPPDATA%\Programs\Prupru`) e conclua.

O instalador cria atalhos na **área de trabalho** e no **Menu Iniciar**. Para atualizar, basta instalar uma
versão nova por cima: contas e logins continuam.

---

## Como usar

### Adicionar um serviço
**+ Adicionar** (rodapé da barra lateral) → escolha o serviço → dê um nome (opcional) → **Adicionar**.
Faça o login como faria no navegador (no WhatsApp, leia o QR code em *Aparelhos conectados* no celular).

Para um site que não está na lista, escolha **Site personalizado** e informe o endereço (por exemplo
`trello.com`).

### Opções de uma conta (botão ⋮)
Passe o mouse na conta e clique em **⋮**:

| Opção | O que faz |
|---|---|
| Nome | Renomeia a conta. |
| Endereço do site | Só em sites personalizados. |
| Pasta | Move a conta para uma pasta. |
| Hibernar automaticamente | Tira da memória após 15 min sem uso (veja [Hibernação](#hibernação)). |
| Silenciar notificações | Sem avisos nem sons desta conta. |
| Recarregar | Recarrega a página. |
| Hibernar agora / Acordar | Libera a memória na hora, ou carrega de volta. |
| Remover | Desconecta a conta deste computador e apaga os dados dela aqui. |

### Pastas
- **Nova pasta**: ícone de pasta no rodapé.
- **Colocar uma conta na pasta**: arraste a conta até o nome da pasta, ou escolha a pasta no ⋮ da conta.
- **Tirar da pasta**: arraste até a faixa *"Solte aqui para tirar da pasta"*, que aparece no fim da lista
  durante o arraste.
- **Abrir/fechar**: clique no nome da pasta. Fechada, ela mostra a soma das não lidas.
- **Reordenar**: arraste contas e pastas.
- **Renomear/excluir**: ⋮ ao lado do nome da pasta. Excluir a pasta não apaga as contas.

### Barra lateral
- **Recolher/expandir**: último ícone do rodapé. Recolhida, mostra só os ícones (com as iniciais quando há
  duas contas do mesmo serviço).
- **Largura**: arraste a borda direita da barra (de 180 a 380 px). Duplo clique na borda volta ao padrão.

### Rodapé

| Ícone | Função |
|---|---|
| + Adicionar | Adiciona um serviço. |
| Pasta | Cria uma pasta. |
| Sino | Não perturbe. |
| Engrenagem | Configurações (tema e iniciar com o Windows). |
| « / » | Recolhe ou expande a barra. |

---

## Recursos

### Hibernação
Cada serviço aberto é um navegador inteiro na memória (de ~150 MB a ~500 MB). A hibernação descarrega da
memória o serviço que ficou **15 minutos** sem ser usado; ele aparece apagado, com uma lua, e acorda ao
clicar — o login continua salvo.

Enquanto hiberna, o serviço **não recebe notificações**. Por isso o padrão é:
- **Sempre ativos**: WhatsApp, Gmail, Outlook, Teams, Discord.
- **Hibernam**: Notion, Instagram, ChatGPT, Claude e sites personalizados.

Os serviços que hibernam também só carregam quando você clica neles pela primeira vez, o que deixa a abertura
do app mais leve.

### Não perturbe
Sino no rodapé:
- **Pausar agora**: por 1 hora ou até as 8h.
- **Horário programado**: silencia todo dia num período (ex.: das 19:00 às 08:00).

Silencia as notificações e os sons dos serviços que **não estão na tela** — o serviço aberto continua com som,
para não perder uma chamada. Os contadores de não lidas continuam aparecendo.

### Notificações e contadores
- Notificações nativas do Windows; clicar numa delas abre a conta que recebeu a mensagem.
- Contador de não lidas em cada conta, na pasta fechada e como bolinha vermelha no ícone da barra de tarefas.
  Vem do título da página: funciona no WhatsApp, Gmail, Teams, Discord, Instagram, Notion e na maioria dos
  sites; Outlook, ChatGPT e Claude não mostram contagem.

### Bandeja e inicialização
- Fechar a janela deixa o Prupru rodando ao lado do relógio. Para sair de vez: ícone da bandeja → **Sair**.
- **Configurações → Iniciar com o Windows**: abre minimizado na bandeja quando o computador liga.

### Tema
**Configurações → Aparência**: Sistema, Claro ou Escuro. Os serviços que seguem o tema do sistema mudam junto.

### Links
Links de outros sites abrem no seu navegador padrão. Logins com Google, Microsoft ou Apple abrem dentro do app,
para ficarem na sessão da conta.

---

## Onde ficam os dados

| O quê | Onde |
|---|---|
| Programa instalado | `%LOCALAPPDATA%\Programs\Prupru` |
| Contas, pastas, preferências | `%APPDATA%\Prupru\accounts.json` |
| Cópia de segurança (versão anterior) | `%APPDATA%\Prupru\accounts.json.bak` |
| Logins e dados de cada conta | `%APPDATA%\Prupru\Partitions\<id da conta>` |
| Registro de erros | `%APPDATA%\Prupru\prupru.log` |

A cada alteração, a versão anterior do `accounts.json` vira o `accounts.json.bak`. Se o arquivo principal não
puder ser lido ao abrir (por exemplo, preso por um antivírus), o Prupru tenta de novo por alguns segundos e, se
precisar, usa a cópia de segurança. Se nenhum dos dois puder ser lido, ele avisa e fecha **sem gravar nada**, para
nunca substituir as suas contas por uma lista vazia.

Nada sai do seu computador: o Prupru não tem servidor próprio. Cada conta conversa direto com o seu serviço,
como uma aba de navegador.

Para começar do zero: feche o Prupru (bandeja → Sair) e apague `%APPDATA%\Prupru`.

---

## Desinstalar

**Configurações do Windows → Aplicativos → Aplicativos instalados → Prupru → Desinstalar.**

A desinstalação mantém `%APPDATA%\Prupru` (contas e logins), para o caso de reinstalar. Para apagar tudo, remova
essa pasta depois.

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| "O Windows protegeu o computador" ao instalar | **Mais informações → Executar assim mesmo**. O instalador não é assinado digitalmente. |
| Notificação não aparece | Confira em *Configurações do Windows → Sistema → Notificações* se o Prupru está permitido, e se o Não perturbe (do Prupru e do Windows) está desligado. Serviço hibernado não notifica. |
| Um serviço ficou em branco ou travado | ⋮ → **Recarregar**. |
| Login com Google recusado ("navegador não seguro") | Tente entrar com e-mail e senha em vez do botão do Google, ou recarregue e tente de novo. |
| WhatsApp pede QR code de novo | O celular desconectou o aparelho. Leia o QR code outra vez. |
| O app não abre (só aparece na bandeja) | Clique no ícone do pombo ao lado do relógio. |
| "Não foi possível ler as suas contas" | Nada foi apagado. Abra o Prupru de novo em alguns segundos. Se repetir, veja `%APPDATA%\Prupru\prupru.log`. |
| Ícone antigo no atalho | O Windows guarda ícones em cache; reiniciar o computador atualiza. |

---

## Desenvolvimento

Requisitos: **Node.js 22+** e **npm**, no Windows.

```bash
npm install          # instala as dependências
npm start            # compila e abre o app em modo de desenvolvimento
```

Em modo de desenvolvimento o processo aparece como **Electron** no Gerenciador de Tarefas e nas notificações;
na versão instalada aparece como **Prupru**. As duas usam a mesma pasta de dados, então feche uma antes de abrir
a outra.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run build` | Compila o TypeScript para `dist/` e copia a página da barra lateral. |
| `npm start` | Compila e abre o app. |
| `npm run dist` | Gera o instalador em `release/`. |
| `npm run icon` | Gera `assets/icon.png` e `assets/icon.ico` a partir de `assets/icon-source.webp`. |
| `npm run icons:services` | Baixa de novo os ícones dos serviços para `assets/services/`. |

### Estrutura

```
prupru/
├── assets/
│   ├── icon-source.webp       # desenho original do pombo
│   ├── icon.png / icon.ico    # ícones gerados (janela, bandeja, atalho, instalador)
│   └── services/              # ícones de cada serviço do catálogo
├── scripts/
│   ├── buildIcon.cjs          # recorta o fundo do desenho e gera os ícones
│   ├── copyRenderer.mjs       # copia HTML/CSS/ícone para dist/renderer
│   └── fetchServiceIcons.cjs  # baixa os ícones dos serviços
└── src/
    ├── main.ts                # processo principal: janela, contas, hibernação, bandeja, não perturbe
    ├── serviceCatalog.ts      # serviços disponíveis (endereço, domínios, contador, ícone)
    ├── accountStore.ts        # leitura e gravação de accounts.json
    ├── legacyDataMigration.ts # copia os dados de quando o app se chamava "Zap Hub"
    ├── types.d.ts             # tipos compartilhados entre os processos
    ├── preload/
    │   ├── sidebar.ts         # ponte entre a barra lateral e o processo principal
    │   └── account.ts         # notificações das páginas dos serviços
    └── renderer/
        ├── index.html
        ├── styles.css         # paleta cinza, temas claro/escuro, animações
        └── sidebar.ts         # barra lateral, pastas, arrastar, modais
```

### Adicionar um serviço ao catálogo
1. Acrescente o id em `PrupruServiceTypeId` (`src/types.d.ts`).
2. Acrescente a entrada em `SERVICE_TYPES` (`src/serviceCatalog.ts`): nome, cor, endereço, domínios que ficam
   dentro do app, padrão do contador no título e se hiberna por padrão.
3. Rode `npm run icons:services` para baixar o ícone (ou coloque `assets/services/<id>.png` à mão).

### Trocar o ícone do app
Substitua `assets/icon-source.webp` (fundo branco ou transparente) e rode `npm run icon`.

---

## Gerar o instalador

```bash
npm run dist
```

Gera `release/Prupru-Setup-<versão>.exe`. Antes de gerar uma versão nova, aumente `version` no `package.json`.

O instalador não é assinado. Para tirar o aviso do SmartScreen é preciso um certificado de assinatura de código
(ou publicar na Microsoft Store).

---

## Como funciona por dentro

- **Uma janela, várias páginas.** A janela mostra a barra lateral (uma página HTML) e, à direita, uma
  `WebContentsView` por conta carregada. Só a da conta selecionada fica visível.
- **Sessões isoladas.** Cada conta usa a partição `persist:<id>`, com cookies e armazenamento próprios — é isso
  que permite vários logins do mesmo serviço.
- **Navegador "comum".** As páginas se apresentam como o Chrome (user agent), porque o WhatsApp Web e o login do
  Google recusam navegadores que não reconhecem.
- **Contador de não lidas.** Lido do título da página, como "(3) WhatsApp", com um padrão por serviço.
- **Notificações.** O preload das contas envolve a `Notification` da página: o clique abre a conta certa, e com a
  conta silenciada ou o não perturbe ativo a notificação não é exibida.
- **Hibernação.** Fechar a `WebContentsView` libera o processo da página; a sessão continua no disco e a conta é
  recriada ao ser selecionada.
- **Modais.** As páginas dos serviços ficam por cima da barra lateral, então, para abrir um modal, elas são
  escondidas e uma imagem desfocada do serviço aparece no fundo.
