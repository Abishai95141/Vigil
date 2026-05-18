// data.jsx — Scenario script, entity model, event sequence for the Vigil simulation
// All chapters of the probe-cascade demo on prod-edge-01

// -----------------------------------------------------------
// CHAPTERS — the guided scenario player advances through these
// -----------------------------------------------------------
const CHAPTERS = [
  {
    id: 'connect',
    num: '01',
    name: 'Connect',
    sub: 'Install agent, enumerate inventory, run the tier-cascade.',
    rail: 'Connect',
    surface: 'onboarding',
  },
  {
    id: 'topology',
    num: '02',
    name: 'Topology built',
    sub: 'Constructor agents render the live cluster graph.',
    rail: 'Topology',
    surface: 'topology',
  },
  {
    id: 'flags',
    num: '03',
    name: 'First flags',
    sub: 'Memory pressure observed on cartservice. Fingerprints update.',
    rail: 'Flags',
    surface: 'topology',
  },
  {
    id: 'firing',
    num: '04',
    name: 'Playbook fires',
    sub: 'Probe-cascade matches. Interpreter agent composes the card.',
    rail: 'Firing',
    surface: 'insights',
  },
  {
    id: 'synthesis',
    num: '05',
    name: 'Cross-domain synthesis',
    sub: 'Master agent matches a pathway across mem → probe → kubelet.',
    rail: 'Synthesis',
    surface: 'insights',
  },
  {
    id: 'ask',
    num: '06',
    name: 'Ask the cluster',
    sub: 'Operator queries in natural language. Citations inline.',
    rail: 'Ask',
    surface: 'chat',
  },
  {
    id: 'escalate',
    num: '07',
    name: 'Escalation',
    sub: 'Conflicting signatures · master pauses synthesis.',
    rail: 'Escalate',
    surface: 'insights',
  },
  {
    id: 'resolved',
    num: '08',
    name: 'Acknowledged',
    sub: 'Context entry added · firings downgrade · marks expire.',
    rail: 'Resolved',
    surface: 'timeline',
  },
];

// -----------------------------------------------------------
// CLUSTER ENTITIES — fixed positions for predictable layout
// Coordinates are in a 1100×560 viewbox
// -----------------------------------------------------------
const ENTITIES = [
  // Ingress
  { id: 'svc.frontend',   kind: 'service',   label: 'frontend',        ns: 'shop',     x: 110, y: 280, role: 'edge' },

  // Application pods
  { id: 'pod.cart',       kind: 'pod',       label: 'cartservice-2c8d3',     ns: 'shop', x: 320, y: 170, role: 'cart' },
  { id: 'pod.checkout',   kind: 'pod',       label: 'checkout-9f1b2',        ns: 'shop', x: 320, y: 290, role: 'checkout' },
  { id: 'pod.recs',       kind: 'pod',       label: 'recommendation-4a7c',   ns: 'shop', x: 320, y: 410, role: 'recs' },

  // Downstream
  { id: 'pod.currency',   kind: 'pod',       label: 'currencyservice-7b4f9', ns: 'shop', x: 560, y: 200, role: 'currency' },
  { id: 'pod.shipping',   kind: 'pod',       label: 'shipping-d3e8a',        ns: 'shop', x: 560, y: 380, role: 'shipping' },

  // Storage
  { id: 'pvc.cart',       kind: 'pvc',       label: 'pvc-cart-data',         ns: 'shop', x: 800, y: 170, role: 'storage' },
  { id: 'pvc.orders',     kind: 'pvc',       label: 'pvc-orders',            ns: 'shop', x: 800, y: 320, role: 'storage' },

  // Nodes
  { id: 'node.a',         kind: 'node',      label: 'prod-edge-01-node-a',   ns: '_',    x: 990, y: 200, role: 'node' },
  { id: 'node.b',         kind: 'node',      label: 'prod-edge-01-node-b',   ns: '_',    x: 990, y: 380, role: 'node' },
];

// -----------------------------------------------------------
// EDGES — relationship type drives visual style
// -----------------------------------------------------------
const EDGES = [
  // service → pods (selects)
  { from: 'svc.frontend',  to: 'pod.cart',     kind: 'calls' },
  { from: 'svc.frontend',  to: 'pod.checkout', kind: 'calls' },
  { from: 'svc.frontend',  to: 'pod.recs',     kind: 'calls' },

  // pod → pod (calls)
  { from: 'pod.checkout',  to: 'pod.currency', kind: 'calls' },
  { from: 'pod.cart',      to: 'pod.currency', kind: 'calls' },
  { from: 'pod.checkout',  to: 'pod.shipping', kind: 'calls' },
  { from: 'pod.recs',      to: 'pod.shipping', kind: 'calls' },

  // pod → pvc (mounts)
  { from: 'pod.cart',      to: 'pvc.cart',     kind: 'mounts' },
  { from: 'pod.checkout',  to: 'pvc.orders',   kind: 'mounts' },

  // pod → node (runs-on)
  { from: 'pod.cart',      to: 'node.a',       kind: 'runs-on' },
  { from: 'pod.currency',  to: 'node.a',       kind: 'runs-on' },
  { from: 'pod.checkout',  to: 'node.b',       kind: 'runs-on' },
  { from: 'pod.recs',      to: 'node.b',       kind: 'runs-on' },
  { from: 'pod.shipping',  to: 'node.b',       kind: 'runs-on' },
];

