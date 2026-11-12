// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_3bf58d7374c681b779d3d6ab046752bb/node_modules/@earendil-works/pi-ai/dist/utils/headers.js
function headersToRecord(headers) {
	const result = {};
	for (const [key, value] of headers.entries()) result[key] = value;
	return result;
}
function providerHeadersToRecord(...headerSources) {
	const merged = /* @__PURE__ */ new Map();
	for (const source of headerSources) for (const [name, value] of Object.entries(source ?? {})) {
		const normalizedName = name.toLowerCase();
		merged.delete(normalizedName);
		if (value !== null) merged.set(normalizedName, [name, value]);
	}
	return merged.size > 0 ? Object.fromEntries(merged.values()) : void 0;
}
export { providerHeadersToRecord as n, headersToRecord as t };
