import serialize from "serialize-javascript";

export function safeJsonLd(data: unknown): string {
  return serialize(data, { isJSON: true });
}
