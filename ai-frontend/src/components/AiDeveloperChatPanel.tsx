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
  Check,
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
import { useVectorMemory } from "../hooks/useVectorMemory";
import {
  SemanticContextPayload,
  VectorMemoryResult,
  DEFAULT_SEMANTIC_SEARCH_OPTIONS,
} from "../types/semanticContext";

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

export type EmotionalState = "idle" | "thinking" | "responding";

interface ReplitAssistantPanelProps {
  currentFile?: string;
  aiFetch?: (endpoint: string, options?: RequestInit) => Promise<any>;
  onEmotionalStateChange?: (state: EmotionalState) => void;
}

const ReplitAssistantPanel: React.FC<ReplitAssistantPanelProps> = ({
  currentFile,
  aiFetch,
  onEmotionalStateChange,
}) => {
  const { user, isAuthenticated, authInitialized } = useAuth();
  const memoryControls = useMemoryControls(isAuthenticated ? user?.personalId : null);
  const { searchVector } = useVectorMemory();
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
          ...(user.personalId && { "x-personal-id": user.personalId }),
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
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [languageMode, setLanguageMode] = useState<
    "georgian" | "english" | "mixed"
  >("georgian");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Phase 3: Semantic Search State
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(
    DEFAULT_SEMANTIC_SEARCH_OPTIONS.enabled
  );
  const [isSearchingMemory, setIsSearchingMemory] = useState(false);
  const [semanticContext, setSemanticContext] = useState<SemanticContextPayload | null>(null);
  const [showMemoryContext, setShowMemoryContext] = useState(false);

  // Phase 3: Memory Persistence State
  const [savingToMemory, setSavingToMemory] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [savedMessages, setSavedMessages] = useState<Set<string>>(() => {
    // Load from localStorage on init (persistent deduplication)
    try {
      const stored = localStorage.getItem("saved_messages");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const { storeEmbedding } = useVectorMemory();

  // Persist savedMessages to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "saved_messages",
        JSON.stringify(Array.from(savedMessages)),
      );
    } catch (error) {
      console.error("Failed to persist saved messages:", error);
    }
  }, [savedMessages]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const saveErrorTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (!onEmotionalStateChange) {
      return;
    }

    if (isInitializing || isLoading) {
      onEmotionalStateChange("thinking");
      return;
    }

    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.type === "ai") {
      onEmotionalStateChange("responding");
      return;
    }

    onEmotionalStateChange("idle");
  }, [chatMessages, isInitializing, isLoading, onEmotionalStateChange]);

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

  // Phase 3: Semantic Search Function
  const searchSemanticMemory = useCallback(
    async (query: string): Promise<SemanticContextPayload | null> => {
      // Clear stale context before starting new search
      setSemanticContext(null);
      setShowMemoryContext(false);

      if (!semanticSearchEnabled) {
        console.log("🧠 [SEMANTIC] Search disabled");
        return null;
      }

      if (query.length < DEFAULT_SEMANTIC_SEARCH_OPTIONS.minQueryLength) {
        console.log(
          `🧠 [SEMANTIC] Query too short (${query.length} < ${DEFAULT_SEMANTIC_SEARCH_OPTIONS.minQueryLength})`,
        );
        return null;
      }

      setIsSearchingMemory(true);
      const searchStart = Date.now();

      try {
        const result = await searchVector({
          query,
          limit: DEFAULT_SEMANTIC_SEARCH_OPTIONS.maxResults,
          threshold: DEFAULT_SEMANTIC_SEARCH_OPTIONS.threshold,
        });

        const searchDuration = Date.now() - searchStart;

        if (!result.results || result.results.length === 0) {
          console.log("🧠 [SEMANTIC] No relevant memories found");
          // Context already cleared at start
          return null;
        }

        const payload: SemanticContextPayload = {
          results: result.results as VectorMemoryResult[],
          searchQuery: query,
          metadata: {
            resultCount: result.count || 0,
            threshold: DEFAULT_SEMANTIC_SEARCH_OPTIONS.threshold,
            maxResults: DEFAULT_SEMANTIC_SEARCH_OPTIONS.maxResults,
            searchDuration,
          },
        };

        console.log(
          `🧠 [SEMANTIC] Found ${payload.results.length} memories in ${searchDuration}ms`,
        );
        setSemanticContext(payload);
        return payload;
      } catch (error) {
        console.error("❌ [SEMANTIC] Search failed:", error);
        // Context already cleared at start
        return null;
      } finally {
        setIsSearchingMemory(false);
      }
    },
    [semanticSearchEnabled, searchVector],
  );

  // Phase 3: Save Message to Memory Function
  const saveMessageToMemory = useCallback(
    async (messageId: string, content: string, metadata?: Record<string, any>) => {
      // Guard: Check if already saving this message ID
      if (savingToMemory.get(messageId)) {
        console.log("💾 [MEMORY] Save already in progress");
        return;
      }

      if (!content || content.length < 10) {
        if (saveErrorTimerRef.current) {
          clearTimeout(saveErrorTimerRef.current);
        }
        setSaveError("Message too short to save (min 10 characters)");
        saveErrorTimerRef.current = setTimeout(() => setSaveError(null), 3000);
        return;
      }

      if (savedMessages.has(messageId)) {
        if (saveErrorTimerRef.current) {
          clearTimeout(saveErrorTimerRef.current);
        }
        setSaveError("Message already saved to memory");
        saveErrorTimerRef.current = setTimeout(() => setSaveError(null), 3000);
        return;
      }

      setSavingToMemory((prev) => new Map(prev).set(messageId, true));
      setSaveError(null);

      try {
        await storeEmbedding({
          text: content,
          metadata: {
            ...metadata,
            messageId,
            source: "chat_assistant",
            savedAt: new Date().toISOString(),
          },
          source: "chat_assistant",
          userId: user?.personalId || "anonymous",
        });

        setSavedMessages((prev) => new Set(prev).add(messageId));
        console.log(`💾 [MEMORY] Saved message ${messageId} to vector memory`);
      } catch (error) {
        console.error("❌ [MEMORY] Failed to save message:", error);
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Failed to save message to memory";
        if (saveErrorTimerRef.current) {
          clearTimeout(saveErrorTimerRef.current);
        }
        setSaveError(errorMsg);
        saveErrorTimerRef.current = setTimeout(() => setSaveError(null), 5000);
      } finally {
        setSavingToMemory((prev) => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [storeEmbedding, savedMessages, user?.personalId],
  );

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
      // Phase 3: Semantic Search Integration
      const memoryContext = await searchSemanticMemory(currentInput);

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

      // Phase 3: Add semantic context if available
      if (memoryContext) {
        requestBody.semanticContext = memoryContext;
        console.log(
          `🧠 [SEMANTIC] Attached ${memoryContext.results.length} memories to request`,
        );
      }

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
      <div className="h-full w-full bg-[#21252B] flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 text-[#8B949E]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00D4FF]"></div>
          <span>გურულო ასისტენტი იტვირთება...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full bg-[#21252B] flex flex-col max-h-[100vh] overflow-hidden"
      style={{ height: "100vh" }}
    >
      {/* ===== HEADER TABS ===== */}
      <div className="bg-[#2C313A] border-b border-[#3E4450] flex items-center px-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab("agent")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "agent"
                ? "text-[#00D4FF] border-[#00D4FF]"
                : "text-[#8B949E] border-transparent hover:text-white"
            }`}
          >
            <User size={16} />
            აგენტი
          </button>
          <button
            onClick={() => setActiveTab("assistant")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "assistant"
                ? "text-[#00D4FF] border-[#00D4FF]"
                : "text-[#8B949E] border-transparent hover:text-white"
            }`}
          >
            <Sparkles size={16} />
            ასისტენტი
          </button>
        </div>

        {/* Current File Display */}
        {currentFile && (
          <div className="ml-4 flex items-center gap-2 text-[#8B949E] text-sm">
            <div className="w-1 h-1 bg-[#8B949E] rounded-full"></div>
            <span>{currentFile}</span>
            <Plus size={16} className="hover:text-white cursor-pointer" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => createCheckpoint()}
            className="text-[#8B949E] hover:text-white p-1"
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
            className="text-[#8B949E] hover:text-white p-1"
            title="⏪ Rollback to Last Checkpoint"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => setIsCheckpointsVisible(!isCheckpointsVisible)}
            className={`p-1 ${isCheckpointsVisible ? "text-[#00D4FF]" : "text-[#8B949E] hover:text-white"}`}
            title="🔄 View Checkpoints"
          >
            <Clock size={16} />
          </button>
          <button className="text-[#8B949E] hover:text-white p-1">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {authorizationError && (
        <div className="bg-[#3A1F1F] border-b border-[#FF6B6B]/40 text-[#FFB4B4] px-4 py-2 text-sm">
          {authorizationError}
        </div>
      )}

      <div className="flex-1 flex">
        {/* ===== LEFT SIDEBAR ===== */}
        <div className="w-60 bg-[#2C313A] border-r border-[#3E4450] flex flex-col min-h-0">
          <div className="p-3">
            <button
              onClick={createNewChatSession}
              className="w-full flex items-center gap-2 bg-[#21252B] hover:bg-[#3E4450] text-[#8B949E] hover:text-white px-3 py-2 rounded-lg text-sm transition-all"
            >
              <Plus size={16} />
              ახალი ჩატი
            </button>
          </div>

          {/* Chat History with Collapsible Sections */}
          <div className="flex-1 px-3 overflow-y-auto min-h-0 console-scrollbar">
            {/* Chats Section */}
            <div className="mb-4">
              <div
                onClick={() => setIsChatsCollapsed(!isChatsCollapsed)}
                className="flex items-center justify-between text-[#8B949E] text-xs font-medium mb-2 cursor-pointer hover:text-[#E6EDF3] transition-colors"
              >
                <span>ჩატები</span>
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
                <div className="space-y-1">
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
                        className={`relative group text-sm px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          session.id === currentSessionId
                            ? "bg-[#0969DA] text-white"
                            : "bg-[#3E4450] text-[#E6EDF3] hover:bg-[#4A5568]"
                        }`}
                      >
                        <div onClick={() => switchToChatSession(session.id)}>
                          <div className="truncate pr-6">{session.title}</div>
                          <div className="text-xs opacity-75">
                            {session.messages.length} წერილი •{" "}
                            {new Date(session.lastActivity).toLocaleDateString(
                              "ka-GE",
                            )}
                          </div>
                        </div>

                        {/* Archive button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleArchiveSession(session.id);
                          }}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-xs px-1 py-0.5 bg-[#2D3748] rounded hover:bg-[#4A5568] transition-all"
                        >
                          📦
                        </button>
                      </div>
                    ))}

                  {chatSessions.filter((session) => !session.isArchived)
                    .length === 0 && (
                    <div className="text-[#8B949E] text-xs text-center py-4">
                      არ არის ბოლოდროინდელი ჩატები
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
                  className="flex items-center justify-between text-[#8B949E] text-xs font-medium mb-2 cursor-pointer hover:text-[#E6EDF3] transition-colors"
                >
                  <span>არქივირებული</span>
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
                  <div className="space-y-1">
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
                          className={`relative group text-sm px-3 py-2 rounded-lg cursor-pointer transition-all ${
                            session.id === currentSessionId
                              ? "bg-[#0969DA] text-white"
                              : "bg-[#3E4450] text-[#E6EDF3] hover:bg-[#4A5568]"
                          }`}
                        >
                          <div onClick={() => switchToChatSession(session.id)}>
                            <div className="truncate pr-6 opacity-75">
                              {session.title}
                            </div>
                            <div className="text-xs opacity-50">
                              {session.messages.length} წერილი •{" "}
                              {new Date(
                                session.lastActivity,
                              ).toLocaleDateString("ka-GE")}
                            </div>
                          </div>

                          {/* Unarchive button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleArchiveSession(session.id);
                            }}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-xs px-1 py-0.5 bg-[#2D3748] rounded hover:bg-[#4A5568] transition-all"
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
          <div className="p-3 border-t border-[#3E4450] space-y-2">
            <button
              onClick={() => alert("Checkpoints ფუნქციონალი მალე დაემატება!")}
              className="w-full flex items-center gap-2 text-[#8B949E] hover:text-white text-sm py-2 transition-all"
            >
              <RotateCcw size={16} />
              საკონტროლო წერტილები
            </button>
            <button
              onClick={() => alert("Settings ფუნქციონალი მალე დაემატება!")}
              className="w-full flex items-center gap-2 text-[#8B949E] hover:text-white text-sm py-2 transition-all"
            >
              <Settings size={16} />
              პარამეტრები
            </button>
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 flex flex-col min-h-0 max-h-[calc(100vh-120px)] overflow-hidden">
          {!hasActiveChat ? (
            // ===== WELCOME SCREEN =====
            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#3E4450] rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <div className="w-8 h-8 border-2 border-dashed border-[#8B949E] rounded flex items-center justify-center">
                    <Plus size={16} className="text-[#8B949E]" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  ახალი ჩატი ასისტენტთან
                </h2>
                <p className="text-[#8B949E] text-lg">
                  ასისტენტი პასუხობს კითხვებს, აუმჯობესებს კოდს და
                  <br />
                  ახდენს ზუსტ რედაქტირებას.
                </p>
              </div>

              {/* ===== PROMPT SUGGESTIONS ===== */}
              <div className="grid grid-cols-3 gap-3 mb-8 max-w-2xl">
                {promptSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="bg-[#3E4450] hover:bg-[#4A5568] text-[#8B949E] hover:text-white px-4 py-3 rounded-lg text-sm transition-all text-center"
                  >
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Phase 3: Save to Memory Error Banner */}
              {saveError && (
                <div className="bg-[#3A1F1F] border-b border-[#FF6B6B]/40 text-[#FFB4B4] px-4 py-2 text-sm flex items-center justify-between">
                  <span>❌ {saveError}</span>
                  <button
                    onClick={() => setSaveError(null)}
                    className="text-[#FFB4B4] hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* ===== CHAT MESSAGES ===== */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 console-scrollbar"
                style={{
                  maxHeight: "calc(100vh - 180px)",
                  scrollBehavior: "smooth",
                }}
              >
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} mb-4`}
                >
                  {message.type === "user" ? (
                    // User message (original styling)
                    <div className="max-w-[80%] p-3 rounded-lg bg-[#0969DA] text-white">
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    // AI message with Phase 1 SECURED React Component Rendering + Phase 3 Save to Memory
                    <div className="max-w-[85%] space-y-2">
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
                        className="w-full"
                      />
                      {/* Phase 3: Save to Memory Button */}
                      <button
                        onClick={() =>
                          saveMessageToMemory(message.id, message.content, {
                            category: message.category,
                            timestamp: new Date().toISOString(),
                          })
                        }
                        disabled={
                          savingToMemory.get(message.id) ||
                          savedMessages.has(message.id)
                        }
                        className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-[#00D4FF] disabled:text-[#3E4450] disabled:cursor-not-allowed transition-colors"
                        title={
                          savedMessages.has(message.id)
                            ? "უკვე შენახულია მეხსიერებაში"
                            : "მეხსიერებაში შენახვა მომავალი კონტექსტისთვის"
                        }
                      >
                        {savingToMemory.get(message.id) ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>ინახება...</span>
                          </>
                        ) : savedMessages.has(message.id) ? (
                          <>
                            <Check size={12} className="text-green-400" />
                            <span className="text-green-400">
                              💾 მეხსიერებაში შენახულია
                            </span>
                          </>
                        ) : (
                          <>
                            <Brain size={12} />
                            <span>💾 მეხსიერებაში შენახვა</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#3E4450] p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-[#8B949E]">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00D4FF]"></div>
                      <span className="text-sm">ასისტენტი ფიქრობს...</span>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </>
          )}

          {/* ===== BOTTOM INPUT AREA ===== */}
          <div className="border-t border-[#3E4450] bg-[#2C313A] p-4 flex-shrink-0">
            {/* Advanced Controls */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="flex items-center gap-2 text-[#00D4FF] text-sm hover:text-[#0969DA] transition-all"
                >
                  <Sparkles size={16} />
                  <span>გაფართოებული პარამეტრები</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div className="ml-auto flex items-center gap-2 text-sm text-[#8B949E]">
                  <span>
                    {availableModels.find((m) => m.id === selectedModel)
                      ?.label || "იტვირთება..."}
                  </span>
                  <div className="w-2 h-2 bg-[#00D4FF] rounded-full"></div>

                  {/* Policy and Model Badge */}
                  {lastResponseMeta.policy && (
                    <div className="ml-2 flex items-center gap-1 text-xs bg-[#21252B] px-2 py-1 rounded border border-[#3E4450]">
                      <span className="text-[#00D4FF]">Policy:</span>
                      <span className="text-[#8B949E]">
                        {lastResponseMeta.policy}
                      </span>
                      <span className="text-[#3E4450]">·</span>
                      <span className="text-[#00D4FF]">Model:</span>
                      <span className="text-[#8B949E]">
                        {lastResponseMeta.model} ({lastResponseMeta.modelLabel})
                      </span>
                      {lastResponseMeta.overridden && (
                        <>
                          <span className="text-[#3E4450]">·</span>
                          <span className="text-[#F85149]">OVERRIDE</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Dropdown Content */}
              {isAdvancedOpen && (
                <div className="bg-[#21252B] border border-[#3E4450] rounded-lg p-3 mb-3 space-y-3">
                  <div>
                    <label className="block text-sm text-[#8B949E] mb-1">
                      მოდელი
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-[#2C313A] border border-[#3E4450] rounded text-[#E6EDF3] text-sm px-3 py-2"
                    >
                      {availableModels.length === 0 ? (
                        <option value="">მოდელები იტვირთება...</option>
                      ) : (
                        availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label} ({model.category})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[#8B949E] mb-1">
                      ხელით გადაფარვა
                    </label>
                    <select
                      value={manualOverride}
                      onChange={(e) =>
                        setManualOverride(
                          e.target.value as "auto" | "small" | "large",
                        )
                      }
                      className="w-full bg-[#2C313A] border border-[#3E4450] rounded text-[#E6EDF3] text-sm px-3 py-2"
                    >
                      <option value="auto">Auto (Router Decision)</option>
                      <option value="small">პატარა მოდელის იძულება</option>
                      <option value="large">დიდი მოდელის იძულება</option>
                    </select>
                    <p className="text-xs text-[#8B949E] mt-1">
                      ავტომატური მოდელის არჩევის გადაფარვა. ავტო იყენებს წესებზე დაფუძნებულ არჩევანს.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#8B949E] mb-1">
                      კონტექსტის სიღრმე
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={contextDepth}
                        onChange={(e) =>
                          setContextDepth(parseInt(e.target.value))
                        }
                        className="flex-1 h-2 bg-[#3E4450] rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #00D4FF 0%, #00D4FF ${(contextDepth / 10) * 100}%, #3E4450 ${(contextDepth / 10) * 100}%, #3E4450 100%)`,
                        }}
                      />
                      <span className="text-[#E6EDF3] text-sm w-8 text-center">
                        {contextDepth}
                      </span>
                    </div>
                    <p className="text-xs text-[#8B949E] mt-1">
                      წინა შეტყობინებების რაოდენობა (1-10)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#8B949E] mb-1">
                      ენის რეჟიმი
                    </label>
                    <select
                      value={languageMode}
                      onChange={(e) =>
                        setLanguageMode(
                          e.target.value as "georgian" | "english" | "mixed",
                        )
                      }
                      className="w-full bg-[#2C313A] border border-[#3E4450] rounded text-[#E6EDF3] text-sm px-3 py-2"
                    >
                      <option value="georgian">🇬🇪 ქართული (Georgian)</option>
                      <option value="english">🇺🇸 English</option>
                      <option value="mixed">🌐 Mixed Languages</option>
                    </select>
                    <p className="text-xs text-[#8B949E] mt-1">
                      პასუხის ენის პრეფერენცია
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="stream-output"
                      checked={streamingEnabled}
                      onChange={(e) => setStreamingEnabled(e.target.checked)}
                      className="rounded text-[#00D4FF] focus:ring-[#00D4FF] focus:ring-2"
                    />
                    <label
                      htmlFor="stream-output"
                      className="text-sm text-[#8B949E]"
                    >
                      ⚡ ნაკადური პასუხები
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="include-context"
                      className="rounded text-[#00D4FF] focus:ring-[#00D4FF] focus:ring-2"
                      defaultChecked
                    />
                    <label
                      htmlFor="include-context"
                      className="text-sm text-[#8B949E]"
                    >
                      📁 პროექტის კონტექსტის ჩართვა
                    </label>
                  </div>

                  <div className="border-t border-[#3E4450] pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-[#E6EDF3]">
                        <Brain size={16} className="text-[#00D4FF]" /> AI მეხსიერება
                      </span>
                      <button
                        type="button"
                        onClick={() => memoryControls.refresh()}
                        className="inline-flex items-center gap-1 rounded border border-[#3E4450] px-2 py-1 text-xs text-[#8B949E] hover:text-[#E6EDF3]"
                        disabled={memoryControls.loading}
                      >
                        <RefreshCw size={12} /> განახლება
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[#6E7681]">
                      გურულო პასუხებს პერსონალიზებს შენახული მეხსიერების საფუძველზე. საჭიროა მომხმარებლის თანხმობა და მონაცემები ინახება დაშიფრული სახით.
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-[#8B949E]">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={memoryControls.controls.referenceSavedMemories}
                          onChange={(event) => memoryControls.toggleFeature('savedMemories', event.target.checked)}
                          className="rounded text-[#00D4FF] focus:ring-[#00D4FF] focus:ring-2"
                          disabled={memoryControls.loading}
                        />
                        <span title="გურულო გამოიყენებს შენახულ ფაქტებსა და პრეფერენციებს პასუხების გასაუმჯობესებლად.">
                          🧠 შენახული მეხსიერებების გამოყენება
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={memoryControls.controls.referenceChatHistory}
                          onChange={(event) => memoryControls.toggleFeature('chatHistory', event.target.checked)}
                          className="rounded text-[#00D4FF] focus:ring-[#00D4FF] focus:ring-2"
                          disabled={memoryControls.loading}
                        />
                        <span title="გურულო ავტომატურად ჩართავს წინა დიალოგებს დამატებითი კონტექსტისთვის.">
                          🗂️ ჩატის ისტორიის ჩართვა
                        </span>
                      </label>
                    </div>
                    {memoryControls.error && (
                      <p className="mt-2 text-xs text-[#F85149]">❌ {memoryControls.error}</p>
                    )}
                  </div>

                  <div className="border-t border-[#3E4450] pt-3">
                    <label className="block text-sm text-[#8B949E] mb-2">
                      📎 ფაილების დართვა
                    </label>
                    <div className="flex items-center gap-2">
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
                        className="flex-1 bg-[#3E4450] hover:bg-[#4A5568] text-[#8B949E] hover:text-white px-3 py-2 rounded text-sm transition-all flex items-center gap-2"
                      >
                        <Paperclip size={16} />
                        ფაილების არჩევა...
                      </button>
                      {selectedFiles.length > 0 && (
                        <button
                          onClick={() => setSelectedFiles([])}
                          className="px-2 py-2 text-[#F85149] hover:bg-[#3E4450] rounded text-sm transition-all"
                          title="არჩეული ფაილების გასუფთავება"
                        >
                          გასუფთავება ({selectedFiles.length})
                        </button>
                      )}
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-[#21252B] px-2 py-1 rounded text-xs"
                          >
                            <span className="text-[#E6EDF3] truncate">
                              {file}
                            </span>
                            <button
                              onClick={() =>
                                setSelectedFiles((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                              className="text-[#8B949E] hover:text-[#F85149] ml-2 flex-shrink-0"
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

            {/* Phase 3: Memory Search Indicator & Context Panel */}
            {(isSearchingMemory || semanticContext) && (
              <div className="px-4 py-2 bg-[#1C2128] border-t border-[#3E4450]">
                {isSearchingMemory && (
                  <div className="flex items-center gap-2 text-[#8B949E] text-sm">
                    <Brain className="w-4 h-4 animate-pulse text-blue-400" />
                    <span>🧠 მეხსიერების ძებნა...</span>
                  </div>
                )}

                {semanticContext && !isSearchingMemory && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowMemoryContext(!showMemoryContext)}
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Brain className="w-4 h-4" />
                      <span>
                        ნაპოვნია {semanticContext.results.length} შესაბამისი მეხსიერება
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          showMemoryContext ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showMemoryContext && (
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {semanticContext.results.map((result, idx) => (
                          <div
                            key={result.id}
                            className="flex items-start gap-2 bg-[#21252B] rounded p-2 text-xs"
                          >
                            <span className="px-1.5 py-0.5 bg-green-900/30 text-green-300 rounded font-mono">
                              {(result.similarity * 100).toFixed(0)}%
                            </span>
                            <span className="text-[#8B949E] flex-1 truncate">
                              {result.text.substring(0, 100)}...
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                placeholder="ჰკითხე ასისტენტს, გამოიყენე @ კონკრეტული ფაილების ჩასართავად..."
                className="w-full bg-[#21252B] border border-[#3E4450] rounded-lg px-4 py-3 pr-20 text-[#E6EDF3] placeholder-[#8B949E] resize-none focus:outline-none focus:border-[#00D4FF] min-h-[44px] max-h-32"
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

              <div className="absolute right-2 top-2 flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#8B949E] hover:text-white p-1 transition-all"
                  title="ფაილების დართვა"
                >
                  <Paperclip size={16} />
                </button>

                {selectedFiles.length > 0 && (
                  <span className="text-[#8B949E] text-sm">
                    {selectedFiles.length} ფაილი
                  </span>
                )}

                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || isLoading || isSearchingMemory}
                  className="bg-[#0969DA] hover:bg-[#0969DA]/80 disabled:bg-[#3E4450] disabled:cursor-not-allowed text-white p-1 rounded transition-all"
                  title={isSearchingMemory ? "მეხსიერების ძებნა..." : "შეტყობინების გაგზავნა"}
                >
                  {isSearchingMemory ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplitAssistantPanel;
