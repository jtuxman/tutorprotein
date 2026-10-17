import { useMemo, useState } from 'react'
import './App.css'
import { currentStreak, dueCards, useProgress } from './progress'
import { ClassificationTab } from './tabs/classification'
import { ComingSoon } from './tabs/ComingSoon'
import { ProteinsTab } from './tabs/proteins'
import { QuizTab } from './tabs/quiz'
import { TABS, type TabId } from './tabs/tabs'

function App() {
  const [activeId, setActiveId] = useState<TabId>(TABS[0].id)
  const [startDaily, setStartDaily] = useState(false)
  const activeTab = TABS.find((tab) => tab.id === activeId) ?? TABS[0]

  const progress = useProgress()
  const due = useMemo(() => dueCards(progress), [progress])
  const streak = useMemo(() => currentStreak(progress), [progress])

  const openDailyReview = () => {
    setStartDaily(true)
    setActiveId('self-assessment')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span aria-hidden="true">⚗️</span> AminoLab
        </h1>
        <p className="app-tagline">Aminoácidos y proteínas, jugando</p>
        {(due.length > 0 || streak > 0) && activeId !== 'self-assessment' && (
          <div className="daily-reminder" role="region" aria-label="Recordatorio de repaso diario">
            <span>
              {streak > 0 && (
                <>
                  🔥 Racha: <strong>{streak}</strong> {streak === 1 ? 'día' : 'días'} ·{' '}
                </>
              )}
              {due.length > 0
                ? `Tienes ${due.length} ${due.length === 1 ? 'aminoácido pendiente' : 'aminoácidos pendientes'} en tu repaso de hoy`
                : '¡Repaso diario al día!'}
            </span>
            {due.length > 0 && (
              <button type="button" className="daily-reminder__button" onClick={openDailyReview}>
                Repasar ahora →
              </button>
            )}
          </div>
        )}
      </header>

      <nav className="tab-bar" aria-label="Secciones">
        <ul role="tablist">
          {TABS.map((tab) => (
            <li key={tab.id} role="presentation">
              <button
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={tab.id === activeId}
                aria-controls={`panel-${tab.id}`}
                className="tab-button"
                onClick={() => {
                  setStartDaily(false)
                  setActiveId(tab.id)
                }}
              >
                <span className="tab-button__icon" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="tab-button__label">{tab.label}</span>
                <span className="tab-button__short" aria-hidden="true">
                  {tab.shortLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main
        className="tab-panel"
        role="tabpanel"
        id={`panel-${activeTab.id}`}
        aria-labelledby={`tab-${activeTab.id}`}
        key={activeTab.id}
      >
        {activeTab.id === 'classification' ? (
          <ClassificationTab />
        ) : activeTab.id === 'self-assessment' ? (
          <QuizTab startDailyReview={startDaily} />
        ) : activeTab.id === 'proteins' ? (
          <ProteinsTab />
        ) : (
          <ComingSoon tab={activeTab} />
        )}
      </main>
    </div>
  )
}

export default App
