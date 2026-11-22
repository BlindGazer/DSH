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
    Tooltip,
    TrashIcon
} from '../src/index.ts';

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
        expect(html).toContain('Paste the callback URL.');
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
            />
        );
        expect(html).toContain('dsh-select');
        expect(html).not.toContain('kpp-');
    });

    it.each([false, true])('renders SwitchControl with checked=%s', checked => {
        const html = renderToString(<SwitchControl checked={checked} onChange={() => undefined} />);
        expect(html).toContain('type="button"');
        expect(html).toContain(`data-checked="${checked}"`);
    });

    it('renders Button and IconButton', () => {
        const btnHtml = renderToString(
            <Button variant="primary" size="sm">
                Save
            </Button>
        );
        expect(btnHtml).toContain('dsh-btn-primary');
        expect(btnHtml).toContain('dsh-btn-sm');

        const iconBtnHtml = renderToString(<IconButton tooltip="Proxy settings">gear</IconButton>);
        expect(iconBtnHtml).not.toContain('title="Proxy settings"');
        expect(iconBtnHtml).toContain('class="dsh-icon-btn"');
    });

    it.each(['neutral', 'danger'] as const)('renders the flat %s IconButton as a native button', variant => {
        const html = renderToString(
            <IconButton variant={variant} size="small" tooltip="Delete account" disabled className="custom-icon">
                <TrashIcon />
            </IconButton>
        );

        const dangerClass = variant === 'danger' ? ' dsh-icon-btn-danger' : '';
        expect(html).toContain(`class="dsh-icon-btn dsh-icon-btn-sm dsh-icon-btn-flat${dangerClass} custom-icon"`);
        expect(html).toContain('type="button"');
        expect(html).not.toContain('title="Delete account"');
        expect(html).toContain('disabled=""');
    });

    it.each([undefined, 18])('renders the outlined TrashIcon at size %s', size => {
        const html = renderToString(size === undefined ? <TrashIcon /> : <TrashIcon size={size} />);

        expect(html).toContain(`width="${size ?? 14}" height="${size ?? 14}"`);
        expect(html).toContain('viewBox="0 0 16 16"');
        expect(html).toContain('stroke="currentColor" stroke-width="1"');
        expect(html.match(/<path /g)).toHaveLength(5);
    });

    it('renders CollectionAddButton with a decorative plus and native button props', () => {
        const html = renderToString(
            <CollectionAddButton disabled className="custom-add" tooltip="Add an account">
                Add account
            </CollectionAddButton>
        );
        expect(html).toContain('dsh-collection-add-btn custom-add');
        expect(html).toContain('type="button"');
        expect(html).toContain('disabled=""');
        expect(html).toContain('focusable="false"');
        expect(html).not.toContain('title="Add an account"');
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
        expect(html).toContain(`data-testid="${TestId.Common.TabsList}"`);
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
            <Modal open onClose={() => undefined} title="Settings">
                Body
            </Modal>
        );
        expect(openHtml).not.toContain('data-theme=');
        expect(openHtml).toContain('class="dsh-modal-backdrop-control"');
        expect(openHtml).toContain('Settings');
        expect(openHtml).toContain('Body');
        expect(openHtml).not.toContain('kpp-');
    });

    it('renders determinate DSH progress indicators with bounded visual values', () => {
        const ringHtml = renderToString(<CircularProgress value={120} size="small" color="accent" />);
        expect(ringHtml).not.toContain('<title>');
        expect(ringHtml).toContain(`stroke-dasharray="${2 * Math.PI * 5.5} ${2 * Math.PI * 5.5}"`);
        expect(ringHtml).toContain('data-size="small"');
        expect(ringHtml).toContain('--dsh-progress-color:var(--dsw-alias-button-info-fill)');

        const lineHtml = renderToString(<LinearProgress value={-5} color="#ff0088" />);
        expect(lineHtml).toContain('--dsh-progress-value:0%');
        expect(lineHtml).toContain('--dsh-progress-color:#ff0088');
    });

    it('renders a DSH tooltip trigger with its visible content', () => {
        const html = renderToString(
            <Tooltip content={<div>Usage details</div>} data-testid="usage-tooltip">
                Usage
            </Tooltip>
        );
        expect(html).toContain('class="dsh-tooltip"');
        expect(html).toContain('data-testid="usage-tooltip"');
        expect(html).toContain('Usage');
        expect(html).toContain('type="button"');
        expect(html).not.toContain('Usage details');
    });

    it('supports non-button tooltip triggers for interactive children', () => {
        const html = renderToString(
            <Tooltip content="Usage details" triggerElement="span">
                <span>Usage</span>
            </Tooltip>
        );
        expect(html).toContain('<span><span>Usage</span></span>');
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
