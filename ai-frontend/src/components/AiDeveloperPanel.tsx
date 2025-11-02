// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  Activity,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  FolderOpen,
  Github,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Moon,
  RefreshCcw,
  ScrollText,
  Settings,
  Sparkles,
  Sun,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ChatTab from "./AIDeveloper/tabs/ChatTab";
import ConsoleTab from "./AIDeveloper/tabs/ConsoleTab";
import ExplorerTab from "./AIDeveloper/tabs/ExplorerTab";
import MemoryTab from "./AIDeveloper/tabs/MemoryTab";
import LogsTab from "./AIDeveloper/tabs/LogsTab";
import SettingsTab from "./AIDeveloper/tabs/SettingsTab";
import AutoImproveTab from "./AIDeveloper/tabs/AutoImproveTab";
import { SecretsPage } from "./AIDeveloper/tabs/Secrets";
import GitHubTab from "./AIDeveloper/tabs/GitHubTab";
import { DevConsoleProvider } from "../contexts/DevConsoleContext";
import { useAIServiceState } from "@/hooks/useAIServiceState";
import { useFileOperations } from "../hooks/useFileOperations";
import { useSystemState } from "../hooks/useSystemState";
import { useMemoryManagement } from "../hooks/useMemoryManagement";
import { fetchSecretsTelemetry } from "@/services/secretsAdminApi";
import { useTheme } from "../contexts/useTheme";
import { systemCleanerService } from "../services/SystemCleanerService";

export type EmotionalState = "idle" | "thinking" | "responding";

type AiDeveloperChatPanelProps = {
  onEmotionalStateChange?: (state: EmotionalState) => void;
};

type TabKey =
  | "dashboard"
  | "chat"
  | "console"
  | "explorer"
  | "autoImprove"
  | "memory"
  | "logs"
  | "secrets"
  | "github"
  | "settings";

type AccentTone = "violet" | "blue" | "green" | "pink" | "gold";

type QuickAction = {
  key: TabKey;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: AccentTone;
  disabled?: boolean;
  badge?: string;
};

type DashboardUpdate = {
  id: string;
  title: string;
  description: string;
  timestamp: string | number | Date;
  icon: LucideIcon;
  accent: AccentTone;
  tag?: string;
};

type StatCard = {
  id: string;
  label: string;
  value: string;
  description: string;
  meta: string;
  icon: LucideIcon;
  accent: AccentTone;
  status: "good" | "warning" | "critical" | "neutral";
};

const CORE_TABS: TabKey[] = [
  "dashboard",
  "chat",
  "console",
  "explorer",
  "autoImprove",
  "memory",
  "logs",
  "secrets",
  "github",
  "settings",
];

const DEFAULT_AI_SERVICE_HEALTH = { status: "ok", port: 5001, lastCheck: Date.now() };

const normalizeTabKey = (value: string | null, validTabs: readonly TabKey[]): TabKey | null => {
  if (!value) {
    return null;
  }

  return (validTabs as readonly string[]).includes(value) ? (value as TabKey) : null;
};

