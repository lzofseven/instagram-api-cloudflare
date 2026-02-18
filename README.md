# Instagram Profile API & Image Proxy (Cloudflare Pages)

Este repositório contém uma solução completa para buscar dados públicos de perfis do Instagram e servir imagens de perfil contornando bloqueios de hotlinking, utilizando **Cloudflare Pages Functions**.

## 🚀 Estrutura do Projeto

- `/api-pages`: Código para deploy no Cloudflare Pages que fornece a API de dados.
- `/proxy-pages`: Código para deploy no Cloudflare Pages que atua como proxy de imagens.
- `/legacy-php`: Versão original em PHP para servidores tradicionais.

## 🛠️ Como fazer o Deploy (Cloudflare Pages)

### 1. Proxy de Imagens
1. Crie um novo projeto no Cloudflare Pages.
2. Faça o upload da pasta `/proxy-pages`.
3. O proxy estará disponível em `https://seu-projeto-proxy.pages.dev/?url=URL_DA_IMAGEM`.

### 2. API de Dados
1. Abra o arquivo `/api-pages/functions/api.js`.
2. Altere a variável `worker_url` para a URL do seu proxy criado no passo anterior.
3. Crie um novo projeto no Cloudflare Pages e faça o upload da pasta `/api-pages`.
4. A API estará disponível em `https://seu-projeto-api.pages.dev/api?username=NOME_DO_USUARIO`.

## 📊 Exemplo de Uso

**Chamada:**
`GET https://insta-api-lz.pages.dev/api?username=loohansb`

**Resposta JSON:**
```json
{
    "username": "loohansb",
    "full_name": "Lohan Santos",
    "biography": "2006 | Lz\nRun More Ads.",
    "profile_pic_url": "https://insta-proxy-lz.pages.dev/?url=https%3A%2F%2F...",
    "follower_count": 2520,
    "following_count": 220,
    "media_count": 9,
    "is_private": false,
    "is_verified": false,
    "user_id": "33484414183",
    "external_url": "http://loohansb1.pages.dev/",
    "_chaining_results": []
}
```

## ⚠️ Notas
- Esta API utiliza endpoints públicos do Instagram.
- O Cloudflare Pages Functions é gratuito e escala automaticamente.
- Recomenda-se o uso moderado para evitar bloqueios de IP por parte do Instagram.
