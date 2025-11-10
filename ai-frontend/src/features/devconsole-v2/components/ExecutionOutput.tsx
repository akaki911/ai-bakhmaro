// @ts-nocheck
import React, { useRef, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface ExecutionOutputProps {
  output: string[];
  errors: string[];
  isExecuting: boolean;
  language?: string;
}

export const ExecutionOutput: React.FC<ExecutionOutputProps> = ({
  output,
  errors,
  isExecuting,
  language = 'ka'
}) => {
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, errors]);

  const hasOutput = output.length > 0;
  const hasErrors = errors.length > 0;

  return (
    <div 
      ref={outputRef}
      className="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-sm text-gray-100"
    >
      {/* Loading State */}
      {isExecuting && !hasOutput && !hasErrors && (
        <div className="flex items-center space-x-2 text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{language === 'ka' ? 'კოდი სრულდება...' : 'Executing code...'}</span>
        </div>
      )}

      {/* Output Lines */}
      {output.map((line, index) => (
        <div key={`out-${index}`} className="flex items-start space-x-2 py-1">
          <span className="text-gray-500">{index + 1}</span>
          <span className="flex-1 whitespace-pre-wrap text-green-400">{line}</span>
        </div>
      ))}

      {/* Error Lines */}
      {errors.map((error, index) => (
        <div key={`err-${index}`} className="flex items-start space-x-2 border-l-2 border-red-500 bg-red-900/20 px-2 py-1">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          <span className="flex-1 whitespace-pre-wrap text-red-300">{error}</span>
        </div>
      ))}

      {/* Success Indicator */}
      {!isExecuting && hasOutput && !hasErrors && (
        <div className="mt-4 flex items-center space-x-2 border-t border-gray-700 pt-4 text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">
            {language === 'ka' ? 'შესრულება დასრულდა წარმატებით' : 'Execution completed successfully'}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!isExecuting && !hasOutput && !hasErrors && (
        <div className="flex h-full items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="mb-2 text-4xl">📟</div>
            <p className="text-sm">
              {language === 'ka' ? 'კონსოლის გამომავალი გამოჩნდება აქ' : 'Console output will appear here'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};