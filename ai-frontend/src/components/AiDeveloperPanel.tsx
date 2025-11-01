import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Plus,
  Settings,
  RotateCcw,
  Paperclip,
  Mic,
  Send,
  ChevronDown,
  User,
  Sparkles,
  Camera,
  Archive,
  ArchiveRestore,
  Clock,
  ChevronRight,
  Trash2,
  X,
  Brain,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import {
  formatEnhancedMessage,
  EnhancedMessage,
} from "../utils/enhancedMessageFormatter";
import EnhancedMessageRenderer from "./EnhancedMessageRenderer";
import { singleFlight } from "../lib/singleFlight";
import { getAdminAuthHeaders } from "../utils/adminToken";
import { fetchWithDirectAiFallback } from "@/utils/aiFallback";
import "../styles/enhancedMessages.css";
import { useMemoryControls } from "../hooks/memory/useMemoryControls";

// UPDATE 2024-10-01: Added admin-token Authorization headers for AI fetches and
// surfaced a UI banner when 401 responses occur so admins can reconfigure the
// credentials without inspecting the console.

// ===== CHAT INTERFACES =====
interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string;
  policy?: string;
  model?: string;
  modelLabel?: string;
  // Phase 1: Enhanced message formatting
  enhanced?: EnhancedMessage;
  category?: "primary" | "success" | "error" | "warning" | "code" | "info";
}

interface AIModel {
  id: string;
  label: string;
  category: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastActivity: string;
  isActive: boolean;
  isArchived: boolean;
}

export type EmotionalState = 'idle' | 'thinking' | 'responding';

interface AiDeveloperPanelProps {
  currentFile?: string;
  aiFetch?: (endpoint: string, options?: RequestInit) => Promise<any>;
  onEmotionalStateChange?: (state: EmotionalState) => void;
}

const ASSISTANT_BUBBLE_CLASS =
  'relative w-fit max-w-[75%] rounded-[18px] border border-white/10 bg-white/10 px-5 py-4 text-[0.95rem] text-white/90 shadow-[0_22px_48px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-shadow duration-500';
const USER_BUBBLE_CLASS =
  'relative w-fit max-w-[70%] rounded-[18px] border border-cyan-300/35 bg-cyan-300/15 px-5 py-3 text-[0.95rem] text-emerald-50 shadow-[0_22px_48px_rgba(14,116,144,0.35)] backdrop-blur-xl transition-shadow duration-500';
const LOADING_BUBBLE_CLASS =
  'relative w-fit max-w-[70%] rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.38)] backdrop-blur-xl';
