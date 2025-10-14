import React, { useState, useRef, useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import FileTree from "./FileTree";

// ===== EXPLORER PANEL INTERFACES =====
interface ExplorerPanelProps {
  tree: any[]; // project files list used today (same shape as parent uses)
  currentFile: { path: string; content: string; lastModified: string } | null;
  setCurrentFile: React.Dispatch<React.SetStateAction<{ path: string; content: string; lastModified: string } | null>>;
  aiFetch: (endpoint: string, options?: RequestInit) => Promise<any>; // pass-through if parent uses it
  loadFile: (path: string) => Promise<{ content: string }>;          // use existing parent handler or thin wrapper
  saveFile: (path: string, content: string) => Promise<any>;         // use existing parent handler or thin wrapper
}

export default function ExplorerPanel({
  tree,
  currentFile,
  setCurrentFile,
  aiFetch,
  loadFile,
  saveFile
}: ExplorerPanelProps) {
  // ===== EXPLORER STATE (moved from AIDeveloperPanel) =====
  const [searchQuery, setSearchQuery] = useState("");
  const fileTreeRef = useRef<HTMLDivElement>(null);

  // Void unused props for now (kept for future functionality)
  void currentFile;
  void aiFetch;
  void loadFile;
  void saveFile;

  // ===== FILTERED FILES LOGIC (moved from AIDeveloperPanel) =====
  const projectFiles = tree ?? [];
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return projectFiles;
    const q = searchQuery.toLowerCase();
    const filter = (nodes: any[]): any[] =>
      (nodes || [])
        .map(n => n.type === "directory"
          ? { ...n, children: filter(n.children || []) }
          : n)
        .filter(n =>
          n.type === "directory" ? (n.children && n.children.length)
                                 : n.name?.toLowerCase().includes(q));
    return filter(projectFiles);
  }, [projectFiles, searchQuery]);

  // ===== FILE SELECT HANDLER (moved from AIDeveloperPanel activeTab === 'explorer') =====
  const handleFileSelect = useCallback(async (path: string) => {
    try {
      setCurrentFile({ path, content: "Loading...", lastModified: "" });
      // Use backend file loading service
      const fileData = await loadFile(path);
      setCurrentFile({
        path,
        content: fileData.content,
        lastModified: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to load file:", error);
      setCurrentFile({ path, content: "Error loading file", lastModified: "" });
    }
  }, [setCurrentFile]);

  // ===== EXPLORER JSX (moved from AIDeveloperPanel activeTab === 'explorer') =====
  return (
    <div className="h-full min-h-0 bg-gradient-to-br from-[#141827]/80 via-[#0F1320]/85 to-[#1D1540]/90">
      <div className="flex h-full flex-col gap-4 p-6 text-[#E6E8EC]">
        {/* Remove search for now - FileTree has its own search */}
        <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220]/70 shadow-[0_24px_60px_rgba(6,12,32,0.55)]">
          <FileTree className="h-full" />
          {/* Debug: Show filteredFiles count */}
          {import.meta.env.DEV && (
            <div style={{ display: 'none' }}>
              {filteredFiles.length} files, handleFileSelect: {typeof handleFileSelect}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}