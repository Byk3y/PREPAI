import * as Sentry from "@sentry/deno";

/**
 * Initialize Sentry for Supabase Edge Functions
 * This should be called at the top of each function index.ts
 */
export function initSentry() {
    const dsn = Deno.env.get("SENTRY_DSN");
    const environment = Deno.env.get("SENTRY_ENVIRONMENT") || "production";

    if (!dsn) {
        if (Deno.env.get("DENO_ENV") === "development") {
            console.warn("[Sentry] No SENTRY_DSN found, skipping initialization.");
        }
        return;
    }

    Sentry.init({
        dsn,
        environment,
        // Capture 10% of transactions for performance monitoring in production
        tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    });
}

/**
 * Capture an error and ensure it is sent to Sentry before the function exits
 */
export async function captureException(error: unknown, context?: Record<string, any>) {
    console.error("[Sentry] Capturing exception:", error);

    Sentry.withScope((scope) => {
        if (context) {
            scope.setExtras(context);
        }
        Sentry.captureException(error);
    });

    // Important for serverless: wait for the event to be sent
    await Sentry.flush(2000);
}

/**
 * Set user context in Sentry
 */
export function setUser(userId: string) {
    Sentry.setUser({ id: userId });
}

/**
 * Helper to wrap handlers for automatic error capturing
 * Usage: Deno.serve(withSentry(async (req) => { ... }));
 */
export function withSentry(handler: (req: Request) => Promise<Response>) {
    return async (req: Request): Promise<Response> => {
        // Re-initialize for each request to ensure fresh scope if needed
        // but initSentry is usually called once at global level.
        try {
            return await handler(req);
        } catch (error) {
            await captureException(error, {
                url: req.url,
                method: req.method,
            });

            return new Response(
                JSON.stringify({
                    error: "Internal Server Error",
                    message: error.message || "An unexpected error occurred on the server.",
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }
    };
}
