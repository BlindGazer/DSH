import type { NormalizedRuleMetadata } from '../../shared/models/RouterModels.js';
/** Return a normalized, project-relative POSIX path or undefined if it escapes the root. */
export declare function projectRelativePath(projectRoot: string, candidate: string): string | undefined;
/** Match a rule/area path filter against one project-relative path. */
export declare function matchesPath(candidate: string, filter: string | readonly string[] | undefined): boolean;
/** Match normalized rule metadata using include, exclude, and basename glob semantics. */
export declare function matchesRule(rule: NormalizedRuleMetadata, targetPath: string): boolean;
/** Explain the last matching include/exclude rule for a project-relative path. */
export declare function explainPathMatch(candidate: string, filter: string | readonly string[] | undefined): {
    matched: boolean;
    reason: string;
};
