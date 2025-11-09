import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recipe {
  id: string;
  updated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating dynamic sitemap...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all completed recipes
    const { data: recipes, error } = await supabase
      .from('videos')
      .select('id, updated_at')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }

    console.log(`Found ${recipes?.length || 0} completed recipes`);

    // Generate sitemap XML
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

    // Add static pages
    staticPages.forEach(page => {
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
      sitemap += `    <lastmod>${page.lastmod}</lastmod>\n`;
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += '  </url>\n';
    });

    // Add recipe pages
    recipes?.forEach((recipe: Recipe) => {
      const lastmod = new Date(recipe.updated_at).toISOString().split('T')[0];
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}/recipe/${recipe.id}</loc>\n`;
      sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemap += '    <changefreq>weekly</changefreq>\n';
      sitemap += '    <priority>0.9</priority>\n';
      sitemap += '  </url>\n';
    });

    sitemap += '</urlset>';

    console.log('Sitemap generated successfully');

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
