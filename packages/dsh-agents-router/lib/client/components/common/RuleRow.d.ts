import type React from 'react';
import type { DiscoveredRuleWithState } from '../../../shared/models/RouterModels.js';
export interface RuleRowProps {
    rule: DiscoveredRuleWithState;
    sessionId: string;
    openFile: (filePath: string) => Promise<void>;
    t?: (key: string) => string;
}
export declare function RuleRow({ rule, sessionId, openFile, t }: RuleRowProps): React.JSX.Element;
