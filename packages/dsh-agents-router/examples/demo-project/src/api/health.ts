export interface HealthResponse {
    status: 'ok';
    checkedAt: string;
}

export function healthResponse(now = new Date()): HealthResponse {
    return { status: 'ok', checkedAt: now.toISOString() };
}
