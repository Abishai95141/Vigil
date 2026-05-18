// surfaces.jsx — Insights feed, Anomaly timeline, Chat ("ask the cluster"), Event row

const { useState: useStateS, useEffect: useEffectS, useMemo: useMemoS, useRef: useRefS } = React;

// =============================================================
// EVENT ROW — Streaming bottom-of-graph activity
// =============================================================
function EventRow({ chapter, compact = false }) {
  const allEvents = useMemoS(() => {
    const order = ['connect','topology','flags','firing','synthesis','ask','escalate','resolved'];
    const idx = order.indexOf(chapter);
    return window.EVENTS.filter(e => {
      if (!e.chapter) return idx >= 1;
      return order.indexOf(e.chapter) <= idx;
    }).slice(-(compact ? 6 : 12));
  }, [chapter]);

  // Progressive reveal: start with most-but-not-all, then add new lines one at a time
  const initial = Math.max(0, allEvents.length - 4);
  const visibleCount = window.usePhasedReveal(allEvents.length, initial, 700, chapter);
  const events = allEvents.slice(0, visibleCount);

  return (
    <div className={`evrow ${compact ? 'evrow--compact' : ''}`}>
      {events.map((e, i) => (
        <div className={`evrow__line evrow__line--${e.lvl} fade-in`} key={`${chapter}-${i}-${e.t}`}
             style={{ animationDelay: `${i * 30}ms` }}>
          <span className={`evrow__node evrow__node--${e.lvl}`}/>
          <span className="evrow__time mono">{e.t}</span>
          <span className="evrow__dom mono">{e.dom}</span>
          <span className="evrow__scope mono">{e.scope}</span>
          <span className="evrow__msg">{e.msg}</span>
          <span className={`evrow__verdict mono evrow__verdict--${e.lvl}`}>{e.verdict}</span>
        </div>
      ))}
    </div>
  );
}

// =============================================================
// INSIGHT CARD
// =============================================================
function EvidenceChain({ items, expanded, onDrill }) {
  const labelByLvl = { claim: 'CLAIM', rule: 'RULE FIRING', evidence: 'AGENT EVIDENCE', observation: 'RAW OBSERVATION' };
  return (
    <div className={`evchain ${expanded ? 'is-expanded' : ''}`}>
      {items.map((ev, i) => (
        <div className="evchain__row slide-up" key={i} style={{ animationDelay: `${i * 70}ms` }}>
          <div className="evchain__col-lvl">
            <span className="evchain__dot" aria-hidden="true"/>
            <span className="eyebrow">{labelByLvl[ev.lvl] || ev.lvl}</span>
          </div>
          <div className="evchain__col-ref mono">{ev.ref}</div>
          <div className="evchain__col-txt">{ev.txt}</div>
          <button className="evchain__drill mono" onClick={() => onDrill && onDrill(ev)}>drill ↗</button>
        </div>
      ))}
    </div>
  );
}

