import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import type { IncomingMessage, ServerResponse } from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const preferTerser = (() => {
  try {
    require.resolve("terser");
    return true;
  } catch {
    console.warn("⚠️ Terser not found. Falling back to esbuild minifier.");
    return false;
  }
})();

type HealthState = "CONNECTED" | "DEGRADED" | "UNREACHABLE" | "ERROR" | "TIMEOUT";

type HealthPayload = Record<string, unknown>;

interface ServiceHealthTarget {
  name: string;
  label: string;
  url: string;
}

interface ServiceHealthStatus extends ServiceHealthTarget {
  state: HealthState;
  detail?: string;
}

const SERVICE_HEALTH_TARGETS: ServiceHealthTarget[] = [
  { name: "AI Service", label: "AI:5001", url: "http://127.0.0.1:5001/health" },
  { name: "Gateway", label: "Gateway:4000", url: "http://127.0.0.1:4000/health" },
];

const BACKEND_PROXY_TARGET = process.env.VITE_PROXY_TARGET?.trim() || "http://127.0.0.1:5002";
const INTERNAL_HEADER = "x-internal-token";
const INTERNAL_TOKEN = (process.env.AI_INTERNAL_TOKEN ?? "").trim();
let internalTokenWarningLogged = false;

const HEALTHY_STATUS_VALUES = new Set(["ok", "healthy", "up", "ready", "pass", "available"]);

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
};

const normaliseStatus = (value: unknown): string | undefined => {
  return typeof value === "string" ? value.trim().toLowerCase() : undefined;
};

const isPayloadHealthy = (payload: HealthPayload | null) => {
  if (!payload) {
    return false;
  }

  if ((payload as { ok?: unknown }).ok === true) {
    return true;
  }

  const status = normaliseStatus((payload as { status?: unknown }).status);
  if (status && HEALTHY_STATUS_VALUES.has(status)) {
    return true;
  }

  const health = normaliseStatus((payload as { health?: unknown }).health);
  if (health && HEALTHY_STATUS_VALUES.has(health)) {
    return true;
  }

  const overallStatus = normaliseStatus((payload as { overallStatus?: unknown }).overallStatus);
  if (overallStatus && HEALTHY_STATUS_VALUES.has(overallStatus)) {
    return true;
  }

  return false;
};

const summarisePayload = (payload: HealthPayload | null): string | undefined => {
  if (!payload) {
    return undefined;
  }

  const summary: Record<string, unknown> = {};

  const pickString = (key: "status" | "overallStatus" | "service" | "error" | "message" | "state") => {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim() !== "") {
      summary[key] = value;
    }
  };

  pickString("status");
  pickString("overallStatus");
  pickString("service");
  pickString("error");
  pickString("message");
  pickString("state");

  const aiService = toRecord((payload as { aiService?: unknown }).aiService);
  if (aiService) {
    const aiSummary: Record<string, unknown> = {};
    const aiStatus = (aiService as { status?: unknown }).status;
    if (typeof aiStatus === "string" && aiStatus.trim() !== "") {
      aiSummary.status = aiStatus;
    }
    if ("modelsLoaded" in aiService) {
      aiSummary.modelsLoaded = (aiService as { modelsLoaded?: unknown }).modelsLoaded;
    }
    if (Object.keys(aiSummary).length > 0) {
      summary.aiService = aiSummary;
    }
  }

  const memory = toRecord((payload as { memory?: unknown }).memory);
  if (memory) {
    const formatMb = (value: unknown) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return undefined;
      }
      return `${Math.round(((value / 1024 / 1024) + Number.EPSILON) * 100) / 100}MB`;
    };

    const memorySummary: Record<string, string> = {};
    const heapUsed = formatMb((memory as { heapUsed?: unknown }).heapUsed);
    const rss = formatMb((memory as { rss?: unknown }).rss);

    if (heapUsed) {
      memorySummary.heapUsed = heapUsed;
    }
    if (rss) {
      memorySummary.rss = rss;
    }

    if (Object.keys(memorySummary).length > 0) {
      summary.memory = memorySummary;
    }
  }

  const entries = Object.entries(summary).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return undefined;
  }

  const payloadSummary = JSON.stringify(Object.fromEntries(entries));
  if (payloadSummary.length > 200) {
    return `${payloadSummary.slice(0, 197)}…`;
  }
  return payloadSummary;
};

