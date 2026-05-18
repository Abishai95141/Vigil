// topology.jsx — Cluster topology view with live animated knowledge graph

const { useState, useEffect, useMemo, useRef } = React;

// --------- Node SVG glyphs --------- //
function NodeGlyph({ kind, state }) {
  // state: 'idle' | 'observed' | 'flagged' | 'predicted' | 'firing' | 'cleared'
  const fill = state === 'firing' ? '#FFFFFF' : 'none';
  const text = state === 'firing' ? '#0A0A0A' : '#F0EFEC';
  const stroke = state === 'idle' ? '#6A6A67'
                : state === 'observed' ? '#A5A5A2'
                : state === 'flagged' ? '#FFFFFF'
                : state === 'predicted' ? '#FFFFFF'
                : state === 'firing' ? '#FFFFFF'
                : '#6A6A67';
  const sw = state === 'idle' ? 1.4 : 1.8;

  if (kind === 'pod') {
    return (
      <g>
        <rect x={-22} y={-22} width={44} height={44} fill={fill} stroke={stroke} strokeWidth={sw}/>
        <circle cx={-14} cy={-14} r={1.4} fill={text}/>
        <circle cx={-9}  cy={-14} r={1.4} fill={text}/>
        <line x1={-14} y1={-4} x2={14} y2={-4} stroke={text} strokeWidth={0.8} opacity={0.55}/>
        <line x1={-14} y1={3}  x2={8}  y2={3}  stroke={text} strokeWidth={0.8} opacity={0.55}/>
        <line x1={-14} y1={10} x2={11} y2={10} stroke={text} strokeWidth={0.8} opacity={0.55}/>
      </g>
    );
  }
  if (kind === 'service') {
    return (
      <g>
        <circle r={22} fill={fill} stroke={stroke} strokeWidth={sw}/>
        <circle r={5} fill={text}/>
        <line x1={-22} y1={0} x2={-12} y2={0} stroke={text} strokeWidth={0.8} opacity={0.6}/>
        <line x1={12}  y1={0} x2={22}  y2={0} stroke={text} strokeWidth={0.8} opacity={0.6}/>
      </g>
    );
  }
  if (kind === 'pvc') {
    return (
      <g>
        <path d="M-22 -10 a22 7 0 0 0 44 0 v16 a22 7 0 0 1 -44 0 z" fill={fill} stroke={stroke} strokeWidth={sw}/>
        <ellipse cx={0} cy={-10} rx={22} ry={7} fill={fill} stroke={stroke} strokeWidth={sw}/>
        <ellipse cx={0} cy={-2} rx={22} ry={7} fill="none" stroke={stroke} strokeWidth={sw * 0.7} opacity={0.6}/>
      </g>
    );
  }
  if (kind === 'node') {
    return (
      <g>
        <rect x={-26} y={-17} width={52} height={34} fill={fill} stroke={stroke} strokeWidth={sw}/>
        <line x1={-17} y1={-8} x2={17}  y2={-8} stroke={text} strokeWidth={0.8} opacity={0.55}/>
        <line x1={-17} y1={0}  x2={17}  y2={0}  stroke={text} strokeWidth={0.8} opacity={0.55}/>
        <line x1={-17} y1={8}  x2={17}  y2={8}  stroke={text} strokeWidth={0.8} opacity={0.55}/>
        <circle cx={-22} cy={-12} r={1.4} fill={text}/>
        <circle cx={-18} cy={-12} r={1.4} fill={text}/>
      </g>
    );
  }
  return <circle r={14} stroke={stroke} fill={fill}/>;
}

// --------- Edge --------- //
function Edge({ from, to, kind, active, suppressed }) {
  const dashes = kind === 'calls' ? null
              : kind === 'mounts' ? '5 5'
              : '2 6';
  const stroke = active ? '#FFFFFF'
                : suppressed ? '#3F3F3D'
                : '#8A8A87';
  const opacity = active ? 1 : suppressed ? 0.55 : 0.7;
  const sw = active ? 1.8 : 1.2;

  return (
    <g>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={stroke} strokeWidth={sw} strokeDasharray={dashes}
            opacity={opacity}/>
      {active && kind === 'calls' && (
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round"
              strokeDasharray="3 22"
              opacity={0.95}>
          <animate attributeName="stroke-dashoffset" from="0" to="-25" dur="0.9s" repeatCount="indefinite"/>
        </line>
      )}
    </g>
  );
}

