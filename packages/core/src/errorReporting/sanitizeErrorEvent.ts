/** The common wire contract for browser, server and mobile diagnostics. */
interface DiagnosticEvent {
  type?: string;
  event_id?: string;
  timestamp?: number;
  level?: string;
  exception?: {
    values?: {
      type?: string;
      stacktrace?: {
        frames?: {
          filename?: string;
          lineno?: number;
          colno?: number;
          in_app?: boolean;
        }[];
      };
    }[];
  };
}

const ERROR_TYPES = new Set([
  "Error",
  "TypeError",
  "ReferenceError",
  "SyntaxError",
  "RangeError",
  "URIError",
  "EvalError",
  "AggregateError",
  "TRPCError",
  "ZodError",
  "PrismaClientKnownRequestError",
  "PrismaClientUnknownRequestError",
  "PrismaClientInitializationError",
]);

function codeFilename(filename?: string) {
  if (!filename) return undefined;
  const path = filename.split(/[?#]/, 1)[0]?.replaceAll("\\", "/");
  if (!path) return undefined;
  // Only code assets, never arbitrary request paths or local filesystem roots.
  if (
    !/(?:^|\/)(?:src|_next\/static|\.next\/server|node_modules)\//.test(path) &&
    !/(?:^|\/)(?:index(?:\.android|\.ios)?\.bundle|main\.jsbundle)$/.test(path)
  ) {
    return undefined;
  }
  const basename = path.split("/").at(-1);
  return basename &&
    /^[\w.[\]-]+\.(?:[cm]?[jt]sx?|bundle|jsbundle)$/.test(basename)
    ? `app:///${basename}`
    : undefined;
}

/**
 * Rebuild rather than redact: new SDK fields cannot silently start leaking data.
 * Never preserve messages, users, URLs, requests, breadcrumbs, locals or context.
 * Logging/transaction events are not part of the error-reporting contract.
 */
export function sanitizeErrorEvent(
  event: DiagnosticEvent,
  surface: "browser" | "server" | "mobile",
  release?: string,
) {
  if (event.type || !event.exception?.values?.length) return null;

  return {
    type: undefined,
    event_id: /^[a-f\d]{32}$/i.test(event.event_id ?? "")
      ? event.event_id
      : undefined,
    timestamp:
      typeof event.timestamp === "number" && Number.isFinite(event.timestamp)
        ? event.timestamp
        : undefined,
    platform: "javascript",
    level: event.level === "fatal" ? ("fatal" as const) : ("error" as const),
    environment: "production",
    release: release && /^[\w.@+-]{1,100}$/.test(release) ? release : undefined,
    tags: { surface },
    exception: {
      values: event.exception.values.slice(-5).map((exception) => ({
        type: ERROR_TYPES.has(exception.type ?? "") ? exception.type : "Error",
        value: "Error details removed for privacy",
        stacktrace: {
          frames: (exception.stacktrace?.frames ?? [])
            .slice(-30)
            .flatMap((frame) => {
              const filename = codeFilename(frame.filename);
              if (!filename) return [];
              return [
                {
                  filename,
                  lineno:
                    Number.isSafeInteger(frame.lineno) &&
                    (frame.lineno ?? 0) > 0
                      ? frame.lineno
                      : undefined,
                  colno:
                    Number.isSafeInteger(frame.colno) && (frame.colno ?? 0) > 0
                      ? frame.colno
                      : undefined,
                  in_app: frame.in_app === true,
                },
              ];
            }),
        },
      })),
    },
  };
}
