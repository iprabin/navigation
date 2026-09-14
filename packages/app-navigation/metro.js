'use strict';
/**
 * Keeps goTo()'s types in step with the tree while Metro runs:
 *
 *   const { withRouteTypes } = require('app-navigation/metro');
 *   module.exports = withRouteTypes(getDefaultConfig(__dirname));
 *
 * The codegen watches the project's own files and rewrites RouteParams in
 * place, so editing a screen's params or adding a <Route> updates the types on
 * the next save — no restart, nothing to remember. Its TypeScript program lives
 * in its own process, so it never slows a bundle down.
 */
const path = require('node:path');
const { spawn } = require('node:child_process');

let watcher; // the require cache makes this a per-process singleton

function withRouteTypes(config) {
  const projectRoot = config?.projectRoot ?? process.cwd();
  if (!watcher && process.env.NODE_ENV !== 'production') {
    watcher = spawn(process.execPath, [path.join(__dirname, 'bin', 'codegen.js'), '--watch'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    process.on('exit', () => watcher.kill());
  }
  return config;
}

module.exports = { withRouteTypes };
