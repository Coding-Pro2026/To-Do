import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Locks the production page down with a Content-Security-Policy: only our own bundle may run,
 * nothing may connect out, and no plugins, frames or form posts are allowed.
 * `style-src 'unsafe-inline'` is required because framer-motion writes inline styles.
 * Skipped in dev, where Vite injects inline scripts for hot reload.
 */
function csp(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
  return {
    name: 'momentum-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) return html
        return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), csp()],
  test: { environment: 'node' },
})
