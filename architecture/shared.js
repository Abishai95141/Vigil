// Vigil architecture diagrams — keyboard / click navigation.
// Each page exposes window.TOTAL_STEPS (int). Step 0 = idle. Steps 1..TOTAL_STEPS reveal cumulatively.
// CSS uses [data-step="N"] selectors on <body> to drive the build-up.

(function () {
  const body = document.body;
  const total = window.TOTAL_STEPS || 1;
  let step = 0;

  const stepLabel = document.querySelector('[data-step-label]');
  const totalLabel = document.querySelector('[data-step-total]');
  if (totalLabel) totalLabel.textContent = String(total).padStart(2, '0');

  const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));

  function render() {
    body.setAttribute('data-step', String(step));
    if (stepLabel) stepLabel.textContent = String(step).padStart(2, '0');
    revealEls.forEach((el) => {
      const at = parseInt(el.getAttribute('data-reveal'), 10);
      el.classList.toggle('is-on', !isNaN(at) && step >= at);
    });
  }

  function advance() {
    if (step < total) { step += 1; render(); }
  }
  function back() {
    if (step > 0) { step -= 1; render(); }
  }
  function reset() {
    step = 0; render();
  }
  function jumpEnd() {
    step = total; render();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === 'n') {
      e.preventDefault();
      advance();
    } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'Backspace') {
      e.preventDefault();
      back();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      reset();
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      jumpEnd();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  });

  document.addEventListener('click', (e) => {
    // Click anywhere in the stage to advance.
    const stage = document.querySelector('.frame__stage');
    if (stage && stage.contains(e.target)) advance();
  });

  render();
})();