// -----------------------------------------------------------
// ENTITY STATE PER CHAPTER
// state per entity: 'idle' | 'observed' | 'flagged' | 'predicted' | 'firing' | 'cleared'
//   'predicted' means: system forecasts this entity will fire soon (pre-activation alert)
// -----------------------------------------------------------
const STATE_BY_CHAPTER = {
  connect: {},
  topology: {
    // all idle — graph just built
  },
  flags: {
    'pod.cart':     'observed',
    'pod.currency': 'predicted',   // operator-watched node enters pre-activation
  },
  firing: {
    'pod.cart':     'flagged',
    'pod.currency': 'firing',
  },
  synthesis: {
    'pod.cart':     'flagged',
    'pod.currency': 'firing',
    'pod.checkout': 'observed',
    'node.a':       'observed',
  },
  ask: {
    'pod.cart':     'flagged',
    'pod.currency': 'firing',
    'pod.checkout': 'observed',
    'node.a':       'observed',
  },
  escalate: {
    'pod.cart':     'flagged',
    'pod.currency': 'firing',
    'pod.checkout': 'firing',
    'node.a':       'flagged',
    'pvc.orders':   'flagged',
  },
  resolved: {
    'pod.cart':     'cleared',
    'pod.currency': 'cleared',
    'pod.checkout': 'cleared',
    'node.a':       'idle',
    'pvc.orders':   'idle',
  },
};

// -----------------------------------------------------------
// WATCHED NODES PER CHAPTER — operator-marked critical entities
//   The scenario auto-marks currencyservice in 'topology' to demonstrate
//   pre-activation alerting; operator can toggle any node from the inspector.
// -----------------------------------------------------------
const WATCHED_BY_CHAPTER = {
  connect:   [],
  topology:  ['pod.currency'],
  flags:     ['pod.currency'],
  firing:    ['pod.currency'],
  synthesis: ['pod.currency'],
  ask:       ['pod.currency'],
  escalate:  ['pod.currency'],
  resolved:  ['pod.currency'],
};

// -----------------------------------------------------------
// PREDICTION TRACES — per-entity, per-chapter forecast details
//   These power the inspector's "Predicted activation" panel
//   and the prediction insight card.
// -----------------------------------------------------------
const PREDICTIONS_BY_CHAPTER = {
  flags: {
    'pod.currency': {
      headline: 'Probe-cascade activation predicted',
      eta_low:  10,   // seconds
      eta_high: 30,
      confidence: 'medium',
      confidence_val: 0.74,
      pre_match_fraction: 0.66,
      pathway: 'pwy.probe_cascade_memory_origin',
      pathway_steps_matched: 2,
      pathway_steps_total: 3,
      reasoning: 'Co-scheduled with cartservice on node-a. Cart memory pressure is sustained and rising (working set 484 / 512 MiB · +18 MiB / 30s). Probe failure rate on this pod is climbing (1 / 30s → 2 / 30s). Two of three probe-cascade rules already satisfied.',
      contributing: [
        { domain: 'memory',  entity: 'pod.cart',     signal: 'memory_pressure_sustained',  weight: 0.40 },
        { domain: 'network', entity: 'pod.currency', signal: 'probe_fail_rate_climbing',   weight: 0.35 },
        { domain: 'topology',entity: 'node.a',       signal: 'co_scheduled_adjacency',     weight: 0.25 },
      ],
    },
  },
};

