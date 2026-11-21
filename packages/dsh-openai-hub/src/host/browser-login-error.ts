import type { OpenAIHubLogEvent } from '../shared/logging.js';

// Сообщение задается только кодом плагина, а не текстом ответа или исключения с секретами.
export class BrowserLoginError extends Error {
    override readonly name = 'BrowserLoginError';

    constructor(
        message: string,
        readonly diagnostic?: OpenAIHubLogEvent
    ) {
        super(message);
    }
}
