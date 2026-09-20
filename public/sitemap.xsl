<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>ATITTLE — XML Sitemap</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2.5rem 1.25rem;
      background: #fbf6ee;
      color: #211a15;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    .wrap { max-width: 900px; margin-inline: auto; }
    header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .mark {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #16110d;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fbf6ee;
      font-weight: 700;
      font-size: 0.9rem;
      flex-shrink: 0;
    }
    h1 { font-size: 1.35rem; margin: 0; letter-spacing: -0.01em; }
    p.sub { color: #665748; margin: 0.35rem 0 1.75rem; font-size: 0.9rem; }
    .count {
      display: inline-block;
      background: #fbe3d6;
      color: #7f311b;
      border-radius: 9999px;
      padding: 0.2rem 0.7rem;
      font-size: 0.78rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid #e5d9cb;
    }
    thead th {
      text-align: left;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #776553;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e5d9cb;
    }
    tbody td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f4ede4;
      font-size: 0.9rem;
      word-break: break-all;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #fbf6ee; }
    a { color: #a13f22; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    footer { margin-top: 1.5rem; font-size: 0.78rem; color: #a89680; }
    footer a { color: #776553; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="mark">A</div>
      <h1>ATITTLE — XML Sitemap</h1>
    </header>
    <p class="sub">Machine-readable index of indexable pages, read by search engine crawlers. This styled view is for humans.</p>

    <xsl:choose>
      <xsl:when test="sitemap:sitemapindex">
        <span class="count"><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/> sitemap file(s)</span>
        <table>
          <thead><tr><th>Sitemap</th></tr></thead>
          <tbody>
            <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
              <tr><td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td></tr>
            </xsl:for-each>
          </tbody>
        </table>
      </xsl:when>
      <xsl:otherwise>
        <span class="count"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URL(s)</span>
        <table>
          <thead><tr><th>URL</th></tr></thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr><td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td></tr>
            </xsl:for-each>
          </tbody>
        </table>
      </xsl:otherwise>
    </xsl:choose>

    <footer>Generated automatically at build time by <a href="https://atittle.com/">atittle.com</a>. See <a href="/robots.txt">robots.txt</a>.</footer>
  </div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
