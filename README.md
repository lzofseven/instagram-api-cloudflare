# 📸 Instagram API & Image Proxy (Cloudflare)

Uma solução completa e gratuita para buscar dados públicos do Instagram, calcular métricas de engajamento e exibir imagens sem bloqueios (CORS/403), tudo rodando no **Cloudflare Pages & Workers**.

## 🚀 URLs Oficiais (Live Demo)

- **API de Dados:** `https://insta-api-lz.pages.dev/api?username=loohansb`
- **Proxy de Imagem:** `https://insta-proxy-lz.pages.dev`

---

## 📊 Exemplo de Resposta JSON Completa

A API retorna um objeto completo com dados do perfil, métricas de engajamento calculadas em tempo real, posts recentes e sugestões para stories.

```json
{
    "username": "cristiano",
    "full_name": "Cristiano Ronaldo",
    "biography": "Página oficial do Cristiano Ronaldo",
    "profile_pic_url": "https://insta-proxy-lz.pages.dev/?url=https%3A%2F%2Fscontent...",
    "follower_count": 671851326,
    "following_count": 627,
    "media_count": 4012,
    "is_private": false,
    "is_verified": true,
    "user_id": "173560420",
    "external_url": "https://...",
    "metrics": {
        "total_likes_recent": 57341815,
        "total_views_recent": 22544044,
        "average_likes": "4778484.58",
        "engagement_rate": "0.72%",
        "posts_analyzed": 12
    },
    "posts": [
        {
            "post": {
                "image_url": "https://insta-proxy-lz.pages.dev/?url=...",
                "video_url": "https://insta-proxy-lz.pages.dev/?url=...",
                "like_count": 3797426,
                "view_count": 16962755,
                "comment_count": 35164,
                "taken_at": 1771098506,
                "caption": "Another step forward. Let’s keep going. 💪"
            }
        }
    ],
    "_chaining_results": [
        {
            "username": "leomessi",
            "full_name": "Leo Messi",
            "profile_pic_url": "https://insta-proxy-lz.pages.dev/?url=..."
        }
    ]
}
```

---

## 🛠️ Estrutura do Repositório

- **`/api-pages`**: Código para Cloudflare Pages Functions (API de dados + Métricas).
- **`/proxy-pages`**: Middleware para Cloudflare Pages (Proxy de imagens/CORS).
- **`/legacy-php`**: Versão original em PHP para servidores tradicionais.

## ⚙️ Como Instalar

### 1. Cloudflare Pages (API)
1. Crie um novo projeto no Cloudflare Pages.
2. Faça o upload da pasta `api-pages`.
3. Sua API estará disponível em `https://seu-projeto.pages.dev/api?username=NOME`.

### 2. Cloudflare Pages (Proxy)
1. Crie outro projeto no Cloudflare Pages.
2. Faça o upload da pasta `proxy-pages`.
3. Atualize a variável `worker_url` no arquivo `api.js` da sua API com a URL deste proxy.

## 🔓 Solução de CORS
A API já vem configurada com headers `Access-Control-Allow-Origin: *` e suporte a requisições `OPTIONS` (preflight), permitindo que você faça chamadas `fetch()` diretamente do seu front-end sem erros.

---
Desenvolvido para **lzofseven**. 🚀
