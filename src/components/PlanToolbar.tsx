import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useDialog } from '../hooks/useDialog';
import { deletePlan, freshPlan, listSavedPlans, loadSavedPlan, savePlan, type Plan } from '../lib/plans';
import { exportPlanFile, parsePlanFile, PYF_EXTENSION } from '../lib/planFiles';
import { buildShareUrl, clearSharedPlanFromLocation, readSharedPlanFromLocation } from '../lib/planShare';
import {
  DownloadIcon,
  FolderIcon,
  PinwheelIcon,
  PlusIcon,
  RedoIcon,
  SaveIcon,
  ShareIcon,
  TrashIcon,
  UndoIcon,
  UploadIcon,
} from './icons';

/** Small grace period between the pointer leaving the Saved Plans trigger and the panel actually
 *  closing - without this, a fast diagonal move from the trigger toward the panel can register a
 *  leave/re-enter pair, closing it out from under a click that was already in flight. */
const CLOSE_DELAY_MS = 150;

/** Save itself (an in-memory object write) finishes well under a frame - without an artificial
 *  floor, the pinwheel would flash on and immediately off, unnoticeable. This makes "Save just
 *  happened" visible even though there's nothing slow to actually wait on. */
const MIN_SAVE_SPINNER_MS = 300;

interface PlanToolbarProps {
  /** Name of the saved plan the current draft was loaded from/saved as, or null if untitled. */
  activePlanName: string | null;
  /** Whether the draft has diverged from `activePlanName`'s last saved snapshot - drives the dot
   *  next to the active-plan name, paired with Save/Share (see App.tsx). */
  isDirty: boolean;
  onPlanLoaded: (name: string, plan: Plan) => void;
  onPlanSaved: (name: string, plan: Plan) => void;
  onPlanDeleted: (name: string) => void;
  /** A brand-new named plan was just created (the "+" action) - distinct from onPlanLoaded because
   *  the caller also launches the questionnaire for it, rather than just switching the draft. */
  onPlanCreated: (name: string, plan: Plan) => void;
  onImportPlan: (plan: Plan) => void;
  planForSaving: () => Plan;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isAutosaving: boolean;
}

/** Undo/Redo + Saved Plans/Save/Import, as a row of icon buttons rather than a hamburger menu -
 *  lives at the top right of the header, directly right of the active-plan indicator. */