const getInternalToken = () => ({ token: INTERNAL_TOKEN, isFallback: false });

const formatFrontendLog = (message: string, level: "log" | "warn" | "error" = "log") => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}] ⚛️ [Frontend-5000]`;

  switch (level) {
    case "warn":
      console.warn(`${prefix} ${message}`);
      break;
    case "error":
      console.error(`${prefix} ${message}`);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
};

const logFrontend = (message: string) => formatFrontendLog(message, "log");
const warnFrontend = (message: string) => formatFrontendLog(message, "warn");
const errorFrontend = (message: string) => formatFrontendLog(message, "error");

const getTimeoutController = (ms: number) => {
  const anyAbortSignal = AbortSignal as unknown as { timeout?: (timeout: number) => AbortSignal };
  if (typeof anyAbortSignal?.timeout === "function") {
    const signal = anyAbortSignal.timeout(ms);
    return { signal, cancel: () => {} };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (typeof (timer as NodeJS.Timeout).unref === "function") {
    (timer as NodeJS.Timeout).unref();
  }

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
};

const checkServiceHealth = async (service: ServiceHealthTarget): Promise<ServiceHealthStatus> => {
  const controller = getTimeoutController(3000);

  try {
    const response = await fetch(service.url, { signal: controller.signal });
    controller.cancel();

    let payload: HealthPayload | null = null;
    try {
      const raw = (await response.json()) as unknown;
      if (raw && typeof raw === "object") {
        payload = raw as HealthPayload;
      }
    } catch {
      payload = null;
    }

    if (response.ok) {
      if (isPayloadHealthy(payload)) {
        return { ...service, state: "CONNECTED", detail: `HTTP ${response.status}` };
      }
      const reason = summarisePayload(payload) ?? `HTTP ${response.status}`;
      return { ...service, state: "DEGRADED", detail: reason };
    }

    return {
      ...service,
      state: "ERROR",
      detail: `HTTP ${response.status}`,
    };
  } catch (unknownError) {
    controller.cancel();

    const error = unknownError as NodeJS.ErrnoException & { cause?: { code?: string; message?: string } };
    if (error?.name === "AbortError") {
      return { ...service, state: "TIMEOUT", detail: "timeout" };
    }

    const code = error?.code || error?.cause?.code;
    const message = code || error?.cause?.message || error?.message || "unknown error";
    const state: HealthState = code === "ECONNREFUSED" ? "UNREACHABLE" : "ERROR";

    return {
      ...service,
      state,
      detail: message,
    };
  }
};

const describeStatus = (status: ServiceHealthStatus) => {
  const detail = status.detail ? ` (${status.detail})` : "";
  return `${status.label} - ${status.state}${detail}`;
};

const shouldInjectInternalToken = (req: IncomingMessage | undefined) => {
  const hostHeader = req?.headers?.host ?? "";
  if (!hostHeader) {
    return false;
  }
  const normalised = hostHeader.toLowerCase();
  return (
    normalised.includes("localhost") ||
    normalised.startsWith("127.0.0.1") ||
    normalised.startsWith("0.0.0.0")
  );
};

const createServiceProxyConfig = (serviceName: string, target: string) => ({
  target,
  changeOrigin: true,
  secure: false,
  configure: (proxy: any) => {
    proxy.on("proxyReq", (_proxyReq: any) => {
      if (INTERNAL_TOKEN) {
        _proxyReq.setHeader(INTERNAL_HEADER, INTERNAL_TOKEN);
      }
    });
    proxy.on(
      "error",
      (error: NodeJS.ErrnoException & { code?: string; cause?: { code?: string } }, req: IncomingMessage, res?: ServerResponse) => {
        const code = error?.code || error?.cause?.code;
        const reason = code === "ECONNREFUSED" ? "connection refused" : code || error?.message || "unknown error";
        const method = req?.method ?? "GET";
        const url = req?.url ?? "";

        errorFrontend(`🚨 Proxy to ${serviceName} failed (${reason}) → ${method} ${url}`);

        if (!res || res.writableEnded) {
          return;
        }

        if (!res.headersSent) {
          res.writeHead(503, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "X-Proxy-Service": serviceName,
          });
        }

        const payload = JSON.stringify({
          ok: false,
          error: "SERVICE_UNAVAILABLE",
          service: serviceName,
          reason,
          connected: false,
        });

        res.end(payload);
      },
    );

    proxy.on("proxyReq", (proxyReq: any, req: IncomingMessage) => {
      try {
        if (!shouldInjectInternalToken(req)) {
          return;
        }

        const { token, isFallback } = getInternalToken();

        if (!token) {
          if (!internalTokenWarningLogged) {
            warnFrontend("⚠️ Internal token missing; skipping X-Internal-Token injection.");
            internalTokenWarningLogged = true;
          }
          return;
        }

        if (isFallback) {
          if (!internalTokenWarningLogged) {
            warnFrontend("⚠️ Insecure fallback internal token detected; skipping automatic header injection.");
            internalTokenWarningLogged = true;
          }
          return;
        }

        proxyReq.setHeader("X-Internal-Token", token);
        proxyReq.setHeader("X-AI-Internal-Token", token);
      } catch (error) {
        warnFrontend(`⚠️ Failed to attach internal token header: ${(error as Error)?.message ?? error}`);
      }
    });
  },
});
// https://vitejs.org/config/
export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,tsx}",
    }),
    {
      name: "dev-logger",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url?.startsWith("/api/")) {
            logFrontend(`🔄 Proxying API request: ${req.method} ${req.url}`);
          }
          next();
        });

        const statusCache = new Map<string, string>();

        const pollHealth = async () => {
          logFrontend("💓 Vite dev server heartbeat - HMR active");

          const statuses = await Promise.all(SERVICE_HEALTH_TARGETS.map(checkServiceHealth));
          const summary = statuses.map(describeStatus).join(", ");

          const hasError = statuses.some((status) => status.state === "ERROR" || status.state === "UNREACHABLE");
          const hasTimeout = statuses.some((status) => status.state === "TIMEOUT");
          const hasDegraded = statuses.some((status) => status.state === "DEGRADED");
          const logFn = hasError ? errorFrontend : hasTimeout || hasDegraded ? warnFrontend : logFrontend;

          logFn(`🔗 Proxy status: ${summary}`);

          statuses.forEach((status) => {
            const signature = `${status.state}|${status.detail ?? ""}`;
            const previous = statusCache.get(status.name);

            if (previous !== signature) {
              const detail = status.detail ? ` (${status.detail})` : "";
              const changeLogger = status.state === "CONNECTED" ? logFrontend : warnFrontend;
              changeLogger(`   ↳ ${status.label} → ${status.state}${detail}`);
              statusCache.set(status.name, signature);
            }
          });
        };

        const runHealthCheck = () => {
          pollHealth().catch((error) => {
            errorFrontend(`Proxy health check failed: ${(error as Error)?.message ?? error}`);
          });
        };

        runHealthCheck();

        const interval = setInterval(runHealthCheck, 30000);
        if (typeof (interval as NodeJS.Timeout).unref === "function") {
          (interval as NodeJS.Timeout).unref();
        }

        server.httpServer?.once("close", () => {
          clearInterval(interval);
        });
      },
    },
  ],
  server: {
    host: true,
    port: 5000,
    strictPort: true,    // SOL-311: Enforce port 5000
    allowedHosts: true,
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
    watch: {
      usePolling: true,
      interval: 800,
    },
    proxy: {
      "/api/admin": createServiceProxyConfig("Backend (5002) :: /api/admin", BACKEND_PROXY_TARGET),
      "/api/auth": createServiceProxyConfig("Backend (5002) :: /api/auth", BACKEND_PROXY_TARGET),
      "/api": createServiceProxyConfig("Backend (5002) :: /api", BACKEND_PROXY_TARGET),
    },
  },
  optimizeDeps: {
    exclude: ['node_modules'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    minify: preferTerser ? 'terser' : 'esbuild',
    target: 'es2022',
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings that don't affect functionality
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
            return 'vendor-editor';
          }

          if (id.includes('lucide-react') || id.includes('@tabler/icons-react')) {
            return 'vendor-icons';
          }

          if (id.includes('react-syntax-highlighter')) {
            return 'vendor-highlighter';
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }

          if (id.includes('date-fns')) {
            return 'vendor-time';
          }

          if (id.includes('jspdf')) {
            return 'vendor-export';
          }

          if (/[\\/]firebase[\\/]/.test(id)) {
            return 'vendor-firebase';
          }

          if (id.includes('@tanstack/') || id.includes('swr')) {
            return 'vendor-data';
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react';
          }

          return 'vendor';
        },
      },
    },
  },
});
