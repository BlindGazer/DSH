import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
    Button,
    ChildrenLazy,
    CircularProgress,
    CollectionAddButton,
    IconButton,
    LinearProgress,
    Modal,
    ProgressBar,
    RadioCardGroup,
    Skeleton,
    Spinner,
    SwitchControl,
    Tabs,
    TestId,
    ThemedSelect,
    Tooltip
} from '../src/index.js';

describe('@kalex/dsh-core UI Components', () => {
    it('renders radio cards as one named native group with descriptions and disabled state', () => {
        const html = renderToString(
            <RadioCardGroup
                name="method"
                label="Sign-in method"
                value="code"
                disabled
                options={[
                    { value: 'code', label: 'By code', description: 'Enter the device code.' },
                    { value: 'link', label: 'By link', description: 'Paste the callback URL.' }
                ]}
                onChange={() => undefined}
            />
        );
        expect(html).toContain('<fieldset class="dsh-radio-card-group" disabled="">');
        expect(html).toContain('<legend class="dsh-radio-card-legend">Sign-in method</legend>');
        expect(html.match(/type="radio"/g)).toHaveLength(2);
        expect(html.match(/name="method"/g)).toHaveLength(2);
        expect(html.match(/checked=""/g)).toHaveLength(1);
        expect(html).toContain('aria-describedby="method-link-description"');
        expect(html).toContain('id="method-link-description"');
    });

    it('renders ThemedSelect', () => {
        const html = renderToString(
            <ThemedSelect
                value="ru"
                options={[
                    { value: 'en', label: 'English' },
                    { value: 'ru', label: 'Russian' }
                ]}
                onChange={() => undefined}
                ariaLabel="Language"
            />
        );
        expect(html).toContain('dsh-select');
        expect(html).not.toContain('kpp-');
    });

    it('renders SwitchControl', () => {
        const html = renderToString(<SwitchControl checked={false} onChange={() => undefined} ariaLabel="Enable proxy" />);
        expect(html).toContain('role="switch"');
        expect(html).toContain('aria-checked="false"');
    });

    it('renders Button and IconButton', () => {
        const btnHtml = renderToString(
            <Button variant="primary" size="sm">
                Save
            </Button>
        );
        expect(btnHtml).toContain('dsh-btn-primary');
        expect(btnHtml).toContain('dsh-btn-sm');

        const iconBtnHtml = renderToString(<IconButton ariaLabel="Proxy settings">gear</IconButton>);
        expect(iconBtnHtml).toContain('aria-label="Proxy settings"');
        expect(iconBtnHtml).toContain('dsh-icon-btn');
    });

    it('renders CollectionAddButton with a decorative plus and native button props', () => {
        const html = renderToString(
            <CollectionAddButton disabled className="custom-add" title="Add an account">
                Add account
            </CollectionAddButton>
        );
        expect(html).toContain('dsh-collection-add-btn custom-add');
        expect(html).toContain('type="button"');
        expect(html).toContain('disabled=""');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('title="Add an account"');
        expect(html).toContain('<span>Add account</span>');
    });

    it('renders Tabs', () => {
        const html = renderToString(
            <Tabs
                items={[
                    { value: 'catalog', label: 'Catalog' },
                    { value: 'audit', label: 'Audit' }
                ]}
                activeValue="catalog"
                onChange={() => undefined}
            />
        );
        expect(html).toContain('role="tablist"');
        expect(html).toContain('Catalog');
        expect(html).toContain('Audit');
    });

    it('renders Modal when open', () => {
        const closedHtml = renderToString(
            <Modal open={false} onClose={() => undefined}>
                Body
            </Modal>
        );
        expect(closedHtml).toBe('');
        const openHtml = renderToString(
            <Modal open onClose={() => undefined} title="Settings" theme="light">
                Body
            </Modal>
        );
        expect(openHtml).toContain('data-theme="light"');
        expect(openHtml).toContain('class="dsh-modal-backdrop-control"');
        expect(openHtml).toContain('Settings');
        expect(openHtml).toContain('Body');
        expect(openHtml).not.toContain('kpp-');
    });

    it('renders determinate DSH progress indicators with bounded accessible values', () => {
        const ringHtml = renderToString(<CircularProgress value={120} label="Quota remaining" size="small" color="accent" />);
        expect(ringHtml).toContain('role="progressbar"');
        expect(ringHtml).toContain('aria-label="Quota remaining"');
        expect(ringHtml).toContain('aria-valuenow="100"');
        expect(ringHtml).toContain('data-size="small"');
        expect(ringHtml).toContain('--dsh-progress-color:var(--dsw-alias-button-info-fill)');

        const lineHtml = renderToString(<LinearProgress value={-5} label="Context usage" color="#ff0088" />);
        expect(lineHtml).toContain('aria-valuenow="0"');
        expect(lineHtml).toContain('--dsh-progress-color:#ff0088');
    });

    it('renders a DSH tooltip trigger with an accessible description link', () => {
        const html = renderToString(
            <Tooltip triggerLabel="Usage" content={<div>Usage details</div>} data-testid="usage-tooltip">
                Usage
            </Tooltip>
        );
        expect(html).toContain('class="dsh-tooltip"');
        expect(html).toContain('data-testid="usage-tooltip"');
        expect(html).toContain('aria-label="Usage"');
        expect(html).toContain('type="button"');
        expect(html).not.toContain('role="tooltip"');
    });

    it('supports non-button tooltip triggers for interactive children', () => {
        const html = renderToString(
            <Tooltip triggerLabel="Usage" content="Usage details" triggerElement="span">
                <span>Usage</span>
            </Tooltip>
        );
        expect(html).toContain('<span aria-label="Usage"><span>Usage</span></span>');
        expect(html).not.toContain('<button');
    });

    it('renders loading indicators with TestId.Common.Loading', () => {
        const skelHtml = renderToString(<Skeleton height={24} />);
        expect(skelHtml).toContain(`data-testid="${TestId.Common.Loading}"`);
        const spinHtml = renderToString(<Spinner />);
        expect(spinHtml).toContain(`data-testid="${TestId.Common.Loading}"`);
        const progHtml = renderToString(<ProgressBar />);
        expect(progHtml).toContain(`data-testid="${TestId.Common.Loading}"`);
        const lazyHtml = renderToString(<ChildrenLazy variant="progress">Content</ChildrenLazy>);
        expect(lazyHtml).toBeDefined();
    });
});
