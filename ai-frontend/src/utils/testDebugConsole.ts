export const testDebugConsole = () => {
  const runTests = () => {
    console.log('[INFO][DebugTest] Debug console tests started...', { timestamp: new Date().toISOString() });
    console.log('[INFO][DebugTest] This is an info log for testing', { context: 'info', timestamp: new Date().toISOString() });
    console.warn('[WARN][DebugTest] This is a warning log for testing', { warningType: 'system', timestamp: new Date().toISOString() });
    console.error('[ERROR][DebugTest] This is an error log for testing', { errorType: 'network', timestamp: new Date().toISOString() });
    console.log('[MODAL][DebugTest] Modal opened for testing', { modalType: 'test', timestamp: new Date().toISOString() });
    console.log('🔍 Debug tests completed!');
  };

  runTests();
};

(window as any).testDebugConsole = testDebugConsole;
setTimeout(testDebugConsole, 1000);
