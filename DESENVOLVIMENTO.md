# Desenvolvimento do Prupru

Guia para quem vai mexer no código. Para usar o app, veja o [README](README.md).

## Sumário

- [Requisitos](#requisitos)
- [Rodar em modo de desenvolvimento](#rodar-em-modo-de-desenvolvimento)
- [Comandos](#comandos)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como funciona por dentro](#como-funciona-por-dentro)
- [Dados, backup e log](#dados-backup-e-log)
- [Adicionar um serviço ao catálogo](#adicionar-um-serviço-ao-catálogo)
- [Trocar o ícone do app](#trocar-o-ícone-do-app)
- [Gerar o instalador](#gerar-o-instalador)
- [Publicar uma versão no GitHub](#publicar-uma-versão-no-github)

---

## Requisitos

- Windows 10 ou 11
- [Node.js](https://nodejs.org/) 22 ou mais novo (com npm)
- Git

## Rodar em modo de desenvolvimento

```bash
git clone https://github.com/nicolasdeves/prupru.git
```
```bash
cd prupru
```
```bash
npm install
```
```bash
npm start
```

Em modo de desenvolvimento o processo aparece como **Electron** no Gerenciador de Tarefas e nas notificações; na
versão instalada aparece como **Prupru**. As duas usam a mesma pasta de dados (`%APPDATA%\Prupru`), então feche
uma antes de abrir a outra.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run build` | Compila o TypeScript para `dist/` e copia a página da barra lateral. |
| `npm start` | Compila e abre o app. |
| `npm run dist` | Gera o instalador em `release/`. |
| `npm run icon` | Gera `assets/icon.png` e `assets/icon.ico` a partir de `assets/icon-source.webp`. |
| `npm run icons:services` | Baixa de novo os ícones dos serviços para `assets/services/`. |

## Estrutura do projeto

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
    ├── accountStore.ts        # leitura e gravação de accounts.json, com backup e novas tentativas
    ├── logger.ts              # registro de erros em prupru.log
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

## Como funciona por dentro

- **Uma janela, várias páginas.** A janela mostra a barra lateral (uma página HTML) e, à direita, uma
  `WebContentsView` por conta carregada. Só a da conta selecionada fica visível.
- **Sessões isoladas.** Cada conta usa a partição `persist:<id>`, com cookies e armazenamento próprios — é isso
  que permite vários logins do mesmo serviço.
- **Navegador "comum".** As páginas se apresentam como o Chrome (user agent), porque o WhatsApp Web e o login do
  Google recusam navegadores que não reconhecem.
- **Links.** Cada serviço declara os domínios que ficam dentro do app (mais os de login do Google, Microsoft e
  Apple); o resto abre no navegador padrão.
- **Contador de não lidas.** Lido do título da página, como "(3) WhatsApp", com um padrão por serviço.
- **Notificações.** O preload das contas envolve a `Notification` da página: o clique abre a conta certa, e com a
  conta silenciada ou o não perturbe ativo a notificação não é exibida.
- **Hibernação.** Fechar a `WebContentsView` libera o processo da página; a sessão continua no disco e a conta é
  recriada ao ser selecionada.
- **Modais.** As páginas dos serviços ficam por cima da barra lateral, então, para abrir um modal, elas são
  escondidas e uma imagem desfocada do serviço aparece no fundo.
- **Barra lateral animada.** Ao recolher ou arrastar a borda, a página do serviço só desliza (sem mudar de
  tamanho) e é redimensionada uma vez no fim — redimensionar a cada quadro faria a página travar.

## Dados, backup e log

| Arquivo | Conteúdo |
|---|---|
| `%APPDATA%\Prupru\accounts.json` | Contas, pastas e preferências. |
| `%APPDATA%\Prupru\accounts.json.bak` | A versão anterior, salva a cada alteração (só se a anterior era legível). |
| `%APPDATA%\Prupru\Partitions\<id>` | Logins e dados de cada conta. |
| `%APPDATA%\Prupru\prupru.log` | Abertura de cada versão, falhas de leitura e erros inesperados (gira em 1 MB). |

Ao abrir, o `accounts.json` é lido com até 10 tentativas (cerca de 2 s), porque um antivírus pode prender o
arquivo por um instante. Se ele não puder ser lido, vale o backup. Se nenhum dos dois puder, o app avisa e fecha
**sem gravar nada** — e nenhuma gravação acontece antes de a leitura dar certo, para uma lista vazia em memória
nunca substituir as contas do usuário.

## Adicionar um serviço ao catálogo

1. Acrescente o id em `PrupruServiceTypeId` (`src/types.d.ts`).
2. Acrescente a entrada em `SERVICE_TYPES` (`src/serviceCatalog.ts`): nome, cor, endereço, domínios que ficam
   dentro do app, padrão do contador no título e se hiberna por padrão.
3. Rode `npm run icons:services` para baixar o ícone (ou coloque `assets/services/<id>.png` à mão).

## Trocar o ícone do app

Substitua `assets/icon-source.webp` (fundo branco ou transparente) e rode `npm run icon`. O script remove o fundo
que encosta nas bordas, recorta e gera o `.png` (256 px) e o `.ico` (16 a 256 px).

## Gerar o instalador

1. Aumente `version` no `package.json` (por exemplo, `1.0.1` → `1.0.2`).
2. Rode:

```bash
npm run dist
```

O instalador sai em `release/Prupru-Setup-<versão>.exe`. Ele não é assinado digitalmente, por isso o Windows
mostra o aviso do SmartScreen na instalação; para tirar o aviso é preciso um certificado de assinatura de código
(ou publicar na Microsoft Store).

## Publicar uma versão no GitHub

1. Gere o instalador (seção acima) e envie o código:

```bash
git add .
```
```bash
git commit -m "Prupru 1.0.2"
```
```bash
git push
```

2. No GitHub: **Releases → Draft a new release**.
3. **Tag:** `v1.0.2` (*Create new tag*). **Título:** `Prupru 1.0.2`. Na descrição, o que mudou para quem usa.
4. Arraste `release/Prupru-Setup-1.0.2.exe` para *Attach binaries* e clique em **Publish release**.

O botão de download do README aponta para `releases/latest`, então passa a oferecer a versão nova sozinho.
