import type { AreaDefinition, DiscoveredRule, ProjectDiscoverySnapshot } from '../../shared/models/RouterModels.js';
import { parentsAvailable } from './areaHierarchy.js';
import { compare } from './discoveryFs.js';
import { explainPathMatch, matchesPath, matchesRule } from './pathMatch.js';

interface SelectedRule extends DiscoveredRule {
    readonly appliesTo: readonly string[];
    readonly path: readonly string[];
    readonly content: string;
}

/** Return managed rules matching active paths; unfiltered global rules are always included. */
export function selectRules(snapshot: ProjectDiscoverySnapshot, activePaths: readonly string[] = []): SelectedRule[] {
    const paths = [
        ...new Map(
            activePaths
                .map(normalizePath)
                .filter(Boolean)
                .map(value => [value.toLowerCase(), value])
        ).values()
    ].toSorted(compare);
    const selected = new Map<string, SelectedRule>();
    for (const rule of snapshot.rules) {
        if (!rule.enabled || !rule.path || typeof rule.content !== 'string') continue;
        if (rule.area === 'global') {
            const appliesTo = alwaysApplies(rule) ? ['always'] : paths.filter(candidate => matchesDiscoveredRule(rule, candidate));
            if (appliesTo.length) selected.set(rule.id ?? rule.sourcePath, { ...rule, path: rule.path, content: rule.content, appliesTo });
            continue;
        }
        const area = snapshot.areas.get(rule.area);
        if (!area?.available || !area.enabled || !parentsAvailable(area, snapshot.areas)) continue;
        const appliesTo = paths.filter(candidate => areaMatches(snapshot, area, candidate) && matchesDiscoveredRule(rule, candidate));
        if (appliesTo.length) selected.set(rule.id ?? rule.sourcePath, { ...rule, path: rule.path, content: rule.content, appliesTo });
    }
    return [...selected.values()];
}

export function renderRules(rules: readonly SelectedRule[]): string {
    return rules
        .map(rule => {
            const applies = rule.appliesTo.includes('always') ? 'always' : rule.appliesTo.map(file => `\`${file}\``).join(', ');
            return `## ${rule.description || rule.sourcePath.split('/').at(-1)}\nSource: ${rule.sourcePath}${rule.area === 'global' ? '' : ` (area ${rule.area})`}\nRevision: ${rule.hash}\nApplies to: ${applies}\n\n${rule.content.trim()}`;
        })
        .join('\n\n---\n\n');
}

/** Explain whether a project-relative file would activate each configured rule. */
export function diagnosePath(
    snapshot: ProjectDiscoverySnapshot,
    filePath: string
): {
    rule: DiscoveredRule;
    applies: boolean;
    reason: string;
}[] {
    const candidate = normalizePath(filePath);
    const rows = [];
    for (const rule of snapshot.rules) {
        if (!rule.enabled) {
            rows.push({ rule, applies: false, reason: 'disabled' });
            continue;
        }
        if (rule.area === 'global') {
            const ruleMatch = explainRuleMatch(rule, candidate);
            rows.push({ rule, applies: ruleMatch.matched, reason: ruleMatch.reason });
            continue;
        }
        const area = snapshot.areas.get(rule.area);
        if (!area?.available || !area.enabled || !parentsAvailable(area, snapshot.areas)) {
            rows.push({ rule, applies: false, reason: 'area or parent is unavailable/disabled' });
            continue;
        }
        const areaResult = explainAreaPathMatch(snapshot, area, candidate);
        const ruleResult = explainRuleMatch(rule, candidate);
        rows.push({
            rule,
            applies: areaResult.matched && ruleResult.matched,
            reason: !areaResult.matched ? areaResult.reason : !ruleResult.matched ? ruleResult.reason : 'area and rule paths matched'
        });
    }
    return rows;
}

