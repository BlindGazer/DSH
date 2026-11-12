// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_3bf58d7374c681b779d3d6ab046752bb/node_modules/@earendil-works/pi-ai/dist/utils/event-stream.js
var FifoQueue = class {
	incoming = [];
	outgoing = [];
	get length() {
		return this.incoming.length + this.outgoing.length;
	}
	enqueue(value) {
		this.incoming.push(value);
	}
	dequeue() {
		if (this.outgoing.length === 0) while (this.incoming.length > 0) this.outgoing.push(this.incoming.pop());
		return this.outgoing.pop();
	}
};
var EventStream = class {
	queue = new FifoQueue();
	waiting = new FifoQueue();
	done = false;
	finalResultPromise;
	resolveFinalResult;
	isComplete;
	extractResult;
	constructor(isComplete, extractResult) {
		this.isComplete = isComplete;
		this.extractResult = extractResult;
		this.finalResultPromise = new Promise((resolve) => {
			this.resolveFinalResult = resolve;
		});
	}
	push(event) {
		if (this.done) return;
		if (this.isComplete(event)) {
			this.done = true;
			this.resolveFinalResult(this.extractResult(event));
		}
		const waiter = this.waiting.dequeue();
		if (waiter) waiter({
			value: event,
			done: false
		});
		else this.queue.enqueue(event);
	}
	end(result) {
		this.done = true;
		if (result !== void 0) this.resolveFinalResult(result);
		while (this.waiting.length > 0) this.waiting.dequeue()({
			value: void 0,
			done: true
		});
	}
	async *[Symbol.asyncIterator]() {
		while (true) if (this.queue.length > 0) yield this.queue.dequeue();
		else if (this.done) return;
		else {
			const result = await new Promise((resolve) => this.waiting.enqueue(resolve));
			if (result.done) return;
			yield result.value;
		}
	}
	result() {
		return this.finalResultPromise;
	}
};
/**
* Event stream of one assistant response. It also times the response: the final message (`done` or `error` event, or
* the result passed to `end()`) gets `durationMs`, measured with a monotonic clock from the stream's creation, unless
* the message already has one or its `timestamp` predates the stream. A stream that forwards a response which started
* elsewhere, such as a deferred result fetched later, therefore leaves it untimed.
*/
var AssistantMessageEventStream = class extends EventStream {
	#startedAt = Date.now();
	#startedAtMonotonic = performance.now();
	constructor() {
		super((event) => event.type === "done" || event.type === "error", (event) => {
			if (event.type === "done") return event.message;
			else if (event.type === "error") return event.error;
			throw new Error("Unexpected event type for final result");
		});
	}
	push(event) {
		if (event.type === "done") this.#time(event.message);
		else if (event.type === "error") this.#time(event.error);
		super.push(event);
	}
	end(result) {
		if (result !== void 0) this.#time(result);
		super.end(result);
	}
	#time(message) {
		if (this.done || message.durationMs !== void 0 || message.timestamp < this.#startedAt) return;
		message.durationMs = Math.max(0, Math.round(performance.now() - this.#startedAtMonotonic));
	}
};
// ../../node_modules/.pnpm/@earendil-works+pi-ai@1.4.0_3bf58d7374c681b779d3d6ab046752bb/node_modules/@earendil-works/pi-ai/dist/utils/diagnostics.js
function formatThrownValue(value) {
	if (value instanceof Error) return value.message || value.name;
	if (typeof value === "string") return value;
	return String(value);
}
function extractDiagnosticError(error) {
	if (!(error instanceof Error)) return {
		name: "ThrownValue",
		message: formatThrownValue(error)
	};
	const code = error.code;
	return {
		name: error.name || void 0,
		message: error.message || error.name,
		stack: error.stack,
		code: typeof code === "string" || typeof code === "number" ? code : void 0
	};
}
function createAssistantMessageDiagnostic(type, error, details) {
	return {
		type,
		timestamp: Date.now(),
		error: extractDiagnosticError(error),
		details
	};
}
function appendAssistantMessageDiagnostic(message, diagnostic) {
	message.diagnostics = [...message.diagnostics ?? [], diagnostic];
}
export { AssistantMessageEventStream as i, createAssistantMessageDiagnostic as n, formatThrownValue as r, appendAssistantMessageDiagnostic as t };
