// interactions.jsx — Modal primitives, forms, command palette, user menu
//   Centralises every interactive control that needs an overlay or form.
//   App.jsx holds the modal state and renders <ModalHost/> at the root.

const { useState: useStateI, useEffect: useEffectI, useMemo: useMemoI, useRef: useRefI } = React;

// =============================================================
// MODAL PRIMITIVE — overlay + frame, brand-consistent
// =============================================================
function Modal({ title, eyebrow, onClose, children, footer, wide }) {
  // Esc closes
  useEffectI(() => {
    const h = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-host fade-in" onClick={onClose}>
      <div className={`modal ${wide ? 'modal--wide' : ''} slide-up`} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <div className="modal__title">{title}</div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <line x1="3" y1="3" x2="13" y2="13"/>
              <line x1="13" y1="3" x2="3" y2="13"/>
            </svg>
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

// =============================================================
// ANNOTATE INSIGHT — operator feedback on a card
// =============================================================
function AnnotateModal({ card, onClose, onSubmit }) {
  const [kind, setKind] = useStateI('real_acted_on');
  const [note, setNote] = useStateI('');
  const [ticket, setTicket] = useStateI('');
  const options = [
    { id: 'real_acted_on', label: 'Real · acted on',     sub: 'Firing was correct. Operator took action.' },
    { id: 'real_expected', label: 'Real · expected',     sub: 'Firing was correct but expected. No action.' },
    { id: 'false_positive',label: 'False positive',      sub: 'Firing was wrong. Suppress similar in scope.' },
    { id: 'unknown',       label: 'Unknown',             sub: 'Cannot determine. Skip suppression hint.' },
  ];
  return (
    <Modal
      eyebrow="/annotate · operator feedback"
      title={`Annotate · ${card?.headline?.split('.')[0] || 'insight'}`}
      onClose={onClose}
      footer={
        <>
          <button className="modal__btn" onClick={onClose}>Cancel</button>
          <button className="modal__btn modal__btn--primary" onClick={() => { onSubmit && onSubmit({ kind, note, ticket }); onClose(); }}>
            Save annotation
          </button>
        </>
      }
    >
      <div className="form-row">
        <div className="eyebrow form-row__lab">classification</div>
        <div className="form-radio">
          {options.map(o => (
            <button key={o.id} className={`form-radio-btn ${kind === o.id ? 'is-active' : ''}`} onClick={() => setKind(o.id)}>
              <span className="form-radio-dot"/>
              <span className="form-radio-body">
                <span className="form-radio-label">{o.label}</span>
                <span className="form-radio-sub">{o.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="eyebrow form-row__lab">note</div>
        <textarea className="form-input form-input--area" rows="3" placeholder="optional · what did you do, what did you learn"
          value={note} onChange={(e) => setNote(e.target.value)}/>
      </div>
      <div className="form-row">
        <div className="eyebrow form-row__lab">external ticket</div>
        <input className="form-input" placeholder="optional · linear / jira / pagerduty url"
          value={ticket} onChange={(e) => setTicket(e.target.value)}/>
      </div>
    </Modal>
  );
}

// =============================================================
// SUPPRESS — playbook + scope + duration
// =============================================================
function SuppressModal({ card, onClose, onSubmit }) {
  const [scope, setScope] = useStateI('this_entity');
  const [duration, setDuration] = useStateI('until_unflagged');
  const playbook = card?.playbook || 'pb.probe_cascade';
  return (
    <Modal
      eyebrow="/suppress · firing-level rule"
      title={`Suppress ${playbook} firings`}
      onClose={onClose}
      footer={
        <>
          <button className="modal__btn" onClick={onClose}>Cancel</button>
          <button className="modal__btn modal__btn--primary" onClick={() => { onSubmit && onSubmit({ playbook, scope, duration }); onClose(); }}>
            Apply suppression
          </button>
        </>
      }
    >
      <p className="modal__lead">
        Suppression scopes are recorded as first-class context entries. Underlying observation continues — only the firing visibility is modified.
      </p>
      <div className="form-row">
        <div className="eyebrow form-row__lab">scope</div>
        <div className="form-segmented">
          {[
            ['this_entity', 'This entity only'],
            ['this_role',   'This pod role'],
            ['namespace',   'Namespace · shop'],
            ['cluster',     'Cluster-wide'],
          ].map(([id, lab]) => (
            <button key={id} className={`form-seg-btn ${scope === id ? 'is-active' : ''}`} onClick={() => setScope(id)}>{lab}</button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="eyebrow form-row__lab">duration</div>
        <div className="form-segmented">
          {[
            ['15m', '15 minutes'],
            ['1h',  '1 hour'],
            ['24h', '24 hours'],
            ['until_unflagged', 'Until unflagged'],
          ].map(([id, lab]) => (
            <button key={id} className={`form-seg-btn ${duration === id ? 'is-active' : ''}`} onClick={() => setDuration(id)}>{lab}</button>
          ))}
        </div>
      </div>
      <div className="form-summary">
        <div className="eyebrow">summary</div>
        <div className="mono form-summary__val">
          {playbook} · {scope.replace('_', ' ')} · {duration}
        </div>
      </div>
    </Modal>
  );
}

// =============================================================
// DRILLDOWN — evidence chain Level-4 raw observation viewer
// =============================================================
function DrilldownModal({ chainNode, onClose }) {
  // Synthesise raw-observation payload for the node ref
  const ref = chainNode?.ref || 'obs.unknown';
  const isMetric = /obs\.working_set|obs\.probe|obs\.cpu/.test(ref);
  const isEvent  = /ev\.|^pb\./.test(ref);
  const isRule   = /^rule\./.test(ref);
  return (
    <Modal
      wide
      eyebrow={`/drill · level 4 · ${chainNode?.lvl || 'raw'}`}
      title={ref}
      onClose={onClose}
      footer={
        <>
          <button className="modal__btn" onClick={onClose}>Close</button>
          <button className="modal__btn modal__btn--primary">Open in time-series store</button>
        </>
      }
    >
      <p className="modal__lead">{chainNode?.txt || 'raw observation'}</p>
      <div className="drill-meta">
        <div><span className="eyebrow">observed at</span><span className="mono">14:02:11.034 UTC</span></div>
        <div><span className="eyebrow">retention tier</span><span className="mono">hot · 0-7 days · full resolution</span></div>
        <div><span className="eyebrow">cluster</span><span className="mono">prod-edge-01</span></div>
        <div><span className="eyebrow">ontology version</span><span className="mono">3.2.1</span></div>
      </div>
      {isMetric && (
        <pre className="drill-payload mono">{`{
  "canonical_variable_id": "var.container_memory_working_set",
  "entity_id": "ent_pod_instance_2c8d3",
  "logical_entity_id": "ent_pod_role_cart",
  "value": 484.7,
  "unit": "MiB",
  "raw_labels": {
    "container":  "cart",
    "pod":        "cartservice-2c8d3",
    "namespace":  "shop",
    "node":       "prod-edge-01-node-a",
    "image":      "cartservice:v1.4.2"
  },
  "scrape_interval_ms": 15000,
  "binding_provenance": "T1_catalog · kube-state-metrics v2.10 · 0.99"
}`}</pre>
      )}
      {isEvent && (
        <pre className="drill-payload mono">{`{
  "evidence_kind": "${ref.replace('ev.', '').replace('pb.', '')}",
  "emitted_by": "memory.constructor",
  "affected_entity_ids": ["ent_pod_instance_2c8d3"],
  "fingerprint_snapshot": {
    "active_conditions": ["memory_pressure_sustained"],
    "rate_of_change": "+18 MiB / 30s",
    "threshold_status": "above (484 / 512)"
  },
  "confidence_band": "high",
  "rule_id": "rule.memory_pressure_sustained",
  "ttl_seconds": 120
}`}</pre>
      )}
      {isRule && (
        <pre className="drill-payload mono">{`{
  "rule_id": "${ref}",
  "playbook_id": "pb.probe_cascade",
  "rule_kind": "rate_of_change",
  "satisfied": true,
  "current_value": 4,
  "threshold_default": 3,
  "window_seconds": 30,
  "evaluated_at": "14:02:13.218 UTC",
  "provenance": "lab_phase_4_T4_cascade"
}`}</pre>
      )}
      {!isMetric && !isEvent && !isRule && (
        <pre className="drill-payload mono">{`// no specialised view for ${ref}\n// raw payload would be served from evidence store`}</pre>
      )}
      <div className="drill-chain">
        <div className="eyebrow" style={{ marginBottom: 10 }}>upstream chain (level 1 → 4)</div>
        <ol className="drill-chain__list">
          <li><span className="mono">L1 claim</span> · insight card</li>
          <li><span className="mono">L2 reasoning</span> · rule firing</li>
          <li><span className="mono">L3 agent</span> · evidence emission</li>
          <li className="is-current"><span className="mono">L4 raw</span> · this view</li>
        </ol>
      </div>
    </Modal>
  );
}

// =============================================================
// NEW CONTEXT ENTRY — operator-annotated time/scope window
// =============================================================
function NewContextModal({ onClose, onSubmit }) {
  const [type, setType] = useStateI('planned_maintenance');
  const [scope, setScope] = useStateI('namespace');
  const [target, setTarget] = useStateI('shop');
  const [window, setWindow] = useStateI('60');  // minutes
  const types = [
    'planned_maintenance', 'chaos_test', 'load_test', 'deploy_window',
    'expected_recurring_pattern', 'known_broken', 'under_investigation',
  ];
  const effectByType = {
    planned_maintenance: 'suppress',
    chaos_test: 'annotate_only',
    load_test: 'downgrade_severity',
    deploy_window: 'annotate_only',
    expected_recurring_pattern: 'suppress',
    known_broken: 'downgrade_severity',
    under_investigation: 'boost_priority',
  };
  return (
    <Modal
      eyebrow="/context · new entry"
      title="New context entry"
      onClose={onClose}
      footer={
        <>
          <button className="modal__btn" onClick={onClose}>Cancel</button>
          <button className="modal__btn modal__btn--primary" onClick={() => { onSubmit && onSubmit({ type, scope, target, window }); onClose(); }}>
            Create context
          </button>
        </>
      }
    >
      <p className="modal__lead">Context modifies playbook firing behaviour in known-expected windows. Observation continues; only alerting changes.</p>
      <div className="form-row">
        <div className="eyebrow form-row__lab">type</div>
        <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-row">
        <div className="eyebrow form-row__lab">scope</div>
        <div className="form-segmented">
          {[
            ['entity', 'Entity'],
            ['namespace', 'Namespace'],
            ['label', 'Label selector'],
            ['cluster', 'Cluster-wide'],
          ].map(([id, lab]) => (
            <button key={id} className={`form-seg-btn ${scope === id ? 'is-active' : ''}`} onClick={() => setScope(id)}>{lab}</button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="eyebrow form-row__lab">target</div>
        <input className="form-input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. shop · pvc-orders · app=cart"/>
      </div>
      <div className="form-row">
        <div className="eyebrow form-row__lab">window · minutes</div>
        <input className="form-input" type="number" min="5" max="1440" value={window} onChange={(e) => setWindow(e.target.value)}/>
      </div>
      <div className="form-summary">
        <div className="eyebrow">resulting effect</div>
        <div className="mono form-summary__val">{type} · {scope}={target} · {window}m · effect={effectByType[type] || 'annotate_only'}</div>
      </div>
    </Modal>
  );
}

// =============================================================
// ESCALATION ACK — pick an interpretation, resume synthesis
// =============================================================
function EscalationAckModal({ card, onClose, onAck }) {
  const [pick, setPick] = useStateI(0);
  const choices = card?.conflicting || [];
  return (
    <Modal
      wide
      eyebrow="/escalate · operator judgement required"
      title="Pick an interpretation to resume synthesis"
      onClose={onClose}
      footer={
        <>
          <button className="modal__btn" onClick={onClose}>Cancel</button>
          <button className="modal__btn modal__btn--primary" onClick={() => { onAck && onAck({ pick, label: choices[pick]?.which }); onClose(); }}>
            Acknowledge · resume synthesis
          </button>
        </>
      }
    >
      <p className="modal__lead">Master agent paused cross-domain synthesis on the shop subgraph. Pick the interpretation you want it to commit to; constructors and signal detection continued running underneath.</p>
      <div className="esc-picker">
        {choices.map((c, i) => (
          <button key={i} className={`esc-pick ${pick === i ? 'is-active' : ''}`} onClick={() => setPick(i)}>
            <div className="esc-pick-head">
              <span className="esc-pick-dot"/>
              <span className="mono esc-pick-which">{c.which}</span>
              <span className="mono esc-pick-conf">conf · {c.confidence}</span>
            </div>
            <div className="esc-pick-txt">{c.txt}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// =============================================================
// BINDING REVIEW — onboarding operator-review action
// =============================================================
function BindingReviewModal({ binding, onClose, onDecide }) {
  return (
    <Modal
      eyebrow="/binding · operator review"
      title={binding?.local || 'binding'}
      onClose={onClose}
      footer={
        <>
          <button className="modal__btn" onClick={() => { onDecide && onDecide('rejected'); onClose(); }}>Reject · out of scope</button>
          <button className="modal__btn" onClick={() => { onDecide && onDecide('edited'); onClose(); }}>Edit mapping</button>
          <button className="modal__btn modal__btn--primary" onClick={() => { onDecide && onDecide('confirmed'); onClose(); }}>Confirm</button>
        </>
      }
    >
      <p className="modal__lead">The system proposes this mapping based on the binding tier. Confirmation elevates it to high-confidence bound state for production playbook use.</p>
      <div className="binding-review">
        <div className="binding-review__row">
          <div className="eyebrow">local observable</div>
          <div className="mono binding-review__val">{binding?.local}</div>
        </div>
        <div className="binding-review__arrow">↓</div>
        <div className="binding-review__row">
          <div className="eyebrow">canonical variable</div>
          <div className="mono binding-review__val binding-review__val--target">{binding?.target}</div>
        </div>
        <div className="binding-review__meta">
          <span className="chip mono">{binding?.tier}</span>
          <span className="chip mono">conf · {binding?.conf}</span>
          <span className="chip mono">provenance · {binding?.tier?.startsWith('T1') ? 'kube-state-metrics catalog' : binding?.tier?.startsWith('T5') ? 'LLM disambiguation · cached' : 'embedding similarity'}</span>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================
// USER MENU — small dropdown anchored to topbar avatar
// =============================================================
function UserMenu({ onClose }) {
  return (
    <div className="usermenu fade-in" onClick={onClose}>
      <div className="usermenu__panel slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="usermenu__head">
          <div className="usermenu__avatar">M</div>
          <div>
            <div className="usermenu__name">maya@team</div>
            <div className="mono usermenu__role">operator · prod-edge-01</div>
          </div>
        </div>
        <div className="usermenu__list">
          <button className="usermenu__item"><span>Profile · maya@team</span><span className="mono">↗</span></button>
          <button className="usermenu__item"><span>API tokens</span><span className="mono">↗</span></button>
          <button className="usermenu__item"><span>Org · acme-edge</span><span className="mono">3 clusters</span></button>
          <button className="usermenu__item"><span>Theme</span><span className="mono">dark</span></button>
          <button className="usermenu__item"><span>Sign out</span><span className="mono">↗</span></button>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// COMMAND PALETTE — ⌘K, search entities/playbooks/insights
// =============================================================
function CommandPalette({ onClose, onPick }) {
  const [q, setQ] = useStateI('');
  const items = useMemoI(() => {
    const ents = (window.ENTITIES || []).map(e => ({ kind: 'entity', id: e.id, label: e.label, sub: e.ns }));
    const pbs  = (window.PLAYBOOKS_STATUS || []).map(p => ({ kind: 'playbook', id: p.id, label: p.name, sub: p.status }));
    const ins  = (window.INSIGHTS || []).map(c => ({ kind: 'insight', id: c.id, label: c.headline, sub: c.playbook || c.pathway || c.kind }));
    return [...ents, ...pbs, ...ins];
  }, []);
  const filtered = useMemoI(() => {
    if (!q.trim()) return items.slice(0, 12);
    const qq = q.toLowerCase();
    return items.filter(it => (it.label + ' ' + it.id + ' ' + (it.sub || '')).toLowerCase().includes(qq)).slice(0, 12);
  }, [q, items]);
  const inputRef = useRefI(null);
  useEffectI(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="palette-host fade-in" onClick={onClose}>
      <div className="palette slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="palette__input-row">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4.5"/><line x1="10.3" y1="10.3" x2="13.5" y2="13.5"/></svg>
          <input ref={inputRef} className="palette__input" placeholder="search entities, playbooks, insights…"
            value={q} onChange={(e) => setQ(e.target.value)}/>
          <kbd className="palette__esc mono">ESC</kbd>
        </div>
        <div className="palette__list">
          {filtered.map(it => (
            <button key={`${it.kind}-${it.id}`} className="palette__item" onClick={() => { onPick && onPick(it); onClose(); }}>
              <span className="mono palette__kind">{it.kind}</span>
              <span className="palette__label">{it.label}</span>
              <span className="mono palette__sub">{it.sub}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="palette__empty mono">no matches</div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// TOAST — small floating confirmation
// =============================================================
function Toast({ message, onDone }) {
  useEffectI(() => {
    const t = setTimeout(() => onDone && onDone(), 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="toast slide-up">
      <span className="toast__dot"/>
      <span className="toast__msg">{message}</span>
    </div>
  );
}

// =============================================================
// MODAL HOST — single render point, dispatches by modal.kind
// =============================================================
function ModalHost({ modal, onClose, onAction }) {
  if (!modal) return null;
  const close = onClose;
  switch (modal.kind) {
    case 'annotate':
      return <AnnotateModal card={modal.card} onClose={close} onSubmit={(p) => onAction('annotate', p)}/>;
    case 'suppress':
      return <SuppressModal card={modal.card} onClose={close} onSubmit={(p) => onAction('suppress', p)}/>;
    case 'drill':
      return <DrilldownModal chainNode={modal.chainNode} onClose={close}/>;
    case 'newContext':
      return <NewContextModal onClose={close} onSubmit={(p) => onAction('newContext', p)}/>;
    case 'escalationAck':
      return <EscalationAckModal card={modal.card} onClose={close} onAck={(p) => onAction('escalationAck', p)}/>;
    case 'bindingReview':
      return <BindingReviewModal binding={modal.binding} onClose={close} onDecide={(d) => onAction('bindingReview', { binding: modal.binding, decision: d })}/>;
    case 'userMenu':
      return <UserMenu onClose={close}/>;
    case 'commandPalette':
      return <CommandPalette onClose={close} onPick={(it) => onAction('commandPalette', it)}/>;
    default:
      return null;
  }
}

// =============================================================
// PLAYBOOK MANAGEMENT VIEW — full surface for settings sub-tab
// =============================================================
function PlaybookManagementView({ enabledMap, thresholdMap, onToggle, onThreshold }) {
  const list = window.PLAYBOOKS_STATUS || [];
  return (
    <div className="pbmgmt">
      <div className="pbmgmt__head">
        <div>
          <div className="eyebrow">/settings · playbook management</div>
          <h3 className="pbmgmt__title">Playbook management</h3>
          <p className="pbmgmt__sub">Enable/disable individual playbooks and tune their detection thresholds. Defaults derive from lab calibration; rarely needs adjustment.</p>
        </div>
        <div className="pbmgmt__count mono">{list.filter(p => enabledMap[p.id] !== false && p.status !== 'disabled').length} of {list.length} active</div>
      </div>
      <div className="pbmgmt__list">
        {list.map(p => {
          const enabled = enabledMap[p.id] !== false && p.status !== 'disabled';
          const threshold = thresholdMap[p.id] ?? 50;
          return (
            <div key={p.id} className={`pbmgmt__row is-${p.status}`}>
              <div className="pbmgmt__row-id">
                <div className="pbmgmt__row-name">{p.name}</div>
                <div className="mono pbmgmt__row-pid">{p.id}</div>
              </div>
              <div className="pbmgmt__row-note">{p.note}</div>
              <div className="pbmgmt__row-thresh">
                <span className="eyebrow">threshold tune</span>
                <input type="range" min="20" max="80" value={threshold}
                  disabled={!enabled || p.status === 'disabled'}
                  onChange={(e) => onThreshold(p.id, Number(e.target.value))}
                  className="pbmgmt__slider"/>
                <span className="mono pbmgmt__row-thresh-val">{threshold > 50 ? 'strict' : threshold < 50 ? 'lenient' : 'default'}</span>
              </div>
              <button
                className={`pbmgmt__toggle ${enabled ? 'is-on' : ''}`}
                disabled={p.status === 'disabled'}
                onClick={() => onToggle(p.id)}
              >
                <span className="pbmgmt__toggle-slider"/>
                <span className="mono">{p.status === 'disabled' ? 'unavailable' : enabled ? 'on' : 'off'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
// CAPABILITY DEGRADATION REPORT — per-playbook coverage status
// =============================================================
function CapabilityReportView() {
  const rows = [
    {
      pb: 'pb.probe_cascade',         name: 'Probe-cascade',          status: 'fully_active',
      bound: ['var.container_memory_working_set', 'var.kubelet_probe_failure', 'var.kubelet_eviction_event'],
      missing: [],
      action: null,
    },
    {
      pb: 'pb.network_partition',     name: 'Network partition',      status: 'degraded',
      bound: ['var.tcp_retrans_aggregate'],
      missing: ['var.tcp_retrans_per_pod_ns'],
      action: { gap: 'tier_below_required', current: 'S', required: 'P', remediation: 'Enable the eBPF DaemonSet to recover per-pod-namespace TCP retransmission detection. Requires operator consent for kernel-level access.' },
    },
    {
      pb: 'pb.pvc_hot_partition',     name: 'PVC hot partition',      status: 'degraded',
      bound: ['var.pvc_iops', 'var.pvc_throughput'],
      missing: ['var.csi_volume_op_seconds'],
      action: { gap: 'source_uninstalled', current: 'S', required: 'S', remediation: 'Install csi-driver-stats in the cluster. Source is supported at your current tier — no upgrade needed.' },
    },
    {
      pb: 'pb.dns_resolution_failure',name: 'DNS resolution failure', status: 'disabled',
      bound: [],
      missing: ['var.coredns_query_latency', 'var.coredns_error_rate'],
      action: { gap: 'source_uninstalled', current: 'S', required: 'S', remediation: 'CoreDNS metrics endpoint not detected. Enable Prometheus scraping on kube-system/coredns.' },
    },
  ];
  return (
    <div className="capreport">
      <div className="capreport__head">
        <div>
          <div className="eyebrow">/settings · capability degradation</div>
          <h3 className="capreport__title">Capability report</h3>
          <p className="capreport__sub">Per-playbook coverage status. Distinguishes <em>tier-below-required</em> (upgrade tier) from <em>source-uninstalled</em> (install/configure source). Nothing pretends a missing binding doesn't matter.</p>
        </div>
        <div className="capreport__legend">
          <span className="chip chip--live"><span className="chip__dot"/>{rows.filter(r => r.status === 'fully_active').length} active</span>
          <span className="chip chip--warn"><span className="chip__dot"/>{rows.filter(r => r.status === 'degraded').length} degraded</span>
          <span className="chip"><span className="chip__dot"/>{rows.filter(r => r.status === 'disabled').length} disabled</span>
        </div>
      </div>
      <div className="capreport__list">
        {rows.map(r => (
          <div className={`capreport__row is-${r.status}`} key={r.pb}>
            <div className="capreport__row-head">
              <div className="capreport__row-name">{r.name}</div>
              <span className="mono capreport__row-pid">{r.pb}</span>
              <span className={`chip mono capreport__row-status ${r.status === 'degraded' ? 'chip--warn' : r.status === 'fully_active' ? 'chip--live' : ''}`}>
                <span className="chip__dot"/>{r.status.replace('_', ' ')}
              </span>
            </div>
            <div className="capreport__row-vars">
              <div className="capreport__row-vars-side">
                <div className="eyebrow">bound · {r.bound.length}</div>
                {r.bound.map(v => <div className="mono capreport__var capreport__var--bound" key={v}>✓ {v}</div>)}
                {r.bound.length === 0 && <div className="mono capreport__var capreport__var--mute">none</div>}
              </div>
              <div className="capreport__row-vars-side">
                <div className="eyebrow">missing · {r.missing.length}</div>
                {r.missing.map(v => <div className="mono capreport__var capreport__var--missing" key={v}>× {v}</div>)}
                {r.missing.length === 0 && <div className="mono capreport__var capreport__var--mute">none</div>}
              </div>
            </div>
            {r.action && (
              <div className="capreport__row-action">
                <div className="capreport__row-action-head">
                  <span className="mono capreport__row-action-gap">{r.action.gap.replace('_', ' ')}</span>
                  <span className="mono">tier {r.action.current} → {r.action.required}</span>
                </div>
                <p className="capreport__row-action-txt">{r.action.remediation}</p>
                <button className="modal__btn modal__btn--primary capreport__row-action-btn">{r.action.gap === 'tier_below_required' ? 'Review tier upgrade' : 'Install / configure source'}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  Modal, ModalHost, Toast,
  PlaybookManagementView, CapabilityReportView,
});
