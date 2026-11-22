// src/types.ts
var NOOP_LOGGER = Object.freeze({ record: () => void 0 });
// src/factory.ts
function createFacade(logger, sink) {
	const write = (level, message, context) => {
		sink?.(level, message, context);
		logger.record(context === void 0 ? {
			event: message,
			level
		} : {
			event: context.event ?? message,
			level,
			data: context
		});
	};
	return {
		debug: (message, context) => write("debug", message, context),
		info: (message, context) => write("info", message, context),
		warn: (message, context) => write("warn", message, context),
		error: (message, context) => write("error", message, context)
	};
}
/** Ожидаем реальный сервис, а имя пакета передаём явно: имя fiber не является идентификатором пакета. */
function createOptionalLogger(context, packageName) {
	let target = NOOP_LOGGER;
	context.inject?.(["dshLoggerService"], (scope) => {
		target = scope.dshLoggerService?.getLogger({ packageName }, "host") ?? NOOP_LOGGER;
		scope.effect(() => () => {
			target = NOOP_LOGGER;
		}, "optional dsh-logger binding");
	});
	return { record: (record) => target.record(record) };
}
function createHostLogger(logger) {
	return createFacade(logger ?? NOOP_LOGGER);
}
function createClientLogger(options = {}, logger) {
	return createFacade(logger ?? NOOP_LOGGER, options.sink);
}
export { NOOP_LOGGER, createClientLogger, createHostLogger, createOptionalLogger };
