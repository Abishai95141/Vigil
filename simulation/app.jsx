// app.jsx — Root: shell, navigation, scenario player, surface routing

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useRef: useRefA } = React;

// ============================================================
// LIVE CLOCK — Topbar wall clock anchored to the current scenario chapter
//   Earlier the clock free-ran from 14:02:11, drifting away from the
//   scenario events. Now it sits on a per-chapter "as of" time and ticks
//   forward within the chapter window so demo timestamps stay coherent.
// ============================================================
function LiveClock({ chapter }) {
  const tick = window.useTick(1000);
  const baseByChapter = {
    connect:   14 * 3600 + 0  * 60 + 47,   // helm command issued
    topology:  14 * 3600 + 1  * 60 + 42,   // operator marks currency
    flags:     14 * 3600 + 2  * 60 + 3,    // first signals
    firing:    14 * 3600 + 2  * 60 + 14,   // playbook fires
    synthesis: 14 * 3600 + 2  * 60 + 20,   // synthesis composed
    ask:       14 * 3600 + 2  * 60 + 34,   // operator queries
    escalate:  14 * 3600 + 2  * 60 + 52,   // escalation triggers
    resolved:  14 * 3600 + 3  * 60 + 24,   // resolved
  };
  // Cap the drift inside a chapter so we don't bleed into the next one
  const base = baseByChapter[chapter] ?? (14 * 3600 + 2 * 60 + 11);
  const total = base + (tick % 8);
  const hh = String(Math.floor(total / 3600) % 24).padStart(2, '0');
  const mm = String(Math.floor(total / 60) % 60).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return (
    <div className="topbar__stat topbar__clock">
      <span className="topbar__stat-val mono">{hh}:{mm}:{ss}</span>
      <span className="topbar__stat-lab">cluster time · demo</span>
    </div>
  );
}