// --------- Live node (with overlay rings) --------- //
function GraphNode({ entity, state, focused, watched, onClick }) {
  const { x, y, kind, label, ns } = entity;
  const showAlertRing = state === 'firing';
  const showFlagRing  = state === 'flagged';
  const showObsRing   = state === 'observed';
  const showPredict   = state === 'predicted';

  return (
    <g transform={`translate(${x},${y})`}
       onClick={onClick}
       style={{ cursor: 'pointer' }}
       className={`kg-node ${watched ? 'is-watched' : ''}`}>

      {/* Observation ring (chapter 'flags' / 'synthesis') */}
      {showObsRing && (
        <circle r={32} fill="none" stroke="#A5A5A2" strokeWidth="0.7" strokeDasharray="1.8 4" opacity={0.7}>
          <animate attributeName="r" values="28;34;28" dur="2.6s" repeatCount="indefinite"/>
        </circle>
      )}

      {/* Flag ring */}
      {showFlagRing && (
        <>
          <circle r={34} fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="2 4" opacity={0.8}>
            <animate attributeName="r" values="30;36;30" dur="2s" repeatCount="indefinite"/>
          </circle>
        </>
      )}

      {/* Predicted (pre-fire) — distinctive double-ring + countdown arc */}
      {showPredict && (
        <>
          {/* Outer dashed pre-fire ring */}
          <circle r={38} fill="none" stroke="#FFFFFF" strokeWidth="1.1" strokeDasharray="3 3" opacity={0.85}>
            <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          {/* Inner converging ring — visualises "incoming" */}
          <circle r={48} fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity={0.4}>
            <animate attributeName="r" values="48;34;48" dur="2.4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.0;0.55;0.0" dur="2.4s" repeatCount="indefinite"/>
          </circle>
          {/* Triangular "watch / pre-fire" warning ticker above node */}
          <g transform="translate(0,-46)">
            <rect x={-44} y={-9} width={88} height={18} fill="#0A0A0A" stroke="#FFFFFF" strokeWidth="0.8"/>
            <text textAnchor="middle" y={3.5}
                  fontFamily="JetBrains Mono"
                  fontSize="8.5"
                  letterSpacing="0.2em"
                  fill="#FFFFFF">PRE-FIRE · ~12s</text>
          </g>
        </>
      )}

      {/* Firing ring + pulse */}
      {showAlertRing && (
        <>
          <circle r={38} fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity={0.8}/>
          <circle r={28} fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity={0.5}>
            <animate attributeName="r" values="28;52;28" dur="1.6s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" repeatCount="indefinite"/>
          </circle>
        </>
      )}

      {/* Focus halo */}
      {focused && (
        <circle r={42} fill="none" stroke="#FFFFFF" strokeWidth="0.6" strokeDasharray="3 5" opacity={0.6}/>
      )}

      <NodeGlyph kind={kind} state={state}/>

      {/* Watch glyph — small star in top-right when operator is subscribed */}
      {watched && (
        <g transform="translate(20,-20)">
          <circle r={7} fill="#0A0A0A" stroke="#FFFFFF" strokeWidth="1"/>
          <path d="M0 -3.4 L0.9 -1 L3.4 -1 L1.4 0.5 L2.1 3 L0 1.5 L-2.1 3 L-1.4 0.5 L-3.4 -1 L-0.9 -1 Z"
                fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="0.4"/>
        </g>
      )}

      <text y={kind === 'node' ? 34 : 38}
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans"
            fontSize="12"
            fontWeight="600"
            letterSpacing="0.04em"
            fill={state === 'firing' || state === 'flagged' || state === 'predicted' ? '#FFFFFF' : '#F0EFEC'}
            style={{ userSelect: 'none' }}>
        {label.length > 22 ? label.slice(0, 22) : label}
      </text>
    </g>
  );
}

