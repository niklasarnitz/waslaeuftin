import { renderToString } from 'react-dom/server';

const jsonLd = { test: "</script><script>alert(1)</script>" };

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const html = renderToString(
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
  />
);

console.log(html);
