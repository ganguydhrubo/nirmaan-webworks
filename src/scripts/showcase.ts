/** One controller per stage. A decoded incoming scene replaces the whole composition. */
const DWELL = 4350;
const TRANSITION = 650;

function mountShowcase(root: HTMLElement): () => void {
  const scenes = [...root.querySelectorAll<HTMLElement>('[data-scene]')];
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const controls = root.querySelector<HTMLElement>('[data-controls]')!;
  const play = root.querySelector<HTMLButtonElement>('[data-play]')!;
  const picker = root.querySelector<HTMLSelectElement>('[data-picker]')!;
  const announcement = root.querySelector<HTMLElement>('[data-announcement]')!;
  const stack = root.querySelector<HTMLElement>('.showcase-stack')!;
  const progress = root.querySelector<HTMLElement>('[data-progress]')!;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const { signal } = abort;
  const savedActive = (() => {
    try {
      if (history.state && typeof history.state.showcaseActive === 'number') return history.state.showcaseActive;
      const s = sessionStorage.getItem('atittle_showcase_active');
      if (s !== null) { const n = Number(s); if (!Number.isNaN(n)) return n; }
    } catch {}
    return undefined;
  })();
  let active = (savedActive !== undefined && savedActive >= 0 && savedActive < scenes.length)
    ? savedActive
    : Number(root.dataset.active ?? 0);
  let busy = false;
  let visible = false;
  let disposed = false;
  let userPaused = media.matches || root.dataset.userPaused === 'true';
  let keyboardPaused = false;
  let focused = false;
  let hovering = false;
  let touching = false;
  let autoplay: ReturnType<typeof setTimeout> | undefined;
  let transitionTimer: ReturnType<typeof setTimeout> | undefined;
  let progressAnimation: Animation | undefined;
  let pending: number | undefined;
  let pointer: { id: number; x: number; y: number } | undefined;
  let suppressClickUntil = 0;
  let version = 0;
  const wrap = (index: number) => (index + scenes.length) % scenes.length;
  const canRun = () => !disposed && !busy && visible && !document.hidden && !userPaused && !keyboardPaused && !focused && !hovering && !touching;

  function stopTimer() {
    clearTimeout(autoplay);
    autoplay = undefined;
    progressAnimation?.cancel();
    root.dataset.running = 'false';
  }

  function updatePlayback() {
    stopTimer();
    const paused = userPaused || keyboardPaused;
    root.dataset.userPaused = String(paused);
    play.setAttribute('aria-label', paused ? 'Play automatic demos' : 'Pause automatic demos');
    root.querySelector<HTMLElement>('[data-play-icon]')!.textContent = paused ? '▷' : 'Ⅱ';
    root.dataset.state = busy ? 'transitioning' : canRun() ? 'settled' : 'paused';
    if (canRun()) {
      root.dataset.running = 'true';
      if (!media.matches) progressAnimation = progress.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:DWELL,easing:'linear',fill:'both'});
      autoplay = setTimeout(() => { void show(active + 1, false); }, DWELL);
    }
  }

  async function prepare(index: number): Promise<boolean> {
    const scene = scenes[wrap(index)]!;
    const image = scene.querySelector<HTMLImageElement>('img')!;
    const source = scene.querySelector<HTMLSourceElement>('source')!;
    if (!source.srcset) source.srcset = source.dataset.srcset!;
    if (!image.getAttribute('src')) image.src = image.dataset.src!;
    image.loading = 'eager';
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        image.decode(),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Preview timed out')), 8000); }),
      ]);
      return image.naturalWidth > 0;
    } catch { return false; }
    finally { clearTimeout(timeout); }
  }

  function updateNavigation(manual: boolean) {
    const next = scenes[wrap(active + 1)]!;
    root.querySelector<HTMLElement>('[data-position]')!.textContent = String(active + 1).padStart(2, '0');
    picker.value = String(active);
    root.querySelector<HTMLElement>('[data-next-name]')!.textContent = next.dataset.name!;
    root.querySelector<HTMLElement>('[data-next-category]')!.textContent = next.dataset.category!;
    root.querySelector<HTMLElement>('[data-after-next]')!.textContent = scenes[wrap(active + 2)]!.dataset.category!;
    root.querySelector('[data-next-card]')!.setAttribute('aria-label', `Next demo: ${next.dataset.name}`);
    if (manual) announcement.textContent = `${active + 1} of ${scenes.length}: ${scenes[active]!.dataset.name}`;
  }

  async function show(index: number, manual: boolean) {
    const target = wrap(index);
    if (busy) { if (manual) pending = target; return; }
    if (target === active || disposed) return;
    stopTimer();
    busy = true;
    root.dataset.state = 'loading';
    const request = ++version;
    const ready = await prepare(target);
    if (disposed || request !== version) return;
    if (!ready || (!manual && (touching || focused || hovering || document.hidden || !visible || userPaused || keyboardPaused))) {
      busy = false;
      if (!ready && manual) announcement.textContent = 'This preview could not load. Please choose another demo or try again.';
      const queued = pending;
      pending = undefined;
      updatePlayback();
      if (queued !== undefined) void show(queued, true);
      return;
    }
    const outgoing = scenes[active]!;
    const incoming = scenes[target]!;
    if (outgoing.contains(document.activeElement)) root.querySelector<HTMLButtonElement>('[data-next]')!.focus({ preventScroll: true });
    outgoing.inert = true;
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.classList.add('is-outgoing');
    outgoing.classList.remove('is-active');
    incoming.inert = false;
    incoming.removeAttribute('aria-hidden');
    incoming.classList.add('is-active');
    active = target;
    root.dataset.active = String(active);
    try {
      history.replaceState({ ...history.state, showcaseActive: active }, '');
      sessionStorage.setItem('atittle_showcase_active', String(active));
    } catch {}
    root.dataset.state = 'transitioning';
    updateNavigation(manual);
    stack.classList.add('is-advancing');
    transitionTimer = setTimeout(() => {
      outgoing.classList.remove('is-outgoing');
      stack.classList.remove('is-advancing');
      busy = false;
      const queued = pending;
      pending = undefined;
      updatePlayback();
      if (queued !== undefined && queued !== active) void show(queued, true);
      else if (visible && !document.hidden) void prepare(active + 1);
    }, media.matches ? 0 : TRANSITION);
  }

  const advance = (delta: number) => void show((pending ?? active) + delta, true);
  root.querySelector('[data-prev]')!.addEventListener('click', () => advance(-1), { signal });
  root.querySelector('[data-next]')!.addEventListener('click', () => advance(1), { signal });
  root.querySelector('[data-next-card]')!.addEventListener('click', () => advance(1), { signal });
  picker.addEventListener('change', () => void show(Number(picker.value), true), { signal });
  play.addEventListener('click', () => {
    const resuming = userPaused || keyboardPaused;
    userPaused = !resuming;
    keyboardPaused = false;
    if (resuming) { focused = false; hovering = false; }
    updatePlayback();
  }, { signal });
  root.addEventListener('keydown', event => {
    if (event.target instanceof HTMLSelectElement || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      keyboardPaused = true;
      advance(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }, { signal });
  root.addEventListener('focusin', event => {
    focused = event.target instanceof HTMLElement && event.target.matches(':focus-visible');
    if (focused) keyboardPaused = true;
    updatePlayback();
  }, { signal });
  root.addEventListener('focusout', () => {
    queueMicrotask(() => { focused = root.contains(document.activeElement) && document.activeElement instanceof HTMLElement && document.activeElement.matches(':focus-visible'); updatePlayback(); });
  }, { signal });
  root.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovering = true; updatePlayback(); }
  }, { signal });
  root.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') { hovering = false; updatePlayback(); }
  }, { signal });
  root.addEventListener('pointerdown', event => {
    touching = true;
    stopTimer();
    if (event.isPrimary && stage.contains(event.target as Node) && !(event.target as Element).closest('a,button,select')) {
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  }, { signal });
  window.addEventListener('pointerup', event => {
    if (!touching) return;
    touching = false;
    if (pointer?.id === event.pointerId) {
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      if (Math.abs(dx) > Math.max(48, stage.clientWidth * .12) && Math.abs(dx) > Math.abs(dy) * 1.6) {
        suppressClickUntil = performance.now() + 350;
        // Brief convention: swipe toward the right to advance, left to go back.
        advance(dx > 0 ? 1 : -1);
      }
    }
    pointer = undefined;
    updatePlayback();
  }, { signal });
  window.addEventListener('pointercancel', () => { pointer = undefined; touching = false; updatePlayback(); }, { signal });
  stage.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, { signal, capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { touching = false; pointer = undefined; }
    updatePlayback();
  }, { signal });
  media.addEventListener('change', () => { userPaused = media.matches; updatePlayback(); }, { signal });
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    updatePlayback();
    if (visible && !document.hidden) void prepare(active + 1);
  }, { threshold: 0.15 });
  observer.observe(stage.querySelector('.showcase-visual')!);
  controls.inert = false;
  root.dataset.active = String(active);
  root.dataset.enhanced = 'true';
  scenes.forEach((scene, index) => {
    scene.classList.remove('is-outgoing');
    scene.classList.toggle('is-active', index === active);
    scene.inert = index !== active;
    if (index === active) scene.removeAttribute('aria-hidden');
    else scene.setAttribute('aria-hidden', 'true');
  });
  void prepare(active);
  try {
    history.replaceState({ ...history.state, showcaseActive: active }, '');
    sessionStorage.setItem('atittle_showcase_active', String(active));
  } catch {}
  updateNavigation(false);
  updatePlayback();
  return () => {
    disposed = true;
    version++;
    stopTimer();
    clearTimeout(transitionTimer);
    observer.disconnect();
    abort.abort();
    scenes.forEach((scene, index) => {
      scene.classList.remove('is-outgoing');
      scene.classList.toggle('is-active', index === active);
      scene.inert = index !== active;
      if (index === active) scene.removeAttribute('aria-hidden');
      else scene.setAttribute('aria-hidden', 'true');
    });
    stack.classList.remove('is-advancing');
  };
}

let cleanups: (() => void)[] = [];
function mount() {
  cleanups.forEach(cleanup => cleanup());
  cleanups = [...document.querySelectorAll<HTMLElement>('[data-showcase]')].map(mountShowcase);
}
mount();
window.addEventListener('pagehide', () => { cleanups.forEach(cleanup => cleanup()); cleanups = []; });
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
