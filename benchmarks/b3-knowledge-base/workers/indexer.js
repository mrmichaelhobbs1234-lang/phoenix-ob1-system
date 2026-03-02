/**
 * B3 KNOWLEDGE BASE INDEXER
 * Indexes 825 Phoenix chat logs into Cloudflare Vectorize
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      if (url.pathname === '/index') {
        return await indexAllLogs(env, corsHeaders);
      }
      
      if (url.pathname === '/search') {
        const query = url.searchParams.get('q') || (await request.json()).query;
        const topK = parseInt(url.searchParams.get('topK') || '5');
        return await searchLogs(query, topK, env, corsHeaders);
      }
      
      if (url.pathname === '/status') {
        return await getIndexStatus(env, corsHeaders);
      }
      
      return new Response('B3 Knowledge Base Indexer\n\nEndpoints:\n- GET /index - Index all files\n- GET /search?q=query - Search\n- GET /status - Index status', { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function indexAllLogs(env, corsHeaders) {
  const startTime = Date.now();
  
  // Fetch file list from phoenix-chat-logs repo
  const response = await fetch(
    'https://api.github.com/repos/mrmichaelhobbs1234-lang/phoenix-chat-logs/contents/CHAT-EXPORTS',
    {
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'Phoenix-B3-Indexer',
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  const files = await response.json();
  const txtFiles = files.filter(f => f.name.endsWith('.txt'));
  
  const indexed = [];
  const errors = [];
  let totalChunks = 0;
  
  // Process files in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < txtFiles.length; i += batchSize) {
    const batch = txtFiles.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (file) => {
      try {
        // Download file content
        const contentResponse = await fetch(file.download_url);
        if (!contentResponse.ok) {
          throw new Error(`Download failed: ${contentResponse.status}`);
        }
        
        const content = await contentResponse.text();
        
        // Skip empty files
        if (content.length < 10) {
          return { file: file.name, chunks: 0, skipped: true };
        }
        
        // Chunk into ~1000 char segments with 100 char overlap
        const chunks = chunkText(content, 1000, 100);
        
        // Generate embeddings and store
        const vectors = [];
        for (let j = 0; j < chunks.length; j++) {
          const embedding = await generateEmbedding(chunks[j], env);
          
          vectors.push({
            id: `${file.name}__chunk_${j}`,
            values: embedding,
            metadata: {
              filename: file.name,
              chunk_index: j,
              total_chunks: chunks.length,
              content: chunks[j].substring(0, 500), // Store first 500 chars for preview
              indexed_at: new Date().toISOString()
            }
          });
        }
        
        // Upsert in batches of 100 vectors
        for (let k = 0; k < vectors.length; k += 100) {
          const vectorBatch = vectors.slice(k, k + 100);
          await env.VECTORIZE.upsert(vectorBatch);
        }
        
        totalChunks += chunks.length;
        return { file: file.name, chunks: chunks.length };
      } catch (error) {
        errors.push({ file: file.name, error: error.message });
        return null;
      }
    });
    
    const results = await Promise.all(batchPromises);
    indexed.push(...results.filter(r => r !== null));
    
    // Progress log every batch
    console.log(`Indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(txtFiles.length / batchSize)}`);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  return new Response(JSON.stringify({
    status: 'complete',
    duration_seconds: duration,
    files_processed: indexed.length,
    files_found: txtFiles.length,
    total_chunks: totalChunks,
    errors: errors.length > 0 ? errors : undefined,
    indexed
  }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function searchLogs(query, topK, env, corsHeaders) {
  if (!query) {
    throw new Error('Query parameter required');
  }
  
  // Generate embedding for query
  const embedding = await generateEmbedding(query, env);
  
  // Search vector database
  const results = await env.VECTORIZE.query(embedding, {
    topK: topK,
    returnMetadata: true
  });
  
  return new Response(JSON.stringify({
    query,
    results: results.matches.map(m => ({
      filename: m.metadata.filename,
      chunk_index: m.metadata.chunk_index,
      similarity: m.score,
      content: m.metadata.content,
      indexed_at: m.metadata.indexed_at
    }))
  }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getIndexStatus(env, corsHeaders) {
  // Note: Vectorize doesn't have a count() method yet
  // Return metadata about the index
  return new Response(JSON.stringify({
    index_name: 'phoenix-knowledge-base',
    dimensions: 768,
    metric: 'cosine',
    expected_files: 825,
    model: 'baai/bge-base-en-v1.5'
  }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function chunkText(text, chunkSize, overlap) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}

async function generateEmbedding(text, env) {
  // Use Cloudflare AI to generate embeddings
  const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [text]
  });
  
  return response.data[0];
}