const AiDeveloperChatPanel: React.FC<AiDeveloperChatPanelProps> = ({
  onEmotionalStateChange,
}) => {
  const {
    user: authUser,
    isAuthenticated,
    authInitialized,
    userRole,
    routeAdvice,
    deviceRecognition,
    deviceTrust,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const allowedSuperAdminIds = useMemo(() => ["01019062020"], []);

  const verifiedPersonalId = useMemo(() => {
    if (!authUser?.personalId) {
      return false;
    }

    const normalizedPersonalId = authUser.personalId.trim();
    return allowedSuperAdminIds.includes(normalizedPersonalId);
  }, [allowedSuperAdminIds, authUser]);

  const normalizedAuthRole = useMemo(() => {
    if (!authUser?.role) {
      return null;
    }

    return typeof authUser.role === "string"
      ? authUser.role.trim().toUpperCase()
      : null;
  }, [authUser]);

  const recognizedByAuthRole = useMemo(
    () => Boolean(isAuthenticated && normalizedAuthRole === "SUPER_ADMIN"),
    [isAuthenticated, normalizedAuthRole],
  );

  const recognizedByContextRole = useMemo(
    () => Boolean(isAuthenticated && userRole === "SUPER_ADMIN"),
    [isAuthenticated, userRole],
  );

  const recognizedByRouteAdvice = useMemo(
    () => Boolean(routeAdvice?.authenticated && routeAdvice?.role === "SUPER_ADMIN"),
    [routeAdvice?.authenticated, routeAdvice?.role],
  );

  const recognizedByDevice = useMemo(() => {
    if (!deviceRecognition?.isRecognizedDevice) {
      return false;
    }

    return (
      deviceRecognition.currentDevice?.registeredRole === "SUPER_ADMIN" &&
      (deviceTrust || recognizedByRouteAdvice)
    );
  }, [deviceRecognition, deviceTrust, recognizedByRouteAdvice]);

  const isSuperAdminUser = useMemo(() => {
    if (!authInitialized) {
      return false;
    }

    return (
      verifiedPersonalId ||
      recognizedByDevice ||
      recognizedByRouteAdvice ||
      recognizedByAuthRole ||
      recognizedByContextRole
    );
  }, [
    authInitialized,
    recognizedByAuthRole,
    recognizedByContextRole,
    recognizedByDevice,
    recognizedByRouteAdvice,
    verifiedPersonalId,
  ]);

  useEffect(() => {
    if (!authInitialized || !isSuperAdminUser || verifiedPersonalId) {
      return;
    }

    console.warn(
      "⚠️ [ACCESS] SUPER_ADMIN privileges granted without verified personalId. Check user profile setup.",
    );
  }, [authInitialized, isSuperAdminUser, verifiedPersonalId]);

  const coreTabs = useMemo<TabKey[]>(() => CORE_TABS, []);

  const validTabs = useMemo<readonly TabKey[]>(() => coreTabs, [coreTabs]);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [isInitializing, setIsInitializing] = useState(true);
  const initBarrierRef = useRef(false);
  const initCleanupRef = useRef(null);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  useEffect(() => {
    if (!onEmotionalStateChange) {
      return;
    }

    if (isInitializing || isRefreshingHealth || isRefreshingModels) {
      onEmotionalStateChange("thinking");
      return;
    }

    if (activeTab === "chat") {
      onEmotionalStateChange("responding");
      return;
    }

    onEmotionalStateChange("idle");
  }, [
    activeTab,
    isInitializing,
    isRefreshingHealth,
    isRefreshingModels,
    onEmotionalStateChange,
  ]);

  const aiFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      if (!authInitialized || !isAuthenticated || !authUser) {
        console.log("🟡 AI Fetch blocked - authentication not ready");
        throw new Error("Authentication required");
      }

      const url = endpoint.startsWith("/") ? endpoint : `/api/ai/${endpoint}`;

      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(authUser?.personalId && { "x-personal-id": authUser.personalId }),
            ...(authUser?.role && { "X-User-Role": authUser.role }),
            ...options.headers,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error(`AI Service Error (${url}):`, error);
        throw error;
      }
    },
    [authInitialized, isAuthenticated, authUser],
  );

  const {
    aiServiceHealth: providedHealth,
    refreshHealth,
    loadModels,
    modelControls,
    setModelControls,
    availableModels,
    selectedModel,
    setSelectedModel,
  } = useAIServiceState(isAuthenticated, authUser);
  const aiServiceHealth = providedHealth ?? DEFAULT_AI_SERVICE_HEALTH;

  const { tree, currentFile, setCurrentFile, loadFileTree, loadFile, saveFile } = useFileOperations(
    isAuthenticated,
    authUser,
  );

  const { isDarkMode, setTheme, toggleTheme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    cleanerEnabled,
    setCleanerEnabled,
    isCleaningNow,
    setIsCleaningNow,
    lastCleanup,
    setLastCleanup,
    telemetryData,
    setTelemetryData,
  } = useSystemState();

  const hasDevConsoleAccess = useMemo(
    () => Boolean(isSuperAdminUser),
    [isSuperAdminUser],
  );

  useMemoryManagement();

  const numberFormatter = useMemo(() => new Intl.NumberFormat("ka-GE"), []);
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat("ka-GE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [],
  );

  const sidebarTitle = "Ai გურულო";
  const userDisplayName = useMemo(() => {
    if (!authUser) {
      return "სტუმარი";
    }

    return (
      authUser.displayName ||
      authUser.fullName ||
      authUser.email ||
      authUser.personalId ||
      "სტუმარი"
    );
  }, [authUser]);

  const handleSetDarkMode = useCallback(
    (dark: boolean) => {
      setTheme(dark ? "dark" : "light");
    },
    [setTheme],
  );

  const handleThemeToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed((previous) => !previous);
  }, []);

  const formatRelativeTime = useCallback((value: unknown) => {
    if (!value) {
      return "განახლება უცნობია";
    }

    const date = typeof value === "number" ? new Date(value) : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return "განახლება უცნობია";
    }

    const diff = Date.now() - date.getTime();

    if (diff < 0) {
      return "დაგეგმილი";
    }

    const minutes = Math.floor(diff / 60000);

    if (minutes <= 0) {
      return "ახლახანს";
    }

    if (minutes < 60) {
      return `${minutes} წთ წინ`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} სთ წინ`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days} დღე წინ`;
    }

    return date.toLocaleDateString("ka-GE", {
      month: "short",
      day: "numeric",
    });
  }, []);

  const selectedModelLabel = useMemo(() => {
    if (!selectedModel) {
      return "ნაგულისხმევი";
    }

    const model = availableModels?.find((entry) => entry.id === selectedModel);

    return model?.label ?? selectedModel;
  }, [availableModels, selectedModel]);

  const secretsQueueBadge = useMemo(() => {
    const queueLength = telemetryData?.secrets?.queueLength ?? 0;
    if (!Number.isFinite(queueLength) || queueLength <= 0) {
      return undefined;
    }

    return numberFormatter.format(queueLength);
  }, [numberFormatter, telemetryData]);

  const handleToggleCleaner = useCallback(() => {
    const nextState = !cleanerEnabled;

    try {
      systemCleanerService.setCleaningEnabled(nextState);
      setCleanerEnabled(nextState);

      if (nextState) {
        setLastCleanup(systemCleanerService.getLastCleanupTime());
      }
    } catch (error) {
      console.error("⚠️ Failed to toggle system cleaner", error);
    }
  }, [cleanerEnabled, setCleanerEnabled, setLastCleanup]);

  const handleManualCleanup = useCallback(async () => {
    try {
      setIsCleaningNow(true);
      const stats = await systemCleanerService.performManualCleanup();
      setLastCleanup(stats?.timestamp ?? new Date().toISOString());
    } catch (error) {
      console.error("⚠️ Manual cleanup failed", error);
    } finally {
      setIsCleaningNow(false);
    }
  }, [setIsCleaningNow, setLastCleanup]);

  const statCards = useMemo<StatCard[]>(() => {
    const {
      totalRequests = 0,
      averageLatency = 0,
      errorRate = 0,
      fallbackUsage = 0,
      lastUpdate,
      secrets: secretsTelemetry = {
        total: 0,
        requiredMissing: 0,
        lastStatus: 'unknown',
        queueLength: 0,
        pendingKeys: 0,
        lastAction: null,
        lastCompletedAt: null,
      },
    } = telemetryData ?? {};

    const safeLatency = Number.isFinite(averageLatency) ? Math.max(0, averageLatency) : 0;
    const safeRequests = Number.isFinite(totalRequests) ? Math.max(0, totalRequests) : 0;
    const safeErrorRate = Number.isFinite(errorRate) ? Math.max(0, errorRate) : 0;
    const safeFallback = Number.isFinite(fallbackUsage) ? Math.max(0, fallbackUsage) : 0;

    const errorValue = safeErrorRate > 1 ? Math.min(safeErrorRate, 100) : Math.min(safeErrorRate * 100, 100);
    const errorStatus = errorValue <= 1.5 ? "good" : errorValue <= 5 ? "warning" : "critical";
    const latencyStatus = safeLatency <= 250 ? "good" : safeLatency <= 500 ? "warning" : "critical";

    const cleanerStatus = cleanerEnabled ? "good" : "warning";
    const cleanerValue = cleanerEnabled ? (isCleaningNow ? "მიმდინარეობს" : "აქტიური") : "გამორთული";
    const statusDescription =
      typeof aiServiceHealth?.status === "string" && aiServiceHealth.status.trim().length > 0
        ? aiServiceHealth.status
        : aiServiceHealth?.ok
          ? "OK"
          : "უცნობია";

    const temperature = Number.isFinite(modelControls?.temperature)
      ? percentFormatter.format(Math.round((modelControls?.temperature ?? 0) * 10) / 10)
      : "0";
    const maxTokens = Number.isFinite(modelControls?.maxTokens)
      ? numberFormatter.format(Math.max(0, modelControls?.maxTokens ?? 0))
      : "0";

    const cards: StatCard[] = [
      {
        id: "health",
        label: "AI სერვისის სტატუსი",
        value: aiServiceHealth?.ok ? "სტაბილური" : "გაფრთხილება",
        description: `სტატუსი: ${statusDescription}`,
        meta: `განახლდა: ${formatRelativeTime(aiServiceHealth?.lastChecked)}`,
        icon: Activity,
        accent: "violet",
        status: aiServiceHealth?.ok ? "good" : "warning",
      },
      {
        id: "latency",
        label: "საშ. ლატენტურობა",
        value: `${Math.round(safeLatency)} ms`,
        description: `მოთხოვნები: ${numberFormatter.format(safeRequests)}`,
        meta: lastUpdate ? `განახლდა: ${formatRelativeTime(lastUpdate)}` : "მონაცემები იხვლება",
        icon: Clock,
        accent: "blue",
        status: latencyStatus,
      },
      {
        id: "errors",
        label: "შეცდომების მაჩვენებელი",
        value: `${percentFormatter.format(errorValue)}%`,
        description: safeFallback > 0 ? `Fallback ჩართვები: ${numberFormatter.format(safeFallback)}` : "Fallback არ გამოიყენება",
        meta: errorValue <= 1 ? "სტაბილური შესრულება" : errorValue <= 5 ? "გაფრთხილება" : "საჭიროა გამოკვლევა",
        icon: MessageSquare,
        accent: "pink",
        status: errorStatus,
      },
      {
        id: "cleaner",
        label: "სისტემის მოვლა",
        value: cleanerValue,
        description: cleanerEnabled ? "ავტომატური დასუფთავება ჩართულია" : "ავტომატური დასუფთავება გამორთულია",
        meta: lastCleanup ? `ბოლო: ${formatRelativeTime(lastCleanup)}` : "ჯერ არ შესრულებულა",
        icon: HardDrive,
        accent: "green",
        status: cleanerStatus,
      },
      {
        id: "model",
        label: "აქტიური მოდელი",
        value: selectedModelLabel,
        description: `ტემპერატურა: ${temperature}`,
        meta: `მაქს. ტოკენები: ${maxTokens}`,
        icon: Brain,
        accent: "gold",
        status: "neutral",
      },
    ];

    if (isSuperAdminUser) {
      const secretsStatusLabel = (() => {
        switch (secretsTelemetry.lastStatus) {
          case 'ok':
            return 'სტაბილური';
          case 'degraded':
            return 'გაფრთხილება';
          case 'rollback':
            return 'როლბეკი';
          default:
            return 'უცნობი';
        }
      })();

      const secretsCardStatus =
        secretsTelemetry.requiredMissing === 0 && secretsTelemetry.lastStatus === 'ok' ? 'good' : 'warning';

      cards.splice(1, 0, {
        id: 'secrets',
        label: 'Secrets Vault',
        value: `${numberFormatter.format(secretsTelemetry.total)} გასაღები`,
        description:
          secretsTelemetry.requiredMissing > 0
            ? `ნაკლული: ${numberFormatter.format(secretsTelemetry.requiredMissing)}`
            : 'ყველა აუცილებელი შევსებულია',
        meta: `Sync: ${secretsStatusLabel} • Queue: ${numberFormatter.format(secretsTelemetry.queueLength)}`,
        icon: KeyRound,
        accent: secretsCardStatus === 'good' ? 'green' : 'pink',
        status: secretsCardStatus,
      });
    }

    return cards;
  }, [
    aiServiceHealth,
    cleanerEnabled,
    formatRelativeTime,
    isCleaningNow,
    lastCleanup,
    modelControls,
    numberFormatter,
    percentFormatter,
    selectedModelLabel,
    telemetryData,
    isSuperAdminUser,
  ]);

  const secretsMiniMetrics = useMemo(() => {
    if (!isSuperAdminUser) {
      return [] as Array<{
        id: string;
        label: string;
        value: string;
        hint: string;
        intent: 'neutral' | 'success' | 'warning' | 'alert';
      }>;
    }

    const defaults = {
      total: 0,
      requiredMissing: 0,
      lastStatus: 'unknown',
      queueLength: 0,
      pendingKeys: 0,
      lastAction: null as string | null,
      lastCompletedAt: null as string | null,
    };

    const secretsTelemetry = telemetryData?.secrets ?? defaults;
    const totalValue = Math.max(0, secretsTelemetry.total ?? 0);
    const missingRequired = Math.max(0, secretsTelemetry.requiredMissing ?? 0);
    const queueLength = Math.max(0, secretsTelemetry.queueLength ?? 0);

    const statusLabel = (() => {
      switch ((secretsTelemetry.lastStatus || '').toLowerCase()) {
        case 'ok':
          return t('aiDeveloper.secrets.metrics.status.ok', 'OK');
        case 'degraded':
          return t('aiDeveloper.secrets.metrics.status.degraded', 'Degraded');
        case 'rollback':
          return t('aiDeveloper.secrets.metrics.status.rollback', 'Rollback');
        default:
          return t('aiDeveloper.secrets.metrics.status.unknown', 'Unknown');
      }
    })();

    const statusIntent: 'neutral' | 'success' | 'warning' | 'alert' = (() => {
      const status = (secretsTelemetry.lastStatus || '').toLowerCase();
      if (status === 'ok') {
        return 'success';
      }
      if (status === 'degraded') {
        return 'alert';
      }
      if (status === 'rollback') {
        return 'warning';
      }
      return 'neutral';
    })();

    return [
      {
        id: 'total',
        label: t('aiDeveloper.secrets.metrics.total', 'Secrets total'),
        value: numberFormatter.format(totalValue),
        hint: t('aiDeveloper.secrets.metrics.totalHint', 'Keys managed in vault'),
        intent: 'neutral' as const,
      },
      {
        id: 'required-missing',
        label: t('aiDeveloper.secrets.metrics.requiredMissing', 'Required missing'),
        value: numberFormatter.format(missingRequired),
        hint:
          missingRequired > 0
            ? t('aiDeveloper.secrets.metrics.requiredMissingHint', 'Needs placeholders before deployment')
            : t('aiDeveloper.secrets.metrics.requiredMissingClear', 'All required keys present'),
        intent: missingRequired > 0 ? ('alert' as const) : ('success' as const),
      },
      {
        id: 'last-status',
        label: t('aiDeveloper.secrets.metrics.lastStatus', 'Last sync status'),
        value: statusLabel,
        hint: secretsTelemetry.lastCompletedAt
          ? t('aiDeveloper.secrets.metrics.lastStatusHint', 'Updated {{time}}', {
              time: formatRelativeTime(secretsTelemetry.lastCompletedAt),
            })
          : t('aiDeveloper.secrets.metrics.lastStatusPending', 'No sync recorded'),
        intent: statusIntent,
      },
      {
        id: 'queue-length',
        label: t('aiDeveloper.secrets.metrics.queueLength', 'Sync queue'),
        value: numberFormatter.format(queueLength),
        hint:
          queueLength > 0
            ? t('aiDeveloper.secrets.metrics.queueLengthHint', '{{count}} key(s) awaiting sync', {
                count: queueLength,
              })
            : t('aiDeveloper.secrets.metrics.queueLengthClear', 'Queue is empty'),
        intent: queueLength > 0 ? ('warning' as const) : ('neutral' as const),
      },
    ];
  }, [
    formatRelativeTime,
    isSuperAdminUser,
    numberFormatter,
    t,
    telemetryData,
  ]);

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab);
      const params = new URLSearchParams(location.search);

      if (tab === "dashboard") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
      console.log(`🔄 Switched to tab: ${tab}`);
    },
    [location.pathname, location.search, navigate],
  );

  const handleOpenFileFromActivity = useCallback(
    async (path: string) => {
      if (!path) {
        return;
      }

      try {
        const file = await loadFile(path);
        setCurrentFile({
          path,
          content: file?.content ?? "",
          lastModified: new Date().toISOString(),
        });
        handleTabChange("explorer");
      } catch (error) {
        console.error("⚠️ Failed to open file from activity feed", error);
      }
    },
    [handleTabChange, loadFile, setCurrentFile],
  );

  const handleRefreshHealth = useCallback(async () => {
    try {
      setIsRefreshingHealth(true);
      console.log("🔄 Refreshing AI service health status");
      await refreshHealth();
    } catch (error) {
      console.error("AI service health refresh failed", error);
    } finally {
      setIsRefreshingHealth(false);
    }
  }, [refreshHealth]);

  const handleReloadModels = useCallback(async () => {
    try {
      setIsRefreshingModels(true);
      console.log("✨ Reloading AI service model catalogue");
      await loadModels();
    } catch (error) {
      console.error("AI model reload failed", error);
    } finally {
      setIsRefreshingModels(false);
    }
  }, [loadModels]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = normalizeTabKey(params.get("tab"), validTabs);

    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location.search, activeTab, validTabs]);

  const initPanel = useCallback(() => {
    refreshHealth();
    loadFileTree();
    loadModels();
    setIsInitializing(false);

    return () => {
      console.log("🧹 [AI_DEV_PANEL] Cleanup on unmount");
    };
  }, [loadFileTree, loadModels, refreshHealth]);

  useEffect(() => {
    if (!isAuthenticated || !hasDevConsoleAccess) {
      return;
    }

    if (initBarrierRef.current) {
      return initCleanupRef.current || undefined;
    }

    initBarrierRef.current = true;
    const cleanup = initPanel();
    initCleanupRef.current = cleanup;

    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [hasDevConsoleAccess, initPanel, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasDevConsoleAccess) {
      if (typeof initCleanupRef.current === "function") {
        initCleanupRef.current();
      }
      initCleanupRef.current = null;
      initBarrierRef.current = false;
    }
  }, [hasDevConsoleAccess, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasDevConsoleAccess) {
      setIsInitializing(false);
    }
  }, [isAuthenticated, hasDevConsoleAccess]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isInitializing) {
        console.warn("⚠️ AI Developer Panel initialization timeout - switching to fallback mode");
        setIsInitializing(false);
      }
    }, 20000);

    return () => clearTimeout(timeout);
  }, [isInitializing]);

  useEffect(() => {
    if (!isSuperAdminUser) {
      setTelemetryData((prev) => ({
        ...prev,
        secrets: {
          total: 0,
          requiredMissing: 0,
          lastStatus: 'unknown',
          queueLength: 0,
          pendingKeys: 0,
          lastAction: null,
          lastCompletedAt: null,
        },
      }));
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadTelemetry = async () => {
      try {
        const data = await fetchSecretsTelemetry(controller.signal);
        if (cancelled) {
          return;
        }
        setTelemetryData((prev) => ({
          ...prev,
          secrets: {
            total: data.totals?.secrets ?? 0,
            requiredMissing: data.totals?.requiredMissing ?? 0,
            lastStatus: data.sync?.lastStatus ?? 'unknown',
            queueLength: data.sync?.queueLength ?? 0,
            pendingKeys: data.sync?.pendingKeys ?? 0,
            lastAction: data.sync?.lastAction ?? null,
            lastCompletedAt: data.sync?.lastCompletedAt ?? null,
          },
        }));
      } catch (error) {
        if ((error instanceof DOMException && error.name === 'AbortError') || error?.name === 'AbortError') {
          return;
        }
        console.error('❌ [SecretsTelemetry] fetch failed', error);
      }
    };

    loadTelemetry();
    const interval = window.setInterval(loadTelemetry, 60000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [isSuperAdminUser, setTelemetryData]);

  type SidebarItem =
  | {
        key: string;
        action: "tab";
        tabKey: TabKey;
        icon: LucideIcon;
        label: string;
        badge?: string;
        title?: string;
        isOff?: boolean;
        disabled?: boolean;
        href?: string;
      }
    | {
        key: string;
        action: "link";
        icon: LucideIcon;
        label: string;
        title?: string;
        href: string;
        disabled?: boolean;
      };

  const sidebarItems: SidebarItem[] = useMemo(() => {
    return [
      {
        key: "dashboard",
        action: "tab",
        tabKey: "dashboard",
        icon: LayoutDashboard,
        label: "დეშბორდი",
        title: "Dashboard",
        href: "/admin?tab=dashboard",
      },
      {
        key: "chat",
        action: "tab",
        tabKey: "chat",
        icon: MessageSquare,
        label: "AI ჩატი",
        title: "AI Chat",
        href: "/admin?tab=chat",
      },
      {
        key: "console",
        action: "tab",
        tabKey: "console",
        icon: Terminal,
        label: "კონსოლი",
        title: "Developer Console",
        href: "/admin?tab=console",
      },
      {
        key: "explorer",
        action: "tab",
        tabKey: "explorer",
        icon: FolderOpen,
        label: "ფაილები",
        title: "File Explorer",
        href: "/admin?tab=explorer",
      },
      {
        key: "autoImprove",
        action: "tab",
        tabKey: "autoImprove",
        icon: Sparkles,
        label: "Auto-Improve",
        title: "Auto-Improve Studio",
        href: "/admin?tab=autoImprove",
        isOff: !hasDevConsoleAccess,
      },
      {
        key: "memory",
        action: "tab",
        tabKey: "memory",
        icon: Database,
        label: "მეხსიერება",
        title: "Memory Manager",
        href: "/admin?tab=memory",
      },
      {
        key: "logs",
        action: "tab",
        tabKey: "logs",
        icon: ScrollText,
        label: "ლოგები",
        title: "System Logs",
        href: "/admin?tab=logs",
        isOff: !hasDevConsoleAccess,
      },
      {
        key: "secrets",
        action: "tab",
        tabKey: "secrets",
        icon: KeyRound,
        label: "საიდუმლოებები",
        title: "Secrets Vault",
        href: "/admin?tab=secrets",
        badge: secretsQueueBadge,
        isOff: !isSuperAdminUser,
      },
      {
        key: "github",
        action: "tab",
        tabKey: "github",
        icon: Github,
        label: "GitHub",
        title: "GitHub Integration",
        href: "/admin?tab=github",
      },
      {
        key: "settings",
        action: "tab",
        tabKey: "settings",
        icon: Settings,
        label: "პარამეტრები",
        title: "Settings",
        href: "/admin?tab=settings",
      },
    ];
  }, [hasDevConsoleAccess, isSuperAdminUser, secretsQueueBadge]);

  const activeTabLabel = useMemo(() => {
    const current = sidebarItems.find(
      (item): item is Extract<SidebarItem, { action: "tab" }> =>
        item.action === "tab" && item.tabKey === activeTab,
    );

    if (current) {
      return current.label;
    }

    return t("aiDeveloper.title", "AI დეველოპერის პანელი");
  }, [activeTab, sidebarItems, t]);

  const dashboardUpdates = useMemo<DashboardUpdate[]>(() => {
    const healthOk = Boolean(aiServiceHealth?.ok);
    const healthCheckedAt = aiServiceHealth?.lastChecked ?? Date.now();

    return [
      {
        id: "dashboard-launch",
        title: "ახალი დეშბორდი გაშვებულია",
        description: "AI Developer-ის მთავარი პანელი ახლა იწყება სრულყოფილი სტატუსებით და სწრაფი ნავიგაციით.",
        timestamp: "2025-01-05T09:00:00Z",
        icon: Megaphone,
        accent: "violet",
        tag: "ახალი",
      },
      {
        id: "service-health",
        title: "სერვისის რეალური სტატუსი",
        description: healthOk
          ? "AI სერვისი სტაბილურად მუშაობს და მონიტორინგი ავტომატურად მიმდინარეობს."
          : "სერვისს სჭირდება ყურადღება — გადახედე სტატუსის დეტალებს და კონსოლს.",
        timestamp: healthCheckedAt,
        icon: Activity,
        accent: healthOk ? "green" : "pink",
        tag: healthOk ? "აქტიური" : "გაფრთხილება",
      },
      {
        id: "explorer-refresh",
        title: "ფაილების მენეჯერი დახვეწილია",
        description: "Explorer ტაბი სწრაფი ნავიგაციისთვის და ცვლილებების კონტროლისთვის ოპტიმიზებულია.",
        timestamp: "2025-01-12T10:00:00Z",
        icon: FolderOpen,
        accent: "blue",
        tag: "განახლება",
      },
    ];
  }, [aiServiceHealth?.lastChecked, aiServiceHealth?.ok]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        description: "Review health, telemetry, and rollout updates",
        icon: LayoutDashboard,
        accent: "violet",
      },
      {
        key: "chat",
        label: "AI Chat",
        description: "Collaborate with Gurulo for live coding guidance",
        icon: MessageSquare,
        accent: "blue",
      },
      {
        key: "console",
        label: "Console",
        description: "Monitor services and run automation jobs",
        icon: Terminal,
        accent: "green",
      },
      {
        key: "explorer",
        label: "File Explorer",
        description: "Browse, edit, and preview repository files",
        icon: FolderOpen,
        accent: "gold",
      },
      {
        key: "autoImprove",
        label: "Auto-Improve",
        description: "Audit Gurulo brain metrics and rollout automations",
        icon: Sparkles,
        accent: "pink",
        disabled: !hasDevConsoleAccess,
      },
      {
        key: "memory",
        label: "Memory",
        description: "Tune saved context, notes, and recall preferences",
        icon: Database,
        accent: "blue",
      },
      {
        key: "logs",
        label: "Logs",
        description: "Inspect realtime activity across services",
        icon: ScrollText,
        accent: "violet",
        disabled: !hasDevConsoleAccess,
      },
      {
        key: "secrets",
        label: "Secrets Vault",
        description: "Audit, sync, and roll back environment secrets",
        icon: KeyRound,
        accent: "violet",
        disabled: !isSuperAdminUser,
        badge: secretsQueueBadge,
      },
      {
        key: "github",
        label: "GitHub",
        description: "Connect repos, inspect diffs, and push changes",
        icon: Github,
        accent: "green",
      },
      {
        key: "settings",
        label: "Settings",
        description: "Configure Gurulo behavior, models, and cleanup",
        icon: Settings,
        accent: "gold",
      },
    ],
    [hasDevConsoleAccess, isSuperAdminUser, secretsQueueBadge],
  );

  if (isInitializing) {
    return (
      <div className="ai-dev-panel full-width ai-dev-panel--state">
        <div className="ai-dev-panel__state-card" role="status" aria-live="polite">
          <div className="ai-dev-panel__state-indicator ai-dev-panel__state-indicator--loading">
            <div className="ai-dev-panel__state-spinner" />
          </div>
          <h2>პანელი იტვირთება…</h2>
          <p>თუ დიდხანს გაგრძელდა, განაახლე გვერდი ან გადაამოწმე კავშირი.</p>
        </div>
      </div>
    );
  }

  if (!hasDevConsoleAccess) {
    return (
      <div className="ai-dev-panel full-width ai-dev-panel--state">
        <div className="ai-dev-panel__state-card" role="alert">
          <div className="ai-dev-panel__state-indicator ai-dev-panel__state-indicator--locked">🔒</div>
          <h2>წვდომა შეზღუდულია</h2>
          <p>ეს პანელი ხელმისაწვდომია მხოლოდ SUPER_ADMIN მომხმარებლებისთვის.</p>
        </div>
      </div>
    );
  }

  return (
    <DevConsoleProvider>
      <div className="ai-dev-panel full-width">
        <div className="ai-dev-shell">
          <aside
            className={["ai-dev-sidebar", isSidebarCollapsed ? "ai-dev-sidebar--collapsed" : ""]
              .filter(Boolean)
              .join(" ")}
            aria-label="AI Developer პანელის ნავიგაცია"
          >
            <div className="ai-dev-sidebar__header">
              <div
                className="ai-dev-sidebar__logo"
                title={`${sidebarTitle} — ${userDisplayName}`}
                aria-label={`${sidebarTitle} (${userDisplayName})`}
              >
                <span className="ai-dev-sidebar__logo-icon">Ai</span>
              </div>
              {!isSidebarCollapsed && (
                <div className="ai-dev-sidebar__meta">
                  <span className="ai-dev-sidebar__brand">{sidebarTitle}</span>
                  <span className="ai-dev-sidebar__user">{userDisplayName}</span>
                </div>
              )}
              <button
                type="button"
                className="ai-dev-sidebar__theme-toggle"
                onClick={handleThemeToggle}
                aria-label={isDarkMode ? "გათენება" : "დაუბნელება"}
                title={isDarkMode ? "ღია თემა" : "მუქი თემა"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>

            <div className="ai-dev-sidebar__items">
              {sidebarItems.map((item) => {
                const isTab = item.action === "tab";
                const isActive = isTab && activeTab === item.tabKey;
                const isMuted = isTab ? item.isOff ?? false : false;
                const isDisabled = Boolean(item.disabled || isMuted);
                const itemClasses = [
                  "ai-dev-sidebar__item",
                  isActive ? "is-active" : "",
                  isMuted || isDisabled ? "is-muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const buttonClasses = [
                  "ai-dev-sidebar__button",
                  isSidebarCollapsed ? "is-icon-only" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const handleItemClick = () => {
                  if (isDisabled) {
                    return;
                  }

                  if (item.action === "tab") {
                    handleTabChange(item.tabKey);
                  } else {
                    navigate(item.href);
                  }
                };

                return (
                  <div key={item.key} className={itemClasses}>
                    <span className="ai-dev-sidebar__glow" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={handleItemClick}
                      className={buttonClasses}
                      title={item.title ?? item.label}
                      aria-pressed={isActive}
                      aria-disabled={isDisabled}
                      disabled={isDisabled}
                    >
                      <span className="ai-dev-sidebar__icon">
                        <item.icon size={20} />
                      </span>
                      {!isSidebarCollapsed && (
                        <span className="ai-dev-sidebar__label">{item.label}</span>
                      )}
                    </button>
                    {item.action === "tab" && item.badge && (
                      <span className="ai-dev-sidebar__badge">{item.badge}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="ai-dev-sidebar__footer">
              <button
                type="button"
                className="ai-dev-sidebar__collapse"
                onClick={handleSidebarToggle}
                aria-label={isSidebarCollapsed ? "მენიუს გახსნა" : "მენიუს შეკვეცა"}
              >
                {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                {!isSidebarCollapsed && (
                  <span className="ai-dev-sidebar__footer-label">მენიუს შეკვეცა</span>
                )}
              </button>
            </div>
          </aside>

          <div className="ai-dev-main">
            <header className="ai-dev-topbar">
              <div className="ai-dev-topbar__title">
                <span>{sidebarTitle}</span>
                <h1>{activeTabLabel}</h1>
              </div>

              <div className="ai-dev-topbar__chips">
                <span className={`ai-dev-chip ${aiServiceHealth?.ok ? "is-success" : "is-warning"}`}>
                  <Sparkles size={14} />
                  {aiServiceHealth?.ok ? "სერვისი აქტიურია" : "საჭიროა შემოწმება"}
                </span>
                <span className="ai-dev-chip is-neutral">
                  <Terminal size={14} />
                  მოდელი: {selectedModelLabel}
                </span>
                <span className="ai-dev-chip is-neutral">
                  <Clock size={14} />
                  {formatRelativeTime(aiServiceHealth?.lastChecked)}
                </span>
              </div>

              <div className="ai-dev-topbar__actions">
                <button
                  type="button"
                  onClick={handleRefreshHealth}
                  className="ai-dev-button"
                  disabled={isRefreshingHealth}
                  aria-busy={isRefreshingHealth}
                >
                  <RefreshCcw
                    size={16}
                    className={`ai-dev-button__icon ${isRefreshingHealth ? "is-rotating" : ""}`}
                  />
                  <span>{isRefreshingHealth ? "განახლება..." : "სტატუსის განახლება"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReloadModels}
                  className="ai-dev-button ai-dev-button--ghost"
                  disabled={isRefreshingModels}
                  aria-busy={isRefreshingModels}
                >
                  <Sparkles
                    size={16}
                    className={`ai-dev-button__icon ${isRefreshingModels ? "is-rotating" : ""}`}
                  />
                  <span>{isRefreshingModels ? "იტვირთება..." : "მოდელების რეფრეში"}</span>
                </button>
              </div>
            </header>

            <main className="ai-dev-content">
              {activeTab === "dashboard" && (
                <>
                  <section className="ai-dev-stats-grid" aria-label="სისტემური მაჩვენებლები">
                    {statCards.map((card) => (
                      <article
                        key={card.id}
                        className={`ai-dev-stat-card ai-dev-stat-card--${card.accent} ai-dev-stat-card--${card.status}`}
                      >
                        <div className="ai-dev-stat-card__layer" aria-hidden="true" />
                        <div className="ai-dev-stat-card__content">
                          <div className="ai-dev-stat-card__header">
                            <span className="ai-dev-stat-card__icon">
                              <card.icon size={18} />
                            </span>
                            <span className="ai-dev-stat-card__label">{card.label}</span>
                          </div>
                          <div className="ai-dev-stat-card__value">{card.value}</div>
                          <p className="ai-dev-stat-card__description">{card.description}</p>
                          <span className="ai-dev-stat-card__meta">{card.meta}</span>
                        </div>
                      </article>
                    ))}
                  </section>

                  {quickActions.length > 0 && (
                    <section className="ai-dev-quick-actions" aria-label="სწრაფი მოქმედებები">
                      {quickActions.map((item) => {
                        const isActive = activeTab === item.key;
                        const quickClasses = [
                          "ai-dev-quick-card",
                          `ai-dev-quick-card--${item.accent}`,
                          isActive ? "is-active" : "",
                          item.disabled ? "is-disabled" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => !item.disabled && handleTabChange(item.key)}
                            className={quickClasses}
                            disabled={item.disabled}
                            aria-pressed={isActive}
                          >
                            <span className="ai-dev-quick-card__glow" aria-hidden="true" />
                            <span className="ai-dev-quick-card__icon">
                              <item.icon size={18} />
                            </span>
                            <span className="ai-dev-quick-card__title">{item.label}</span>
                            <span className="ai-dev-quick-card__description">{item.description}</span>
                            {item.badge && <span className="ai-dev-quick-card__badge">{item.badge}</span>}
                          </button>
                        );
                      })}
                    </section>
                  )}
                </>
              )}

              <section className="ai-dev-tab-panel" aria-live="polite">
                <div className="ai-dev-tab-panel__surface">
                  <div className="ai-dev-tab-panel__content">
                    {activeTab === "dashboard" && (
                      <div className="ai-dev-dashboard-feed">
                        <div className="ai-dev-updates__header">
                          <div>
                            <p className="ai-dev-updates__eyebrow">რა არის ახალი</p>
                            <h2 className="ai-dev-updates__title">უახლესი განახლებები</h2>
                          </div>
                          <span className="ai-dev-updates__meta">პანელი ავტომატურად განახლდება მონიტორინგის საფუძველზე</span>
                        </div>

                        {isSuperAdminUser && secretsMiniMetrics.length > 0 && (
                          <div
                            className="ai-dev-secrets-metrics"
                            aria-label={t('aiDeveloper.secrets.metrics.sectionLabel', 'Secrets telemetry')}
                          >
                            {secretsMiniMetrics.map((metric) => (
                              <div
                                key={metric.id}
                                className={`ai-dev-secrets-metric ai-dev-secrets-metric--${metric.intent}`}
                              >
                                <span className="ai-dev-secrets-metric__label">{metric.label}</span>
                                <span className="ai-dev-secrets-metric__value">{metric.value}</span>
                                {metric.hint && (
                                  <span className="ai-dev-secrets-metric__hint">{metric.hint}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="ai-dev-updates__grid">
                          {dashboardUpdates.map((update) => (
                            <article
                              key={update.id}
                              className={`ai-dev-update-card ai-dev-update-card--${update.accent}`}
                            >
                              <div className="ai-dev-update-card__header">
                                <span className="ai-dev-update-card__icon">
                                  <update.icon size={18} />
                                </span>
                                <div className="ai-dev-update-card__heading">
                                  <h3>{update.title}</h3>
                                  <span className="ai-dev-update-card__time">{formatRelativeTime(update.timestamp)}</span>
                                </div>
                                {update.tag && <span className="ai-dev-update-card__tag">{update.tag}</span>}
                              </div>
                              <p className="ai-dev-update-card__description">{update.description}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "chat" && (
                      <ChatTab isAuthenticated={isAuthenticated} />
                    )}

                    {activeTab === "autoImprove" && (
                      <AutoImproveTab
                        hasDevConsoleAccess={hasDevConsoleAccess}
                        isAuthenticated={isAuthenticated}
                        userRole={userRole ?? ""}
                        openFileFromActivity={handleOpenFileFromActivity}
                      />
                    )}

                    {activeTab === "console" && (
                      <ConsoleTab hasDevConsoleAccess={hasDevConsoleAccess} />
                    )}

                    {activeTab === "explorer" && (
                      <ExplorerTab
                        tree={tree ?? []}
                        currentFile={currentFile}
                        setCurrentFile={setCurrentFile}
                        aiFetch={aiFetch}
                        loadFile={loadFile}
                        saveFile={saveFile}
                      />
                    )}

                    {activeTab === "memory" && (
                      <MemoryTab isAuthenticated={isAuthenticated} />
                    )}

                    {activeTab === "logs" && (
                      <LogsTab hasDevConsoleAccess={hasDevConsoleAccess} />
                    )}

                    {activeTab === "secrets" && <SecretsPage variant="panel" />}

                    {activeTab === "github" && (
                      <GitHubTab hasDevConsoleAccess={hasDevConsoleAccess} />
                    )}

                    {activeTab === "settings" && (
                      <SettingsTab
                        isDarkMode={isDarkMode}
                        setIsDarkMode={handleSetDarkMode}
                        cleanerEnabled={cleanerEnabled}
                        isCleaningNow={isCleaningNow}
                        lastCleanup={lastCleanup}
                        onToggleCleaner={handleToggleCleaner}
                        onManualCleanup={handleManualCleanup}
                        modelControls={modelControls}
                        setModelControls={setModelControls}
                        availableModels={availableModels ?? []}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        telemetryData={telemetryData}
                      />
                    )}
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </DevConsoleProvider>
  );
};

export default AiDeveloperChatPanel;
