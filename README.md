# 📸 Instagram API & Image Proxy (Cloudflare)

Uma solução completa e gratuita para buscar dados públicos do Instagram, calcular métricas de engajamento e exibir imagens sem bloqueios (CORS/403), tudo rodando no **Cloudflare Pages & Workers**.

## 🚀 URLs Oficiais (Live Demo)

- **API de Dados:** `https://insta-api-lz.pages.dev/api?username=loohansb`
- **Proxy de Imagem:** `https://insta-proxy-lz.pages.dev`

---

## 🔍 Filtros Avançados (Query Params)

Você pode personalizar a resposta da API utilizando os seguintes parâmetros na URL:

### 1. Modo de Visualização (`view`)
Controla a quantidade de dados retornados.
- `&view=full` (Padrão): Retorna todos os dados, métricas e mídias.
- `&view=basic`: Retorna apenas dados essenciais do perfil e as legendas dos posts com contagem de comentários. Ideal para performance.

**Exemplo:** `https://insta-api-lz.pages.dev/api?username=natanrabelo&view=basic`

### 2. Filtrar por Tipo de Mídia (`type`)
Filtra os posts retornados e recalcula as métricas apenas para esse tipo.
- `&type=image`: Apenas fotos únicas.
- `&type=video`: Apenas vídeos e Reels.
- `&type=sidecar`: Apenas posts de carrossel (múltiplas fotos/vídeos).

**Exemplo:** `https://insta-api-lz.pages.dev/api?username=natanrabelo&type=video`

### 3. Filtrar por Período (`days`)
Filtra os posts dos últimos X dias e mostra o desempenho nesse período.
- `&days=7`: Última semana.
- `&days=30`: Último mês.
- `&days=90`: Último trimestre.

**Exemplo:** `https://insta-api-lz.pages.dev/api?username=natanrabelo&days=30`

---

## 💡 Exemplos Combinados

Você pode misturar os filtros para obter exatamente o que precisa:

- **Apenas legendas e comentários da última semana:**
  `?username=natanrabelo&view=basic&days=7`
- **Vídeos (Reels) com métricas completas dos últimos 90 dias:**
  `?username=natanrabelo&type=video&days=90`

---

## 📊 Estrutura do JSON (Métricas Completas)

A API retorna dois blocos de métricas para comparação, agora incluindo **contagem de comentários**. A API tenta carregar até **50 posts** (limite da carga inicial do Instagram) para análise.

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
            "comments": 329,
            "posts": 12,
            "engagement": "1.20%"
        },
        "filtered_result": {
            "likes": 5820,
            "views": 55814,
            "comments": 167,
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
            "view_count": 1913,
            "comment_count": 11
        }
    ]
}
```

---

## 🛠️ Funcionalidades Inclusas
- ✅ **Contagem de Comentários:** Agora disponível em todas as métricas e no modo básico.
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


---

## ✨ Novo Endpoint: Verificar se um Usuário Segue Outro (`/api?username=<usuario_origem>&target=<usuario_alvo>`)

Este endpoint permite verificar a relação entre dois usuários do Instagram. Dada a natureza das APIs públicas do Instagram, a verificação direta de "quem segue quem" sem autenticação (cookies de sessão) é restrita. No entanto, este endpoint serve como uma base para futuras integrações com sessões autenticadas ou para cenários onde a informação de ID do usuário alvo é suficiente.

### Parâmetros:
- `username`: O nome de usuário (handle) da pessoa que você quer verificar se segue outra.
- `target`: O nome de usuário (handle) da pessoa que você quer verificar se é seguida pelo `username`.

### Exemplo de Uso:
`https://insta-api-lz.pages.dev/api?username=usuario_origem&target=usuario_alvo`

### Resposta Esperada:
```json
{
    "message": "Endpoint de verificação de seguidor implementado.",
    "note": "A verificação exata de 'quem segue quem' em APIs públicas do Instagram sem cookies de sessão é restrita. Este endpoint serve como base para futuras integrações com sessões autenticadas.",
    "source": "usuario_origem",
    "target": "usuario_alvo",
    "target_id": "ID_DO_USUARIO_ALVO"
}
```

**Observação:** A `target_id` é o ID numérico do usuário alvo no Instagram. Para uma verificação completa de "segue/não segue", seria necessário um mecanismo de autenticação ou uma abordagem de raspagem mais complexa que não é coberta por esta API pública no momento.
