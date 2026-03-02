# B3: Knowledge Base

Vector search system for 825 Phoenix DNA chat logs (7.2M+ lines).

## Architecture

```
phoenix-chat-logs (GitHub)
    ↓ fetch files
B3 Indexer Worker (Cloudflare)
    ↓ generate embeddings
Cloudflare Vectorize
    ↓ semantic search
Magic Chat (B1)
```

## Features

- **825 unique chat logs** from full drive scan
- **Semantic search** via text embeddings
- **Chunked indexing** (1000 char segments)
- **RAG integration** with Magic Chat
- **Citation tracking** back to source files

## Deploy

```bash
cd benchmarks/b3-knowledge-base
./scripts/deploy.sh
```

## Usage

### Index all files
```bash
curl https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev/index
```

### Search
```bash
curl "https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev/search?q=Magic+Chat+DNA"
```

### Query from Magic Chat
```javascript
const response = await fetch('https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: userMessage, topK: 3 })
});
const context = await response.json();
// Inject context into Perplexity prompt
```

## Files Indexed

- 825 `.txt` files from `phoenix-chat-logs/CHAT-EXPORTS`
- Includes: DNA files, vault dumps, batch logs, operation logs, ledgers
- Total size: ~150MB compressed
- Deduplicated: 8 content duplicates removed

## Storage

- **Vectorize Index**: `phoenix-knowledge-base`
- **Dimensions**: 768 (BGE-base-en-v1.5)
- **Metric**: Cosine similarity
- **Estimated vectors**: ~150,000 (825 files × ~180 chunks avg)