// -----------------------------------------------------------
// INNER-WORKINGS TRACE — the agent pipeline behind a prediction
//   Used by the Inspector's "Inner workings" panel to teach stakeholders
//   how the system produced the abstracted operator-facing claim.
//   Keyed by chapter → entity_id → ordered pipeline steps.
// -----------------------------------------------------------
const PIPELINE_BY_CHAPTER = {
  flags: {
    'pod.currency': [
      {
        layer: 'L1 · ingest',
        agent: 'customer-side agent',
        action: 'forwarding canonical observations',
        detail: 'container_memory_working_set_bytes · probe_fail · cpu_user_seconds — 312 obs/s on shop ns',
        state: 'streaming',
      },
      {
        layer: 'L3 · constructor',
        agent: 'memory.constructor',
        action: 'fingerprint updated',
        detail: 'ev.memory_pressure_sustained on pod.cart · adjacency edge to pod.currency · evidence emitted +12s ago',
        state: 'emitted',
      },
      {
        layer: 'L3 · constructor',
        agent: 'network.constructor',
        action: 'rate-of-change tracking',
        detail: 'probe_fail_rate on pod.currency · 0 → 1 → 2 / 30s · fingerprint: probe_fail_climbing',
        state: 'climbing',
      },
      {
        layer: 'L4 · signal detection',
        agent: 'pb.probe_cascade · detector',
        action: 'partial pattern match',
        detail: 'rule.memory_pressure_upstream ✓ · rule.co_scheduled_on_node ✓ · rule.probe_failure_rate_exceeds (2 / 3 · threshold not yet crossed)',
        state: 'partial · 2 of 3',
      },
      {
        layer: 'L4 · master agent',
        agent: 'master.synth',
        action: 'pathway pre-match',
        detail: 'pwy.probe_cascade_memory_origin · origin ✓ · propagation ✓ · termination pending',
        state: '2 of 3 steps',
      },
      {
        layer: 'L4 · master agent',
        agent: 'master.synth',
        action: 'forecast composed',
        detail: 'predicted activation · conf 0.74 · ETA 10–30s · operator-watched entity flagged for pre-alert',
        state: 'forecasting',
      },
      {
        layer: 'L5 · interpreter',
        agent: 'pb.probe_cascade · interpreter',
        action: 'predicted-firing card surfaced',
        detail: 'card kind: predicted_activation · severity: high · linked to evidence chain (4 nodes)',
        state: 'surfaced',
      },
      {
        layer: 'L4 · overlay',
        agent: 'active prediction overlay',
        action: 'mark applied',
        detail: 'pod.currency · PRE-FIRE · expires when condition resolves or playbook fires',
        state: 'active',
      },
    ],
  },
  firing: {
    'pod.currency': [
      {
        layer: 'L4 · signal detection',
        agent: 'pb.probe_cascade · detector',
        action: 'full pattern match',
        detail: 'rule.probe_failure_rate_exceeds ✓ · 4 fails / 30s · all 3 rules now satisfied',
        state: 'matched',
      },
      {
        layer: 'L5 · interpreter',
        agent: 'pb.probe_cascade · interpreter',
        action: 'prediction confirmed → playbook firing',
        detail: 'predicted_activation card replaced by playbook_match card · delta to fire: +8s of forecast window',
        state: 'confirmed',
      },
      {
        layer: 'L4 · overlay',
        agent: 'active prediction overlay',
        action: 'mark elevated',
        detail: 'pod.currency · PRE-FIRE → FIRING · cascade tracked through pathway',
        state: 'elevated',
      },
    ],
  },
};

// -----------------------------------------------------------
// AGENT ACTIVITY STRIP — shown in the "Inside the system" overlay
//   Surfaces what every agent is doing per chapter. Stakeholders see
//   the agent collaboration that produces the abstracted view above.
// -----------------------------------------------------------
const AGENT_ACTIVITY_BY_CHAPTER = {
  connect:   [],
  topology: [
    { agent: 'memory.constructor',  state: 'idle',       note: 'awaiting baseline observations' },
    { agent: 'network.constructor', state: 'idle',       note: 'awaiting baseline observations' },
    { agent: 'storage.constructor', state: 'idle',       note: 'awaiting baseline observations' },
    { agent: 'master.synth',        state: 'idle',       note: 'graph constructed · 0 evidence' },
    { agent: 'exploratory.agent',   state: 'standby',    note: 'engaged after warmup · standard sensitivity' },
  ],
  flags: [
    { agent: 'memory.constructor',  state: 'emitting',   note: 'ev.memory_pressure_sustained · pod.cart' },
    { agent: 'network.constructor', state: 'tracking',   note: 'probe_fail_rate climbing · pod.currency' },
    { agent: 'storage.constructor', state: 'idle',       note: 'no signal' },
    { agent: 'signal.detection',    state: 'partial',    note: 'pb.probe_cascade · 2 of 3 rules' },
    { agent: 'master.synth',        state: 'forecasting',note: 'pwy.probe_cascade · pre-match 2 of 3' },
    { agent: 'exploratory.agent',   state: 'standby',    note: 'no unexplained signal' },
  ],
  firing: [
    { agent: 'memory.constructor',  state: 'emitting',   note: 'ev.oom_kill_recorded · pod.cart' },
    { agent: 'network.constructor', state: 'firing',     note: 'rule.probe_failure_rate_exceeds satisfied' },
    { agent: 'signal.detection',    state: 'fired',      note: 'pb.probe_cascade · all rules matched · conf 0.87' },
    { agent: 'pb.probe_cascade · interpreter', state: 'composing', note: 'insight card · 4 entities affected' },
    { agent: 'master.synth',        state: 'synthesizing', note: 'evidence aligning with known pathway' },
    { agent: 'exploratory.agent',   state: 'standby',    note: 'all signals explained by playbook match' },
  ],
  synthesis: [
    { agent: 'signal.detection',    state: 'firing',     note: 'pb.probe_cascade ongoing' },
    { agent: 'master.synth',        state: 'matched',    note: 'pwy.probe_cascade_memory_origin · 3 of 3 steps' },
    { agent: 'master.synth',        state: 'collapsing', note: '2 prior interpreter cards collapsed beneath synthesis card' },
    { agent: 'overlay',             state: 'updating',   note: 'cross-domain mark extends to node.a + pod.checkout' },
    { agent: 'exploratory.agent',   state: 'standby',    note: 'pathway-matched · no exploratory work needed' },
  ],
  ask: [
    { agent: 'master.synth',        state: 'decomposing', note: 'chat query · intent=incident_history · entity=currency' },
    { agent: 'master.synth',        state: 'composing',  note: '6 inline citations · grounded in KG' },
    { agent: 'signal.detection',    state: 'firing',     note: 'pb.probe_cascade ongoing' },
  ],
  escalate: [
    { agent: 'signal.detection',    state: 'firing × 3', note: 'pb.probe_cascade · pb.storage_saturation · pb.oom_cascade' },
    { agent: 'master.synth',        state: 'paused',     note: 'CONFLICTING SIGNATURES · synthesis paused on shop subgraph' },
    { agent: 'exploratory.agent',   state: 'eager',      note: 'in-incident sweep · pvc-orders adjacent entities' },
    { agent: 'overlay',             state: 'frozen',     note: 'marks held until operator acknowledges escalation' },
  ],
  resolved: [
    { agent: 'context.subsystem',   state: 'applied',    note: 'planned_maintenance on pvc-orders · suppresses pb.storage_saturation' },
    { agent: 'signal.detection',    state: 'downgraded', note: 'pb.storage_saturation in context · annotated, not fired' },
    { agent: 'master.synth',        state: 'resuming',   note: 'subgraph re-evaluated · synthesis resumed' },
    { agent: 'overlay',             state: 'expiring',   note: 'marks aging out as conditions clear' },
    { agent: 'annotation.subsystem',state: 'recording',  note: 'operator annotation · real_acted_on · maya@team' },
  ],
};

