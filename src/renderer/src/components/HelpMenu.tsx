import { useEffect, useRef } from 'react'
import { dispatch } from '../actions/dispatch'
import { GROUP_INFO, groupsUnlockedBy, LESSON_IDS } from '../learn/controlGroups'
import { INTRO, LESSONS } from '../learn/tours'
import { useLearnStore } from '../state/learnStore'
import { useSettingsStore } from '../state/settingsStore'

/** ?-menyen: grunnkurset og leksjonene, med hvilke som er fullført. */
export function HelpMenu(): React.JSX.Element {
  const open = useLearnStore((s) => s.menuOpen)
  const completed = useSettingsStore((s) => s.completedLessons)
  const introDone = useSettingsStore((s) => s.introDone)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) void dispatch({ type: 'learn/menu', open: false })
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') void dispatch({ type: 'learn/menu', open: false })
    }
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="helpmenu" ref={ref}>
      <button
        type="button"
        className="helpmenu__button"
        data-tour-id="help-menu"
        aria-expanded={open}
        aria-label="Hjelp og leksjoner"
        onClick={() => void dispatch({ type: 'learn/menu', open: !open })}
      >
        ?
      </button>
      {open && (
        <div className="helpmenu__panel" role="menu">
          <div className="helpmenu__heading">Grunnkurs</div>
          <button
            type="button"
            className="helpmenu__item"
            role="menuitem"
            onClick={() => void dispatch({ type: 'learn/start', tour: 'intro' })}
          >
            <span className={`helpmenu__check ${introDone ? 'helpmenu__check--done' : ''}`}>
              {introDone ? '✓' : '★'}
            </span>
            <span>
              <span className="helpmenu__title">{introDone ? 'Ta grunnkurset på nytt' : INTRO.title}</span>
              <span className="helpmenu__desc">{INTRO.description}</span>
            </span>
          </button>
          <div className="helpmenu__heading">Leksjoner</div>
          {LESSON_IDS.map((id, i) => {
            const lesson = LESSONS[id]
            const done = completed.includes(id)
            const unlocks = groupsUnlockedBy(id)
              .map((g) => GROUP_INFO[g].label)
              .join(' og ')
            return (
              <button
                key={id}
                type="button"
                className="helpmenu__item"
                role="menuitem"
                onClick={() => void dispatch({ type: 'learn/start', tour: id })}
              >
                <span className={`helpmenu__check ${done ? 'helpmenu__check--done' : ''}`}>{done ? '✓' : i + 1}</span>
                <span>
                  <span className="helpmenu__title">{lesson.title}</span>
                  <span className="helpmenu__desc">{lesson.description}</span>
                  <span className="helpmenu__unlocks">{done ? `Låst opp: ${unlocks}` : `Låser opp: ${unlocks}`}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
