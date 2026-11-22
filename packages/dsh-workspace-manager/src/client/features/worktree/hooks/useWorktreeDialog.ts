import { useEffect, useRef, useState } from 'react';
import type { CopyKey } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import type { WorktreeRepository, WorktreeSelection } from '../../../../shared/models/Worktree.ts';
import { getWorktreeErrorKey, shouldRefreshWorktree } from '../worktreeError.ts';

interface WorktreeDialogActions {
    readonly inspect: (signal: AbortSignal) => Promise<WorktreeRepository>;
    readonly prepare: (selection: WorktreeSelection) => Promise<string>;
    readonly openSession: (path: string) => Promise<void>;
    readonly pick: () => Promise<string | undefined>;
    readonly onClose: () => void;
}

function previewDestination(basePath: string, folderName: string): string {
    const windows = /^(?:[a-z]:[\\/]|\\\\)/i.test(basePath);
    const base = windows ? basePath.replaceAll('/', '\\') : basePath;
    const separator = windows ? '\\' : '/';
    return `${base.endsWith(separator) ? base : `${base}${separator}`}${folderName}`;
}

interface RepositoryState {
    readonly generation: number;
    readonly repository?: WorktreeRepository;
    readonly error?: CopyKey;
}

export function useWorktreeDialog({ inspect, prepare, openSession, pick, onClose }: WorktreeDialogActions) {
    const [mode, setMode] = useState<WorktreeSelection['mode']>('new');
    const [draftSource, setSourceBranch] = useState<string>();
    const [branchName, setBranchName] = useState('');
    const [draftBranch, setBranch] = useState('');
    const [draftCheckout, setCheckout] = useState('');
    const [draftBase, setBasePath] = useState<string>();
    const [folderName, setFolderName] = useState('');
    const [generation, setGeneration] = useState(0);
    const [snapshot, setSnapshot] = useState<RepositoryState>();
    const [preparedPath, setPreparedPath] = useState<string>();
    const [action, setAction] = useState<'pick' | 'submit'>();
    const [actionError, setActionError] = useState<CopyKey>();
    const locked = useRef(false);
    const lifetime = useRef<AbortSignal | undefined>(undefined);
    const inspectRef = useRef(inspect);

    useEffect(() => {
        inspectRef.current = inspect;
    }, [inspect]);

    useEffect(() => {
        const controller = new AbortController();
        lifetime.current = controller.signal;
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const load = async (): Promise<void> => {
            try {
                const repository = await inspectRef.current(controller.signal);
                if (controller.signal.aborted) return;
                setSourceBranch(current => current ?? repository.currentBranch ?? '');
                setSnapshot({ generation, repository });
            } catch (error) {
                if (!controller.signal.aborted) {
                    setSnapshot({
                        generation,
                        error: getWorktreeErrorKey(error instanceof Error ? error : undefined, 'worktreeInspectFailed')
                    });
                }
            }
        };
        void load();
        return () => controller.abort();
    }, [generation]);

    const loading = snapshot?.generation !== generation;
    const repository = snapshot?.repository;
    const loadError = loading ? undefined : snapshot?.error;
    const branches = repository?.branches ?? [];
    const occupied = new Set(repository?.occupiedBranches);
    const freeBranches = branches.filter(branch => !occupied.has(branch));
    const checkouts = repository?.checkouts ?? [];
    const source = draftSource ?? '';
    const sourceBranch = branches.includes(source) ? source : '';
    const branch = freeBranches.includes(draftBranch) ? draftBranch : '';
    const checkout = checkouts.some(item => item.path === draftCheckout) ? draftCheckout : '';
    const basePath = draftBase ?? repository?.defaultBasePath ?? '';
    const destination = { basePath: basePath.trim(), folderName: folderName.trim() };
    const invalidFolder = Boolean(
        destination.folderName && (/[/\\]/.test(destination.folderName) || ['.', '..'].includes(destination.folderName))
    );
    const hasDestination = Boolean(destination.basePath && destination.folderName && !invalidFolder);
    const resultPath = hasDestination ? previewDestination(destination.basePath, destination.folderName) : undefined;
    let selection: WorktreeSelection | undefined;
    if (mode === 'open' && checkout) selection = { mode, path: checkout };
    if (mode === 'existing' && branch && hasDestination) selection = { mode, branch, ...destination };
    if (mode === 'new' && sourceBranch && branchName.trim() && hasDestination) {
        selection = { mode, sourceBranch, branch: branchName.trim(), ...destination };
    }
    const canSubmit = action === undefined && !loading && !loadError && (selection !== undefined || preparedPath !== undefined);

    const close = (): void => {
        if (!locked.current) onClose();
    };

    const reload = (): void => {
        setActionError(undefined);
        setGeneration(current => current + 1);
    };

    const pickBasePath = async (): Promise<void> => {
        const signal = lifetime.current;
        if (locked.current || !signal || signal.aborted) return;
        locked.current = true;
        setAction('pick');
        setActionError(undefined);
        try {
            const path = await pick();
            if (path !== undefined && !signal.aborted) setBasePath(path);
        } catch {
            if (!signal.aborted) setActionError('worktreePickFailed');
        } finally {
            locked.current = false;
            if (!signal.aborted) setAction(undefined);
        }
    };

    const submit = async (): Promise<void> => {
        const signal = lifetime.current;
        if (locked.current || !canSubmit || !signal || signal.aborted) return;
        locked.current = true;
        setAction('submit');
        setActionError(undefined);
        let path = preparedPath;
        let opened = false;
        try {
            if (path === undefined && selection !== undefined) {
                path = await prepare(selection);
                if (signal.aborted) return;
                setPreparedPath(path);
            }
            if (path === undefined) return;
            await openSession(path);
            opened = true;
        } catch (error) {
            if (signal.aborted) return;
            if (path !== undefined) {
                setActionError('worktreeSessionFailed');
                return;
            }
            const key = getWorktreeErrorKey(error instanceof Error ? error : undefined, 'worktreeGitFailed');
            setActionError(key);
            if (shouldRefreshWorktree(key)) setGeneration(current => current + 1);
        } finally {
            if (!opened) {
                locked.current = false;
                if (!signal.aborted) setAction(undefined);
            }
        }
        if (opened && !signal.aborted) onClose();
    };

    return {
        mode,
        setMode,
        repository,
        branches,
        sourceBranch,
        setSourceBranch,
        branchName,
        setBranchName,
        freeBranches,
        branch,
        setBranch,
        checkouts,
        checkout,
        setCheckout,
        basePath,
        setBasePath,
        folderName,
        setFolderName,
        invalidFolder,
        resultPath,
        loading,
        loadError,
        actionError,
        action,
        preparedPath,
        canSubmit,
        reload,
        close,
        pickBasePath,
        submit
    };
}
