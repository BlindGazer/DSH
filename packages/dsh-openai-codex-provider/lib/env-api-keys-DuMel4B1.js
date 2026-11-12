// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/env-api-keys.js
var __rewriteRelativeImportExtension = function(path, preserveJsx) {
	if (typeof path === "string" && /^\.\.?\//.test(path)) return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
		return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
	});
	return path;
};
var dynamicImport = (specifier) => import(__rewriteRelativeImportExtension(specifier));
var NODE_FS_SPECIFIER = "node:fs";
var NODE_OS_SPECIFIER = "node:os";
var NODE_PATH_SPECIFIER = "node:path";
if (typeof process !== "undefined" && (process.versions?.node || process.versions?.bun)) {
	dynamicImport(NODE_FS_SPECIFIER).then((m) => {
		m.existsSync;
	});
	dynamicImport(NODE_OS_SPECIFIER).then((m) => {
		m.homedir;
	});
	dynamicImport(NODE_PATH_SPECIFIER).then((m) => {
		m.join;
	});
}
var ANTHROPIC_AUTH_TOKEN_ENV = "ANTHROPIC_AUTH_TOKEN";
var ANTHROPIC_OAUTH_TOKEN_ENV = "ANTHROPIC_OAUTH_TOKEN";
var ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY";
var ANTHROPIC_FEDERATION_RULE_ID_ENV = "ANTHROPIC_FEDERATION_RULE_ID";
var ANTHROPIC_ORGANIZATION_ID_ENV = "ANTHROPIC_ORGANIZATION_ID";
var ANTHROPIC_SERVICE_ACCOUNT_ID_ENV = "ANTHROPIC_SERVICE_ACCOUNT_ID";
var ANTHROPIC_IDENTITY_TOKEN_FILE_ENV = "ANTHROPIC_IDENTITY_TOKEN_FILE";
var ANTHROPIC_WORKSPACE_ID_ENV = "ANTHROPIC_WORKSPACE_ID";
export { ANTHROPIC_OAUTH_TOKEN_ENV as a, ANTHROPIC_WORKSPACE_ID_ENV as c, ANTHROPIC_IDENTITY_TOKEN_FILE_ENV as i, ANTHROPIC_AUTH_TOKEN_ENV as n, ANTHROPIC_ORGANIZATION_ID_ENV as o, ANTHROPIC_FEDERATION_RULE_ID_ENV as r, ANTHROPIC_SERVICE_ACCOUNT_ID_ENV as s, ANTHROPIC_API_KEY_ENV as t };