// -----------------------------------------------------------
// EVENT STREAM — anomaly timeline + event row
// Each event: { t (sec), domain, level, scope, msg, verdict }
// -----------------------------------------------------------
const EVENTS = [
  // baseline
  { t: '14:01:08', dom: 'log', lvl: 'idle', scope: 'frontend',     msg: 'request /cart 200 · 14ms',                       verdict: 'OBS' },
  { t: '14:01:11', dom: 'cpu', lvl: 'idle', scope: 'recs',         msg: 'cpu utilization steady · 0.18 / 0.40 cores',     verdict: 'OBS' },
  { t: '14:01:14', dom: 'net', lvl: 'idle', scope: 'shipping',     msg: 'p99 latency 21ms · within probe budget',          verdict: 'OBS' },

  // chapter 2 — operator marks currencyservice as critical-watch (during topology setup)
  { t: '14:01:42', dom: 'op',  lvl: 'idle', scope: 'maya@team',    msg: 'watch added · currencyservice marked as critical · pre-alert enabled', verdict: 'WATCH', chapter: 'topology' },

  // chapter 3 — first flags + predicted activation on watched node
  { t: '14:02:03', dom: 'mem', lvl: 'flag', scope: 'cartservice',  msg: 'working_set 484 / 512 MiB · approaching limit',  verdict: 'OBS', chapter: 'flags' },
  { t: '14:02:07', dom: 'mem', lvl: 'flag', scope: 'cartservice',  msg: 'rate-of-change +18 MiB / 30s · sustained',        verdict: 'EVD', chapter: 'flags' },
  { t: '14:02:09', dom: 'log', lvl: 'flag', scope: 'cartservice',  msg: 'WARN page allocation stall · order=0',            verdict: 'EVD', chapter: 'flags' },
  { t: '14:02:10', dom: 'net', lvl: 'flag', scope: 'currency',     msg: 'probe_fail_rate 1 → 2 / 30s · climbing',          verdict: 'EVD', chapter: 'flags' },
  { t: '14:02:10', dom: 'sig', lvl: 'flag', scope: 'pb.probe_cascade', msg: 'partial pattern match · 2 of 3 rules satisfied', verdict: 'PARTIAL', chapter: 'flags' },
  { t: '14:02:11', dom: 'mst', lvl: 'flag', scope: 'pwy.probe_cascade_memory_origin', msg: 'pathway pre-match · 2 of 3 steps · forecasting', verdict: 'PRE', chapter: 'flags' },
  { t: '14:02:11', dom: 'int', lvl: 'flag', scope: 'currency',     msg: 'predicted activation · ETA 10–30s · conf 0.74 · watched node', verdict: 'PREDICT', chapter: 'flags' },

  // chapter 4 — playbook fires
  { t: '14:02:11', dom: 'mem', lvl: 'fire', scope: 'cartservice',  msg: 'OOM-kill recorded · container=cart pid=1',        verdict: 'EVD', chapter: 'firing' },
  { t: '14:02:13', dom: 'net', lvl: 'fire', scope: 'currency',     msg: 'probe failure rate 4 / 30s · exceeds threshold',  verdict: 'EVD', chapter: 'firing' },
  { t: '14:02:14', dom: 'sig', lvl: 'fire', scope: 'pb.probe_cascade', msg: 'playbook predicted firing · conf 0.87',       verdict: 'FIRE', chapter: 'firing' },
  { t: '14:02:15', dom: 'int', lvl: 'fire', scope: 'pb.probe_cascade', msg: 'interpreter agent composing insight · 4 entities affected', verdict: 'CARD', chapter: 'firing' },

  // chapter 5 — synthesis
  { t: '14:02:18', dom: 'mst', lvl: 'fire', scope: 'pwy.probe_cascade_memory_origin', msg: 'pathway match · mem→probe→kubelet · 3 of 3 steps', verdict: 'SYN', chapter: 'synthesis' },
  { t: '14:02:19', dom: 'cpu', lvl: 'flag', scope: 'node-a',       msg: 'kubelet eviction events queued on node-a',         verdict: 'EVD', chapter: 'synthesis' },
  { t: '14:02:20', dom: 'mst', lvl: 'fire', scope: 'synthesis',    msg: 'cross-domain card surfaced · 2 firings collapsed',  verdict: 'CARD', chapter: 'synthesis' },

  // chapter 6 — operator asks
  { t: '14:02:34', dom: 'op',  lvl: 'idle', scope: 'maya@team',    msg: 'chat query · "what is happening with currencyservice?"', verdict: 'ASK', chapter: 'ask' },
  { t: '14:02:36', dom: 'mst', lvl: 'idle', scope: 'chat',         msg: 'decomposed → intent=incident_history · entity=currency · window=5m', verdict: 'OBS', chapter: 'ask' },
  { t: '14:02:37', dom: 'mst', lvl: 'idle', scope: 'chat',         msg: 'response composed · 6 citations inlined',           verdict: 'OBS', chapter: 'ask' },

  // chapter 7 — escalation
  { t: '14:02:48', dom: 'stg', lvl: 'fire', scope: 'pvc-orders',   msg: 'storage queue depth saturated · 16 / 16 inflight', verdict: 'EVD', chapter: 'escalate' },
  { t: '14:02:50', dom: 'sig', lvl: 'fire', scope: 'pb.storage_saturation', msg: 'playbook predicted firing · conf 0.79',    verdict: 'FIRE', chapter: 'escalate' },
  { t: '14:02:51', dom: 'sig', lvl: 'fire', scope: 'pb.oom_cascade', msg: 'playbook predicted firing · conf 0.72',           verdict: 'FIRE', chapter: 'escalate' },
  { t: '14:02:52', dom: 'mst', lvl: 'fire', scope: 'escalation',   msg: 'CONFLICTING SIGNATURES · synthesis paused on subgraph', verdict: 'ESC', chapter: 'escalate' },

  // chapter 8 — resolved
  { t: '14:03:08', dom: 'op',  lvl: 'idle', scope: 'maya@team',    msg: 'context added · planned_maintenance · pvc-orders · 15m', verdict: 'CTX', chapter: 'resolved' },
  { t: '14:03:10', dom: 'sig', lvl: 'idle', scope: 'pb.storage_saturation', msg: 'firing downgraded · context active',       verdict: 'DOWN', chapter: 'resolved' },
  { t: '14:03:12', dom: 'op',  lvl: 'idle', scope: 'maya@team',    msg: 'cartservice memory.limit raised 512 → 768 MiB · helm rollout', verdict: 'ACT', chapter: 'resolved' },
  { t: '14:03:24', dom: 'mst', lvl: 'idle', scope: 'synthesis',    msg: 'pathway clear · marks expiring · synthesis resumed', verdict: 'OK', chapter: 'resolved' },
];

