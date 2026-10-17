// Compatibility entry without top-level await.
process.env.NODE_ENV ||= 'production';
import('./dist/server.cjs').catch(error => { console.error(error); process.exitCode = 1; });
