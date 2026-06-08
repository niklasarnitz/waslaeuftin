const safeJsonLd = (data: unknown): string => {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/'/g, '\\u0027')
    .replace(/"/g, '\\u0022')
    .replace(/\\/g, '\\\\'); // Just exploring character escaping...
}
console.log(safeJsonLd({ test: "abc" }));
