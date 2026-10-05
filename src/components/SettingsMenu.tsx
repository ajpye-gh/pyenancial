import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { EditIcon, GearIcon, MoonIcon, SunIcon } from './icons';

interface SettingsMenuProps {
  /** Reopens the guided setup flow, seeded with the current draft's answers rather than a fresh
   *  plan - see Story 8 in features.md. Deliberately not framed as "restart"/"reset" anywhere in
   *  the UI, since nothing is cleared until the user actually changes a value. */
  onReviewAnswers: () => void;
}

/** Gear icon + dropdown panel for app-wide settings, styled after PlanToolbar's Saved Plans
 *  dropdown. */
export function SettingsMenu({ onReviewAnswers }: Readonly<SettingsMenuProps>) {
  const { theme, toggleTheme } = useTheme();
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
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

  return (
    <div className="settings-menu" ref={wrapRef}>
      <button
        type="button"
        className="plan-toolbar__btn"
        title="Settings"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={panelOpen}
        onClick={() => setPanelOpen((open) => !open)}
      >
        <GearIcon size={16} />
      </button>
      {panelOpen && (
        <div className="settings-menu__panel plan-toolbar__panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="settings-menu__row"
            onClick={() => {
              setPanelOpen(false);
              onReviewAnswers();
            }}
          >
            <span className="settings-menu__row-label">
              <EditIcon size={14} />
              Review my answers
            </span>
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={theme === 'dark'}
            className="settings-menu__row"
            onClick={toggleTheme}
          >
            <span className="settings-menu__row-label">
              {theme === 'dark' ? <MoonIcon size={14} /> : <SunIcon size={14} />}
              Dark mode
            </span>
            <span className={theme === 'dark' ? 'settings-menu__switch settings-menu__switch--on' : 'settings-menu__switch'}>
              <span className="settings-menu__switch-knob" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
