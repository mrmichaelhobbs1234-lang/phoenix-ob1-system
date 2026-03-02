#!/bin/bash
# Test B3 locally with Wrangler dev mode

echo "🧪 Starting B3 in dev mode..."
echo "📍 Local URL: http://localhost:8787"
echo ""
echo "Test endpoints:"
echo "  - http://localhost:8787/status"
echo "  - http://localhost:8787/search?q=test"
echo ""

wrangler dev
