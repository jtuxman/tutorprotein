import type { TabInfo } from './tabs'

interface ComingSoonProps {
  tab: TabInfo
}

export function ComingSoon({ tab }: ComingSoonProps) {
  return (
    <section className="coming-soon" aria-labelledby={`${tab.id}-title`}>
      <div className="coming-soon__icon" aria-hidden="true">
        {tab.icon}
      </div>
      <h2 id={`${tab.id}-title`}>{tab.label}</h2>
      <p className="coming-soon__badge">Próximamente</p>
      <p className="coming-soon__text">{tab.description}</p>
      <p className="coming-soon__phase">Llega en la fase {tab.phase} 🚧</p>
      <div className="coming-soon__bubbles" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  )
}
