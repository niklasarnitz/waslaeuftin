import React from 'react';
import { renderToString } from 'react-dom/server';

const jsonLd = { test: "</script><script>alert(1)</script>" };

console.log(renderToString(
  <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
));
