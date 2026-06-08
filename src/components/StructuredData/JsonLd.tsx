import React from 'react';
import serialize from 'serialize-javascript';

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data, { isJSON: true }) }}
    />
  );
}
