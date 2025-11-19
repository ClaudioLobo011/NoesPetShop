# Noe's PetShop - SPA

Projeto em React + Vite para o site do Noe's PetShop.

## Como rodar

1. Certifique-se de ter o **Node.js** instalado (versão 18+ recomendada).
2. No terminal, dentro da pasta do projeto, execute:

   ```bash
   npm install
   npm run dev
   ```

3. O Vite mostrará um endereço (geralmente `http://localhost:5173`). Acesse no navegador.

## Onde alterar o número do WhatsApp

Edite o arquivo:

`src/config/whatsappConfig.js`

Atualize a constante `STORE_WHATSAPP_NUMBER` com o número da loja
no formato internacional, apenas números. Exemplo:

```js
export const STORE_WHATSAPP_NUMBER = '5521999999999'
```

## Estrutura principal

- `src/`
  - `main.jsx` – ponto de entrada React
  - `App.jsx` – layout principal (SPA)
  - `styles.css` – estilos globais
  - `assets/logo.png` – logo do Noe's
  - `config/whatsappConfig.js` – número do WhatsApp
  - `context/CartContext.jsx` – contexto do carrinho
  - `scripts/products.js` – produtos de exemplo
  - `components/` – Header, Footer, Carousel, Produtos, Carrinho, Checkout etc.
  - `pages/Home.jsx` – página principal