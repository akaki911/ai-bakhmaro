
import { useState, useCallback, useEffect } from 'react';
import type { FileTreeProps, FileNode, Tab, ContextMenu, NewFileModal } from '../types';

interface WorkspaceEventDetail {
  repo?: string;
  workspace?: {
    path?: string;
    type?: string;
  };
}

const getInitialRepo = (): string => {
  if (typeof window === 'undefined') {
    return 'local';
  }
  try {
    return window.localStorage?.getItem('gurulo.selectedRepo') || 'local';
  } catch {
    return 'local';
  }
};

/**
 * Core FileTree Hook - Centralized State Management
 * 
 * Replaces the massive 584-line useFileTree.ts with clean modular approach
 * Handles all file tree operations, state management, and UI interactions
 */
export const useFileTreeCore = (props?: FileTreeProps) => {
  // Core state
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state - Initialize with common folders expanded
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['src', 'backend', 'ai-service'])
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    path: string;
    type: 'file' | 'directory';
  }>({
    visible: false,
    x: 0,
    y: 0,
    path: '',
    type: 'file'
  });
  const [newFileModal, setNewFileModal] = useState<NewFileModal>({
    isOpen: false,
    type: 'file',
    parentPath: ''
  });

  // Tab state
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loadingTabs, setLoadingTabs] = useState<Set<string>>(new Set());
  const [savingTabs, setSavingTabs] = useState<Set<string>>(new Set());
  const [savedTabs, setSavedTabs] = useState<Set<string>>(new Set());

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Upload/Download
  const [dragOver, setDragOver] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Additional UI
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Lazy loading state
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  const [workspaceContext, setWorkspaceContext] = useState<{ repo: string; path?: string }>({
    repo: getInitialRepo(),
    path: undefined,
  });

  // Load file tree from API
  const loadFileTree = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('ðŸŒ³ Loading file tree from:', window.location.origin);
      
      // Try both relative and absolute URLs for better compatibility
      let response;
      try {
        console.log('Attempting fetch to /api/files/tree...');
        const repoQuery = workspaceContext.repo
          ? `?repo=${encodeURIComponent(workspaceContext.repo)}`
          : '';
        response = await fetch(`/api/files/tree${repoQuery}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        console.log('ðŸ“¡ Response status:', response.status, response.statusText);
      } catch (fetchError) {
        console.error('ðŸš« Fetch failed:', fetchError);
        const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
        throw new Error(`Network error: ${message}`);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('âŒ HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('ðŸ“¦ Received data:', { 
        success: data.success, 
        filesLength: data.files?.length, 
        dataKeys: Object.keys(data) 
      });
      
      if (data.success && Array.isArray(data.data)) {
        setFileTree(data.data);
        console.log('âœ… File tree loaded successfully:', data.data.length, 'items');
        console.log('ðŸ—‚ï¸ First few items:', data.data.slice(0, 3));
      } else {
        console.warn('âš ï¸ Invalid response format:', data);
        throw new Error(data.error || 'Invalid response format - expected success:true and data array');
      }
    } catch (err) {
      console.error('âŒ Failed to load file tree:', err);
      if (err instanceof Error) {
        console.error('âŒ Error stack:', err.stack);
        setError(err.message);
      } else {
        setError('Failed to load file tree');
      }
      setFileTree([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceContext.repo]);

  // Context menu handlers
  const showContextMenu = useCallback((x: number, y: number, path: string, type: 'file' | 'directory') => {
    setContextMenu({
      visible: true,
      x,
      y,
      path,
      type
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      path: '',
      type: 'file'
    });
  }, []);

  // New file modal handlers
  const openNewFileModal = useCallback((type: 'file' | 'folder', parentPath = '') => {
    setNewFileModal({
      isOpen: true,
      type,
      parentPath
    });
  }, []);

  const closeNewFileModal = useCallback(() => {
    setNewFileModal({
      isOpen: false,
      type: 'file',
      parentPath: ''
    });
  }, []);

  // Folder toggle
  const toggleFolder = useCallback((path: string, node?: FileNode) => {
    console.log('ðŸ”„ Toggling folder:', path);
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
        console.log('ðŸ“ Closed:', path);
      } else {
        newSet.add(path);
        console.log('ðŸ“‚ Opened:', path);
      }
      return newSet;
    });
  }, []);

  // Tab management
  const openTab = useCallback((tab: Tab) => {
    setOpenTabs(prev => {
      // Check if tab already exists
      const existingIndex = prev.findIndex(t => t.path === tab.path);
      if (existingIndex >= 0) {
        // Tab exists, just activate it
        setActiveTab(tab.id);
        return prev;
      }
      
      // Add new tab
      const newTabs = [...prev, tab];
      setActiveTab(tab.id);
      return newTabs;
    });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // If we closed the active tab, activate another one
      if (activeTab === tabId && newTabs.length > 0) {
        setActiveTab(newTabs[newTabs.length - 1].id);
      } else if (newTabs.length === 0) {
        setActiveTab(null);
      }
      
      return newTabs;
    });

    // Clean up loading/saving states
    setLoadingTabs(prev => {
      const newSet = new Set(prev);
      newSet.delete(tabId);
      return newSet;
    });

    setSavingTabs(prev => {
      const newSet = new Set(prev);
      newSet.delete(tabId);
      return newSet;
    });

    setSavedTabs(prev => {
      const newSet = new Set(prev);
      newSet.delete(tabId);
      return newSet;
    });
  }, [activeTab]);

  // Load tab content
  const loadTabContent = useCallback(async (tab: Tab) => {
    if (!tab.path) return;

    try {
      setLoadingTabs(prev => new Set(prev).add(tab.id));
      
      console.log(`ðŸ“„ Loading content for tab: ${tab.path}`);
      
      const repoQuery = workspaceContext.repo ? `?repo=${encodeURIComponent(workspaceContext.repo)}` : '';
      const response = await fetch(`/api/files/content/${encodeURIComponent(tab.path)}${repoQuery}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      
      // Update tab with content
      setOpenTabs(prev => prev.map(t => 
        t.id === tab.id 
          ? { ...t, content, hasUnsavedChanges: false }
          : t
      ));

      console.log(`âœ… Content loaded for tab: ${tab.path}`);
    } catch (err) {
      console.error(`âŒ Failed to load content for tab ${tab.path}:`, err);
      setError(`Failed to load file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingTabs(prev => {
        const newSet = new Set(prev);
        newSet.delete(tab.id);
        return newSet;
      });
    }
  }, [workspaceContext.repo]);

  // Auto-load file tree on mount
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFileTree();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [loadFileTree]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleWorkspaceChange = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceEventDetail>).detail;
      if (!detail || typeof detail.repo !== 'string') {
        return;
      }
      const repoFromEvent = detail.repo;
      setWorkspaceContext((prev) => {
        const nextPath =
          detail.workspace && typeof detail.workspace.path === 'string'
            ? detail.workspace.path
            : prev.path;
        if (prev.repo === detail.repo && prev.path === nextPath) {
          return prev;
        }
        return {
          repo: repoFromEvent,
          path: nextPath,
        };
      });
    };

    window.addEventListener('workspace:repo-changed', handleWorkspaceChange as EventListener);
    return () => {
      window.removeEventListener('workspace:repo-changed', handleWorkspaceChange as EventListener);
    };
  }, []);

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        hideContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible, hideContextMenu]);

  return {
    // Core state
    fileTree,
    loading,
    error,
    setError,
    
    // UI state
    expandedFolders,
    selectedFile,
    setSelectedFile,
    contextMenu,
    newFileModal,

    // Tab state
    openTabs,
    setOpenTabs,
    activeTab,
    setActiveTab,
    loadingTabs,
    setLoadingTabs,
    savingTabs,
    setSavingTabs,
    savedTabs,
    setSavedTabs,

    // Search
    searchQuery,
    setSearchQuery,

    // Upload/Download
    dragOver,
    setDragOver,
    isDownloading,
    setIsDownloading,

    // Additional UI
    copiedToClipboard,
    setCopiedToClipboard,

    // Lazy loading state
    loadingFolders,

    // Actions
    loadFileTree,
    showContextMenu,
    hideContextMenu,
    openNewFileModal,
    closeNewFileModal,
    toggleFolder,
    openTab,
    closeTab,
    loadTabContent,
  };
};

export default useFileTreeCore;

