import type { RawRuleFrontmatter } from '../../shared/models/RouterModels.js';
export declare function sanitizeFrontmatterYaml(rawFrontmatter: string): string;
export declare function splitGlobString(input: string): string[];
export declare function normalizeRulePatterns(frontmatter: RawRuleFrontmatter): string[];