// ============================================================
// ICONS (sidebar nav)
// ============================================================
const Icons = {
  topology: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="4" cy="5" r="1.6"/><circle cx="12" cy="4" r="1.6"/><circle cx="10" cy="12" r="1.6"/><circle cx="4" cy="12" r="1.6"/><line x1="5.5" y1="5.5" x2="10.5" y2="4.3"/><line x1="4" y1="6.6" x2="4" y2="10.4"/><line x1="12" y1="5.5" x2="10.5" y2="10.5"/><line x1="5.5" y1="12" x2="8.5" y2="12"/></svg>,
  insights: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="10" height="10"/><line x1="3" y1="6" x2="13" y2="6"/><line x1="6" y1="9" x2="11" y2="9"/></svg>,
  timeline: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><line x1="2" y1="8" x2="14" y2="8" strokeDasharray="1.5 3"/><circle cx="5" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="2"/><circle cx="12" cy="8" r="1.2" fill="currentColor"/></svg>,
  chat:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 4 H13 V11 H7 L4 14 V11 H3 Z"/><line x1="5" y1="7" x2="11" y2="7"/><line x1="5" y1="9" x2="9" y2="9"/></svg>,
  onboard:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 4 L8 2 L13 4 L8 6 Z"/><path d="M3 8 L8 6 L13 8 L8 10 Z"/><path d="M3 12 L8 10 L13 12 L8 14 Z"/></svg>,
  context:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="10" height="10"/><line x1="6" y1="6" x2="10" y2="6"/><line x1="6" y1="9" x2="8" y2="9"/></svg>,
  settings: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="8" cy="8" r="2"/><path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3.2 3.2 L4.5 4.5 M11.5 11.5 L12.8 12.8 M3.2 12.8 L4.5 11.5 M11.5 4.5 L12.8 3.2"/></svg>,
  search:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="7" cy="7" r="4.5"/><line x1="10.3" y1="10.3" x2="13.5" y2="13.5"/></svg>,
  play:     <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 3 L13 8 L4 13 Z"/></svg>,
  pause:    <svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="3" height="10"/><rect x="9" y="3" width="3" height="10"/></svg>,
  prev:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M11 3 L5 8 L11 13"/></svg>,
  next:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M5 3 L11 8 L5 13"/></svg>,
  restart:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 8 a5 5 0 1 0 1.5 -3.5 L3 6 M3 3 V6 H6"/></svg>,
};

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar({ current, onSelect, escalations }) {
  const items = [
    { id: 'onboarding', label: 'Onboarding',   icon: Icons.onboard,   badge: '06/07' },
    { id: 'topology',   label: 'Topology',     icon: Icons.topology,  badge: '71' },
    { id: 'insights',   label: 'Insights',     icon: Icons.insights,  badge: escalations > 0 ? `${escalations} esc` : null, live: escalations > 0 },
    { id: 'timeline',   label: 'Timeline',     icon: Icons.timeline },
    { id: 'chat',       label: 'Ask',          icon: Icons.chat },
  ];
  const secondary = [
    { id: 'context',  label: 'Context entries', icon: Icons.context },
    { id: 'settings', label: 'Settings',        icon: Icons.settings },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          <svg viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12.5" stroke="#FFFFFF" strokeWidth="1"/>
            <circle cx="14" cy="14" r="6.5" stroke="#FFFFFF" strokeWidth="0.6" strokeDasharray="1.6 3" opacity="0.55"/>
            <line x1="1.5" y1="14" x2="26.5" y2="14" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="1.6 3" opacity="0.4"/>
            <circle cx="14" cy="14" r="1.8" fill="#FFFFFF"/>
          </svg>
        </div>
        <span className="sidebar__brand-word">Vigil</span>
        <span className="sidebar__brand-version">v 0.1</span>
      </div>

      <div className="sidebar__section">
        <div className="sidebar__section-label">Cluster</div>
        {items.map(it => (
          <button
            key={it.id}
            className={`sidebar__nav-item ${current === it.id ? 'is-active' : ''}`}
            onClick={() => onSelect(it.id)}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.badge && <span className={`badge ${it.live ? 'badge--live' : ''}`}>{it.badge}</span>}
          </button>
        ))}
      </div>

      <div className="sidebar__section">
        <div className="sidebar__section-label">Controls</div>
        {secondary.map(it => (
          <button
            key={it.id}
            className={`sidebar__nav-item ${current === it.id ? 'is-active' : ''}`}
            onClick={() => onSelect(it.id)}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar__cluster">
        <div className="sidebar__cluster-row">
          <span className="sidebar__cluster-name">prod-edge-01</span>
          <span className="sidebar__cluster-dot"/>
        </div>
        <div className="sidebar__cluster-row">
          <span className="sidebar__cluster-meta">tier-S · 2 nodes</span>
          <span className="sidebar__cluster-meta">v3.2.1</span>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// TOPBAR
// ============================================================
function Topbar({ surface, chapter, showInternals, setShowInternals, onSearch, onUser }) {
  const tick = window.useTick(1100);
  const surfaceLabel = {
    onboarding: 'Onboarding',
    topology:   'Topology',
    insights:   'Insights',
    timeline:   'Timeline',
    chat:       'Ask',
    context:    'Context',
    settings:   'Settings',
  }[surface] || 'Vigil';

  const stats = {
    connect:   { eps: '—',     bind: '120 / 124', pb: 'calibrating' },
    topology:  { eps: '341/s', bind: '120 / 124', pb: '6 active' },
    flags:     { eps: '362/s', bind: '120 / 124', pb: '6 active · 1 pre-fire' },
    firing:    { eps: '388/s', bind: '120 / 124', pb: '6 active · 1 firing' },
    synthesis: { eps: '391/s', bind: '120 / 124', pb: '6 active · 1 firing' },
    ask:       { eps: '372/s', bind: '120 / 124', pb: '6 active · 1 firing' },
    escalate:  { eps: '418/s', bind: '120 / 124', pb: '6 active · 3 firing' },
    resolved:  { eps: '352/s', bind: '120 / 124', pb: '6 active · 0 firing' },
  }[chapter];

  // Jitter the obs/sec to feel live
  const liveEps = (() => {
    if (stats.eps === '—') return '—';
    const base = parseInt(stats.eps);
    const jitter = ((tick * 5) % 17) - 8;
    return `${base + jitter}/s`;
  })();

  return (
    <header className="topbar">
      <div className="topbar__crumbs">
        <b>prod-edge-01</b>
        <span>/</span>
        <span>{surfaceLabel.toUpperCase()}</span>
        <span className="topbar__demo-badge mono" title="This is a guided simulation. Mock data + scripted timing.">DEMO</span>
      </div>
      <button className="topbar__search" onClick={onSearch}>
        {Icons.search}
        <span>Search entities, playbooks, insights…</span>
        <kbd>⌘ K</kbd>
      </button>
      <button
        className={`topbar__internals ${showInternals ? 'is-on' : ''}`}
        onClick={() => setShowInternals(v => !v)}
        title="Toggle the inner-workings overlay — shows the agent collaboration that produces the operator-facing surface."
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6"/>
          <circle cx="8" cy="8" r="2.5" strokeDasharray="1.5 2"/>
          <line x1="8" y1="0.5" x2="8" y2="2"/>
          <line x1="8" y1="14" x2="8" y2="15.5"/>
          <line x1="0.5" y1="8" x2="2" y2="8"/>
          <line x1="14" y1="8" x2="15.5" y2="8"/>
        </svg>
        <span>{showInternals ? 'Internals · on' : 'Inside the system'}</span>
      </button>
      <LiveClock chapter={chapter}/>
      <div className="topbar__stat">
        <span className="topbar__stat-val">{liveEps}</span>
        <span className="topbar__stat-lab">obs / sec</span>
      </div>
      <div className="topbar__stat">
        <span className="topbar__stat-val">{stats.bind}</span>
        <span className="topbar__stat-lab">bound</span>
      </div>
      <div className="topbar__stat">
        <span className="topbar__stat-val">{stats.pb}</span>
        <span className="topbar__stat-lab">playbooks</span>
      </div>
      <button className="topbar__user" onClick={onUser}>M</button>
    </header>
  );
}

// ============================================================
// SCENARIO PLAYER
// ============================================================
function ScenarioPlayer({ chapters, idx, setIdx, playing, setPlaying }) {
  const cur = chapters[idx];

  return (
    <footer className="player" style={{ '--chapter-count': chapters.length }}>
      <div className="player__chapter">
        <div className="player__chapter-num">CHAPTER · {cur.num} / {String(chapters.length).padStart(2, '0')}</div>
        <div className="player__chapter-name">
          {cur.name.split(' ').map((w, i, arr) => (i === arr.length - 1 ? <em key={i}>{w}</em> : <React.Fragment key={i}>{w}{' '}</React.Fragment>))}
        </div>
        <div className="player__chapter-sub">{cur.sub}</div>
      </div>

      <div className="player__track">
        <div className="player__rail">
          {chapters.map((c, i) => (
            <div
              key={c.id}
              className={`player__rail-cell ${i < idx ? 'is-done' : ''} ${i === idx ? 'is-active' : ''}`}
              onClick={() => setIdx(i)}
              role="button"
              title={c.name}
            />
          ))}
        </div>
        <div className="player__rail-labels">
          {chapters.map((c, i) => (
            <span
              key={c.id}
              className={`player__rail-label ${i < idx ? 'is-done' : ''} ${i === idx ? 'is-active' : ''}`}
            >{c.rail}</span>
          ))}
        </div>
      </div>

      <div className="player__controls">
        <button className="player__btn" onClick={() => setIdx(0)} title="Restart">{Icons.restart}</button>
        <button className="player__btn" onClick={() => setIdx(Math.max(0, idx - 1))} title="Previous">{Icons.prev}</button>
        <button className="player__btn player__btn--primary" onClick={() => setPlaying(!playing)}>
          {playing ? Icons.pause : Icons.play}
          <span>{playing ? 'Pause' : 'Play scenario'}</span>
        </button>
        <button className="player__btn" onClick={() => setIdx(Math.min(chapters.length - 1, idx + 1))} title="Next">{Icons.next}</button>
      </div>
    </footer>
  );
}

// ============================================================
// CONTEXT entries / Settings (placeholder surfaces)
// ============================================================
function ContextView({ extras, onNew }) {
  const baseCtxs = [
    { type: 'planned_maintenance', scope: 'pvc-orders', when: '14:03:08 → 14:18:08', by: 'maya@team', effect: 'suppress', pb: 'pb.storage_saturation', status: 'active' },
    { type: 'deploy_window',       scope: 'shop namespace', when: '09:00 → 09:30 daily', by: 'maya@team', effect: 'annotate_only', pb: 'all', status: 'recurring' },
    { type: 'expected_recurring_pattern', scope: 'batch-reconcile-cron', when: 'Mon 09:00 weekly', by: 'liam@team', effect: 'suppress', pb: 'pb.cpu_contention', status: 'recurring' },
    { type: 'known_broken',        scope: 'recommendation-4a7c',  when: 'open since 5 days', by: 'liam@team', effect: 'downgrade_severity', pb: 'pb.grpc_degradation', status: 'active' },
  ];
  const all = [...(extras || []), ...baseCtxs];
  return (
    <div className="surface__body ctx">
      <div className="ctx__head">
        <div>
          <div className="eyebrow">/context</div>
          <div className="ctx__title">Context windows · operator-annotated time/scope</div>
          <p className="ctx__sub">Mark planned maintenance, chaos tests, deploys, and recurring patterns. Context modifies how playbooks fire — it never silences observation.</p>
        </div>
        <button className="player__btn player__btn--primary" style={{ height: 38 }} onClick={onNew}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
          <span>New context entry</span>
        </button>
      </div>
      <div className="ctx__grid">
        {all.map((c, i) => (
          <div className="ctx__card" key={c.id || i}>
            <div className="ctx__card-head">
              <span className={`chip ${c.status === 'active' ? 'chip--solid' : 'chip--warn'}`}><span className="chip__dot"/>{c.status}</span>
              <span className="chip mono">{c.effect}</span>
            </div>
            <div className="ctx__card-type mono">{c.type}</div>
            <div className="ctx__card-scope">{c.scope}</div>
            <div className="ctx__card-row"><span className="eyebrow">when</span><span className="mono">{c.when}</span></div>
            <div className="ctx__card-row"><span className="eyebrow">by</span><span className="mono">{c.by}</span></div>
            <div className="ctx__card-row"><span className="eyebrow">applies to</span><span className="mono">{c.pb}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ sensitivity, setSensitivity, alertRoutes, setAlertRoutes, subtab, setSubtab, playbookEnabled, togglePlaybook, playbookThreshold, setThreshold }) {
  const tabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'playbooks',  label: 'Playbook management' },
    { id: 'capability', label: 'Capability report' },
  ];
  return (
    <div className="surface__body settings-shell">
      <div className="settings-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`settings-tab ${subtab === t.id ? 'is-active' : ''}`} onClick={() => setSubtab(t.id)}>{t.label}</button>
        ))}
      </div>
      {subtab === 'overview' && (
        <div className="settings">
          <div className="settings__panel">
            <div className="eyebrow">/settings · exploratory agent</div>
            <h3>Exploratory agent sensitivity</h3>
            <p>Controls how eagerly the agent invokes for unexplained signals.</p>
            <div className="settings__radio">
              {[
                { id: 'conservative', lab: 'Conservative', sub: '~50/day' },
                { id: 'standard',     lab: 'Standard',     sub: '~150/day' },
                { id: 'eager',        lab: 'Eager',        sub: '~500/day' },
              ].map(r => (
                <button key={r.id} className={`settings__radio-btn ${sensitivity === r.id ? 'is-active' : ''}`} onClick={() => setSensitivity(r.id)}>
                  <span className="settings__radio-dot"/>
                  <span>{r.lab}</span>
                  <span className="eyebrow mono">{r.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="settings__panel">
            <div className="eyebrow">/settings · alert routing</div>
            <h3>Where insights go</h3>
            {[
              { id: 'feed',      lab: 'in-product feed', detail: 'always · 100%',                             locked: true  },
              { id: 'slack',     lab: 'Slack',           detail: '#vigil-prod · severity ≥ medium',           locked: false },
              { id: 'pagerduty', lab: 'PagerDuty',       detail: 'on-call · severity ≥ high · escalations',   locked: false },
              { id: 'email',     lab: 'Email',           detail: 'daily digest · operators × 3',              locked: false },
            ].map(r => (
              <div className="settings__route" key={r.id}>
                <button
                  className={`settings__route-btn ${alertRoutes[r.id] ? 'is-on' : ''}`}
                  onClick={() => !r.locked && setAlertRoutes(a => ({ ...a, [r.id]: !a[r.id] }))}
                  disabled={r.locked}
                >
                  <span className="settings__route-pip"/>
                  <span>{r.lab}</span>
                </button>
                <span className="mono">{r.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {subtab === 'playbooks' && (
        <window.PlaybookManagementView
          enabledMap={playbookEnabled}
          thresholdMap={playbookThreshold}
          onToggle={togglePlaybook}
          onThreshold={setThreshold}
        />
      )}
      {subtab === 'capability' && <window.CapabilityReportView/>}
    </div>
  );
}

// ============================================================
// APP — root component
// ============================================================
function App() {
  // Chapter index drives the entire simulation state
  const [chapterIdx, setChapterIdx] = useStateA(0);
  const [playing, setPlaying] = useStateA(true);
  const [focusedId, setFocusedId] = useStateA(null);

  // Sidebar surface (manual override)
  const [manualSurface, setManualSurface] = useStateA(null);

  // Operator-watched nodes (Set of entity IDs). Seeded by scenario per chapter
  // but operator can add/remove via the Inspector watch toggle.
  const [watchedNodes, setWatchedNodes] = useStateA(() => new Set());

  // "Inside the system" overlay — slides up the agent activity drawer
  const [showInternals, setShowInternals] = useStateA(false);

  // ---------- Interaction state ----------
  // modal: { kind: 'annotate'|'suppress'|'drill'|'newContext'|'escalationAck'|'bindingReview'|'userMenu'|'commandPalette', ...payload }
  const [modal, setModal] = useStateA(null);
  const [toast, setToast] = useStateA(null);

  // Filter for insights (All/Playbook/Synthesis/Candidate/Escalation)
  const [insightFilter, setInsightFilter] = useStateA('all');

  // Card status — operator can acknowledge, mark suppressed, annotate
  // Map of cardId → { ack?: bool, annotation?: {...}, suppressed?: bool, dismissed?: bool }
  const [cardStatus, setCardStatus] = useStateA({});

  // Settings state — sensitivity + alert routing
  const [sensitivity, setSensitivity] = useStateA('standard');   // conservative / standard / eager
  const [alertRoutes, setAlertRoutes] = useStateA({
    feed: true,
    slack: true,
    pagerduty: true,
    email: false,
  });
  const [playbookEnabled, setPlaybookEnabled] = useStateA({});   // pbId → bool
  const [playbookThreshold, setPlaybookThreshold] = useStateA({});  // pbId → 20-80
  const [settingsSubtab, setSettingsSubtab] = useStateA('overview'); // overview / playbooks / capability

  // Chat state — extends CHAT_HISTORY with operator-typed messages and synthetic responses
  const [chatExtras, setChatExtras] = useStateA([]);
  const [chatComposing, setChatComposing] = useStateA(false);

  // Onboarding binding review state — decided rows are remembered
  const [bindingDecisions, setBindingDecisions] = useStateA({});  // observable → 'confirmed' | 'edited' | 'rejected'

  // Context entries (extends the demo set with operator-created ones)
  const [extraContexts, setExtraContexts] = useStateA([]);

  // Escalation state — picked interpretation
  const [escalationPick, setEscalationPick] = useStateA(null);

  // Cmd+K shortcut for command palette
  useEffectA(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setModal({ kind: 'commandPalette' });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Toast scheduler
  const fireToast = (msg) => setToast({ msg, ts: Date.now() });

  const chapters = window.CHAPTERS;
  const chapter = chapters[chapterIdx];
  const chapterId = chapter.id;

  // Auto-play: advance every 5s while playing
  useEffectA(() => {
    if (!playing) return;
    const handle = setTimeout(() => {
      if (chapterIdx < chapters.length - 1) {
        setChapterIdx(chapterIdx + 1);
        setManualSurface(null); // chapter advance overrides manual nav
      } else {
        setPlaying(false);
      }
    }, 5000);
    return () => clearTimeout(handle);
  }, [chapterIdx, playing]);

  // Focus the most-relevant entity for each chapter. Operator can still
  // click any node; this is just the demo default.
  useEffectA(() => {
    if (chapterId === 'flags') {
      // The watched node is the protagonist now — its inspector shows
      // the predicted-activation panel + inner workings.
      setFocusedId('pod.currency');
    } else if (chapterId === 'firing' || chapterId === 'synthesis') {
      setFocusedId('pod.currency');
    } else if (chapterId === 'connect') {
      setFocusedId(null);
    }
  }, [chapterId]);

  // Sync watched nodes with the scenario. Operator can still toggle freely;
  // this just keeps the demo coherent as chapters advance.
  useEffectA(() => {
    const scenarioWatched = (window.WATCHED_BY_CHAPTER || {})[chapterId] || [];
    setWatchedNodes(prev => {
      const next = new Set(prev);
      scenarioWatched.forEach(id => next.add(id));
      return next;
    });
  }, [chapterId]);

  // Auto-advance also resets manual surface
  const handleSetIdx = (i) => {
    setChapterIdx(i);
    setManualSurface(null);
    setPlaying(false);
  };

  // Toggle a node in/out of the watched set
  const toggleWatch = (entityId) => {
    setWatchedNodes(prev => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  };

  // Navigate from an insight card or chat citation → topology with focus.
  // Citation refs include both entity IDs (pod.currency, node.a) and
  // observation/rule IDs (obs.working_set.2c8d3); only entities have a
  // graph node to focus, so we fall back to just switching surfaces.
  const openInTopology = (refId) => {
    if (!refId) return;
    const isEntity = window.ENTITIES.some(e => e.id === refId);
    if (isEntity) setFocusedId(refId);
    setManualSurface('topology');
    setPlaying(false);
  };

  // Modal-action dispatcher
  const handleModalAction = (kind, payload) => {
    if (kind === 'annotate') {
      const cardId = modal?.card?.id;
      if (cardId) {
        setCardStatus(s => ({ ...s, [cardId]: { ...(s[cardId] || {}), annotation: payload, ack: true } }));
      }
      fireToast(`Annotation saved · ${payload.kind.replace('_', ' ')}${payload.kind === 'false_positive' ? ' · suppression hint queued' : ''}`);
    } else if (kind === 'suppress') {
      const cardId = modal?.card?.id;
      if (cardId) {
        setCardStatus(s => ({ ...s, [cardId]: { ...(s[cardId] || {}), suppressed: true } }));
      }
      fireToast(`Suppression active · ${payload.playbook} · ${payload.scope} · ${payload.duration}`);
    } else if (kind === 'newContext') {
      const ctx = {
        id: 'ctx.' + Date.now(),
        type: payload.type,
        scope: payload.target,
        when: `now → +${payload.window}m`,
        by: 'maya@team',
        effect: ({
          planned_maintenance: 'suppress',
          chaos_test: 'annotate_only',
          load_test: 'downgrade_severity',
          deploy_window: 'annotate_only',
          expected_recurring_pattern: 'suppress',
          known_broken: 'downgrade_severity',
          under_investigation: 'boost_priority',
        })[payload.type] || 'annotate_only',
        pb: 'all',
        status: 'active',
      };
      setExtraContexts(c => [ctx, ...c]);
      fireToast(`Context entry created · ${payload.type} · ${payload.target}`);
    } else if (kind === 'escalationAck') {
      const cardId = modal?.card?.id;
      if (cardId) {
        setCardStatus(s => ({ ...s, [cardId]: { ...(s[cardId] || {}), ack: true } }));
      }
      setEscalationPick(payload);
      fireToast(`Escalation acknowledged · ${payload.label} · synthesis resuming`);
    } else if (kind === 'bindingReview') {
      const local = payload.binding?.local;
      if (local) setBindingDecisions(d => ({ ...d, [local]: payload.decision }));
      fireToast(`Binding · ${payload.decision} · ${local}`);
    } else if (kind === 'commandPalette') {
      const it = payload;
      if (it.kind === 'entity') openInTopology(it.id);
      else if (it.kind === 'playbook') { setManualSurface('settings'); setSettingsSubtab('playbooks'); setPlaying(false); }
      else if (it.kind === 'insight') { setManualSurface('insights'); setPlaying(false); }
    }
  };

  // Acknowledge a card without going through annotate (escalation needs the picker)
  const ackCard = (card) => {
    if (card.kind === 'escalation') {
      setModal({ kind: 'escalationAck', card });
    } else {
      setCardStatus(s => ({ ...s, [card.id]: { ...(s[card.id] || {}), ack: true } }));
      fireToast('Insight acknowledged');
    }
  };

  // Chat — submit either typed text or a suggestion chip
  const submitChat = (text) => {
    if (!text || !text.trim()) return;
    const t = text.trim();
    const nowStr = new Date().toLocaleTimeString('en-GB').slice(0, 8);
    const opMsg = { who: 'op', t: '14:02:' + String(40 + chatExtras.length).padStart(2, '0'), txt: t };
    setChatExtras(x => [...x, opMsg]);
    setChatComposing(true);
    setTimeout(() => {
      const ql = t.toLowerCase();
      let reply;
      if (ql.includes('last week') || ql.includes('related')) {
        reply = { who: 'sys', t: '14:02:' + String(41 + chatExtras.length).padStart(2, '0'), txt: [
          'Yes — a similar probe-cascade fired on 2026-05-11 at 09:42 on the same pod role. Same upstream (cartservice memory) and the same node (', { c: 'prod-edge-01-node-a', ref: 'node.a' }, '). It resolved after a cart memory limit increase from 384 → 512 MiB.',
          'The pattern history is recorded against the PodRole, so the comparison is durable across pod restarts.',
        ]};
      } else if (ql.includes('clear') || ql.includes('how') || ql.includes('beyond')) {
        reply = { who: 'sys', t: '14:02:' + String(41 + chatExtras.length).padStart(2, '0'), txt: [
          'Three options ordered by least-invasive first:',
          { kind: 'list', items: [
            ['1.', 'Raise cart memory limit (current 512 MiB) to 768 MiB — the playbook\'s recommended action.'],
            ['2.', 'Roll back to ', { c: 'cartservice:v1.4.1', ref: 'pod.cart' }, ' — the deploy at 13:42 introduced the memory regression.'],
            ['3.', 'Scale cart from 1 → 2 replicas to spread the working set across nodes.'],
          ]},
          'Confidence on these is high for option 1, medium for 2 and 3.',
        ]};
      } else if (ql.includes('other clusters') || ql.includes('image')) {
        reply = { who: 'sys', t: '14:02:' + String(41 + chatExtras.length).padStart(2, '0'), txt: [
          'Cross-cluster lookup is out of v3 scope — federation is roadmap. For this cluster, ', { c: 'cartservice:v1.4.2', ref: 'pod.cart' }, ' is the only running image on this role.',
          'I can mark this question to revisit when multi-cluster ships.',
        ]};
      } else if (ql.includes('show me everything') || ql.includes('today')) {
        reply = { who: 'sys', t: '14:02:' + String(41 + chatExtras.length).padStart(2, '0'), txt: [
          'Chronological summary for ', { c: 'currencyservice-7b4f9', ref: 'pod.currency' }, ' today:',
          { kind: 'list', items: [
            ['—', '14:01:42 · operator marked as critical-watch (maya@team)'],
            ['—', '14:02:10 · pre-fire forecast surfaced · pb.probe_cascade pre-match 2/3'],
            ['—', '14:02:14 · ', { c: 'pb.probe_cascade', ref: 'pb.probe_cascade' }, ' fired · conf 0.87'],
            ['—', '14:02:20 · cross-domain synthesis composed · pathway match'],
          ]},
          'All events have evidence chains — click any for level-4 raw observation.',
        ]};
      } else {
        reply = { who: 'sys', t: '14:02:' + String(41 + chatExtras.length).padStart(2, '0'), txt: [
          'Decomposing your query against the knowledge graph…',
          'I have current state for ', { c: 'currencyservice-7b4f9', ref: 'pod.currency' }, ', ', { c: 'cartservice-2c8d3', ref: 'pod.cart' }, ', and ', { c: 'prod-edge-01-node-a', ref: 'node.a' }, '. If you can be specific (e.g. "show me X", "compare Y to Z"), I can ground the answer in evidence.',
        ]};
      }
      setChatExtras(x => [...x, reply]);
      setChatComposing(false);
    }, 900);
  };

  // Surface: manual override takes precedence
  const surface = manualSurface || chapter.surface;

  const stateMap = window.STATE_BY_CHAPTER[chapterId] || {};
  const visibleEscalations = surface === 'insights' ? (chapterId === 'escalate' ? 1 : 0) : (chapterId === 'escalate' ? 1 : 0);

  return (
    <div className="app">
      <Sidebar
        current={surface}
        onSelect={(id) => { setManualSurface(id); setPlaying(false); }}
        escalations={chapterId === 'escalate' ? 1 : 0}
      />
      <Topbar
        surface={surface}
        chapter={chapterId}
        showInternals={showInternals}
        setShowInternals={setShowInternals}
        onSearch={() => setModal({ kind: 'commandPalette' })}
        onUser={() => setModal({ kind: 'userMenu' })}
      />

      <main className="main">
        {/* Onboarding */}
        <div className={`surface ${surface === 'onboarding' ? 'is-active' : ''}`}>
          <div className="surface__head">
            <div>
              <h2 className="surface__title">Welcome to <em>prod-edge-01.</em></h2>
              <p className="surface__sub">The agent is installed and the cluster is being prepared. Each phase shows concrete progress — there is no opaque "wait."</p>
            </div>
            <div className="surface__chips">
              <span className="chip chip--live"><span className="chip__dot"/>connected</span>
              <span className="chip chip--warn"><span className="chip__dot"/>phase 06 · warmup</span>
              <span className="chip mono">eta · 4m 12s</span>
            </div>
          </div>
          <OnboardingView
            chapter={chapterId}
            chapterIdx={chapterIdx}
            bindingDecisions={bindingDecisions}
            onReviewBinding={(b) => setModal({ kind: 'bindingReview', binding: b })}
          />
        </div>

        {/* Topology */}
        <div className={`surface ${surface === 'topology' ? 'is-active' : ''}`}>
          <div className="surface__head">
            <div>
              <h2 className="surface__title">Cluster <em>topology.</em></h2>
              <p className="surface__sub">Live semantic graph. Click any node to inspect. The active prediction overlay marks affected entities; pathway overlays render when the master agent matches.</p>
            </div>
            <div className="surface__chips">
              <span className="chip chip--live"><span className="chip__dot"/>live</span>
              <span className="chip mono">{Object.keys(stateMap).filter(k => stateMap[k] === 'firing').length} firing</span>
              <span className="chip mono">{Object.keys(stateMap).filter(k => stateMap[k] === 'flagged' || stateMap[k] === 'observed').length} flagged</span>
              <span className="chip mono">10 entities</span>
            </div>
          </div>
          <TopologyView
            chapter={chapterId}
            entities={window.ENTITIES}
            edges={window.EDGES}
            stateMap={stateMap}
            focusedId={focusedId}
            onFocus={setFocusedId}
            watchedSet={watchedNodes}
            onToggleWatch={toggleWatch}
            demoMode={true}
          />
        </div>

        {/* Insights */}
        <div className={`surface ${surface === 'insights' ? 'is-active' : ''}`}>
          <div className="surface__head">
            <div>
              <h2 className="surface__title">Insight <em>feed.</em></h2>
              <p className="surface__sub">Playbook matches, cross-domain synthesis, and escalations. Each card is grounded — confidence visible, evidence chain one click away.</p>
            </div>
            <div className="surface__chips">
              {chapterId === 'escalate' && <span className="chip chip--solid"><span className="chip__dot"/>escalation</span>}
              {(chapterId === 'firing' || chapterId === 'synthesis' || chapterId === 'ask' || chapterId === 'escalate') && <span className="chip chip--live"><span className="chip__dot"/>incident · 1m 12s</span>}
              <span className="chip mono">severity ↓</span>
            </div>
          </div>
          <InsightsView
            chapter={chapterId}
            onOpenTopology={openInTopology}
            onAck={ackCard}
            onAnnotate={(card) => setModal({ kind: 'annotate', card })}
            onSuppress={(card) => setModal({ kind: 'suppress', card })}
            onDrill={(chainNode) => setModal({ kind: 'drill', chainNode })}
            cardStatus={cardStatus}
            filter={insightFilter}
            setFilter={setInsightFilter}
            escalationPick={escalationPick}
          />
        </div>

        {/* Timeline */}
        <div className={`surface ${surface === 'timeline' ? 'is-active' : ''}`}>
          <div className="surface__head">
            <div>
              <h2 className="surface__title">Anomaly <em>timeline.</em></h2>
              <p className="surface__sub">Horizontal axis of recent observations, playbook firings, agent evidence, synthesis conclusions, and operator actions — one row per domain.</p>
            </div>
            <div className="surface__chips">
              <span className="chip mono">14:01 – 14:04</span>
              <span className="chip chip--live"><span className="chip__dot"/>now · live</span>
            </div>
          </div>
          <TimelineView chapter={chapterId}/>
        </div>

        {/* Chat */}
        <div className={`surface ${surface === 'chat' ? 'is-active' : ''}`}>
          <div className="surface__head">
            <div>
              <h2 className="surface__title">Ask the <em>cluster.</em></h2>
              <p className="surface__sub">Natural-language queries through the master agent. Every entity, metric, log line, or playbook in the response is an inline citation.</p>
            </div>
            <div className="surface__chips">
              <span className="chip mono">ontology v3.2.1</span>
              <span className="chip mono">pattern-library v0.4.1</span>
              <span className="chip chip--live"><span className="chip__dot"/>master agent ready</span>
            </div>
          </div>
          <ChatView
            chapter={chapterId}
            onCite={openInTopology}
            extras={chatExtras}
            composing={chatComposing}
            onSubmit={submitChat}
          />
        </div>

        {/* Context */}
        <div className={`surface ${surface === 'context' ? 'is-active' : ''}`}>
          <div className="surface__head">
            <div>
              <h2 className="surface__title">Context <em>windows.</em></h2>
              <p className="surface__sub">Operator-annotated time and scope. Modifies playbook firing behavior in known-expected windows. Never silences observation.</p>
            </div>
            <div className="surface__chips">
              <span className="chip chip--live"><span className="chip__dot"/>4 active</span>
              <span className="chip mono">2 recurring</span>
            </div>
          </div>
          <ContextView extras={extraContexts} onNew={() => setModal({ kind: 'newContext' })}/>
        </div>

        {/* Settings */}
        <div className={`surface ${surface === 'settings' ? 'is-active' : ''}`}>
          <div className="surface__head">
            <div>
              <h2 className="surface__title">Settings.</h2>
              <p className="surface__sub">Routing, sensitivity, and bindings. Sensible defaults; rarely needs adjustment.</p>
            </div>
          </div>
          <SettingsView
            sensitivity={sensitivity}
            setSensitivity={setSensitivity}
            alertRoutes={alertRoutes}
            setAlertRoutes={setAlertRoutes}
            subtab={settingsSubtab}
            setSubtab={setSettingsSubtab}
            playbookEnabled={playbookEnabled}
            togglePlaybook={(pbId) => setPlaybookEnabled(m => ({ ...m, [pbId]: m[pbId] === false ? true : false }))}
            playbookThreshold={playbookThreshold}
            setThreshold={(pbId, v) => setPlaybookThreshold(m => ({ ...m, [pbId]: v }))}
          />
        </div>

        {/* "Inside the system" overlay — slides up over any surface */}
        {showInternals && (
          <AgentActivityDrawer chapter={chapterId} onClose={() => setShowInternals(false)}/>
        )}
      </main>

      {/* Modal host + toast — global overlay layer */}
      <window.ModalHost modal={modal} onClose={() => setModal(null)} onAction={handleModalAction}/>
      {toast && <window.Toast key={toast.ts} message={toast.msg} onDone={() => setToast(null)}/>}

      <ScenarioPlayer
        chapters={chapters}
        idx={chapterIdx}
        setIdx={handleSetIdx}
        playing={playing}
        setPlaying={(p) => { setPlaying(p); }}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
