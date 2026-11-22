import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.ts';

export function formatQuotaReset(resetAt: number, text: (key: OpenAICodexText) => string, now = Date.now()): string {
    if (!Number.isFinite(resetAt) || resetAt <= 0) return text('usageUnavailable');
    const minutes = Math.max(0, Math.ceil((resetAt - now) / 60000));
    if (minutes === 0) return `${text('resetsIn')} ${text('resetNow')}`;
    if (minutes >= 1440) return `${text('resetsIn')} ${Math.ceil(minutes / 1440)} ${text('days')}`;
    if (minutes >= 60) return `${text('resetsIn')} ${Math.ceil(minutes / 60)} ${text('hours')}`;
    return `${text('resetsIn')} ${minutes} ${text('minutes')}`;
}
