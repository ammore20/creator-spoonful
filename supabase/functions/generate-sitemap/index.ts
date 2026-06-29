import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sitemap.org max is 50,000 URLs per file. We cap well below that.
const MAX_URLS = 5000;

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_URLS).optional(),
});

interface Recipe { video_id: string; updated_at: string; }

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]!));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({ limit: url.searchParams.get('limit') ?? undefined });
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid query', details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const limit = parsed.data.limit ?? MAX_URLS;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the safe public view (already filtered to status='done' and non-empty recipes)
    const { data: recipes, error } = await supabase
      .from('public_videos')
      .select('video_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('sitemap_query_failed', { err: error.message });
      throw error;
    }

    console.log('sitemap_generated', { recipeCount: recipes?.length ?? 0, limit });

    const baseUrl = 'https://recipemaker.in';
    const staticPages = [
      { url: '/', lastmod: '2025-01-09', changefreq: 'daily', priority: '1.0' },
      { url: '/premium', lastmod: '2025-01-09', changefreq: 'monthly', priority: '0.8' },
      { url: '/contact', lastmod: '2025-01-09', changefreq: 'monthly', priority: '0.7' },
      { url: '/terms', lastmod: '2025-01-09', changefreq: 'yearly', priority: '0.5' },
      { url: '/privacy', lastmod: '2025-01-09', changefreq: 'yearly', priority: '0.5' },
      { url: '/refund', lastmod: '2025-01-09', changefreq: 'yearly', priority: '0.5' },
    ];

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of staticPages) {
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
      sitemap += `    <lastmod>${page.lastmod}</lastmod>\n`;
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += '  </url>\n';
    }

    for (const recipe of (recipes ?? []) as Recipe[]) {
      if (!recipe.video_id) continue;
      const lastmod = new Date(recipe.updated_at).toISOString().split('T')[0];
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}/recipe/${escapeXml(recipe.video_id)}</loc>\n`;
      sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemap += '    <changefreq>weekly</changefreq>\n';
      sitemap += '    <priority>0.9</priority>\n';
      sitemap += '  </url>\n';
    }

    sitemap += '</urlset>';

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('sitemap_error', { err: error instanceof Error ? error.message : String(error) });
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