// --------- Pathway overlay --------- //
function PathwayOverlay({ visible, entities }) {
  if (!visible) return null;
  const cart = entities['pod.cart'];
  const cur  = entities['pod.currency'];
  const node = entities['node.a'];
  if (!cart || !cur || !node) return null;

  return (
    <g className="pathway-overlay">
      {/* Label */}
      <g transform={`translate(${(cart.x + node.x) / 2}, ${cart.y - 78})`}>
        <rect x={-128} y={-18} width={256} height={28} fill="#0A0A0A" stroke="#FFFFFF" strokeWidth={0.8}/>
        <text textAnchor="middle" y={1}
              fontFamily="Plus Jakarta Sans"
              fontWeight="600"
              fontSize="11"
              letterSpacing="0.05em"
              fill="#FFFFFF">PATHWAY MATCH</text>
        <text textAnchor="middle" y={14}
              fontFamily="JetBrains Mono"
              fontSize="8.5"
              letterSpacing="0.18em"
              fill="#A5A5A2">PROBE-CASCADE · MEM ORIGIN</text>
      </g>

      {/* Step labels */}
      <g fontFamily="JetBrains Mono" fontSize="8.5" letterSpacing="0.18em" fill="#FFFFFF">
        <text x={cart.x} y={cart.y - 48} textAnchor="middle">01 · ORIGIN</text>
        <text x={cur.x}  y={cur.y - 48}  textAnchor="middle">02 · PROPAGATION</text>
        <text x={node.x} y={node.y - 28} textAnchor="middle">03 · TERMINATION</text>
      </g>

      {/* Bold pathway line */}
      <path d={`M ${cart.x} ${cart.y} Q ${(cart.x + cur.x) / 2} ${cart.y - 30} ${cur.x} ${cur.y} T ${node.x} ${node.y}`}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={0.9}>
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.4s" repeatCount="indefinite"/>
      </path>
    </g>
  );
}

