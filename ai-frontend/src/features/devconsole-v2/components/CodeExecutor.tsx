// @ts-nocheck
import React, { useState, useRef, useCallback } from 'react';
import { Play, Trash2, Download, Copy, Check, AlertCircle, Loader2, Terminal as TerminalIcon } from 'lucide-react';
import { ExecutionOutput } from './ExecutionOutput';

interface CodeExecutorProps {
  language?: string;
}

export const CodeExecutor: React.FC<CodeExecutorProps> = ({ language = 'ka' }) => {
  const [code, setCode] = useState(`// \u10D3\u10D0\u10EC\u10D4\u10E0\u10D4 JavaScript \u10D9\u10DD\u10D3\u10D8 \u10D3\u10D0 \u10D3\u10D0\u10D0\u10ED\u10D8\u10E0\u10D4 Execute
console.log('Hello from Gurulo Workspace!');

// \u10DB\u10D0\u10D2\u10D0\u10DA\u10D8\u10D7\u10D8:
const sum = (a, b) => a + b;
console.log('2 + 3 =', sum(2, 3));

// Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled:', doubled);
`);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [streamOutput, setStreamOutput] = useState<string[]>([]);
  const [streamErrors, setStreamErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleExecute = useCallback(async () => {
    if (!code.trim()) {
      alert(language === 'ka' ? 'კოდი ცარიელია!' : 'Code is empty!');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setStreamOutput([]);
    setStreamErrors([]);
    setExecutionId(null);

    try {
      // Close existing EventSource if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create POST request with SSE streaming
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          code,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ [EXECUTOR] Stream complete');
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.substring(6).trim();
            continue; // Event type is on separate line
          }

          if (line.startsWith('data:')) {
            const dataStr = line.substring(5).trim();
            
            try {
              const data = JSON.parse(dataStr);

              // Store execution ID
              if (data.executionId && !executionId) {
                setExecutionId(data.executionId);
              }

              // Handle different event types
              if (data.output) {
                setStreamOutput(prev => [...prev, data.output]);
              } else if (data.error) {
                setStreamErrors(prev => [...prev, `Error: ${data.error}`]);
                setIsExecuting(false);
              } else if (data.success !== undefined) {
                // Complete event
                setExecutionResult({
                  success: data.success,
                  duration: data.duration,
                  output: data.output,
                });
                setIsExecuting(false);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', dataStr);
            }
          }
        }
      }

    } catch (error: any) {
      console.error('❌ [EXECUTOR] Execution error:', error);
      setStreamErrors([`Execution failed: ${error.message}`]);
      setIsExecuting(false);
    }
  }, [code, executionId, language]);

  const handleClear = useCallback(() => {
    setCode('');
    setExecutionResult(null);
    setStreamOutput([]);
    setStreamErrors([]);
    setExecutionId(null);
    textareaRef.current?.focus();
  }, []);

  const handleCopyOutput = useCallback(() => {
    const outputText = [...streamOutput, ...streamErrors].join('\n');
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [streamOutput, streamErrors]);

  const handleDownloadOutput = useCallback(() => {
    const outputText = [...streamOutput, ...streamErrors].join('\n');
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution_${executionId || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [streamOutput, streamErrors, executionId]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const hasOutput = streamOutput.length > 0 || streamErrors.length > 0;

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
            <TerminalIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === 'ka' ? 'კოდის შესრულება' : 'Code Executor'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'ka' 
                ? 'JavaScript კოდის უსაფრთხო სანდბოქსში გაშვება' 
                : 'Execute JavaScript code in secure sandbox'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClear}
            disabled={isExecuting}
            className="flex items-center space-x-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            title={language === 'ka' ? 'გასუფთავება' : 'Clear'}
          >
            <Trash2 className="h-4 w-4" />
            <span>{language === 'ka' ? 'გასუფთავება' : 'Clear'}</span>
          </button>

          <button
            onClick={handleExecute}
            disabled={isExecuting || !code.trim()}
            className="flex items-center space-x-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title={language === 'ka' ? 'გაშვება (Ctrl+Enter)' : 'Execute (Ctrl+Enter)'}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{language === 'ka' ? 'შესრულება...' : 'Executing...'}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>{language === 'ka' ? 'გაშვება' : 'Execute'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 min-h-0 flex flex-col space-y-4">
        <div className="flex-1 min-h-0 rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
          <div className="flex h-full flex-col">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-600 dark:bg-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {language === 'ka' ? 'კოდის რედაქტორი' : 'Code Editor'}
                </span>
                <span className="text-xs text-gray-500">
                  {code.split('\n').length} {language === 'ka' ? 'ხაზი' : 'lines'}
                </span>
              </div>
            </div>
            
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                  e.preventDefault();
                  handleExecute();
                }
              }}
              className="flex-1 resize-none border-none bg-white px-4 py-3 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              placeholder={language === 'ka' 
                ? 'JavaScript კოდი დაწერეთ აქ...\n\nconsole.log("Hello, World!");' 
                : 'Write JavaScript code here...\n\nconsole.log("Hello, World!");'}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Output Panel */}
        {hasOutput && (
          <div className="flex-1 min-h-0 rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-600 dark:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <TerminalIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {language === 'ka' ? 'შედეგი' : 'Output'}
                  </span>
                  {executionId && (
                    <span className="text-xs text-gray-400">
                      ID: {executionId.substring(0, 8)}...
                    </span>
                  )}
                  {executionResult && (
                    <span className={`text-xs font-medium ${executionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {executionResult.duration}ms
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleCopyOutput}
                    className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                    title={language === 'ka' ? 'კოპირება' : 'Copy'}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleDownloadOutput}
                    className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                    title={language === 'ka' ? 'ჩამოტვირთვა' : 'Download'}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ExecutionOutput 
                output={streamOutput} 
                errors={streamErrors}
                isExecuting={isExecuting}
                language={language}
              />
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-900/20">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-xs text-blue-800 dark:text-blue-300">
            <p className="font-medium">
              {language === 'ka' ? '🔒 უსაფრთხოება:' : '🔒 Security:'}
            </p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-blue-700 dark:text-blue-400">
              <li>{language === 'ka' ? 'კოდი სრულდება იზოლირებულ VM სანდბოქსში' : 'Code runs in isolated VM sandbox'}</li>
              <li>{language === 'ka' ? 'მაქსიმალური მეხსიერება: 128MB, დრო: 30წმ' : 'Max memory: 128MB, time: 30s'}</li>
              <li>{language === 'ka' ? 'ფაილურ სისტემასთან წვდომა დაბლოკილია' : 'File system access blocked'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};