// -----------------------------------------------------------
// INSIGHT CARDS — surface to insight feed
// -----------------------------------------------------------
const INSIGHTS = [
  // Visible from chapter 3 (flags) onwards — pre-activation alert on watched node
  {
    id: 'card.predicted-activation',
    kind: 'predicted_activation',
    chapter_from: 'flags',
    chapter_until: 'flags',                       // replaced by playbook_match card once it fires
    playbook: 'pb.probe_cascade',
    severity: 'high',
    confidence: 'medium',
    headline: 'Predicted activation on currencyservice — watched node.',
    italic: 'Pre-fire forecast · ETA 10–30s · probe-cascade pre-match.',
    narrative: 'Operator marked currencyservice as critical-watch at 14:01:42. Upstream memory pressure on cartservice (working set 484 / 512 MiB, sustained +18 MiB / 30s) and a climbing probe failure rate on currencyservice (1 → 2 / 30s) have triggered 2 of 3 probe-cascade rules. The master agent has pre-matched 2 of 3 steps of pwy.probe_cascade_memory_origin and is forecasting activation in 10–30s with medium confidence.',
    affected: ['pod.cart', 'pod.currency', 'node.a'],
    forecast: {
      eta_low: 10,
      eta_high: 30,
      confidence_val: 0.74,
      pre_match_fraction: 0.66,
    },
    evidence: [
      { lvl: 'claim',       ref: 'forecast.predicted_activation',     txt: 'pre-fire forecast on operator-watched entity · pod.currency' },
      { lvl: 'rule',        ref: 'rule.memory_pressure_upstream',     txt: 'satisfied · pod.cart memory pressure sustained' },
      { lvl: 'rule',        ref: 'rule.co_scheduled_on_node',         txt: 'satisfied · pod.cart and pod.currency on node-a' },
      { lvl: 'rule',        ref: 'rule.probe_failure_rate_exceeds',   txt: 'partial · 2 / 3 fails · trending toward threshold' },
      { lvl: 'evidence',    ref: 'ev.memory_pressure_sustained',      txt: 'sustained on cartservice · 90s window' },
      { lvl: 'observation', ref: 'obs.working_set.2c8d3',             txt: 'working_set_bytes · 14:01:00 – 14:02:11' },
    ],
    action: 'Inspect upstream memory on cartservice before currencyservice activates. If you can raise cart\'s memory limit or roll back the recent cart deploy in the next 20s, the cascade may not propagate.',
  },
  {
    id: 'card.probe-cascade',
    kind: 'playbook_match',
    chapter_from: 'firing',
    playbook: 'pb.probe_cascade',
    severity: 'high',
    confidence: 'medium',
    headline: 'Probe-cascade pattern detected on currencyservice.',
    italic: 'Upstream memory pressure linked to probe failures. Pre-fire forecast confirmed.',
    narrative: 'Memory pressure on cartservice-2c8d3 has progressed to OOM-kill, while probe failures on currencyservice-7b4f9 are exceeding the configured 3-in-30s threshold. Both pods are scheduled on node-a; kubelet eviction queue is filling. Pattern matches lab-phase-4 probe-cascade signature. The pre-fire forecast surfaced 14s ago has now resolved to a confirmed playbook firing.',
    confirms_prediction: 'card.predicted-activation',
    affected: ['pod.cart', 'pod.currency', 'node.a'],
    evidence: [
      { lvl: 'claim',     ref: 'pb.probe_cascade',                  txt: 'probe-cascade pattern · pattern_library v0.4.1' },
      { lvl: 'rule',      ref: 'rule.probe_failure_rate_exceeds',   txt: 'detection rule satisfied · 4 fails / 30s' },
      { lvl: 'evidence',  ref: 'ev.memory_pressure_sustained',      txt: 'memory_pressure_sustained on cartservice · 484 MiB / 512' },
      { lvl: 'evidence',  ref: 'ev.oom_kill_recorded',              txt: 'OOM-kill recorded · 14:02:11' },
      { lvl: 'observation', ref: 'obs.probe_fail.7b4f9',            txt: 'probe failure × 4 · 14:02:01 – 14:02:13' },
      { lvl: 'observation', ref: 'obs.working_set.2c8d3',           txt: 'working_set_bytes · 14:01:00 – 14:02:11' },
    ],
    action: 'Inspect upstream memory on cartservice. Consider raising its memory limit (currently 512 MiB) and checking for a recent code change in the cart worker.',
  },
  {
    id: 'card.synthesis',
    kind: 'cross_domain_synthesis',
    chapter_from: 'synthesis',
    pathway: 'pwy.probe_cascade_memory_origin',
    severity: 'high',
    confidence: 'medium',
    headline: 'Memory pressure → probe failure → kubelet eviction on node-a.',
    italic: 'Three steps of a known propagation pathway, all matched.',
    narrative: 'Master agent matched the three-step cross-domain pathway pwy.probe_cascade_memory_origin. Origin: sustained memory pressure on cartservice-2c8d3. Propagation: probe failures on co-scheduled currencyservice-7b4f9. Termination: kubelet eviction queue building on node-a. Two prior interpreter cards are collapsed beneath this synthesis as supporting context.',
    affected: ['pod.cart', 'pod.currency', 'pod.checkout', 'node.a'],
    evidence: [
      { lvl: 'claim',  ref: 'pwy.probe_cascade_memory_origin',   txt: 'pathway match · lab_phase_4_T4_cascade' },
      { lvl: 'claim',  ref: 'cause→effect',                       txt: 'origin: memory pressure · termination: eviction queue' },
      { lvl: 'rule',   ref: 'rule.kubelet_eviction_queue_growing', txt: 'eviction events += 3 in 30s on node-a' },
      { lvl: 'rule',   ref: 'rule.probe_failure_rate_exceeds',    txt: 'detection rule satisfied · 4 fails / 30s' },
      { lvl: 'evidence', ref: 'ev.memory_pressure_sustained',     txt: 'sustained on cartservice · 90s window' },
    ],
    action: 'Address upstream memory on cartservice. The pathway terminates cleanly once memory pressure clears; no action needed on currencyservice or node-a directly.',
    supporting: ['card.probe-cascade'],
  },
  {
    id: 'card.exploratory.unbound-restarts',
    kind: 'exploratory_hypothesis',
    chapter_from: 'escalate',
    severity: 'medium',
    confidence: 'low',
    headline: 'Candidate · recommendation-4a7c restart pattern not matching any playbook.',
    italic: 'Exploratory agent surfacing for review — no causal claim attached.',
    narrative: 'Exploratory agent invoked from in-incident sweep (escalation active on shop subgraph). Observed an unusual restart cadence on recommendation-4a7c (3 restarts in 14 minutes) with no matching playbook fingerprint. Partial resemblance to pb.oom_cascade signature, but memory pressure is not sustained on this pod. Two of three rules of pb.grpc_degradation would match if the operator confirms the latency spikes are real.',
    affected: ['pod.recs'],
    partial_matches: [
      { playbook_id: 'pb.oom_cascade',      match_fraction: 0.33, differences: ['memory pressure absent', 'no OOM event recorded'] },
      { playbook_id: 'pb.grpc_degradation', match_fraction: 0.66, differences: ['latency signal degraded — service-mesh tier required for full match'] },
    ],
    probes: [
      { txt: 'Check recommendation-4a7c logs for repeated readiness probe timeouts in the last 15 minutes.', a: 'No timeouts — likely scheduling churn, not cascade.', b: 'Timeouts present — promote to pb.grpc_degradation candidate.' },
      { txt: 'Compare restart cadence against last week\'s baseline on the same pod role.', a: 'In baseline — false positive.', b: 'Above baseline — flag for product-team pattern review.' },
    ],
    evidence: [
      { lvl: 'claim', ref: 'exploratory.hypothesis.recommendation-restarts', txt: 'exploratory agent · structured hypothesis · conf low' },
      { lvl: 'rule',  ref: 'rule.partial_match.pb.grpc_degradation',         txt: '2 of 3 partial · service-mesh signal missing' },
      { lvl: 'evidence', ref: 'ev.restart_cadence_above_baseline',           txt: '3 restarts / 14m on pod.recs · no fingerprint match' },
    ],
    action: 'Treat as candidate, not finding. If operator confirms (annotate "real"), the hypothesis is submitted to the pattern-candidate review queue for product-team characterisation.',
    pattern_candidate_for_library: true,
  },
  {
    id: 'card.escalation',
    kind: 'escalation',
    chapter_from: 'escalate',
    trigger: 'conflicting_signatures',
    severity: 'critical',
    confidence: 'low',
    headline: 'Conflicting signatures on the shop subgraph. Need your read.',
    italic: 'Synthesis paused. Three candidate interpretations attached.',
    narrative: 'Three playbooks fired within 6 seconds on overlapping entities: probe_cascade (origin: memory), storage_saturation (origin: pvc-orders queue depth), and oom_cascade (origin: cartservice memory). Their pattern signatures point to different originating causes. Master agent has paused cross-domain synthesis on the shop subgraph and is asking for operator judgment.',
    affected: ['pod.cart', 'pod.currency', 'pod.checkout', 'pvc.orders', 'node.a'],
    conflicting: [
      { which: 'A · memory-origin',  txt: 'cartservice memory pressure is the upstream cause; storage queue is a downstream symptom.', confidence: 'medium' },
      { which: 'B · storage-origin', txt: 'pvc-orders queue saturation is causing checkout latency, which back-pressures memory.',     confidence: 'low' },
      { which: 'C · combined',       txt: 'Two independent incidents coinciding in the same window.', confidence: 'low' },
    ],
    probes: [
      { txt: 'Inspect pvc-orders write throughput in the last 10 minutes.', a: 'Flat — argues for memory-origin (A)', b: 'Elevated — argues for storage-origin (B)' },
      { txt: 'Check checkout-9f1b2 working_set_bytes trajectory.', a: 'Flat — independent of cart (C unlikely)', b: 'Rising — argues for memory-origin (A)' },
      { txt: 'Was a chaos or load test scheduled on the shop ns?', a: 'No active context — proceed.', b: 'Yes — add chaos_test context to downgrade.' },
    ],
    evidence: [
      { lvl: 'claim', ref: 'esc.conflicting_signatures', txt: 'reasoning-uncertainty escalation · synthesis paused' },
      { lvl: 'rule',  ref: 'pb.probe_cascade',           txt: 'fired · conf 0.87' },
      { lvl: 'rule',  ref: 'pb.storage_saturation',      txt: 'fired · conf 0.79' },
      { lvl: 'rule',  ref: 'pb.oom_cascade',             txt: 'fired · conf 0.72' },
    ],
  },
];

