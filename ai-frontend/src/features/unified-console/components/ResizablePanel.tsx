import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Minimize2, Maximize2 } from 'lucide-react';

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: 'left' | 'right';
  collapsible?: boolean;
  className?: string;
  title?: string;
  onCollapse?: (collapsed: boolean) => void;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 600,
  position = 'left',
  collapsible = true,
  className = '',
  title,
  onCollapse
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      let newWidth: number;

      if (position === 'left') {
        newWidth = e.clientX - rect.left;
      } else {
        newWidth = rect.right - e.clientX;
      }

      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, position]);

  const handleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    onCollapse?.(!isCollapsed);
  };

  return (
    <div
      ref={panelRef}
      className={`relative flex flex-col bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 transition-all duration-300 ${className} ${
        position === 'left' ? 'border-r' : 'border-l'
      }`}
      style={{
        width: isCollapsed ? '0px' : `${width}px`,
        minWidth: isCollapsed ? '0px' : `${minWidth}px`,
        maxWidth: isCollapsed ? '0px' : `${maxWidth}px`,
        overflow: isCollapsed ? 'hidden' : 'visible'
      }}
    >
      {title && !isCollapsed && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {collapsible && (
            <button
              onClick={handleCollapse}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Collapse panel"
            >
              {position === 'left' ? (
                <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {!isCollapsed && children}
      </div>

      {!isCollapsed && (
        <div
          className={`absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors ${
            position === 'left' ? 'right-0' : 'left-0'
          } ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
          onMouseDown={() => setIsResizing(true)}
        />
      )}

      {isCollapsed && collapsible && (
        <button
          onClick={handleCollapse}
          className={`absolute top-1/2 -translate-y-1/2 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 rounded transition-colors z-10 ${
            position === 'left' ? '-right-3' : '-left-3'
          }`}
          title="Expand panel"
        >
          {position === 'left' ? (
            <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
          )}
        </button>
      )}
    </div>
  );
};

interface ResizableHorizontalPanelProps {
  children: React.ReactNode;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  position?: 'top' | 'bottom';
  collapsible?: boolean;
  className?: string;
  title?: string;
}

export const ResizableHorizontalPanel: React.FC<ResizableHorizontalPanelProps> = ({
  children,
  defaultHeight = 300,
  minHeight = 150,
  maxHeight = 600,
  position = 'top',
  collapsible = true,
  className = '',
  title
}) => {
  const [height, setHeight] = useState(defaultHeight);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      let newHeight: number;

      if (position === 'top') {
        newHeight = e.clientY - rect.top;
      } else {
        newHeight = rect.bottom - e.clientY;
      }

      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minHeight, maxHeight, position]);

  return (
    <div
      ref={panelRef}
      className={`relative flex flex-col bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 transition-all duration-300 ${className} ${
        position === 'top' ? 'border-b' : 'border-t'
      }`}
      style={{
        height: isCollapsed ? '40px' : `${height}px`,
        minHeight: isCollapsed ? '40px' : `${minHeight}px`,
        maxHeight: isCollapsed ? '40px' : `${maxHeight}px`
      }}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <Maximize2 size={16} className="text-gray-600 dark:text-gray-400" />
              ) : (
                <Minimize2 size={16} className="text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>
      )}

      {!isCollapsed && (
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      )}

      {!isCollapsed && (
        <div
          className={`absolute left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors ${
            position === 'top' ? 'bottom-0' : 'top-0'
          } ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
          onMouseDown={() => setIsResizing(true)}
        />
      )}
    </div>
  );
};