export function renderAreas(snapshot: ProjectDiscoverySnapshot): string {
    const rows = [...snapshot.areas]
        .toSorted(([a], [b]) => a.localeCompare(b))
        .filter(([, area]) => {
            let current: AreaDefinition | undefined = area;
            while (current) {
                if (!current.enabled || !current.available) return false;
                if (!current.parent) return true;
                current = snapshot.areas.get(current.parent);
            }
            return false;
        })
        .map(([name, area]) => {
            const paths = Array.isArray(area.path) ? area.path : [area.path];
            const keywords = area.keywords?.length ? `; keywords: ${area.keywords.join(', ')}` : '';
            return `- ${name}: ${paths.join(' OR ')}${keywords}`;
        });
    return rows.length ? `## Project areas (search hints only; they do not activate rules)\n${rows.join('\n')}` : '';
}

function alwaysApplies(rule: DiscoveredRule): boolean {
    return rule.alwaysApply === true || isUnfilteredLegacyAgentRule(rule);
}

function isUnfilteredLegacyAgentRule(rule: DiscoveredRule): boolean {
    return rule.sourceVendor === 'agents' && (rule.globs?.length ?? 0) === 0 && (rule.path?.length ?? 0) === 0;
}

function matchesDiscoveredRule(rule: DiscoveredRule, candidate: string): boolean {
    if (isUnfilteredLegacyAgentRule(rule)) return true;
    if (rule.sourceVendor === 'agents' && rule.path?.length) return matchesPath(candidate, rule.path);
    if (rule.globs === undefined) return matchesPath(candidate, rule.path);
    return matchesRule(
        {
            globs: rule.globs,
            alwaysApply: rule.alwaysApply ?? false,
            activationMode: rule.activationMode ?? 'manual',
            ...(rule.sourceVendor === undefined ? {} : { sourceVendor: rule.sourceVendor })
        },
        candidate
    );
}

function explainRuleMatch(rule: DiscoveredRule, candidate: string): { matched: boolean; reason: string } {
    if (alwaysApplies(rule)) return { matched: true, reason: 'always' };
    if (rule.sourceVendor === 'agents' && rule.path?.length) {
        const result = explainPathMatch(candidate, rule.path);
        return { matched: result.matched, reason: explainFilterReason(result, 'rule') };
    }
    if (rule.globs === undefined) {
        const result = explainPathMatch(candidate, rule.path);
        return { matched: result.matched, reason: explainFilterReason(result, 'rule') };
    }
    const matched = matchesDiscoveredRule(rule, candidate);
    return { matched, reason: matched ? 'rule glob patterns matched' : 'rule glob patterns did not match' };
}

function areaMatches(snapshot: ProjectDiscoverySnapshot, area: AreaDefinition, candidate: string): boolean {
    return explainAreaPathMatch(snapshot, area, candidate).matched;
}

function explainAreaPathMatch(
    snapshot: ProjectDiscoverySnapshot,
    area: AreaDefinition,
    candidate: string
): { matched: boolean; reason: string } {
    let current: AreaDefinition | undefined = area;
    while (current) {
        if (!current.enabled || !current.available) return { matched: false, reason: 'area or parent is unavailable/disabled' };
        const result = explainPathMatch(candidate, current.path);
        if (!result.matched) return { matched: false, reason: explainFilterReason(result, 'area') };
        if (!current.parent) return { matched: true, reason: 'area path matched' };
        current = snapshot.areas.get(current.parent);
    }
    return { matched: false, reason: 'area or parent is unavailable/disabled' };
}

function explainFilterReason(result: { matched: boolean; reason: string }, kind: 'area' | 'rule'): string {
    if (result.reason.startsWith('excluded by ')) return `excluded by ${kind} pattern ${result.reason.slice('excluded by '.length)}`;
    return `${kind} path did not match`;
}

function normalizePath(value: string): string {
    if (typeof value !== 'string') return '';
    return value
        .replaceAll('\\', '/')
        .replace(/^\.\//, '')
        .replace(/\/{2,}/g, '/')
        .replace(/^\//, '');
}
