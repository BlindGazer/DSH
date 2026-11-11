import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { readJsonBody } from '../src/host/api/httpRoutes.js';

describe('proxy HTTP request body', () => {
    it('rejects non-object JSON bodies', async () => {
        const request = new PassThrough();
        const body = readJsonBody(request);
        request.end(Buffer.from('null'));

        await expect(body).rejects.toThrow('Request body must be a JSON object');
    });

    it('accepts null profileId to reset routing to direct connection', async () => {
        const request = new PassThrough();
        const body = readJsonBody(request);
        request.end(Buffer.from('{"providerId":"openai","profileId":null}'));

        await expect(body).resolves.toEqual({ providerId: 'openai', profileId: null });
    });

    it('accepts object bodies with JSON-supported values', async () => {
        const request = new PassThrough();
        const body = readJsonBody(request);
        request.end(Buffer.from('{"includeCredentials":true,"password":"passphrase"}'));

        await expect(body).resolves.toEqual({ includeCredentials: true, password: 'passphrase' });
    });
});
