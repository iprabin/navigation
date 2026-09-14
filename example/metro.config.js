const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withRouteTypes } = require('app-navigation/metro');

// Monorepo: watch the workspace root so edits in packages/* rebuild, and let
// Metro resolve hoisted dependencies from the root node_modules.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Keeps goTo()'s types in step with the route tree while Metro runs.
module.exports = withRouteTypes(config);