export function PlanToolbar({
  activePlanName,
  isDirty,
  onPlanLoaded,
  onPlanSaved,
  onPlanDeleted,
  onPlanCreated,
  onImportPlan,
  planForSaving,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isAutosaving,
}: Readonly<PlanToolbarProps>) {
  const [savedPlans, setSavedPlans] = useState<string[]>(() => listSavedPlans());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, prompt, dialog } = useDialog();

  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }
    const handlePointerDown = (event: globalThis.MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [panelOpen]);

  useEffect(() => () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
  }, []);

  const openPanel = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setPanelOpen(true);
  };

  const schedulePanelClose = () => {
    closeTimer.current = setTimeout(() => setPanelOpen(false), CLOSE_DELAY_MS);
  };

  /** Prompts for a save name, re-prompting on collision until the user either picks a name that's
   *  free, explicitly confirms overwriting an existing plan, or cancels (blank/Escape at any point).
   *  `exemptName` skips the collision check for one name - re-saving the plan you're already
   *  editing under its own name is just "save my changes", not an overwrite to confirm. */
  const resolveSaveName = async (
    promptMessage: string,
    initialDefault: string,
    { confirmLabel = 'Save', exemptName = null }: { confirmLabel?: string; exemptName?: string | null } = {},
  ): Promise<string | null> => {
    let name = (await prompt(promptMessage, initialDefault, { confirmLabel }))?.trim();
    while (name) {
      if (name === exemptName || !listSavedPlans().includes(name)) {
        return name;
      }
      const overwrite = await confirm(`A plan named "${name}" already exists. Overwrite it?`, {
        confirmLabel: 'Overwrite',
        cancelLabel: 'Choose a different name',
        tone: 'danger',
      });
      if (overwrite) {
        return name;
      }
      name = (await prompt(promptMessage, name, { confirmLabel }))?.trim();
    }
    return null;
  };

  /** Writes `name` under the current draft, showing the pinwheel for at least
   *  `MIN_SAVE_SPINNER_MS` even though the write itself is near-instant (see its comment). */
  const writeSave = async (name: string) => {
    setIsSaving(true);
    const startedAt = Date.now();
    try {
      const plan = planForSaving();
      savePlan(name, plan);
      setSavedPlans(listSavedPlans());
      onPlanSaved(name, plan);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save plan.');
    } finally {
      const remaining = MIN_SAVE_SPINNER_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setIsSaving(false);
    }
  };

  /** Prompts for a name only the first time a draft is saved - once it's tied to a saved plan,
   *  Save is a silent overwrite of that same name, same as any other app's Ctrl+S. "Save As" (a
   *  deliberate rename/fork to a different name) isn't exposed here; renaming would need its own
   *  affordance. */
  const handleSave = async () => {
    if (activePlanName !== null) {
      await writeSave(activePlanName);
      return;
    }
    const name = await resolveSaveName('Save Plan As:', 'My plan');
    if (!name) {
      return;
    }
    await writeSave(name);
  };

  /** If the draft isn't tied to any saved plan, offer to stash it under a new name before it gets
   *  clobbered by the incoming Load - otherwise those changes just vanish with no way back. */
  const backupUntitledDraft = async () => {
    if (activePlanName !== null) {
      return;
    }
    const shouldBackup = await confirm('Save your current changes as a new plan before loading?', {
      confirmLabel: 'Save as new plan',
      cancelLabel: 'Discard changes',
    });
    if (!shouldBackup) {
      return;
    }
    const backupName = await resolveSaveName('Save current plan as:', 'My plan');
    if (!backupName) {
      return;
    }
    try {
      const current = planForSaving();
      savePlan(backupName, current);
      setSavedPlans(listSavedPlans());
      onPlanSaved(backupName, current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save current plan.');
    }
  };

  /** Picks up a plan encoded in the URL (see handleShare) on first mount. The share param is
   *  stripped immediately - before any prompt is even shown - so the financial details it carries
   *  don't linger in the address bar or browser history regardless of what the user does next.
   *  Runs once: deps are intentionally empty, since this only ever reacts to the URL the app was
   *  loaded with.
   *
   *  Unlike Load/New plan, this skips backupUntitledDraft's "save your current changes first?"
   *  prompt - whatever's in the untitled draft at this point is just whatever the autosave last
   *  held from before this page load, not something the user did in this session, so asking to
   *  back it up is just noise on every share-link open rather than a meaningful safety net. */
  useEffect(() => {
    const result = readSharedPlanFromLocation();
    if (!result.present) {
      return;
    }
    clearSharedPlanFromLocation();
    const shared = result.plan;
    void (async () => {
      if (!shared) {
        setError('That share link is not a valid plan.');
        return;
      }
      const name = await resolveSaveName('Name this imported plan:', 'Shared plan', { confirmLabel: 'Import' });
      if (!name) {
        // Cancelled naming - still show the imported plan, just not tied to any saved slot yet,
        // same fallback handleFileChange uses for a cancelled file import.
        onImportPlan(shared);
        return;
      }
      try {
        savePlan(name, shared);
        setSavedPlans(listSavedPlans());
        onPlanLoaded(name, shared);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save imported plan.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    const proceed = await confirm(
      'This link encodes all of your financial details, not just the site URL - only share it with people you trust.',
      { confirmLabel: 'Copy', cancelLabel: 'Cancel' },
    );
    if (!proceed) {
      return;
    }
    try {
      const url = buildShareUrl(planForSaving());
      await navigator.clipboard.writeText(url);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not copy share link.');
    }
  };

  const handleLoad = async (name: string) => {
    const plan = loadSavedPlan(name);
    if (!plan) {
      setError(`Could not load "${name}".`);
      return;
    }
    await backupUntitledDraft();
    onPlanLoaded(name, plan);
    setError(null);
    setPanelOpen(false);
  };

  /** Starts a brand-new plan: names it first (same collision-handling prompt Save uses), backs up
   *  the current untitled draft if it has unsaved changes (same safety net Load applies), then
   *  saves a fresh default plan under that name and hands off to the caller, which also launches
   *  the questionnaire (see App.tsx's handlePlanCreated). */
  const handleNewPlan = async () => {
    await backupUntitledDraft();
    const name = await resolveSaveName('Name your new plan:', 'My plan', { confirmLabel: 'Create' });
    if (!name) {
      return;
    }
    try {
      const plan = freshPlan();
      savePlan(name, plan);
      setSavedPlans(listSavedPlans());
      onPlanCreated(name, plan);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create plan.');
    }
  };

  const handleDelete = async (name: string, event: MouseEvent) => {
    event.stopPropagation();
    const shouldDelete = await confirm(`Delete "${name}"?`, { confirmLabel: 'Delete', cancelLabel: 'Cancel', tone: 'danger' });
    if (!shouldDelete) {
      return;
    }
    deletePlan(name);
    setSavedPlans(listSavedPlans());
    if (name === activePlanName) {
      onPlanDeleted(name);
    }
  };

  const handleExport = (name: string, event: MouseEvent) => {
    event.stopPropagation();
    const plan = loadSavedPlan(name);
    if (!plan) {
      setError(`Could not export "${name}".`);
      return;
    }
    exportPlanFile(name, plan).catch((err) => {
      setError(err instanceof Error ? err.message : 'Could not export plan.');
    });
  };

  const handleShareSaved = async (name: string, event: MouseEvent) => {
    event.stopPropagation();
    const plan = loadSavedPlan(name);
    if (!plan) {
      setError(`Could not share "${name}".`);
      return;
    }
    const proceed = await confirm(
      'This link encodes all of your financial details, not just the site URL - only share it with people you trust.',
      { confirmLabel: 'Copy', cancelLabel: 'Cancel' },
    );
    if (!proceed) {
      return;
    }
    try {
      const url = buildShareUrl(plan);
      await navigator.clipboard.writeText(url);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not copy share link.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    let plan: Plan;
    try {
      plan = await parsePlanFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import plan.');
      return;
    }
    // The file's name is just a starting suggestion, not an assumed plan name - the user picks (or
    // overwrites) the actual name via the same prompt Save uses.
    const suggestedName = file.name.replace(/\.pyf$/i, '');
    const name = await resolveSaveName('Import as:', suggestedName, { confirmLabel: 'Import' });
    if (!name) {
      // Cancelled naming - still show the imported plan, just not tied to any saved slot yet.
      onImportPlan(plan);
      setError(null);
      return;
    }
    try {
      savePlan(name, plan);
      setSavedPlans(listSavedPlans());
      onPlanLoaded(name, plan);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save imported plan.');
    }
  };

  let saveButtonTitle = 'Save Plan';
  if (isSaving) {
    saveButtonTitle = 'Saving…';
  } else if (isAutosaving) {
    saveButtonTitle = 'Autosaving…';
  }

  return (
    <div className="plan-toolbar-wrap">
      <div className="plan-toolbar">
        <button type="button" className="plan-toolbar__btn" title="Undo" aria-label="Undo" onClick={onUndo} disabled={!canUndo}>
          <UndoIcon size={16} />
        </button>
        <button type="button" className="plan-toolbar__btn" title="Redo" aria-label="Redo" onClick={onRedo} disabled={!canRedo}>
          <RedoIcon size={16} />
        </button>

        <div className="plan-toolbar__divider" />

        <button type="button" className="plan-toolbar__btn" title="New plan" aria-label="New plan" onClick={handleNewPlan}>
          <PlusIcon size={16} />
        </button>

        <div
          className="plan-toolbar__dropdown-wrap"
          ref={dropdownRef}
          onMouseEnter={openPanel}
          onMouseLeave={schedulePanelClose}
        >
          <button
            type="button"
            className="plan-toolbar__btn"
            title="Saved Plans"
            aria-label="Saved Plans"
            aria-haspopup="menu"
            aria-expanded={panelOpen}
            onClick={openPanel}
          >
            <FolderIcon size={16} />
          </button>
          {panelOpen && (
            <div className="plan-toolbar__panel" role="menu">
              {savedPlans.length === 0 ? (
                <span className="plan-toolbar__item plan-toolbar__item--disabled">(nothing saved)</span>
              ) : (
                savedPlans.map((name) => (
                  <div className="plan-toolbar__row" key={name}>
                    <button
                      type="button"
                      role="menuitem"
                      className={
                        name === activePlanName ? 'plan-toolbar__item plan-toolbar__item--active' : 'plan-toolbar__item'
                      }
                      onClick={() => handleLoad(name)}
                    >
                      {name}
                    </button>
                    <button
                      type="button"
                      className="plan-toolbar__row-btn"
                      aria-label={`Export "${name}"`}
                      onClick={(event) => handleExport(name, event)}
                    >
                      <DownloadIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="plan-toolbar__row-btn"
                      aria-label={`Share "${name}"`}
                      onClick={(event) => void handleShareSaved(name, event)}
                    >
                      <ShareIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="plan-toolbar__row-btn"
                      aria-label={`Delete "${name}"`}
                      onClick={(event) => handleDelete(name, event)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))
              )}
              <div className="plan-toolbar__panel-divider" />
              <button type="button" role="menuitem" className="plan-toolbar__item" onClick={handleImportClick}>
                <span className="settings-menu__row-label">
                  <UploadIcon size={14} />
                  Import .pyf
                </span>
              </button>
              {error && (
                <span className="plan-toolbar__panel-error" role="alert">
                  {error}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="plan-toolbar__divider" />

        <span className="plan-toolbar__active">
          {activePlanName === null ? (
            <span key="draft" className="plan-toolbar__active-draft">Draft</span>
          ) : (
            <span key={activePlanName} className="plan-toolbar__active-name">{activePlanName}</span>
          )}
          {isDirty && <span className="plan-toolbar__active-dot" title="Unsaved changes" aria-label="Unsaved changes" />}
        </span>
        <button
          type="button"
          className="plan-toolbar__btn"
          title={saveButtonTitle}
          aria-label="Save Plan"
          onClick={handleSave}
        >
          {isSaving || isAutosaving ? <PinwheelIcon size={16} /> : <SaveIcon size={16} />}
        </button>
        <button type="button" className="plan-toolbar__btn" title="Share Plan" aria-label="Share Plan" onClick={handleShare}>
          <ShareIcon size={16} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={PYF_EXTENSION}
        className="plan-toolbar__file-input"
        onChange={handleFileChange}
      />

      {!panelOpen && error && (
        <div className="plan-toolbar__error" role="alert">
          {error}
        </div>
      )}
      {dialog}
    </div>
  );
}