// -----------------------------------------------------------
// CHAT TRANSCRIPT — pre-scripted with citation tags
// -----------------------------------------------------------
const CHAT_HISTORY = [
  { who: 'op',  t: '14:02:34', txt: 'what is happening with currencyservice?' },
  { who: 'sys', t: '14:02:36', txt: [
      'Three things, in order:',
      { kind: 'list', items: [
        ['1.', 'Probe failures on ', { c: 'currencyservice-7b4f9', ref: 'pod.currency' }, ' are exceeding the configured threshold — ', { c: '4 fails / 30s', ref: 'rule.probe_failure_rate_exceeds' }, ' against a 3-in-30s budget. Kubelet has begun queuing eviction events on ', { c: 'prod-edge-01-node-a', ref: 'node.a' }, '.'],
        ['2.', 'The upstream signal is memory pressure on ', { c: 'cartservice-2c8d3', ref: 'pod.cart' }, '. Working set hit ', { c: '484 MiB / 512 MiB', ref: 'obs.working_set.2c8d3' }, ' at 14:01:58 and OOM-killed at ', { c: '14:02:11', ref: 'ev.oom_kill_recorded' }, '.'],
        ['3.', 'Both pods are co-scheduled on node-a and match the ', { c: 'probe-cascade pathway', ref: 'pwy.probe_cascade_memory_origin' }, '. The system has surfaced an insight; see the active card to the right.'],
      ]},
      'Confidence on the causal claim is medium — the pathway has matched all three steps from a lab-validated signature. Recommended action: raise cart memory limits and inspect for a recent code change.',
    ]
  },
];

