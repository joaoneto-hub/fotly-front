# Fotly — Front (Vite + React)

Landing page + primeira versão do app: login, painel do fotógrafo, página pública e compra com Pix.
O backend fica no projeto **fotly-backend** (Cloud Functions + regras do Firebase).

## Rodando

Precisa do Node.js 20 ou mais novo.

```bash
npm install
cp .env.example .env    # preencha com os dados do seu projeto Firebase
npm run dev             # http://localhost:5173
```

A landing (`/`) abre mesmo sem `.env`. As outras telas mostram um aviso até o Firebase estar configurado.

Para testar com os emuladores, rode `firebase emulators:start` no fotly-backend e coloque `VITE_USE_EMULATORS=true` no `.env`.

## Telas

| Rota | O que é |
|---|---|
| `/` | Landing page |
| `/entrar` | Login com Google |
| `/painel` | Visão geral: métricas, gráfico, primeiros passos (ou criação do perfil no primeiro acesso) |
| `/painel/albuns` | Todos os álbuns, com busca e filtro por status |
| `/painel/album/:id` | Upload com fila e progresso, preço, publicar e copiar link |
| `/painel/vendas` | Pedidos com busca, filtro e totais |
| `/painel/pagina` | Personalização da página de venda com prévia ao vivo |
| `/painel/configuracoes` | Nome, Google Drive e conta |
| `/:slug` | Página pública do fotógrafo |
| `/:slug/:albumId` | Álbum público: o cliente seleciona e compra |
| `/pedido/:id?t=...` | QR do Pix, espera a confirmação e mostra os downloads |

## Estrutura

```
src/
  App.jsx               landing + carregamento sob demanda do app
  AppRoutes.jsx         rotas do app
  context/AuthContext   usuário logado e perfil em tempo real
  lib/                  integração com Firebase, Drive e checkout (mesma pasta web/ do backend)
  app/                  componentes do app (shell, modal, toast, campos, prévia, tema público)
  pages/                telas públicas e do álbum
  pages/painel/         uma tela por item do menu do painel
  components/           seções da landing
  index.css             tokens e estilos da landing
  app.css               estilos do app
```

## Personalização da página

Fica em `photographers/{uid}.page` no Firestore (ver `src/lib/page.js`): tema claro/escuro, cor de destaque,
tipografia, tamanho das fotos, chamada, recado nos álbuns, texto do botão, preços visíveis e contatos
(WhatsApp, Instagram, e-mail). A foto de perfil e a capa vão para o Storage em `branding/{uid}/`.
As regras do backend validam cada campo, então publique-as junto: `firebase deploy --only firestore:rules,storage`.

## Fluxo para testar de ponta a ponta

1. `/entrar` → login com Google.
2. Crie o perfil (nome + endereço).
3. **Conectar Drive** → autorize no popup. A pasta *Fotly* aparece no seu Drive.
4. **Novo álbum** → tipo *Público*, defina o preço.
5. Arraste algumas fotos. Os originais vão para o Drive, as prévias com marca d'água aparecem na grade.
6. **Publicar** → **Abrir página**.
7. Em outra janela anônima, selecione fotos, informe um e-mail e gere o Pix.
8. Pague com o Pix de teste do Mercado Pago. A página do pedido mostra os downloads quando o webhook confirmar.

## Publicando no Firebase Hosting

As rotas são do lado do cliente, então todas precisam cair no `index.html`. No `firebase.json` do backend, adicione:

```json
"hosting": {
  "public": "../fotly/dist",
  "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
  "rewrites": [{ "source": "**", "destination": "/index.html" }]
}
```

Depois: `npm run build` aqui e `firebase deploy --only hosting` no backend.
Lembre de adicionar o domínio final nas **Origens JavaScript autorizadas** do client OAuth e em **Authentication › Domínios autorizados**.

## Ainda não implementado

- Galeria privada com senha (o álbum privado já fica oculto ao público)
- Editar preço de um item específico, excluir itens, capa do álbum
- Visualização ampliada das fotos (lightbox)
