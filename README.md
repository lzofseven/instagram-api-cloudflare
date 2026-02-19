# 📸 Instagram API & Image Proxy (Cloudflare)

Uma solução completa e gratuita para buscar dados públicos do Instagram, calcular métricas de engajamento e exibir imagens sem bloqueios (CORS/403), tudo rodando no **Cloudflare Pages & Workers**.

## 🚀 URLs Oficiais (Live Demo)

- **API de Dados:** `https://insta-api-lz.pages.dev/api?username=loohansb`
- **Proxy de Imagem:** `https://insta-proxy-lz.pages.dev`

---

## 🔍 Filtros Avançados (Query Params)

Você pode personalizar a resposta da API utilizando os seguintes parâmetros na URL:

### 1. Filtrar por Tipo de Mídia (`type`)
Filtra os posts retornados e recalcula as métricas apenas para esse tipo.
- `&type=image`: Apenas fotos únicas.
- `&type=video`: Apenas vídeos e Reels.
- `&type=sidecar`: Apenas posts de carrossel (múltiplas fotos/vídeos).

**Exemplo:** `https://insta-api-lz.pages.dev/api?username=natanrabelo&type=video`

### 2. Filtrar por Período (`days`)
Filtra os posts dos últimos X dias e mostra o desempenho nesse período.
- `&days=7`: Última semana.
- `&days=30`: Último mês.
- `&days=90`: Último trimestre.

**Exemplo:** `https://insta-api-lz.pages.dev/api?username=natanrabelo&days=30`

---

## 📊 Estrutura do JSON (Métricas Duplas)

A API retorna dois blocos de métricas para comparação:
- **`total_loaded`**: Estatísticas de todo o conteúdo carregado (geralmente os últimos 12-50 posts).
- **`filtered_result`**: Estatísticas aplicando os filtros de `type` e `days` que você escolheu.

```json
{
    "user_info": {
        "username": "natanrabelo",
        "follower_count": 112882,
        "category": "Marketing de Influência",
        "is_business": true
    },
    "metrics": {
        "total_loaded": {
            "likes": 11825,
            "views": 55814,
            "posts": 12,
            "engagement": "1.20%"
        },
        "filtered_result": {
            "likes": 5820,
            "views": 55814,
            "posts": 6,
            "engagement": "1.06%"
        }
    },
    "posts": [
        {
            "type": "GraphVideo",
            "is_video": true,
            "video_url": "https://insta-proxy-lz.pages.dev/?url=...",
            "carousel_media": [],
            "like_count": "curtidas_ocultas",
            "view_count": 1913
        }
    ]
}
```

---

## 🛠️ Funcionalidades Inclusas
- ✅ **Suporte a Carrossel:** O campo `carousel_media` traz todos os itens internos do post.
- ✅ **CORS Liberado:** Use `fetch()` diretamente do seu site sem erros.
- ✅ **Proxy de Imagem:** Todas as URLs de mídia já saem prontas para uso via proxy.
- ✅ **Tratamento de Likes:** Retorna `"curtidas_ocultas"` em vez de `-1`.

## ⚙️ Como Instalar
1. Clone este repositório.
2. Faça o deploy da pasta `/api-pages` no Cloudflare Pages.
3. Faça o deploy da pasta `/proxy-pages` no Cloudflare Pages.
4. Atualize a URL do proxy no arquivo `api.js`.

---
Desenvolvido para **lzofseven**. 🚀