// -----------------------------------------------------------
// ONBOARDING PHASES
// -----------------------------------------------------------
const ONBOARDING_PHASES = [
  { id: 'sign',     num: '01', name: 'Sign-up',        sub: 'Account · API token · Helm command issued.',                progress: 1.0 },
  { id: 'inv',      num: '02', name: 'Inventory',       sub: 'Agent enumerates entities, metrics, log sources.',           progress: 1.0 },
  { id: 'bind',     num: '03', name: 'Binding',         sub: 'Tier cascade maps local observables to ontology variables.', progress: 1.0 },
  { id: 'topo',     num: '04', name: 'Topology',        sub: 'Constructor agents build the semantic graph.',               progress: 1.0 },
  { id: 'calib',    num: '05', name: 'Calibration',     sub: 'Playbook activation against capability-degradation report.', progress: 1.0 },
  { id: 'warm',     num: '06', name: 'Warmup',          sub: 'Constructors observe baseline. Exploratory cadence engages.',progress: 0.42 },
  { id: 'op',       num: '07', name: 'Operational',     sub: 'Feed live · topology populated · chat active.',              progress: 0.0 },
];

const BINDING_TIERS = [
  { id: 't1', label: 'T1 · known-exporter catalog', count: 89, total: 124, kind: 'matched' },
  { id: 't2', label: 'T2 · OTel semantic conventions', count: 12, total: 124, kind: 'matched' },
  { id: 't3', label: 'T3 · embedding similarity', count: 14, total: 124, kind: 'auto-bound' },
  { id: 't4', label: 'T4 · behavioral fingerprint', count: 4,  total: 124, kind: 'veto-confirmed' },
  { id: 't5', label: 'T5 · LLM disambiguation', count: 1,  total: 124, kind: 'review needed' },
  { id: 'op', label: 'Operator review', count: 4,  total: 124, kind: 'queued' },
];