const GLOW_BUTTON_CLASS =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-300/30 bg-gradient-to-br from-sky-500/15 via-indigo-500/15 to-fuchsia-500/15 text-sky-100 transition-all duration-500 hover:shadow-[0_20px_45px_rgba(79,70,229,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40 disabled:cursor-not-allowed disabled:opacity-50';
const GLOW_BUTTON_ACTIVE_CLASS =
  'bg-gradient-to-br from-sky-500/35 via-indigo-500/35 to-fuchsia-500/35 text-white shadow-[0_24px_55px_rgba(56,189,248,0.45)]';

const AiDeveloperPanel: React.FC<AiDeveloperPanelProps> = ({
  currentFile,
  aiFetch,
  onEmotionalStateChange,
}) => {
  const { user, isAuthenticated, authInitialized } = useAuth();
  const memoryControls = useMemoryControls(isAuthenticated ? user?.personalId : null);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);

  const fallbackAiFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      if (!authInitialized || !isAuthenticated || !user) {
        console.warn(
          "🟡 [AI FETCH] Authentication not ready - blocking fallback request",
        );
        throw new Error("Authentication required");
      }

      const normalizedEndpoint = /^https?:\/\//.test(endpoint)
        ? endpoint
        : endpoint.startsWith("/")
          ? endpoint
          : `/api/ai/${endpoint}`;

      try {
        const mergeHeaders = (source?: HeadersInit): Record<string, string> => {
          const result: Record<string, string> = {};

          if (!source) {
            return result;
          }

          if (source instanceof Headers) {
            source.forEach((value, key) => {
              result[key] = value;
            });
            return result;
          }

          if (Array.isArray(source)) {
            source.forEach(([key, value]) => {
              result[key] = value;
            });
            return result;
          }

          Object.assign(result, source as Record<string, string>);
          return result;
        };

        const providedHeaders = mergeHeaders(options.headers);
        const finalHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(user.personalId && { "X-User-ID": user.personalId }),
          ...(user.role && { "X-User-Role": user.role }),
          ...providedHeaders,
        };

        const adminHeaders = getAdminAuthHeaders();
        Object.entries(adminHeaders).forEach(([key, value]) => {
          finalHeaders[key] = value;
        });

        const { response, usedFallback } = await fetchWithDirectAiFallback(normalizedEndpoint, {
          ...options,
          headers: finalHeaders,
          credentials: options.credentials ?? "include",
        });

        if (usedFallback) {
          console.info(`🔁 [AI FETCH] Direct AI fallback used for ${normalizedEndpoint}`);
        }

        if (response.status === 401) {
          setAuthorizationError(
            "🚫 ავტორიზაცია მოთხოვნილია — გთხოვ, გადაამოწმე ადმინისტრატორის ტოკენი.",
          );
        } else {
          setAuthorizationError(null);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error("❌ [AI FETCH] Fallback request failed", error);
        throw error;
      }
    },
    [authInitialized, isAuthenticated, user],
  );

  const safeAiFetch = useMemo(
    () => aiFetch ?? fallbackAiFetch,
    [aiFetch, fallbackAiFetch],
  );

  // ===== STATE =====
  const [activeTab, setActiveTab] = useState<"agent" | "assistant">(
    "assistant",
  );
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Add initialization state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isChatsCollapsed, setIsChatsCollapsed] = useState(false);
  const [isArchivedCollapsed, setIsArchivedCollapsed] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [contextDepth, setContextDepth] = useState(3); // 1-10 scale for conversation context
  const modelSelectId = "replit-assistant-model";
  const overrideSelectId = "replit-assistant-override";
  const languageModeSelectId = "replit-assistant-language-mode";
  const contextDepthSliderId = "replit-assistant-context-depth";
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [languageMode, setLanguageMode] = useState<
    "georgian" | "english" | "mixed"
  >("georgian");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pulsingMessageId, setPulsingMessageId] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);

  // Phase 4: Checkpoints System State
  const [checkpoints, setCheckpoints] = useState<
    Array<{
      id: string;
      name: string;
      timestamp: string;
      sessionId: string;
      messages: ChatMessage[];
      metadata: { messageCount: number; userActivity: string };
    }>
  >([]);
  const [isCheckpointsVisible, setIsCheckpointsVisible] = useState(false);

  // Dynamic model loading state
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [manualOverride, setManualOverride] = useState<
    "auto" | "small" | "large"
  >("auto");
  const [lastResponseMeta, setLastResponseMeta] = useState<{
    policy?: string;
    model?: string;
    modelLabel?: string;
    overridden?: boolean;
  }>({});

  // Models caching and polling state
  const modelsCache = useRef<{
    models: AIModel[];
    timestamp: number;
    ttl: number;
  } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingModelsRef = useRef<boolean>(false);
  const [pollingActive, setPollingActive] = useState(true);
  const [backoffDelay, setBackoffDelay] = useState(30000); // Start with 30s
  const initializationGuardRef = useRef<boolean>(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const emotionalStateRef = useRef<EmotionalState>('idle');
  const settleTimeoutRef = useRef<number>();

  const updateEmotionalState = useCallback(
    (next: EmotionalState) => {
      if (emotionalStateRef.current === next) {
        return;
      }
      emotionalStateRef.current = next;
      onEmotionalStateChange?.(next);
    },
    [onEmotionalStateChange],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthorizationError(null);
    }
  }, [isAuthenticated]);

  // ===== CHAT PERSISTENCE =====
  const STORAGE_KEY = "replit_assistant_chats";

  // Get current chat messages
  const currentChat = chatSessions.find(
    (session) => session.id === currentSessionId,
  );
  const chatMessages = currentChat?.messages || [];
  const hasActiveChat = chatMessages.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = undefined;
    }

    if (!isAuthenticated) {
      updateEmotionalState('idle');
      return;
    }

    if (isLoading) {
      updateEmotionalState('thinking');
      return;
    }

    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.type === 'ai') {
      updateEmotionalState('responding');
      settleTimeoutRef.current = window.setTimeout(() => {
        updateEmotionalState('idle');
        settleTimeoutRef.current = undefined;
      }, 2400);
      return;
    }

    updateEmotionalState('idle');
  }, [chatMessages, isAuthenticated, isLoading, updateEmotionalState]);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (chatMessages.length === 0) {
      return;
    }
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.type === "ai") {
      setPulsingMessageId(lastMessage.id);
      const timeout = window.setTimeout(() => {
        setPulsingMessageId(null);
      }, 900);

      return () => window.clearTimeout(timeout);
    }
    setPulsingMessageId(null);
    return undefined;
  }, [chatMessages]);

  // Load chat sessions from localStorage on component mount
  useEffect(() => {
    const loadChatSessions = async () => {
      setIsInitializing(true);
      try {
        const savedChats = localStorage.getItem(STORAGE_KEY);
        if (savedChats) {
          try {
            const parsed = JSON.parse(savedChats); // <--- შესწორებული (JSON.parse)
            // Remove duplicates and migrate old sessions
            const uniqueSessions = parsed.filter(
              (session: any, index: number, array: any[]) =>
                array.findIndex((s) => s.id === session.id) === index,
            );
            const migratedSessions = uniqueSessions.map((session: any) => ({
              ...session,
              isArchived: session.isArchived || false,
            }));
            setChatSessions(migratedSessions);
            // Set the last active session as current
            const activeSession = migratedSessions.find(
              (session: ChatSession) => session.isActive,
            );
            if (activeSession) {
              setCurrentSessionId(activeSession.id);
            }
          } catch (parseError) {
            console.error("Error parsing chat sessions:", parseError);
            // Clear corrupted data
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (storageError) {
        console.error("Error accessing localStorage:", storageError);
      } finally {
        setIsInitializing(false);
      }
    };

    loadChatSessions();
  }, []);

  // Load available models with single-flight guard and caching
  const loadModels = useCallback(async (): Promise<AIModel[]> => {
    // Check cache first (TTL: 60 seconds minimum)
    if (modelsCache.current) {
      const age = Date.now() - modelsCache.current.timestamp;
      if (age < modelsCache.current.ttl) {
        console.log("🔄 [MODELS] Using cached models");
        return modelsCache.current.models;
      }
    }

    console.log("🔍 [MODELS] Loading models from API...");
    
    return singleFlight("loadModels", async () => {
      try {
        const response = await safeAiFetch("/api/ai/models");
        if (response.success && Array.isArray(response.models)) {
          console.log("✅ [MODELS] Loaded models successfully:", response.models);
          
          // Cache the models for 120 seconds
          modelsCache.current = {
            models: response.models,
            timestamp: Date.now(),
            ttl: 120000
          };
          
          // Reset backoff on success
          setBackoffDelay(30000);
          setPollingActive(true);
          
          return response.models;
        } else {
          throw new Error("Failed to load models or format is invalid");
        }
      } catch (error: any) {
        console.error("❌ [MODELS] Error loading models:", error);
        
        // Handle 429 rate limiting with exponential backoff
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          console.warn("🚫 [MODELS] Rate limited, applying exponential backoff");
          setBackoffDelay(prev => Math.min(prev * 2, 120000)); // Cap at 2 minutes
          setPollingActive(false);
          
          // Re-enable polling after backoff period
          setTimeout(() => {
            setPollingActive(true);
          }, backoffDelay);
        }
        
        // Return cached models if available, even if expired
        if (modelsCache.current) {
          console.log("🔄 [MODELS] Using expired cache as fallback");
          return modelsCache.current.models;
        }
        
        // Return empty array as final fallback
        return [];
      }
    });
  }, [safeAiFetch, backoffDelay]);

  // Initialize models loading with StrictMode guard
  useEffect(() => {
    const initializeModels = async () => {
      // StrictMode development guard
      if (import.meta.env.DEV && initializationGuardRef.current) {
        console.log("🟡 [MODELS] Skipping duplicate initialization (StrictMode)");
        return;
      }
      initializationGuardRef.current = true;

      if (!authInitialized || !isAuthenticated) {
        console.log("🟡 [MODELS] Skipping model load - authentication not ready");
        return;
      }

      try {
        loadingModelsRef.current = true;
        const models = await loadModels();
        
        setAvailableModels(models);
        const defaultModel = models.find((m: AIModel) => m.category === "small");
        if (defaultModel && !selectedModel) {
          setSelectedModel(defaultModel.id);
        }
      } finally {
        loadingModelsRef.current = false;
      }
    };

    initializeModels();
  }, [authInitialized, isAuthenticated]);  // Remove loadModels, selectedModel dependencies to prevent loops

  // Smart polling with visibility detection
  useEffect(() => {
    if (!authInitialized || !isAuthenticated || !pollingActive) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("🔕 [MODELS] Tab hidden, pausing polling");
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        console.log("👁️ [MODELS] Tab visible, resuming polling");
        startPolling();
      }
    };

    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(async () => {
        if (!loadingModelsRef.current && !document.hidden) {
          try {
            // Check if cache is still fresh (avoid unnecessary API calls)
            if (modelsCache.current) {
              const age = Date.now() - modelsCache.current.timestamp;
              if (age < 60000) { // Cache is fresh, skip polling this round
                console.log(`⏭️ [MODELS] Skipping poll - cache fresh (${Math.round(age/1000)}s)`);
                return;
              }
            }
            
            const models = await loadModels();
            setAvailableModels(models);
          } catch (error) {
            console.warn("🟡 [MODELS] Polling update failed:", error);
          }
        }
      }, Math.max(60000, backoffDelay)); // Minimum 60 seconds, respect backoff
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    if (!document.hidden) {
      startPolling();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [authInitialized, isAuthenticated, pollingActive, backoffDelay]);  // Remove loadModels dependency to prevent loops

  // Load checkpoints from localStorage on mount
  useEffect(() => {
    const storedCheckpoints = localStorage.getItem("gurulo-checkpoints");
    if (storedCheckpoints) {
      try {
        setCheckpoints(JSON.parse(storedCheckpoints));
      } catch (error) {
        console.warn("Failed to load checkpoints:", error);
        localStorage.removeItem("gurulo-checkpoints");
      }
    }
  }, []);

  // Save checkpoints to localStorage whenever they change
  useEffect(() => {
    if (checkpoints.length > 0) {
      localStorage.setItem("gurulo-checkpoints", JSON.stringify(checkpoints));
    }
  }, [checkpoints]);

  // Cleanup on unmount - clear all intervals and guards
  useEffect(() => {
    return () => {
      console.log("🧹 [CLEANUP] Clearing all intervals and refs");
      
      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Reset loading state
      loadingModelsRef.current = false;
      
      // Reset initialization guard for next mount
      initializationGuardRef.current = false;
      
      // Clear models cache
      modelsCache.current = null;
    };
  }, []);

  // Save chat sessions to localStorage whenever they change (deduplicated)
  useEffect(() => {
    if (chatSessions.length > 0) {
      // Remove any duplicate sessions before saving
      const uniqueSessions = chatSessions.filter(
        (session, index, array) =>
          array.findIndex((s) => s.id === session.id) === index,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueSessions));

      // Update state if duplicates were found
      if (uniqueSessions.length !== chatSessions.length) {
        setChatSessions(uniqueSessions);
      }
    }
  }, [chatSessions]);

  // Generate Replit-style title from message content
  const generateReplitTitle = (content: string): string => {
    // Clean and truncate the content
    const cleanContent = content.trim();
    const words = cleanContent.split(" ");

    // Take first few meaningful words (2-4 words)
    const meaningfulWords = words.slice(0, 3).join(" ");

    // Add ellipsis if content is longer
    const title = words.length > 3 ? `${meaningfulWords}...` : meaningfulWords;

    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  // Create a new chat session
  const createNewChatSession = useCallback(() => {
    const newSessionId = `chat_${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: "ახალი ჩატი",
      messages: [],
      lastActivity: new Date().toISOString(),
      isActive: true,
      isArchived: false,
    };

    setChatSessions((prev) => {
      // Check if session already exists to prevent duplicates
      if (prev.some((session) => session.id === newSessionId)) {
        return prev;
      }
      // Mark all other sessions as inactive
      const updatedSessions = prev.map((session) => ({
        ...session,
        isActive: false,
      }));
      return [...updatedSessions, newSession];
    });
    setCurrentSessionId(newSessionId);
    setChatInput("");
  }, [chatSessions]);

  // Auto-create first session if none exist (only once on mount)
  useEffect(() => {
    const hasInitialized = sessionStorage.getItem("assistant_initialized");
    if (!hasInitialized && chatSessions.length === 0 && !currentSessionId) {
      try {
        sessionStorage.setItem("assistant_initialized", "true");
        // Add delay to ensure component is fully mounted
        setTimeout(() => {
          createNewChatSession();
        }, 100);
      } catch (error) {
        console.warn("Session storage not available:", error);
        // Create session without storage dependency
        createNewChatSession();
      }
    }
  }, [chatSessions, currentSessionId, createNewChatSession]); // Add dependencies for better reactivity

  // Switch to a different chat session
  const switchToChatSession = (sessionId: string) => {
    setChatSessions((prev) =>
      prev.map((session) => ({
        ...session,
        isActive: session.id === sessionId,
      })),
    );
    setCurrentSessionId(sessionId);
  };

  // Update current session messages
  const updateCurrentSessionMessages = (messages: ChatMessage[]) => {
    if (!currentSessionId) return;

    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id === currentSessionId) {
          // Generate Replit-style title from first user message
          const title =
            messages.length > 0 && messages[0].type === "user"
              ? generateReplitTitle(messages[0].content)
              : "ახალი ჩატი";

          return {
            ...session,
            messages,
            title,
            lastActivity: new Date().toISOString(),
          };
        }
        return session;
      }),
    );
  };

  // Archive/unarchive a chat session
  const toggleArchiveSession = (sessionId: string) => {
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, isArchived: !session.isArchived }
          : session,
      ),
    );
  };

  // ===== PROMPT SUGGESTIONS =====
  const promptSuggestions = [
    {
      text: "შეამოწმე ერორები",
      action: "inspect-errors",
    },
    {
      text: "გააუმჯობესე ვიზუალური დიზაინი",
      action: "improve-design",
    },
    {
      text: "გენერირება ახალი ფუნქციების",
      action: "brainstorm-features",
    },
    {
      text: "დაამატე dark mode ღილაკი",
      action: "add-dark-mode",
    },
    {
      text: "ოპტიმიზება მობილისთვის",
      action: "optimize-mobile",
    },
    {
      text: "განმარტე ეს კოდი",
      action: "explain-code",
    },
  ];

  // ===== FILE ATTACHMENT HANDLER =====
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileNames = Array.from(files).map((file) => file.name);
      setSelectedFiles((prev) => [...prev, ...fileNames]);

      // Reset the input to allow re-selecting the same files
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ===== PHASE 4: CHECKPOINTS FUNCTIONS =====
  const createCheckpoint = useCallback(
    (customName?: string) => {
      const currentSession = chatSessions.find(
        (s) => s.id === currentSessionId,
      );
      if (!currentSession) return;

      const checkpoint = {
        id: `checkpoint_${Date.now()}`,
        name:
          customName ||
          `Checkpoint ${new Date().toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}`,
        timestamp: new Date().toISOString(),
        sessionId: currentSession.id,
        messages: [...currentSession.messages],
        metadata: {
          messageCount: currentSession.messages.length,
          userActivity: new Date().toLocaleString("ka-GE"),
        },
      };

      setCheckpoints((prev) => [checkpoint, ...prev].slice(0, 10)); // Keep last 10 checkpoints
      console.log("📸 [CHECKPOINT] Created:", checkpoint.name);
    },
    [currentSessionId, chatSessions],
  );

  const rollbackToCheckpoint = useCallback(
    (checkpointId: string) => {
      const checkpoint = checkpoints.find((c) => c.id === checkpointId);
      if (!checkpoint) {
        console.error("Checkpoint not found:", checkpointId);
        return;
      }

      // Restore messages to the checkpoint state
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === checkpoint.sessionId
            ? {
                ...session,
                messages: [...checkpoint.messages],
                lastActivity: new Date().toISOString(),
              }
            : session,
        ),
      );

      console.log("⏪ [ROLLBACK] Restored to checkpoint:", checkpoint.name);
    },
    [checkpoints],
  );

  const deleteCheckpoint = useCallback((checkpointId: string) => {
    setCheckpoints((prev) => prev.filter((c) => c.id !== checkpointId));
  }, []);

  // ===== CHAT FUNCTIONS =====
  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    // Create new session if none exists and return without sending
    if (!currentSessionId) {
      createNewChatSession();
      return; // Don't send message immediately, wait for user to click again
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: chatInput,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...chatMessages, userMessage];
    updateCurrentSessionMessages(updatedMessages);

    const currentInput = chatInput;
    setChatInput("");
    setIsLoading(true);

    try {
      // This part is modified based on the provided context and solution
      let enhancedQuery = currentInput;
      // Check if this is a file system related query
      if (
        enhancedQuery.toLowerCase().includes("file") ||
        enhancedQuery.toLowerCase().includes("ფაილ")
      ) {
        // Use backend file API
        try {
          const fileContext = await safeAiFetch("/api/files/tree", {
            credentials: "include",
          });
          if (fileContext?.files) {
            enhancedQuery += `\n\nCurrent file structure: ${JSON.stringify(fileContext.files).substring(0, 500)}...`;
          }
        } catch (error) {
          console.error("Failed to fetch file context:", error);
        }
      }

      // Use intelligent-chat endpoint for dynamic model routing
      const requestBody: any = {
        message: enhancedQuery, // Use the potentially enhanced query
        personalId: user?.personalId || "anonymous",
        // Pass conversation history for context (dynamic depth)
        conversationHistory: chatMessages
          .map((m) => ({
            role: m.type === "ai" ? "assistant" : "user",
            content: m.content,
          }))
          .slice(-contextDepth), // Dynamic context depth
        attachedFiles: selectedFiles.length > 0 ? selectedFiles : undefined,
        streamingEnabled,
        languageMode,
        audience: "admin_dev",
        metadata: {
          audience: "admin_dev",
        },
      };

      // Add model selection and manual override
      if (selectedModel) {
        requestBody.selectedModel = selectedModel;
      }
      if (manualOverride !== "auto") {
        requestBody.modelOverride = manualOverride;
      }

      const data = await safeAiFetch("/api/ai/intelligent-chat", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      // Extract response content from intelligent-chat format
      const responseContent =
        typeof data.response === "string"
          ? data.response
          : data.response?.content || data.response || "No response received";

      // Update last response metadata for badge display
      if (data.policy && data.model) {
        setLastResponseMeta({
          policy: data.policy,
          model: data.model,
          modelLabel: data.modelLabel || "Unknown Model",
          overridden: data.overridden,
        });
      }

      // Phase 1: Enhanced Message Formatting
      const enhancedMessage = formatEnhancedMessage(responseContent);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: enhancedMessage.content,
        timestamp: new Date().toISOString(),
        policy: data.policy,
        model: data.model,
        modelLabel: data.modelLabel,
        // Phase 1: Enhanced formatting integration
        enhanced: enhancedMessage,
        category: enhancedMessage.category,
      };

      const finalMessages = [...updatedMessages, aiResponse];
      updateCurrentSessionMessages(finalMessages);

      // Auto-create checkpoint after AI response
      setTimeout(() => createCheckpoint(), 500);
    } catch (error: any) {
      // Phase 1: Enhanced Error Message Formatting
      const errorContent = `❌ **შეცდომა:** ${error.message}`;
      const enhancedErrorMessage = formatEnhancedMessage(errorContent);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: enhancedErrorMessage.content,
        timestamp: new Date().toISOString(),
        // Phase 1: Enhanced formatting for errors
        enhanced: enhancedErrorMessage,
        category: "error",
      };
      const errorMessages = [...updatedMessages, errorMessage];
      updateCurrentSessionMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: (typeof promptSuggestions)[0]) => {
    setChatInput(suggestion.text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // ===== AUTO-SCROLL =====
  // Only scroll when AI responds, not when user types
  useEffect(() => {
    if (chatContainerRef.current && chatMessages.length > 0) {
      // Only auto-scroll if the last message is from AI
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (lastMessage?.type === "ai") {
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight;
          }
        }, 100); // Small delay to ensure message is rendered
      }
    }
  }, [chatMessages]);

  // Show loading indicator while initializing
  if (isInitializing) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-slate-950/40 text-slate-200 backdrop-blur-2xl">
        <div className="flex items-center gap-3 text-slate-300/80">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500/40 border-t-transparent" />
          <span className="text-sm tracking-[0.28em] uppercase">Loading Gurulo Assistant...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-[100vh] w-full flex-col overflow-hidden text-slate-100">
      {/* ===== HEADER TABS ===== */}
      <div className="living-ai-tabbar relative w-full px-6 py-4 !bg-transparent backdrop-blur-2xl border-b border-white/10 shadow-[0_18px_48px_rgba(8,14,40,0.55)]">
        <div className="living-ai-tablist" role="tablist" aria-label="Assistant modes">
          <button
            type="button"
            onClick={() => setActiveTab("agent")}
            className="living-ai-tab"
            data-active={activeTab === "agent"}
            role="tab"
            aria-selected={activeTab === "agent"}
          >
            <User size={16} aria-hidden="true" />
            <span className="text-[0.75rem] tracking-[0.08em]">Agent</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("assistant")}
            className="living-ai-tab"
            data-active={activeTab === "assistant"}
            role="tab"
            aria-selected={activeTab === "assistant"}
          >
            <Sparkles size={16} aria-hidden="true" />
            <span className="text-[0.75rem] tracking-[0.08em]">Assistant</span>
          </button>
        </div>

        {/* Current File Display */}
        {currentFile && (
          <div className="hidden items-center gap-2 font-jetbrains text-[0.68rem] tracking-[0.24em] text-slate-300/70 md:flex">
            <div className="h-[6px] w-[6px] rounded-full bg-cyan-400/80"></div>
            <span className="uppercase">{currentFile}</span>
            <Plus size={16} className="cursor-pointer text-slate-400 transition hover:text-cyan-200" aria-hidden="true" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 text-slate-300/80">
          <button
            onClick={() => createCheckpoint()}
            className="rounded-full p-2 transition-all hover:bg-white/10 hover:text-white"
            title="📸 Create Checkpoint"
          >
            <Camera size={16} />
          </button>
          <button
            onClick={() => {
              const lastCheckpoint = checkpoints.find(
                (c) => c.sessionId === currentSessionId,
              );
              if (lastCheckpoint) rollbackToCheckpoint(lastCheckpoint.id);
            }}
            className="rounded-full p-2 transition-all hover:bg-white/10 hover:text-white"
            title="⏪ Rollback to Last Checkpoint"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => setIsCheckpointsVisible(!isCheckpointsVisible)}
            className={`rounded-full p-2 transition-all hover:bg-white/10 ${
              isCheckpointsVisible ? "text-sky-300" : "text-slate-300/70 hover:text-white"
            }`}
            title="🔄 View Checkpoints"
          >
            <Clock size={16} />
          </button>
          <button className="rounded-full p-2 text-slate-300/70 transition-all hover:bg-white/10 hover:text-white">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {authorizationError && (
        <div className="border-b border-rose-500/30 bg-rose-500/15 px-6 py-2 text-sm text-rose-100">
          {authorizationError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ===== LEFT SIDEBAR ===== */}
        <div className="flex w-60 min-h-0 flex-col border-r border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_28px_80px_rgba(8,13,31,0.45)]">
          <div className="px-4 py-4">
            <button
              onClick={createNewChatSession}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200/80 transition-all duration-500 hover:-translate-y-[2px] hover:border-white/40 hover:text-white hover:shadow-[0_22px_48px_rgba(88,63,233,0.45)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/80 transition-colors group-hover:bg-white/20">
                <Plus size={16} />
              </span>
              New chat
            </button>
          </div>

          {/* Chat History with Collapsible Sections */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-1 console-scrollbar">
            {/* Chats Section */}
            <div className="mb-4">
              <div
                onClick={() => setIsChatsCollapsed(!isChatsCollapsed)}
                className="mb-2 flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-300/70 transition-colors hover:text-white"
              >
                <span>Chats</span>
                <div
                  className={`transform transition-transform ${isChatsCollapsed ? "rotate-0" : "rotate-90"}`}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="currentColor"
                  >
                    <path d="M3 0L6 4L3 8V0Z" />
                  </svg>
                </div>
              </div>

              {!isChatsCollapsed && (
                <div className="space-y-2">
                  {chatSessions
                    .filter((session) => !session.isArchived)
                    .sort(
                      (a, b) =>
                        new Date(b.lastActivity).getTime() -
                        new Date(a.lastActivity).getTime(),
                    )
                    .map((session) => (
                      <div
                        key={session.id}
                        className={`group relative cursor-pointer rounded-2xl border px-4 py-3 text-sm transition-all duration-500 ${
                          session.id === currentSessionId
                            ? "border-white/40 bg-white/15 text-white shadow-[0_20px_45px_rgba(88,63,233,0.45)]"
                            : "border-white/10 bg-white/5 text-slate-200/80 hover:-translate-y-[1px] hover:border-white/25 hover:bg-white/10 hover:text-white hover:shadow-[0_18px_40px_rgba(56,33,159,0.45)]"
                        }`}
                        onClick={() => switchToChatSession(session.id)}
                      >
                        <div className="truncate pr-8 font-medium tracking-wide">
                          {session.title}
                        </div>
                        <div className="mt-1 text-[0.65rem] uppercase tracking-[0.28em] text-slate-200/60">
                          {session.messages.length} წერილი ·{" "}
                          {new Date(session.lastActivity).toLocaleDateString("ka-GE")}
                        </div>

                        {/* Archive button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleArchiveSession(session.id);
                          }}
                          className="absolute right-2 top-2 rounded-full bg-white/10 px-2 py-1 text-[0.6rem] text-slate-100 opacity-0 shadow-[0_12px_24px_rgba(22,14,56,0.45)] transition-all duration-300 group-hover:opacity-100 hover:bg-white/20"
                        >
                          📦
                        </button>
                      </div>
                    ))}

                  {chatSessions.filter((session) => !session.isArchived).length === 0 && (
                    <div className="py-6 text-center text-[0.7rem] uppercase tracking-[0.3em] text-slate-300/60">
                      No recent chats
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Archived Section */}
            {chatSessions.some((session) => session.isArchived) && (
              <div className="mb-4">
                <div
                  onClick={() => setIsArchivedCollapsed(!isArchivedCollapsed)}
                  className="mb-2 flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-300/70 transition-colors hover:text-white"
                >
                  <span>Archived</span>
                  <div
                    className={`transform transition-transform ${isArchivedCollapsed ? "rotate-0" : "rotate-90"}`}
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      fill="currentColor"
                    >
                      <path d="M3 0L6 4L3 8V0Z" />
                    </svg>
                  </div>
                </div>

                {!isArchivedCollapsed && (
                  <div className="space-y-2">
                    {chatSessions
                      .filter((session) => session.isArchived)
                      .sort(
                        (a, b) =>
                          new Date(b.lastActivity).getTime() -
                          new Date(a.lastActivity).getTime(),
                      )
                      .map((session) => (
                        <div
                          key={session.id}
                          className={`group relative cursor-pointer rounded-2xl border px-4 py-3 text-sm transition-all duration-500 ${
                            session.id === currentSessionId
                              ? "border-white/40 bg-white/15 text-white shadow-[0_20px_45px_rgba(88,63,233,0.45)]"
                              : "border-white/10 bg-white/5 text-slate-200/70 hover:-translate-y-[1px] hover:border-white/25 hover:bg-white/10 hover:text-white hover:shadow-[0_18px_40px_rgba(56,33,159,0.45)]"
                          }`}
                          onClick={() => switchToChatSession(session.id)}
                        >
                          <div className="truncate pr-8 text-sm font-medium tracking-wide text-slate-100/80">
                            {session.title}
                          </div>
                          <div className="mt-1 text-[0.65rem] uppercase tracking-[0.28em] text-slate-200/50">
                            {session.messages.length} წერილი ·{" "}
                            {new Date(session.lastActivity).toLocaleDateString("ka-GE")}
                          </div>

                          {/* Unarchive button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleArchiveSession(session.id);
                            }}
                            className="absolute right-2 top-2 rounded-full bg-white/10 px-2 py-1 text-[0.6rem] text-slate-100 opacity-0 shadow-[0_12px_24px_rgba(22,14,56,0.45)] transition-all duration-300 group-hover:opacity-100 hover:bg-white/20"
                          >
                            📤
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Bottom Actions */}
          <div className="space-y-2 border-t border-white/10 px-4 py-4">
            <button
              onClick={() => alert("Checkpoints ფუნქციონალი მალე დაემატება!")}
              className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200/70 transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sky-200 transition group-hover:bg-white/20 group-hover:text-white">
                <RotateCcw size={16} />
              </span>
              Checkpoints
            </button>
            <button
              onClick={() => alert("Settings ფუნქციონალი მალე დაემატება!")}
              className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200/70 transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200 transition group-hover:bg-white/20 group-hover:text-white">
                <Settings size={16} />
              </span>
              Settings
            </button>
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {!hasActiveChat ? (
            // ===== WELCOME SCREEN =====
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 px-12 py-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10 shadow-[0_26px_60px_rgba(22,18,56,0.55)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-white/40 text-white/70">
                    <Plus size={18} />
                  </div>
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  New chat with Assistant
                </h2>
                <p className="text-base text-slate-200/70">
                  Assistant answers questions, refines code, and makes precise edits.
                </p>
              </div>

              {/* ===== PROMPT SUGGESTIONS ===== */}
              <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {promptSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200/70 transition-all duration-300 hover:-translate-y-[2px] hover:border-white/30 hover:bg-white/10 hover:text-white"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // ===== CHAT MESSAGES =====
            <div
              ref={chatContainerRef}
              className="console-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-6"
              style={{
                scrollBehavior: "smooth",
              }}
            >
              {chatMessages.map((message) => {
                const isAssistant = message.type === "ai";
                const isPulsing = isAssistant && pulsingMessageId === message.id;

                return (
                  <div
                    key={message.id}
                    className={`flex w-full gap-4 ${
                      isAssistant
                        ? "items-end justify-start"
                        : "justify-end"
                    } mb-4`}
                  >
                    {isAssistant && (
                      <div
                        className={`replit-assistant-avatar ${
                          isPulsing ? "replit-assistant-avatar--pulse" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <span className="replit-assistant-avatar__halo" />
                        <span className="replit-assistant-avatar__core">GU</span>
                      </div>
                    )}

                    <div
                      className={
                        isAssistant ? ASSISTANT_BUBBLE_CLASS : USER_BUBBLE_CLASS
                      }
                    >
                      {isAssistant ? (
                        <EnhancedMessageRenderer
                          message={
                            message.enhanced || {
                              id: message.id,
                              content: message.content,
                              category: message.category || "primary",
                              hasCodeBlocks: false,
                              codeBlocks: [],
                              visualElements: [],
                              georgianFormatted: false,
                            }
                          }
                          className="message-enhanced-content"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">
                          {message.content}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex w-full items-end justify-start gap-4">
                  <div className="replit-assistant-avatar replit-assistant-avatar--pulse" aria-hidden="true">
                    <span className="replit-assistant-avatar__halo" />
                    <span className="replit-assistant-avatar__core">GU</span>
                  </div>
                  <div className={LOADING_BUBBLE_CLASS}>
                    <div className="flex items-center gap-2 text-white/80">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200/60 border-t-transparent"></div>
                      <span className="text-sm tracking-wide">Assistant is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== BOTTOM INPUT AREA ===== */}
          <div className="flex-shrink-0 border-t border-white/10 bg-white/5 px-6 py-5 backdrop-blur-2xl shadow-[0_-18px_48px_rgba(8,14,40,0.45)]">
            {/* Advanced Controls */}
            <div className="mb-3">
              <div className="mb-2 flex items-center gap-3">
                <button
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="group inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-white/5 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-cyan-200 transition-all hover:border-cyan-200/60 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                >
                  <Sparkles className="h-4 w-4 text-cyan-300 transition-colors group-hover:text-cyan-100" />
                  <span>Advanced</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div className="ml-auto flex items-center gap-2 text-xs font-medium text-cyan-100/70">
                  <span>
                    {availableModels.find((m) => m.id === selectedModel)?.label || "Loading..."}
                  </span>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300"></div>

                  {lastResponseMeta.policy && (
                    <div className="ml-3 flex items-center gap-1 rounded-full border border-cyan-400/30 bg-[rgba(10,10,20,0.65)] px-3 py-1 text-[0.65rem] uppercase tracking-wide text-cyan-100/80">
                      <span className="text-cyan-200">Policy</span>
                      <span className="text-white/60">{lastResponseMeta.policy}</span>
                      <span className="text-cyan-200">· Model</span>
                      <span className="text-white/60">
                        {lastResponseMeta.model} ({lastResponseMeta.modelLabel})
                      </span>
                      {lastResponseMeta.overridden && (
                        <span className="ml-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[0.55rem] font-bold text-rose-200">
                          Override
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isAdvancedOpen && (
                <div className="living-ai-field mb-3 space-y-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor={modelSelectId}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70"
                      >
                        Model
                      </label>
                      <select
                        id={modelSelectId}
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="living-ai-select"
                      >
                        {availableModels.length === 0 ? (
                          <option value="">Loading models...</option>
                        ) : (
                          availableModels.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.label} ({model.category})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={overrideSelectId}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70"
                      >
                        Manual Override
                      </label>
                      <select
                        id={overrideSelectId}
                        value={manualOverride}
                        onChange={(e) =>
                          setManualOverride(
                            e.target.value as "auto" | "small" | "large",
                          )
                        }
                        className="living-ai-select"
                      >
                        <option value="auto">Auto (Router Decision)</option>
                        <option value="small">Force Small Model</option>
                        <option value="large">Force Large Model</option>
                      </select>
                      <p className="text-[0.7rem] text-cyan-100/60">
                        Override automatic model routing. Auto uses policy-based selection.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={contextDepthSliderId}
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70"
                    >
                      Context Depth
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id={contextDepthSliderId}
                        type="range"
                        min="1"
                        max="10"
                        value={contextDepth}
                        onChange={(e) => setContextDepth(parseInt(e.target.value))}
                        className="living-ai-slider flex-1"
                      />
                      <span className="w-10 text-center text-sm font-semibold text-cyan-100">
                        {contextDepth}
                      </span>
                    </div>
                    <p className="text-[0.7rem] text-cyan-100/60">
                      Number of previous messages to include (1-10)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={languageModeSelectId}
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70"
                    >
                      Language Mode
                    </label>
                    <select
                      id={languageModeSelectId}
                      value={languageMode}
                      onChange={(e) =>
                        setLanguageMode(
                          e.target.value as "georgian" | "english" | "mixed",
                        )
                      }
                      className="living-ai-select"
                    >
                      <option value="georgian">🇬🇪 ქართული (Georgian)</option>
                      <option value="english">🇺🇸 English</option>
                      <option value="mixed">🌐 Mixed Languages</option>
                    </select>
                    <p className="text-[0.7rem] text-cyan-100/60">
                      Response language preference
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="living-ai-toggle text-sm">
                      <input
                        type="checkbox"
                        id="stream-output"
                        checked={streamingEnabled}
                        onChange={(e) => setStreamingEnabled(e.target.checked)}
                      />
                      <span className="text-cyan-50/80">
                        ⚡ Stream responses (პასუხების ნაკადი)
                      </span>
                    </label>

                    <label className="living-ai-toggle text-sm">
                      <input
                        type="checkbox"
                        id="include-context"
                        defaultChecked
                      />
                      <span className="text-cyan-50/80">
                        📁 Include project context (პროექტის კონტექსტი)
                      </span>
                    </label>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                        <Brain size={18} className="text-cyan-200" /> AI მეხსიერება
                      </span>
                      <button
                        type="button"
                        onClick={() => memoryControls.refresh()}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wide text-cyan-100/80 transition hover:border-cyan-200/70 hover:text-cyan-50"
                        disabled={memoryControls.loading}
                      >
                        <RefreshCw size={12} /> განახლება
                      </button>
                    </div>
                    <p className="mt-1 text-[0.7rem] text-cyan-100/60">
                      გურულო პასუხებს პერსონალიზებს შენახული მეხსიერების საფუძველზე. საჭიროა მომხმარებლის თანხმობა და მონაცემები ინახება დაშიფრული სახით.
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <label className="living-ai-toggle">
                        <input
                          type="checkbox"
                          checked={memoryControls.controls.referenceSavedMemories}
                          onChange={(event) =>
                            memoryControls.toggleFeature(
                              'savedMemories',
                              event.target.checked,
                            )
                          }
                          disabled={memoryControls.loading}
                        />
                        <span
                          className="text-cyan-50/80"
                          title="გურულო გამოიყენებს შენახულ ფაქტებსა და პრეფერენციებს პასუხების გასაუმჯობესებლად."
                        >
                          🧠 შენახული მეხსიერებების გამოყენება
                        </span>
                      </label>
                      <label className="living-ai-toggle">
                        <input
                          type="checkbox"
                          checked={memoryControls.controls.referenceChatHistory}
                          onChange={(event) =>
                            memoryControls.toggleFeature(
                              'chatHistory',
                              event.target.checked,
                            )
                          }
                          disabled={memoryControls.loading}
                        />
                        <span
                          className="text-cyan-50/80"
                          title="გურულო ავტომატურად ჩართავს წინა დიალოგებს დამატებითი კონტექსტისთვის."
                        >
                          🗂️ ჩატის ისტორიის ჩართვა
                        </span>
                      </label>
                    </div>
                    {memoryControls.error && (
                      <p className="mt-2 text-xs text-rose-400">❌ {memoryControls.error}</p>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
                      📎 File Attachments
                    </label>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.md,.txt"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-cyan-300/40 bg-[rgba(13,23,42,0.75)] px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/60 hover:text-white"
                      >
                        <Paperclip size={16} />
                        Choose files...
                      </button>
                      {selectedFiles.length > 0 && (
                        <button
                          onClick={() => setSelectedFiles([])}
                          className="rounded-full border border-rose-400/40 px-4 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-300/70 hover:text-white"
                          title="Clear selected files"
                        >
                          Clear ({selectedFiles.length})
                        </button>
                      )}
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="mt-3 max-h-24 space-y-1 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-cyan-300/20 bg-[rgba(10,10,20,0.65)] px-3 py-1 text-xs text-cyan-100"
                          >
                            <span className="truncate">
                              {file}
                            </span>
                            <button
                              onClick={() =>
                                setSelectedFiles((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                              className="ml-3 text-cyan-200 transition hover:text-rose-300"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input Field - Fixed positioning with viewport height calculation */}
            <div className="relative flex-shrink-0 mt-auto">
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                onFocus={() => {
                  // Prevent auto-scroll when user is typing
                  if (chatContainerRef.current) {
                    const container = chatContainerRef.current;
                    const isAtBottom =
                      container.scrollTop + container.clientHeight >=
                      container.scrollHeight - 10;
                    if (!isAtBottom) {
                      // If not at bottom, don't force scroll
                      return;
                    }
                  }
                }}
                placeholder="Ask Assistant, use @ to include specific files..."
                className="w-full rounded-[18px] border border-white/10 bg-white/10 px-5 py-3 pr-32 text-[0.95rem] text-white/90 placeholder:text-white/40 shadow-[0_18px_46px_rgba(15,23,42,0.45)] backdrop-blur-lg transition-all focus:outline-none focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/30 min-h-[44px] max-h-32"
                rows={1}
              />

              {/* Input Controls */}
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.md,.txt"
              />

              <div className="absolute right-3 top-3 flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Attach files"
                >
                  <Paperclip size={16} />
                </button>

                {selectedFiles.length > 0 && (
                  <span className="text-white/60 text-sm">
                    {selectedFiles.length} files
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsMicActive((prev) => !prev)}
                  aria-pressed={isMicActive}
                  className={`${GLOW_BUTTON_CLASS} ${
                    isMicActive ? GLOW_BUTTON_ACTIVE_CLASS : ''
                  }`}
                  title={isMicActive ? "Stop listening" : "Start voice input"}
                >
                  <Mic size={16} />
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || isLoading}
                  className={`${GLOW_BUTTON_CLASS} ${
                    !chatInput.trim() || isLoading ? '' : GLOW_BUTTON_ACTIVE_CLASS
                  }`}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AiDeveloperPanel;
