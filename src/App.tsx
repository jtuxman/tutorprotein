import { useState } from 'react'
import './App.css'
import { ComingSoon } from './tabs/ComingSoon'
import { TABS, type TabId } from './tabs/tabs'

function App() {
  const [activeId, setActiveId] = useState<TabId>(TABS[0].id)
  const activeTab = TABS.find((tab) => tab.id === activeId) ?? TABS[0]

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span aria-hidden="true">⚗️</span> AminoLab
        </h1>
        <p className="app-tagline">Aminoácidos y proteínas, jugando</p>
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
                onClick={() => setActiveId(tab.id)}
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
        <ComingSoon tab={activeTab} />
      </main>
    </div>
  )
}

export default App