const PLAYBOOKS_STATUS = [
  { id: 'pb.probe_cascade',          name: 'Probe-cascade',          status: 'active',   note: '3 required inputs bound · high confidence' },
  { id: 'pb.cpu_contention',         name: 'CPU contention',         status: 'active',   note: '4 required inputs bound · medium confidence' },
  { id: 'pb.oom_cascade',            name: 'OOM cascade',            status: 'active',   note: '3 required inputs bound · high confidence' },
  { id: 'pb.grpc_degradation',       name: 'gRPC degradation',       status: 'active',   note: '5 required inputs bound · service-mesh tier' },
  { id: 'pb.storage_saturation',     name: 'Storage queue saturation', status: 'active', note: '4 required inputs bound · medium confidence' },
  { id: 'pb.image_pull_stall',       name: 'Image pull stall',       status: 'active',   note: 'event-driven · always-on' },
  { id: 'pb.network_partition',      name: 'Network partition',      status: 'degraded', note: 'per-pod-ns TCP retrans missing · upgrade to eBPF tier' },
  { id: 'pb.pvc_hot_partition',      name: 'PVC hot partition',      status: 'degraded', note: 'csi_volume_op_seconds missing · install csi-driver-stats' },
  { id: 'pb.dns_resolution_failure', name: 'DNS resolution failure', status: 'disabled', note: 'required input unavailable in this cluster' },
];

// -----------------------------------------------------------
// ENTITY → NODE LOOKUP (computed from EDGES)
//   Used by Inspector to show the host node a pod runs on
//   without hard-coding the mapping.
// -----------------------------------------------------------
const ENTITY_NODE_LOOKUP = (() => {
  const m = {};
  EDGES.forEach(e => {
    if (e.kind === 'runs-on') m[e.from] = e.to;
  });
  return m;
})();

// -----------------------------------------------------------
// PHASE PROGRESS — onboarding phase index per chapter
//   Drives the PhaseStrip so it doesn't hard-code currentIdx.
// -----------------------------------------------------------
const ONBOARDING_PHASE_IDX_BY_CHAPTER = {
  connect:   5,   // warmup in progress, just before operational
  topology:  6,   // operational
  flags:     6,
  firing:    6,
  synthesis: 6,
  ask:       6,
  escalate:  6,
  resolved:  6,
};

// Expose to window for cross-script access
Object.assign(window, {
  CHAPTERS, ENTITIES, EDGES, STATE_BY_CHAPTER, EVENTS, INSIGHTS,
  CHAT_HISTORY, ONBOARDING_PHASES, BINDING_TIERS, PLAYBOOKS_STATUS,
  WATCHED_BY_CHAPTER, PREDICTIONS_BY_CHAPTER, PIPELINE_BY_CHAPTER,
  AGENT_ACTIVITY_BY_CHAPTER, ENTITY_NODE_LOOKUP, ONBOARDING_PHASE_IDX_BY_CHAPTER,
});

// ---------- Shared dynamic helpers ----------
// useTick(ms): React hook that returns an integer that increments every `ms`.
// Use in any component that should re-render on a timer.
function useTick(ms) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

// usePhasedReveal(total, initial, intervalMs, chapter):
// Returns a count that starts at `initial` and increments up to `total`
// over time. Resets when `chapter` changes.
function usePhasedReveal(total, initial, intervalMs, chapter) {
  const [n, setN] = React.useState(total);
  React.useEffect(() => {
    if (initial >= total) { setN(total); return; }
    setN(initial);
    const id = setInterval(() => {
      setN(c => {
        const next = c + 1;
        if (next >= total) { clearInterval(id); return total; }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [total, initial, intervalMs, chapter]);
  return n;
}

window.useTick = useTick;
window.usePhasedReveal = usePhasedReveal;
