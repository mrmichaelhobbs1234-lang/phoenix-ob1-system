#!/bin/bash
set -e

echo "🚀 Deploying B3 Knowledge Base Indexer..."

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Install: npm install -g wrangler"
    exit 1
fi

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set. Add to wrangler.toml secrets:"
    echo "   wrangler secret put GITHUB_TOKEN"
fi

echo "📦 Creating Vectorize index..."
wrangler vectorize create phoenix-knowledge-base \
  --dimensions=768 \
  --metric=cosine || echo "Index already exists, skipping..."

echo "🚀 Deploying worker..."
wrangler deploy

echo ""
echo "✅ B3 deployed!"
echo ""
echo "📍 Next steps:"
echo "   1. Add GitHub token: wrangler secret put GITHUB_TOKEN"
echo "   2. Trigger indexing: curl https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev/index"
echo "   3. Test search: curl 'https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev/search?q=Magic+Chat'"
echo ""
