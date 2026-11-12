// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_439767bf782aba52419e2a290c6eda93/node_modules/@earendil-works/pi-ai/dist/utils/abort-signals.js
function combineAbortSignals(signals) {
	const activeSignals = signals.filter((signal) => signal !== void 0);
	if (activeSignals.length === 0) return { cleanup: () => {} };
	if (activeSignals.length === 1) return {
		signal: activeSignals[0],
		cleanup: () => {}
	};
	const controller = new AbortController();
	const listeners = [];
	const abort = (signal) => {
		if (!controller.signal.aborted) controller.abort(signal.reason);
	};
	for (const signal of activeSignals) {
		if (signal.aborted) {
			abort(signal);
			break;
		}
		const listener = () => abort(signal);
		signal.addEventListener("abort", listener, { once: true });
		listeners.push({
			signal,
			listener
		});
	}
	return {
		signal: controller.signal,
		cleanup: () => {
			for (const { signal, listener } of listeners) signal.removeEventListener("abort", listener);
		}
	};
}
export { combineAbortSignals as t };
