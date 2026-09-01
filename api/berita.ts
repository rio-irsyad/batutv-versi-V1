import fs from 'fs';
import path from 'path';
import {
  getArticleForServerAsync,
  buildArticleMetadataHtml,
} from '../src/server/articleResolver';

export default async function handler(req: any, res: any) {
  try {
    const slug = (req.query?.slug || req.url?.split('?')[0]?.split('/').pop() || '').toString();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const domainOverride = host ? `${proto}://${host}` : undefined;

    const article = await getArticleForServerAsync(slug, domainOverride);

    // Look for template index.html in dist or root
    const distPath = path.join(process.cwd(), 'dist', 'index.html');
    const rootPath = path.join(process.cwd(), 'index.html');
    let templateHtml = '';

    if (fs.existsSync(distPath)) {
      templateHtml = fs.readFileSync(distPath, 'utf-8');
    } else if (fs.existsSync(rootPath)) {
      templateHtml = fs.readFileSync(rootPath, 'utf-8');
    } else {
      templateHtml = `<!doctype html><html lang="id"><head><!-- BATUTV_DYNAMIC_META_START --><!-- BATUTV_DYNAMIC_META_END --></head><body><div id="root"></div></body></html>`;
    }

    const metaRegex = /<!-- BATUTV_DYNAMIC_META_START -->[\s\S]*?<!-- BATUTV_DYNAMIC_META_END -->/;

    if (article) {
      const dynamicMetaHtml = buildArticleMetadataHtml(article);
      const transformedHtml = templateHtml.replace(metaRegex, dynamicMetaHtml);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).send(transformedHtml);
    } else {
      const notFoundMeta = `<!-- BATUTV_DYNAMIC_META_START -->
    <title>Halaman Tidak Ditemukan (404) | BATUTV</title>
    <meta name="title" content="Halaman Tidak Ditemukan (404) | BATUTV" />
    <meta name="description" content="Halaman atau artikel yang Anda cari tidak dapat ditemukan di Portal Berita BatuTV." />
    <meta name="robots" content="noindex, nofollow" />
    <!-- BATUTV_DYNAMIC_META_END -->`;

      const transformedHtml = templateHtml.replace(metaRegex, notFoundMeta);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(transformedHtml);
    }
  } catch (err) {
    console.error('Error in /api/berita handler:', err);
    return res.status(500).send('Internal Server Error');
  }
}
