// onboarding.jsx — Phase progression: install, inventory, binding cascade, calibration

const { useState: useStateOB, useEffect: useEffectOB, useMemo: useMemoOB } = React;

function PhaseStrip({ phases, currentIdx }) {
  return (
    <div className="ob-strip">
      {phases.map((p, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={p.id} className={`ob-strip__step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}>
            <div className="ob-strip__num">{p.num}</div>
            <div className="ob-strip__name">{p.name}</div>
            <div className="ob-strip__sub">{p.sub}</div>
            <div className="ob-strip__bar">
              <div className="ob-strip__fill" style={{
                width: done ? '100%' : active ? `${Math.round(p.progress * 100)}%` : '0%'
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Animated counter that ticks toward target
function TickerNumber({ target, duration = 1200 }) {
  const [n, setN] = useStateOB(0);
  useEffectOB(() => {
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else setN(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <span>{n.toLocaleString()}</span>;
}

function InventoryPanel() {
  return (
    <div className="card ob-card">
      <div className="card__head">
        <div className="card__title">Inventory</div>
        <span className="chip chip--live"><span className="chip__dot"/>scanning</span>
      </div>
      <div className="ob-inv">
        <div className="ob-inv__row">
          <div className="ob-inv__val"><TickerNumber target={47}/></div>
          <div className="eyebrow">pods</div>
        </div>
        <div className="ob-inv__row">
          <div className="ob-inv__val"><TickerNumber target={12}/></div>
          <div className="eyebrow">services</div>
        </div>
        <div className="ob-inv__row">
          <div className="ob-inv__val"><TickerNumber target={4}/></div>
          <div className="eyebrow">namespaces</div>
        </div>
        <div className="ob-inv__row">
          <div className="ob-inv__val"><TickerNumber target={2}/></div>
          <div className="eyebrow">nodes</div>
        </div>
        <div className="ob-inv__divider"/>
        <div className="ob-inv__row">
          <div className="ob-inv__val"><TickerNumber target={124}/></div>
          <div className="eyebrow">metric names</div>
        </div>
        <div className="ob-inv__row">
          <div className="ob-inv__val"><TickerNumber target={6}/></div>
          <div className="eyebrow">exporters</div>
        </div>
        <div className="ob-inv__row">
          <div className="ob-inv__val"><TickerNumber target={47}/></div>
          <div className="eyebrow">log streams</div>
        </div>
        <div className="ob-inv__row">
          <div className="ob-inv__val"><TickerNumber target={8}/></div>
          <div className="eyebrow">event emitters</div>
        </div>
      </div>
      <div className="ob-source">
        <div className="ob-source__row">
          <span className="mono">prometheus</span>
          <span className="ob-source__dot"/>
          <span className="mono ob-source__addr">kube-system/prometheus-server:9090</span>
        </div>
        <div className="ob-source__row">
          <span className="mono">kube-state-metrics</span>
          <span className="ob-source__dot"/>
          <span className="mono ob-source__addr">kube-system/kube-state-metrics:8080</span>
        </div>
        <div className="ob-source__row">
          <span className="mono">otel-collector</span>
          <span className="ob-source__dot"/>
          <span className="mono ob-source__addr">observability/otel-collector:4318</span>
        </div>
        <div className="ob-source__row">
          <span className="mono">service-mesh</span>
          <span className="ob-source__dot ob-source__dot--mute"/>
          <span className="mono ob-source__addr ob-source__addr--mute">not detected · tier-S degraded</span>
        </div>
      </div>
    </div>
  );
}

function BindingPanel({ tiers, decisions, onReview }) {
  const reviewRows = [
    { local: 'container_memory_working_set_bytes', target: 'var.container_memory_working_set', tier: 'T1', conf: 0.99 },
    { local: 'app_grpc_request_duration_seconds',  target: 'var.grpc_request_duration',         tier: 'T3', conf: 0.87 },
    { local: 'storage_csi_op_latency',              target: 'var.csi_volume_op_seconds',         tier: 'T5', conf: 0.74 },
    { local: 'my_custom_app_metric',                target: 'out of scope · no match',           tier: '—',  conf: null },
  ];
  const pending = reviewRows.filter(r => !decisions || !decisions[r.local]).length;
  return (
    <div className="card ob-card">
      <div className="card__head">
        <div className="card__title">Binding · tier cascade</div>
        <span className="chip mono">124 observables</span>
      </div>
      <div className="ob-bind">
        {tiers.map((t, i) => {
          const pct = (t.count / t.total) * 100;
          return (
            <div className="ob-bind__row" key={t.id}>
              <div className="ob-bind__lab">
                <span className="ob-bind__label">{t.label}</span>
                <span className="ob-bind__kind eyebrow">{t.kind}</span>
              </div>
              <div className="ob-bind__bar">
                <div className="ob-bind__fill" style={{ width: `${pct}%`, animationDelay: `${i * 120}ms` }}/>
              </div>
              <div className="ob-bind__count mono">{t.count} / {t.total}</div>
            </div>
          );
        })}
      </div>
      <div className="ob-bind__review">
        <div className="ob-bind__review-head">
          <div className="eyebrow">awaiting operator review</div>
          <span className={`chip ${pending > 0 ? 'chip--warn' : 'chip--live'}`}><span className="chip__dot"/>{pending} pending</span>
        </div>
        {reviewRows.map(r => {
          const decision = decisions ? decisions[r.local] : null;
          return (
            <div className={`ob-bind__review-row ${decision ? `is-${decision}` : ''}`} key={r.local}>
              <span className="mono">{r.local}</span>
              <span className="ob-bind__arrow">→</span>
              <span className={`mono ob-bind__target ${r.tier === '—' ? 'ob-bind__target--mute' : ''}`}>{r.target}</span>
              <span className="chip mono">{r.tier}{r.conf ? ` · ${r.conf}` : ''}</span>
              {decision ? (
                <span className={`ob-bind__review-decision mono ob-bind__review-decision--${decision}`}>{decision}</span>
              ) : (
                <button className="ob-bind__review-btn" onClick={() => onReview && onReview(r)}>review →</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalibrationPanel({ playbooks }) {
  const active = playbooks.filter(p => p.status === 'active').length;
  const degraded = playbooks.filter(p => p.status === 'degraded').length;
  const disabled = playbooks.filter(p => p.status === 'disabled').length;

  return (
    <div className="card ob-card">
      <div className="card__head">
        <div className="card__title">Calibration · playbook activation</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="chip chip--live"><span className="chip__dot"/>{active} active</span>
          <span className="chip chip--warn"><span className="chip__dot"/>{degraded} degraded</span>
          <span className="chip"><span className="chip__dot"/>{disabled} disabled</span>
        </div>
      </div>
      <div className="ob-pb">
        {playbooks.map((p, i) => (
          <div className={`ob-pb__row is-${p.status}`} key={p.id}>
            <div className="ob-pb__check">
              {p.status === 'active' && (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8.5 L6.5 12 L13 4.5"/></svg>
              )}
              {p.status === 'degraded' && (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="9"/><circle cx="8" cy="11.5" r="0.6" fill="currentColor"/></svg>
              )}
              {p.status === 'disabled' && (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><line x1="4.5" y1="11.5" x2="11.5" y2="4.5"/></svg>
              )}
            </div>
            <div className="ob-pb__info">
              <div className="ob-pb__name">{p.name}</div>
              <div className="ob-pb__id mono">{p.id}</div>
            </div>
            <div className="ob-pb__note">{p.note}</div>
            <div className={`ob-pb__st mono`}>{p.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HelmInstallPanel() {
  return (
    <div className="card ob-card ob-helm">
      <div className="card__head">
        <div className="card__title">Agent installed</div>
        <span className="chip chip--live"><span className="chip__dot"/>connected</span>
      </div>
      <div className="ob-helm__body">
        <div className="eyebrow" style={{ marginBottom: 10 }}>Helm command issued · 14:00:47</div>
        <pre className="ob-code">
<span className="ob-code__kw">$</span> helm install vigil vigil/agent \{'\n'}
{'  '}--namespace vigil-system --create-namespace \{'\n'}
{'  '}--set cluster.id=<span className="ob-code__em">prod-edge-01</span> \{'\n'}
{'  '}--set backend.token=<span className="ob-code__dim">eyJh···c2lnIn0</span>{'\n'}
<span className="ob-code__dim">→ daemonset/vigil-observer       rolled out (3 / 3)</span>{'\n'}
<span className="ob-code__dim">→ deployment/vigil-forwarder    rolled out (1 / 1)</span>{'\n'}
<span className="ob-code__dim">→ servicemonitor/vigil          registered</span>{'\n'}
<span className="ob-code__em">→ handshake                     established · ontology v3.2.1</span>
        </pre>
      </div>
      <div className="ob-helm__meta">
        <div className="ob-helm__meta-row">
          <span className="eyebrow">cluster id</span>
          <span className="mono">prod-edge-01</span>
        </div>
        <div className="ob-helm__meta-row">
          <span className="eyebrow">agent version</span>
          <span className="mono">v0.1.0 · daemonset+deployment</span>
        </div>
        <div className="ob-helm__meta-row">
          <span className="eyebrow">tier</span>
          <span className="mono">tier-S · recommended</span>
        </div>
        <div className="ob-helm__meta-row">
          <span className="eyebrow">premium</span>
          <span className="mono ob-source__addr--mute">eBPF available · not enabled</span>
        </div>
      </div>
    </div>
  );
}

function OnboardingView({ chapter, chapterIdx, bindingDecisions, onReviewBinding }) {
  // Derive the onboarding phase from the scenario chapter so the strip
  // actually progresses rather than freezing at phase 06 (warmup).
  const phaseIdx = (window.ONBOARDING_PHASE_IDX_BY_CHAPTER || {})[chapter] ?? 5;

  return (
    <div className="surface__body ob">
      {/* Phase strip */}
      <PhaseStrip phases={window.ONBOARDING_PHASES} currentIdx={phaseIdx}/>

      {/* Top row: Helm + Inventory (2 columns) */}
      <div className="ob-grid ob-grid--two">
        <HelmInstallPanel/>
        <InventoryPanel/>
      </div>

      {/* Binding cascade full width below */}
      <div className="ob-grid ob-grid--full">
        <BindingPanel tiers={window.BINDING_TIERS} decisions={bindingDecisions} onReview={onReviewBinding}/>
      </div>

      {/* Calibration full width */}
      <div className="ob-grid ob-grid--full">
        <CalibrationPanel playbooks={window.PLAYBOOKS_STATUS}/>
      </div>

      {/* Warmup ticker */}
      <div className="ob-warmup">
        <div className="ob-warmup__head">
          <div>
            <div className="eyebrow">phase 06 · warmup</div>
            <div className="ob-warmup__title">Observing baseline conditions on 71 entities</div>
            <div className="ob-warmup__sub">Constructor agents are establishing fingerprints. Exploratory agent will engage at operational.</div>
          </div>
          <div className="ob-warmup__eta">
            <div className="ob-warmup__eta-val">4<span>m</span>&nbsp;12<span>s</span></div>
            <div className="eyebrow">eta to operational</div>
          </div>
        </div>
        <div className="ob-warmup__bar">
          <div className="ob-warmup__bar-fill"/>
        </div>
        <div className="ob-warmup__legend">
          <span className="mono">cpu · baseline holding</span>
          <span className="ob-warmup__sep"/>
          <span className="mono">mem · 42% confidence</span>
          <span className="ob-warmup__sep"/>
          <span className="mono">storage · 31% confidence</span>
          <span className="ob-warmup__sep"/>
          <span className="mono">network · 38% confidence</span>
          <span className="ob-warmup__sep"/>
          <span className="mono">log/io · 24% confidence</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OnboardingView });