function InsightCard({ card, expanded, onToggle, onOpenTopology, onAck, onAnnotate, onSuppress, onDrill, status, escalationPick }) {
  const tick = window.useTick(1000);
  // Cap age display so it doesn't run away during demo
  const ageSec = Math.min(180, 12 + tick);
  const ageStr = ageSec < 60 ? `${ageSec}s ago`
                : ageSec < 3600 ? `${Math.floor(ageSec / 60)}m ${ageSec % 60}s ago`
                : `${Math.floor(ageSec / 3600)}h ago`;

  const sevTag = ({
    low: 'LOW',
    medium: 'MED',
    high: 'HIGH',
    critical: 'CRIT',
  })[card.severity];

  const kindLabel = ({
    predicted_activation:  'PREDICTED · PRE-FIRE',
    playbook_match:        'PLAYBOOK MATCH',
    cross_domain_synthesis:'CROSS-DOMAIN SYNTHESIS',
    exploratory_hypothesis:'CANDIDATE · NO PLAYBOOK',
    escalation:            'ESCALATION · OPERATOR ACK',
  })[card.kind];

  const isAcked = status?.ack;
  const isSuppressed = status?.suppressed;
  const annotation = status?.annotation;

  return (
    <article className={`insight insight--${card.kind} slide-up ${isAcked ? 'is-acked' : ''} ${isSuppressed ? 'is-suppressed' : ''}`}>
      <header className="insight__head">
        <div className="insight__chips">
          <span className={`chip ${
            card.kind === 'escalation' ? 'chip--solid' :
            card.kind === 'predicted_activation' ? 'chip--warn' :
            card.kind === 'cross_domain_synthesis' ? 'chip--live' :
            'chip--solid'
          }`}>
            <span className="chip__dot"/>{kindLabel}
          </span>
          <span className="chip mono">sev · {sevTag}</span>
          <span className="chip mono">conf · {card.confidence}</span>
          {card.playbook && <span className="chip mono">{card.playbook}</span>}
          {card.pathway && <span className="chip mono">{card.pathway}</span>}
          {card.kind === 'predicted_activation' && <span className="chip chip--watch mono">★ watched · {card.affected.find(id => id === 'pod.currency') ? 'currencyservice' : 'entity'}</span>}
          {card.kind === 'exploratory_hypothesis' && <span className="chip mono">exploratory · pattern candidate</span>}
          {isAcked && <span className="chip chip--solid mono"><span className="chip__dot"/>acknowledged</span>}
          {isSuppressed && <span className="chip mono"><span className="chip__dot"/>suppressed</span>}
        </div>
        <div className="insight__meta">
          <span className="eyebrow">14:02 · {ageStr}</span>
          <button className="player__btn" style={{ width: 30, height: 30 }} aria-label="more">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="3" cy="8" r="0.8" fill="currentColor"/><circle cx="8" cy="8" r="0.8" fill="currentColor"/><circle cx="13" cy="8" r="0.8" fill="currentColor"/></svg>
          </button>
        </div>
      </header>

      <h3 className="insight__title">
        {card.headline}
        {card.italic && <em> {card.italic}</em>}
      </h3>

      <p className="insight__body">{card.narrative}</p>

      {/* Forecast meta (predicted-activation only) */}
      {card.kind === 'predicted_activation' && card.forecast && (
        <div className="insight__forecast">
          <div className="insight__forecast-cell">
            <div className="eyebrow">ETA to activation</div>
            <div className="insight__forecast-val">{card.forecast.eta_low}–{card.forecast.eta_high}<span className="mono">s</span></div>
          </div>
          <div className="insight__forecast-cell">
            <div className="eyebrow">forecast confidence</div>
            <div className="insight__forecast-val">{card.forecast.confidence_val.toFixed(2)}</div>
          </div>
          <div className="insight__forecast-cell">
            <div className="eyebrow">pre-match</div>
            <div className="insight__forecast-val">{Math.round(card.forecast.pre_match_fraction * 100)}<span className="mono">%</span></div>
          </div>
          <div className="insight__forecast-bar">
            <div className="insight__forecast-bar-fill" style={{ width: `${card.forecast.pre_match_fraction * 100}%` }}/>
          </div>
        </div>
      )}

      {/* Affected entities (clickable to open in topology) */}
      <div className="insight__affected">
        <span className="eyebrow">affected</span>
        <div className="insight__affected-list">
          {card.affected.map((eid) => {
            const ent = window.ENTITIES.find(e => e.id === eid);
            return ent ? (
              <button className="insight__entity mono" key={eid} onClick={() => onOpenTopology && onOpenTopology(eid)}>{ent.label}</button>
            ) : null;
          })}
        </div>
      </div>

      {/* Conflicting interpretations (escalation only) */}
      {card.conflicting && (
        <div className="insight__conflict">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Conflicting interpretations · {escalationPick ? `resolved: ${escalationPick.label}` : 'pick one'}
          </div>
          {card.conflicting.map((c, i) => (
            <div className={`insight__conflict-row ${escalationPick?.pick === i ? 'is-picked' : ''}`} key={i}>
              <div className="insight__conflict-which mono">{c.which}</div>
              <div className="insight__conflict-txt">{c.txt}</div>
              <div className="insight__conflict-conf mono">conf · {c.confidence}</div>
            </div>
          ))}
        </div>
      )}

      {/* Partial-match playbooks (exploratory only) */}
      {card.partial_matches && (
        <div className="insight__partial">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Partial-match playbooks · how close this resembles known patterns</div>
          {card.partial_matches.map((p, i) => (
            <div className="insight__partial-row" key={i}>
              <div className="mono insight__partial-pb">{p.playbook_id}</div>
              <div className="insight__partial-bar"><div className="insight__partial-fill" style={{ width: `${p.match_fraction * 100}%` }}/></div>
              <div className="mono insight__partial-frac">{Math.round(p.match_fraction * 100)}%</div>
              <div className="insight__partial-diff">{p.differences.join(' · ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested probes (escalation only) */}
      {card.probes && (
        <div className="insight__probes">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Suggested disambiguation probes</div>
          {card.probes.map((p, i) => (
            <div className="insight__probe" key={i}>
              <div className="insight__probe-step mono">PROBE {String(i + 1).padStart(2, '0')}</div>
              <div className="insight__probe-body">
                <div className="insight__probe-q">{p.txt}</div>
                <div className="insight__probe-outcomes">
                  <div><span className="eyebrow">if&nbsp;a</span> {p.a}</div>
                  <div><span className="eyebrow">if&nbsp;b</span> {p.b}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommended action (non-escalation) */}
      {card.action && (
        <div className="insight__action">
          <div className="eyebrow" style={{ marginBottom: 6 }}>Recommended action</div>
          <p>{card.action}</p>
        </div>
      )}

      {/* Evidence chain + actions */}
      <div className="insight__foot">
        <button className={`insight__chain-toggle mono ${expanded ? 'is-open' : ''}`} onClick={() => onToggle(card.id)}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>
            <path d="M4 2 L8 6 L4 10"/>
          </svg>
          evidence chain · {card.evidence.length} nodes
        </button>
        <div className="insight__actions">
          <button
            className="player__btn player__btn--primary"
            style={{ height: 30, fontSize: 11 }}
            onClick={() => {
              if (card.kind === 'escalation')          onAck && onAck(card);
              else if (card.kind === 'predicted_activation') onOpenTopology && onOpenTopology(card.affected[0]);
              else                                      onAnnotate && onAnnotate(card);
            }}
          >
            {card.kind === 'escalation' ? (isAcked ? 'Re-acknowledge' : 'Acknowledge') : card.kind === 'predicted_activation' ? 'Act now' : isAcked ? 'Re-annotate' : 'Annotate'}
          </button>
          {!isAcked && card.kind !== 'escalation' && (
            <button
              className="player__btn"
              style={{ width: 'auto', height: 30, padding: '0 14px', fontSize: 11, fontFamily: 'var(--display)', fontWeight: 500 }}
              onClick={() => onAck && onAck(card)}
            >
              Acknowledge
            </button>
          )}
          <button
            className="player__btn"
            style={{ width: 'auto', height: 30, padding: '0 14px', fontSize: 11, fontFamily: 'var(--display)', fontWeight: 500 }}
            onClick={() => onSuppress && onSuppress(card)}
          >
            Suppress
          </button>
          <button
            className="player__btn"
            style={{ width: 'auto', height: 30, padding: '0 14px', fontSize: 11, fontFamily: 'var(--display)', fontWeight: 500 }}
            onClick={() => onOpenTopology && onOpenTopology(card.affected[0])}
          >
            Open in topology
          </button>
        </div>
      </div>

      {expanded && <EvidenceChain items={card.evidence} expanded={true} onDrill={onDrill}/>}

      {annotation && (
        <div className="insight__annotation">
          <div className="eyebrow" style={{ marginBottom: 8 }}>operator annotation</div>
          <div className="insight__annotation-row">
            <span className="chip mono">{annotation.kind.replace('_', ' ')}</span>
            {annotation.note && <span className="insight__annotation-note">"{annotation.note}"</span>}
            {annotation.ticket && <span className="mono insight__annotation-ticket">ticket · {annotation.ticket}</span>}
          </div>
        </div>
      )}
    </article>
  );
}

// =============================================================
// INSIGHT FEED SURFACE
// =============================================================
function InsightsView({ chapter, onOpenTopology, onAck, onAnnotate, onSuppress, onDrill, cardStatus, filter, setFilter, escalationPick }) {
  const [expanded, setExpanded] = useStateS({});

  const visibleCards = useMemoS(() => {
    const order = ['connect','topology','flags','firing','synthesis','ask','escalate','resolved'];
    const idx = order.indexOf(chapter);
    return window.INSIGHTS.filter(c => {
      const fromIdx  = order.indexOf(c.chapter_from);
      const untilIdx = c.chapter_until ? order.indexOf(c.chapter_until) : 999;
      return fromIdx <= idx && idx <= untilIdx;
    });
  }, [chapter]);

  // Apply filter
  const filterKindMap = {
    all: null,
    playbook: ['playbook_match'],
    synthesis: ['cross_domain_synthesis'],
    candidate: ['exploratory_hypothesis', 'predicted_activation'],
    escalation: ['escalation'],
  };
  const filteredCards = useMemoS(() => {
    const kinds = filterKindMap[filter || 'all'];
    if (!kinds) return visibleCards;
    return visibleCards.filter(c => kinds.includes(c.kind));
  }, [visibleCards, filter]);

  // Auto-expand newest on chapter change
  useEffectS(() => {
    if (visibleCards.length > 0) {
      const newest = visibleCards[visibleCards.length - 1];
      setExpanded((prev) => ({ ...prev, [newest.id]: true }));
    }
  }, [chapter]);

  // Card order: escalation first, then prediction (urgent forward-looking),
  // then synthesis, then matches, exploratory last (lowest confidence).
  const sorted = useMemoS(() => {
    return [...filteredCards].sort((a, b) => {
      const score = (c) =>
        c.kind === 'escalation'             ? 0 :
        c.kind === 'predicted_activation'   ? 1 :
        c.kind === 'cross_domain_synthesis' ? 2 :
        c.kind === 'playbook_match'         ? 3 :
        c.kind === 'exploratory_hypothesis' ? 4 : 5;
      return score(a) - score(b);
    });
  }, [filteredCards]);

  const tabs = [
    { id: 'all',         label: 'All',         count: visibleCards.length },
    { id: 'playbook',    label: 'Playbook',    count: visibleCards.filter(c => c.kind === 'playbook_match').length },
    { id: 'synthesis',   label: 'Synthesis',   count: visibleCards.filter(c => c.kind === 'cross_domain_synthesis').length },
    { id: 'candidate',   label: 'Candidate',   count: visibleCards.filter(c => c.kind === 'exploratory_hypothesis' || c.kind === 'predicted_activation').length },
    { id: 'escalation',  label: 'Escalation',  count: visibleCards.filter(c => c.kind === 'escalation').length },
  ];

  return (
    <div className="surface__body insights">
      <div className="insights__stats">
        <div className="insights__stat">
          <div className="insights__stat-val">{visibleCards.filter(c => c.kind !== 'escalation').length}</div>
          <div className="eyebrow">active insights</div>
        </div>
        <div className="insights__stat insights__stat--em">
          <div className="insights__stat-val">{visibleCards.filter(c => c.kind === 'escalation').length}</div>
          <div className="eyebrow">escalations · ack required</div>
        </div>
        <div className="insights__stat">
          <div className="insights__stat-val">3</div>
          <div className="eyebrow">domains involved</div>
        </div>
        <div className="insights__stat">
          <div className="insights__stat-val mono">prod-edge-01</div>
          <div className="eyebrow">cluster scope</div>
        </div>
        <div className="insights__filter">
          <div className="insights__filter-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`insights__tab ${filter === t.id ? 'is-active' : ''}`}
                onClick={() => setFilter && setFilter(t.id)}
              >
                {t.label}
                {t.count > 0 && <span className="insights__tab-count mono">{t.count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="insights__feed">
        {sorted.length === 0 ? (
          <div className="insights__empty">
            <div className="eyebrow">/feed</div>
            <h3>No insights surfaced.</h3>
            <p>Constructor agents are observing. Playbooks are calibrated and watching. The system surfaces only what it can back with evidence.</p>
          </div>
        ) : sorted.map((c) => (
          <InsightCard
            key={c.id}
            card={c}
            expanded={!!expanded[c.id]}
            onToggle={(id) => setExpanded(p => ({ ...p, [id]: !p[id] }))}
            onOpenTopology={onOpenTopology}
            onAck={onAck}
            onAnnotate={onAnnotate}
            onSuppress={onSuppress}
            onDrill={onDrill}
            status={cardStatus ? cardStatus[c.id] : null}
            escalationPick={escalationPick}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================
// ANOMALY TIMELINE
// =============================================================
function TimelineView({ chapter }) {
  const order = ['connect','topology','flags','firing','synthesis','ask','escalate','resolved'];
  const idx = order.indexOf(chapter);
  const visible = useMemoS(() => {
    return window.EVENTS.filter(e => !e.chapter || order.indexOf(e.chapter) <= idx);
  }, [chapter]);

  // Map t (string) to seconds for plotting on a horizontal axis
  const toSec = (t) => {
    const [h, m, s] = t.split(':').map(Number);
    return h * 3600 + m * 60 + s;
  };
  const tMin = 14 * 3600 + 1 * 60;
  const tMax = 14 * 3600 + 4 * 60;
  const xPct = (t) => ((toSec(t) - tMin) / (tMax - tMin)) * 100;

  const rows = ['cpu', 'mem', 'stg', 'net', 'log', 'sig', 'mst', 'int', 'op'];
  const rowLabels = {
    cpu: 'cpu · obs',
    mem: 'mem · obs',
    stg: 'storage · obs',
    net: 'net · obs',
    log: 'log / io · obs',
    sig: 'signal detect',
    mst: 'master agent',
    int: 'interpreter',
    op:  'operator',
  };

  return (
    <div className="surface__body tl">
      {/* Time ruler */}
      <div className="tl__ruler">
        {[0, 1, 2, 3].map((m) => (
          <div className="tl__tick" key={m} style={{ left: `${(m / 3) * 100}%` }}>
            <span className="mono">14:0{m + 1}</span>
          </div>
        ))}
        <div className="tl__now" style={{ left: `${xPct(visible[visible.length - 1]?.t || '14:01:00')}%` }}>
          <span className="mono">NOW</span>
        </div>
      </div>

      {/* Rows */}
      <div className="tl__rows">
        {rows.map((r) => {
          const events = visible.filter(e => e.dom === r);
          return (
            <div className="tl__row" key={r}>
              <div className="tl__row-lab">
                <span className="mono">{rowLabels[r]}</span>
                <span className="tl__row-count mono">{events.length}</span>
              </div>
              <div className="tl__row-track">
                <div className="tl__row-line"/>
                {events.map((e, i) => (
                  <div
                    key={i}
                    className={`tl__pip tl__pip--${e.lvl} fade-in`}
                    style={{ left: `${xPct(e.t)}%`, animationDelay: `${i * 60}ms` }}
                    title={`${e.t} · ${e.msg}`}
                  >
                    <span className="tl__pip-dot"/>
                    <span className="tl__pip-label mono">{e.verdict}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context windows */}
      {(chapter === 'resolved') && (
        <div className="tl__contexts">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Active context windows</div>
          <div className="tl__context-row">
            <span className="chip chip--warn"><span className="chip__dot"/>planned_maintenance</span>
            <span className="mono">pvc-orders · 14:03:08 – 14:18:08 · maya@team</span>
            <span className="tl__context-note">downgrades pb.storage_saturation in scope</span>
          </div>
        </div>
      )}

      {/* Latest event stream below */}
      <div className="tl__stream">
        <div className="tl__stream-head">
          <span className="eyebrow">live event stream · last 12</span>
          <span className="chip chip--live"><span className="chip__dot"/>streaming</span>
        </div>
        <EventRow chapter={chapter}/>
      </div>
    </div>
  );
}

// =============================================================
// CHAT — "Ask the cluster"
// =============================================================
function CitationToken({ c, refTo, onClick }) {
  return (
    <button className="chat__cite mono" onClick={() => onClick && onClick(refTo)}>
      <span className="chat__cite-bracket">[</span>
      {c}
      <span className="chat__cite-bracket">]</span>
    </button>
  );
}

function renderChatRich(node, onCite) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    if (node.length > 0 && node[0] === 'list') {
      // not used
      return null;
    }
    // It's a list of mixed strings + citation objects (or a row in a list)
    return node.map((n, i) => (
      <React.Fragment key={i}>{renderChatRich(n, onCite)}</React.Fragment>
    ));
  }
  if (node && node.kind === 'list') {
    return (
      <ul className="chat__list">
        {node.items.map((row, i) => (
          <li className="chat__list-row" key={i}>
            <span className="chat__list-num mono">{row[0]}</span>
            <span className="chat__list-body">
              {row.slice(1).map((segment, j) => (
                <React.Fragment key={j}>{renderChatRich(segment, onCite)}</React.Fragment>
              ))}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (node && node.c) {
    return <CitationToken c={node.c} refTo={node.ref} onClick={onCite}/>;
  }
  return null;
}

function ChatBubble({ msg, isLast, typed, onCite }) {
  const isOp = msg.who === 'op';

  if (isOp) {
    return (
      <div className="chat__msg chat__msg--op slide-up">
        <div className="chat__msg-meta">
          <div className="chat__avatar chat__avatar--op">M</div>
          <span className="chat__msg-name">maya@team</span>
          <span className="chat__msg-time eyebrow">{msg.t}</span>
        </div>
        <div className="chat__msg-body">{msg.txt}</div>
      </div>
    );
  }

  // System: structured response (array of segments)
  const segments = Array.isArray(msg.txt) ? msg.txt : [msg.txt];

  return (
    <div className="chat__msg chat__msg--sys slide-up">
      <div className="chat__msg-meta">
        <div className="chat__avatar chat__avatar--sys">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="0.7" strokeDasharray="1.6 3" opacity="0.6"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
        </div>
        <span className="chat__msg-name">vigil · master agent</span>
        <span className="chat__msg-time eyebrow">{msg.t}</span>
        <span className="chip mono" style={{ marginLeft: 'auto', padding: '3px 8px', fontSize: 9 }}>6 citations · click to open</span>
      </div>
      <div className="chat__msg-body">
        {segments.map((seg, i) => (
          <div className="chat__msg-seg" key={i}>
            {renderChatRich(seg, onCite)}
          </div>
        ))}
      </div>
      <div className="chat__msg-foot">
        <button className="chat__chip mono" onClick={() => onCite && onCite('pod.currency')}>↗ Open evidence chain</button>
        <button className="chat__chip mono" onClick={() => alert('Annotation would be saved against this chat response. (Annotation modal available on insight cards.)')}>Annotate this answer</button>
        <button className="chat__chip mono" onClick={() => alert('Suggested follow-up: "what would clear this — beyond the recommended action?"')}>Suggest follow-up</button>
      </div>
    </div>
  );
}

function ChatView({ chapter, onCite, extras, composing, onSubmit }) {
  const order = ['connect','topology','flags','firing','synthesis','ask','escalate','resolved'];
  const idx = order.indexOf(chapter);
  const [input, setInput] = useStateS('');

  const messages = useMemoS(() => {
    if (idx < order.indexOf('ask')) return extras || [];
    return [...window.CHAT_HISTORY, ...(extras || [])];
  }, [chapter, extras]);

  // Suggested follow-ups — clicking them submits as if typed
  const suggestions = [
    'show me everything that happened to currencyservice today',
    'is this related to last week’s probe-cascade?',
    'what would clear this — beyond the recommended action?',
    'are any other clusters running this image version?',
  ];

  const submit = () => {
    if (!input.trim()) return;
    onSubmit && onSubmit(input);
    setInput('');
  };

  return (
    <div className="surface__body chat">
      <div className="chat__stage">
        {messages.length === 0 ? (
          <div className="chat__empty">
            <div className="chat__empty-mark">
              <svg viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="#FFFFFF" strokeWidth="1.2"/>
                <circle cx="32" cy="32" r="14" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.55"/>
                <line x1="4" y1="32" x2="60" y2="32" stroke="#FFFFFF" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.4"/>
                <circle cx="32" cy="32" r="4" fill="#FFFFFF"/>
              </svg>
            </div>
            <h3>Ask the cluster.</h3>
            <p>Natural-language queries over the knowledge graph. Every answer is grounded — entities, metrics, log lines, and playbook firings are inline citations. Try a suggestion below or type your own.</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatBubble key={i} msg={m} isLast={i === messages.length - 1} onCite={onCite}/>
          ))
        )}
        {composing && (
          <div className="chat__msg chat__msg--sys slide-up">
            <div className="chat__msg-meta">
              <div className="chat__avatar chat__avatar--sys">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2"/></svg>
              </div>
              <span className="chat__msg-name">vigil · master agent</span>
              <span className="chat__msg-time eyebrow">composing</span>
            </div>
            <div className="chat__msg-body chat__msg-body--composing">
              <span className="chat__dots"><span/><span/><span/></span>
              <span>decomposing query · running KG lookups · composing narrative…</span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="chat__composer">
        <div className="chat__suggestions">
          {suggestions.map((s, i) => (
            <button className="chat__suggestion" key={i} onClick={() => onSubmit && onSubmit(s)}>{s}</button>
          ))}
        </div>
        <div className="chat__input">
          <span className="mono chat__prompt">▸</span>
          <input
            type="text"
            placeholder='ask anything — try "what changed since last deploy"'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
          <button className="player__btn" style={{ width: 36, height: 36 }} aria-label="send" onClick={submit}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M3 8 L13 8 M9 4 L13 8 L9 12"/>
            </svg>
          </button>
        </div>
        <div className="chat__meta eyebrow">
          <span>master agent · grounded in KG · v3.2.1 · pattern-library v0.4.1</span>
          <span className="chat__meta-sep"/>
          <span>{extras && extras.length > 0 ? `${extras.length} synthetic round-trip${extras.length > 1 ? 's' : ''}` : 'press enter or click a suggestion'}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// AGENT ACTIVITY DRAWER — surface-agnostic "Inside the system" view
//   Slides up from the bottom of the main area when stakeholders toggle
//   the internals view in the topbar. Shows the live agent collaboration
//   that produces the abstracted operator-facing surface.
// =============================================================
function AgentActivityDrawer({ chapter, onClose }) {
  const activity = (window.AGENT_ACTIVITY_BY_CHAPTER || {})[chapter] || [];
  const stateClass = (s) => {
    if (/firing|fired|matched|emit/.test(s))     return 'is-fire';
    if (/partial|forecast|composing|climbing|tracking|synth|decomposing|eager|elevated|surfaced|updating/.test(s)) return 'is-warn';
    if (/paused|frozen|disabled/.test(s))        return 'is-paused';
    if (/idle|standby|cleared|expiring|resuming|recording|applied|downgraded|collapsing/.test(s)) return 'is-idle';
    return '';
  };
  return (
    <div className="agentdrawer slide-up">
      <div className="agentdrawer__head">
        <div>
          <div className="eyebrow">/inside · DEMO · system internals</div>
          <div className="agentdrawer__title">Agent collaboration · current chapter</div>
        </div>
        <div className="agentdrawer__legend">
          <span className="chip mono">{activity.length} agents</span>
          <span className="chip chip--warn"><span className="chip__dot"/>abstracted from operator UX in production</span>
          <button className="agentdrawer__close" onClick={onClose} title="Hide internals">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
          </button>
        </div>
      </div>
      <div className="agentdrawer__body">
        {activity.length === 0 ? (
          <div className="agentdrawer__empty mono">no agent activity yet · constructors awaiting baseline observations</div>
        ) : activity.map((a, i) => (
          <div className={`agentdrawer__row ${stateClass(a.state)} fade-in`} key={i} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="agentdrawer__rail">
              <div className="agentdrawer__dot"/>
            </div>
            <div className="agentdrawer__agent mono">{a.agent}</div>
            <div className="agentdrawer__state mono">{a.state}</div>
            <div className="agentdrawer__note">{a.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { InsightsView, TimelineView, ChatView, EventRow, AgentActivityDrawer });