// --------- Telemetry sparkline --------- //
function Sparkline({ data, height = 36, stroke = '#FFFFFF', live = false }) {
  const tick = window.useTick(700);
  const shifted = useMemo(() => {
    if (!live) return data;
    // Rolling: pop oldest, push a perturbed continuation of the trend
    const len = data.length;
    const last = data[len - 1];
    const prev = data[len - 2] || last;
    const trend = (last - prev) * 0.5;
    const arr = data.slice(1);
    const noise = (Math.sin(tick * 1.7) + Math.cos(tick * 0.9)) * (Math.abs(last) * 0.04 + 1);
    arr.push(last + trend + noise);
    return arr;
  }, [data, tick, live]);
  const w = 100;
  const h = height;
  const max = Math.max(...shifted);
  const min = Math.min(...shifted);
  const range = max - min || 1;
  const pts = shifted.map((v, i) => {
    const x = (i / (shifted.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastVal = shifted[shifted.length - 1];
  const lastY = h - ((lastVal - min) / range) * (h - 4) - 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1} strokeLinejoin="round"/>
      <circle cx={w} cy={lastY} r={2} fill={stroke}>
        {live && <animate attributeName="r" values="1.5;3;1.5" dur="1.2s" repeatCount="indefinite"/>}
      </circle>
    </svg>
  );
}

// --------- Stable per-entity UID (no re-roll on every render) --------- //
function stableUid(entityId) {
  let h = 0;
  for (let i = 0; i < entityId.length; i++) h = ((h << 5) - h + entityId.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).slice(0, 6);
}

// --------- Predicted-activation panel (operator-facing abstracted view) --------- //
function PredictionPanel({ prediction, watched, onToggleWatch }) {
  if (!prediction) return null;
  return (
    <div className="inspector__predict">
      <div className="inspector__predict-banner">
        <span className="inspector__predict-pulse"/>
        <span className="mono">PREDICTED ACTIVATION</span>
        <span className="mono inspector__predict-eta">ETA {prediction.eta_low}–{prediction.eta_high}s</span>
      </div>
      <div className="inspector__predict-headline">{prediction.headline}</div>
      <div className="inspector__predict-grid">
        <div>
          <div className="eyebrow">confidence</div>
          <div className="inspector__predict-val">{prediction.confidence}<span className="mono">  ·  {prediction.confidence_val.toFixed(2)}</span></div>
        </div>
        <div>
          <div className="eyebrow">pre-match</div>
          <div className="inspector__predict-val">{prediction.pathway_steps_matched} / {prediction.pathway_steps_total}<span className="mono">  ·  pathway</span></div>
        </div>
      </div>
      <p className="inspector__predict-reasoning">{prediction.reasoning}</p>
      <div className="inspector__predict-contrib">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Contributing signals</div>
        {prediction.contributing.map((c, i) => (
          <div key={i} className="inspector__predict-contrib-row">
            <span className="mono inspector__predict-contrib-dom">{c.domain}</span>
            <span className="inspector__predict-contrib-bar">
              <span className="inspector__predict-contrib-fill" style={{ width: `${c.weight * 100}%` }}/>
            </span>
            <span className="mono inspector__predict-contrib-w">{Math.round(c.weight * 100)}%</span>
          </div>
        ))}
      </div>
      <div className="inspector__predict-foot">
        <span className="eyebrow">{watched ? '★ watching · pre-alert enabled' : 'not watched'}</span>
        <button className="inspector__predict-act" onClick={onToggleWatch}>
          {watched ? 'Unwatch' : 'Watch this node'}
        </button>
      </div>
    </div>
  );
}

// --------- Inner-Workings panel (stakeholder-education view) --------- //
function InnerWorkings({ pipeline, open, onToggle }) {
  if (!pipeline || pipeline.length === 0) return null;
  return (
    <div className={`inspector__inner ${open ? 'is-open' : ''}`}>
      <button className="inspector__inner-toggle" onClick={onToggle}>
        <span className="mono">{open ? '▾' : '▸'}</span>
        <span className="eyebrow">Inner workings · how the system arrived here</span>
        <span className="inspector__inner-toggle-tag mono">{pipeline.length} steps</span>
      </button>
      {open && (
        <div className="inspector__inner-body">
          <div className="inspector__inner-key mono">
            DEMO · system internals · abstracted from operator view in production
          </div>
          <ol className="inspector__inner-list">
            {pipeline.map((step, i) => (
              <li key={i} className="inspector__inner-step slide-right" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="inspector__inner-rail">
                  <div className="inspector__inner-dot"/>
                  {i < pipeline.length - 1 && <div className="inspector__inner-line"/>}
                </div>
                <div className="inspector__inner-content">
                  <div className="inspector__inner-layer mono">{step.layer}</div>
                  <div className="inspector__inner-agent">{step.agent}</div>
                  <div className="inspector__inner-action mono">{step.action}<span className="inspector__inner-state"> · {step.state}</span></div>
                  <div className="inspector__inner-detail">{step.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// --------- Inspector panel (right side) --------- //
function Inspector({ entity, state, chapter, watched, onToggleWatch, demoMode }) {
  const [innerOpen, setInnerOpen] = useState(false);

  if (!entity) return null;

  // Rising sparklines for the cascade entities
  const mem = useMemo(() => {
    if (entity.id === 'pod.cart') {
      return [220, 240, 268, 295, 320, 354, 388, 412, 438, 462, 484, 490, 478];
    }
    if (entity.id === 'pod.currency') {
      return [180, 190, 188, 195, 198, 202, 210, 218, 224, 235, 244, 256, 268];
    }
    return [80, 84, 78, 92, 88, 94, 90, 96, 88, 92, 94, 90, 96];
  }, [entity.id]);

  const probe = useMemo(() => {
    if (entity.id === 'pod.currency') {
      return [0, 0, 0, 0, 0, 1, 0, 1, 2, 3, 3, 4, 4];
    }
    return [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  }, [entity.id]);

  const isLive = state === 'firing' || state === 'flagged' || state === 'observed' || state === 'predicted';

  // Resolve host node from EDGES (no hard-coding)
  const hostNodeId = window.ENTITY_NODE_LOOKUP[entity.id];
  const hostNode = hostNodeId ? window.ENTITIES.find(e => e.id === hostNodeId) : null;

  // Resolve prediction + pipeline for the current chapter+entity
  const prediction = (window.PREDICTIONS_BY_CHAPTER[chapter] || {})[entity.id] || null;
  const pipeline   = (window.PIPELINE_BY_CHAPTER[chapter] || {})[entity.id] || [];

  // Auto-open the inner-workings panel for the demo when a prediction exists
  useEffect(() => {
    if (prediction && demoMode) setInnerOpen(true);
  }, [prediction, demoMode, entity.id, chapter]);

  return (
    <aside className="inspector slide-right">
      <div className="inspector__head">
        <div className="eyebrow">/inspector · {entity.kind}</div>
        <div className="inspector__title">{entity.label}</div>
        <div className="inspector__meta">
          ns={entity.ns} · uid=ent_{entity.id.replace('.', '_')}_{stableUid(entity.id)} · ontology v3.2.1
        </div>
      </div>

      {/* State pills */}
      <div className="inspector__pills">
        <span className={`chip ${
          state === 'firing'    ? 'chip--solid' :
          state === 'predicted' ? 'chip--warn'  :
          state === 'flagged'   ? 'chip--warn'  :
          state === 'observed'  ? 'chip--live'  : ''
        }`}>
          <span className="chip__dot"/>{state || 'idle'}
        </span>
        {watched && <span className="chip chip--watch"><span className="chip__dot"/>★ watched</span>}
        {entity.kind === 'pod' && <span className="chip">role · {entity.role}</span>}
        {entity.kind === 'pod' && hostNode && <span className="chip">node · {hostNode.label.split('-').slice(-1)[0]}</span>}
      </div>

      {/* Watch toggle row — always visible for any clickable entity */}
      <div className="inspector__watch-row">
        <button className={`inspector__watch ${watched ? 'is-on' : ''}`} onClick={onToggleWatch}>
          <svg viewBox="0 0 16 16" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
            <path d="M8 1.6 L9.9 5.6 L14.2 6.2 L11.1 9.2 L11.9 13.4 L8 11.4 L4.1 13.4 L4.9 9.2 L1.8 6.2 L6.1 5.6 Z"/>
          </svg>
          <span>{watched ? 'Watching · pre-alert on' : 'Watch this node · pre-alert when activation predicted'}</span>
        </button>
      </div>

      {/* Predicted activation panel — only shown when system has a forecast for this entity */}
      {prediction && (
        <PredictionPanel prediction={prediction} watched={watched} onToggleWatch={onToggleWatch}/>
      )}

      {/* Sparklines */}
      {entity.kind === 'pod' && (
        <>
          <div className="inspector__row">
            <div className="inspector__row-lab">
              <span className="eyebrow">working set</span>
              <span className="inspector__row-val">{mem[mem.length - 1]} MiB / 512</span>
            </div>
            <Sparkline data={mem} live={isLive}/>
          </div>

          <div className="inspector__row">
            <div className="inspector__row-lab">
              <span className="eyebrow">probe fails · 30s</span>
              <span className="inspector__row-val">{probe[probe.length - 1]} / 3</span>
            </div>
            <Sparkline data={probe} live={isLive}/>
          </div>

          <div className="inspector__row">
            <div className="inspector__row-lab">
              <span className="eyebrow">cpu utilization</span>
              <span className="inspector__row-val">0.24 / 0.40 cores</span>
            </div>
            <Sparkline data={[0.1, 0.12, 0.14, 0.18, 0.22, 0.21, 0.24, 0.26, 0.24, 0.22, 0.24, 0.22, 0.24]}/>
          </div>
        </>
      )}

      {/* Active conditions */}
      {(state === 'firing' || state === 'flagged' || state === 'predicted') && (
        <div className="inspector__section">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Active conditions</div>
          {state === 'predicted' && (
            <div className="inspector__cond">
              <span className="inspector__cond-dot"/>
              <span className="mono">ev.probe_fail_rate_climbing</span>
              <span className="inspector__cond-t">+8s</span>
            </div>
          )}
          <div className="inspector__cond">
            <span className="inspector__cond-dot"/>
            <span className="mono">ev.memory_pressure_sustained</span>
            <span className="inspector__cond-t">+38s</span>
          </div>
          {entity.id === 'pod.currency' && state === 'firing' && (
            <div className="inspector__cond">
              <span className="inspector__cond-dot"/>
              <span className="mono">ev.probe_failure_rate_exceeds</span>
              <span className="inspector__cond-t">+12s</span>
            </div>
          )}
        </div>
      )}

      {/* Applicable playbooks */}
      <div className="inspector__section">
        <div className="eyebrow" style={{ marginBottom: 10 }}>Applicable playbooks</div>
        <div className="inspector__pb"><span>pb.probe_cascade</span><span className="mono inspector__pb-st">{
          state === 'firing'    ? 'FIRING'        :
          state === 'predicted' ? 'PRE-MATCH 2/3' : 'WATCHING'
        }</span></div>
        <div className="inspector__pb"><span>pb.oom_cascade</span><span className="mono inspector__pb-st">WATCHING</span></div>
        <div className="inspector__pb"><span>pb.cpu_contention</span><span className="mono inspector__pb-st">WATCHING</span></div>
      </div>

      {/* Inner workings — collapsible, only when there is a pipeline to show */}
      {pipeline.length > 0 && (
        <InnerWorkings pipeline={pipeline} open={innerOpen} onToggle={() => setInnerOpen(o => !o)}/>
      )}
    </aside>
  );
}

// --------- Legend --------- //
function Legend() {
  return (
    <div className="kg-legend">
      <div className="eyebrow" style={{ marginBottom: 14 }}>Legend</div>
      <div className="kg-legend__row">
        <svg width="32" height="20" viewBox="-16 -10 32 20">
          <rect x={-10} y={-7} width={20} height={14} stroke="#A5A5A2" strokeWidth={1.2} fill="none"/>
        </svg>
        <span>Pod</span>
      </div>
      <div className="kg-legend__row">
        <svg width="32" height="20" viewBox="-16 -10 32 20">
          <circle r={9} stroke="#A5A5A2" strokeWidth={1.2} fill="none"/>
          <circle r={2.5} fill="#A5A5A2"/>
        </svg>
        <span>Service</span>
      </div>
      <div className="kg-legend__row">
        <svg width="32" height="20" viewBox="-16 -10 32 20">
          <ellipse cx={0} cy={-3} rx={10} ry={3.4} stroke="#A5A5A2" strokeWidth={1.2} fill="none"/>
          <path d="M-10 -3 v6 a10 3.4 0 0 0 20 0 v-6" stroke="#A5A5A2" strokeWidth={1.2} fill="none"/>
        </svg>
        <span>PVC</span>
      </div>
      <div className="kg-legend__row">
        <svg width="32" height="20" viewBox="-16 -10 32 20">
          <rect x={-13} y={-8} width={26} height={16} stroke="#A5A5A2" strokeWidth={1.2} fill="none"/>
        </svg>
        <span>Node</span>
      </div>
      <div className="kg-legend__divider"/>
      <div className="kg-legend__row">
        <svg width="32" height="6" viewBox="0 0 32 6">
          <line x1={2} y1={3} x2={30} y2={3} stroke="#A5A5A2" strokeWidth={1.4}/>
        </svg>
        <span>calls</span>
      </div>
      <div className="kg-legend__row">
        <svg width="32" height="6" viewBox="0 0 32 6">
          <line x1={2} y1={3} x2={30} y2={3} stroke="#A5A5A2" strokeWidth={1.2} strokeDasharray="4 4"/>
        </svg>
        <span>mounts</span>
      </div>
      <div className="kg-legend__row">
        <svg width="32" height="6" viewBox="0 0 32 6">
          <line x1={2} y1={3} x2={30} y2={3} stroke="#A5A5A2" strokeWidth={1.2} strokeDasharray="2 5"/>
        </svg>
        <span>runs-on</span>
      </div>
    </div>
  );
}

// --------- Cluster ambient ticker (top-of-graph stats) --------- //
function GraphStats({ chapter }) {
  const tick = window.useTick(900);
  const stats = useMemo(() => {
    const baseline = { obs: 41200, evd: 14, fire: 0, esc: 0 };
    const inc = {
      connect:   baseline,
      topology:  { ...baseline, obs: 41203 },
      flags:     { ...baseline, obs: 41215, evd: 17 },
      firing:    { obs: 41229, evd: 22, fire: 1, esc: 0 },
      synthesis: { obs: 41244, evd: 25, fire: 1, esc: 0 },
      ask:       { obs: 41268, evd: 26, fire: 1, esc: 0 },
      escalate:  { obs: 41284, evd: 31, fire: 3, esc: 1 },
      resolved:  { obs: 41318, evd: 33, fire: 0, esc: 0 },
    };
    return inc[chapter] || baseline;
  }, [chapter]);

  // Live jitter — observations tick up steadily, evidence occasionally bumps
  const obsLive = stats.obs + tick * 3 + ((tick * 7) % 5);
  const evdLive = stats.evd + ((tick % 14 === 13) ? 1 : 0);

  return (
    <div className="kg-stats">
      <div className="kg-stats__item">
        <div className="kg-stats__val">{obsLive.toLocaleString()}</div>
        <div className="eyebrow">observations · today</div>
      </div>
      <div className="kg-stats__sep"/>
      <div className="kg-stats__item">
        <div className="kg-stats__val">{evdLive}</div>
        <div className="eyebrow">evidence · last 5m</div>
      </div>
      <div className="kg-stats__sep"/>
      <div className="kg-stats__item">
        <div className="kg-stats__val">{stats.fire}</div>
        <div className="eyebrow">playbooks firing</div>
      </div>
      <div className="kg-stats__sep"/>
      <div className="kg-stats__item">
        <div className="kg-stats__val">{stats.esc}</div>
        <div className="eyebrow">escalations</div>
      </div>
    </div>
  );
}

// --------- Ambient observation ring (random nodes blink as system observes) --------- //
function ObservationPing({ entities, focusedId, stateMap }) {
  const tick = window.useTick(2200);
  // Pick a random idle entity to ping
  const candidates = entities.filter(e => {
    const st = stateMap[e.id];
    return !st || st === 'idle';
  });
  if (candidates.length === 0) return null;
  const target = candidates[tick % candidates.length];
  if (!target || target.id === focusedId) return null;
  return (
    <g key={`ping-${tick}`} transform={`translate(${target.x},${target.y})`} pointerEvents="none">
      <circle r={20} fill="none" stroke="#A5A5A2" strokeWidth="0.6" opacity="0">
        <animate attributeName="r" values="18;42;42" dur="1.4s" begin="0s" fill="freeze"/>
        <animate attributeName="opacity" values="0.6;0.15;0" dur="1.4s" begin="0s" fill="freeze"/>
      </circle>
    </g>
  );
}

// --------- TopologyView (root) --------- //
function TopologyView({ chapter, entities, edges, stateMap, onFocus, focusedId, watchedSet, onToggleWatch, demoMode }) {
  const entityMap = useMemo(() => {
    const m = {};
    entities.forEach(e => { m[e.id] = e; });
    return m;
  }, [entities]);

  const showPathway = chapter === 'synthesis' || chapter === 'ask';
  const subgraphPaused = chapter === 'escalate';
  const focusedEntity = focusedId ? entityMap[focusedId] : null;
  const focusedState = focusedId ? (stateMap[focusedId] || 'idle') : 'idle';

  // Active edges follow the firing/flagged nodes
  const activeEdgeSet = useMemo(() => {
    const set = new Set();
    if (chapter === 'firing' || chapter === 'synthesis' || chapter === 'ask') {
      set.add('pod.cart→pod.currency');
      set.add('pod.cart→node.a');
      set.add('pod.currency→node.a');
    }
    if (chapter === 'synthesis' || chapter === 'ask') {
      set.add('pod.checkout→pod.currency');
    }
    return set;
  }, [chapter]);

  // -------- Pan / zoom --------
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const viewRef = useRef(view);
  const dragRef = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false });
  const svgRef = useRef(null);

  useEffect(() => { viewRef.current = view; }, [view]);

  // Wheel — attached non-passive so we can preventDefault
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(ctm.inverse());
      const t = viewRef.current;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newK = Math.max(0.5, Math.min(3, t.k * factor));
      const kRatio = newK / t.k;
      setView({
        x: p.x - (p.x - t.x) * kRatio,
        y: p.y - (p.y - t.y) * kRatio,
        k: newK,
      });
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  const onPointerDown = (e) => {
    if (e.target.closest('.kg-node, .kg-controls, .kg-legend')) return;
    const svg = svgRef.current;
    if (!svg) return;
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
    setIsPanning(true);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const svg = svgRef.current;
    const ctm = svg && svg.getScreenCTM();
    if (!ctm) return;
    const dx = (e.clientX - dragRef.current.sx) / ctm.a;
    const dy = (e.clientY - dragRef.current.sy) / ctm.d;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
    setView(v => ({ ...v, x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }));
  };
  const onPointerUp = (e) => {
    const svg = svgRef.current;
    if (svg && svg.hasPointerCapture && svg.hasPointerCapture(e.pointerId)) {
      try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    dragRef.current.active = false;
    setIsPanning(false);
  };

  const zoomBy = (factor) => {
    const t = viewRef.current;
    const newK = Math.max(0.5, Math.min(3, t.k * factor));
    const kRatio = newK / t.k;
    const cx = 550, cy = 280;
    setView({
      x: cx - (cx - t.x) * kRatio,
      y: cy - (cy - t.y) * kRatio,
      k: newK,
    });
  };
  const resetView = () => setView({ x: 0, y: 0, k: 1 });

  return (
    <div className={`kg-view ${subgraphPaused ? 'is-paused' : ''}`}>
      <GraphStats chapter={chapter}/>

      <div className="kg-stage">
        <div className="kg-canvas">
          <svg ref={svgRef}
               viewBox="0 0 1100 560"
               preserveAspectRatio="xMidYMid meet"
               className="kg-svg"
               onPointerDown={onPointerDown}
               onPointerMove={onPointerMove}
               onPointerUp={onPointerUp}
               onPointerCancel={onPointerUp}
               onDoubleClick={resetView}
               style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}>
          {/* Background grid */}
          <defs>
            <pattern id="kg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            </pattern>
          </defs>

          <g transform={`translate(${view.x.toFixed(2)} ${view.y.toFixed(2)}) scale(${view.k.toFixed(3)})`}>
          <rect x="-2000" y="-2000" width="5200" height="4560" fill="url(#kg-grid)"/>

          {/* Edges */}
          <g>
            {edges.map((e, i) => {
              const from = entityMap[e.from];
              const to   = entityMap[e.to];
              if (!from || !to) return null;
              const k = `${e.from}→${e.to}`;
              const active = activeEdgeSet.has(k);
              return <Edge key={i} from={from} to={to} kind={e.kind} active={active} suppressed={subgraphPaused && !active}/>;
            })}
          </g>

          {/* Pathway overlay */}
          <PathwayOverlay visible={showPathway} entities={entityMap}/>

          {/* Subgraph-paused banner */}
          {subgraphPaused && (
            <g transform="translate(550, 80)">
              <rect x={-180} y={-22} width={360} height={36} fill="#FFFFFF" stroke="#FFFFFF"/>
              <text textAnchor="middle" y={0} fontFamily="Plus Jakarta Sans" fontWeight="700" fontSize="12" letterSpacing="0.1em" fill="#0A0A0A">SYNTHESIS PAUSED · SHOP SUBGRAPH</text>
              <text textAnchor="middle" y={12} fontFamily="JetBrains Mono" fontSize="9" letterSpacing="0.18em" fill="#0A0A0A">CONFLICTING SIGNATURES · OPERATOR ACK REQUIRED</text>
            </g>
          )}

          {/* Ambient observation pings on idle entities */}
          <ObservationPing entities={entities} focusedId={focusedId} stateMap={stateMap}/>

          {/* Nodes */}
          <g>
            {entities.map((ent, i) => {
              const st = stateMap[ent.id] || 'idle';
              return (
                <GraphNode
                  key={ent.id}
                  entity={ent}
                  state={st}
                  focused={focusedId === ent.id}
                  watched={watchedSet && watchedSet.has(ent.id)}
                  onClick={() => { if (!dragRef.current.moved) onFocus(ent.id); }}
                />
              );
            })}
          </g>
          </g>
        </svg>

          <Legend/>

          <div className="kg-controls">
            <button className="kg-controls__btn" onClick={() => zoomBy(1.25)} title="Zoom in">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <line x1="8" y1="3.5" x2="8" y2="12.5"/>
                <line x1="3.5" y1="8" x2="12.5" y2="8"/>
              </svg>
            </button>
            <button className="kg-controls__btn" onClick={() => zoomBy(0.8)} title="Zoom out">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <line x1="3.5" y1="8" x2="12.5" y2="8"/>
              </svg>
            </button>
            <button className="kg-controls__btn" onClick={resetView} title="Reset view">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3.5" y="3.5" width="9" height="9"/>
                <line x1="3.5" y1="8" x2="12.5" y2="8" opacity="0.4"/>
                <line x1="8" y1="3.5" x2="8" y2="12.5" opacity="0.4"/>
              </svg>
            </button>
            <div className="kg-controls__zoom mono">{Math.round(view.k * 100)}%</div>
          </div>

          <div className="kg-hint mono">drag · scroll to zoom · double-click to reset</div>
        </div>

        {focusedEntity && (
          <Inspector
            entity={focusedEntity}
            state={focusedState}
            chapter={chapter}
            watched={watchedSet ? watchedSet.has(focusedEntity.id) : false}
            onToggleWatch={() => onToggleWatch && onToggleWatch(focusedEntity.id)}
            demoMode={demoMode}
          />
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TopologyView });
