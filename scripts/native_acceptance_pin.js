(async () => {
  if (window.__FERBY_PIN_ACCEPTANCE__) return;
  window.__FERBY_PIN_ACCEPTANCE__ = true;
  const invoke = (command, args = {}) => window.__TAURI_INTERNALS__.invoke(command, args);
  const wait = async predicate => { const end = Date.now() + 15000; while (Date.now() < end) { if (predicate()) return; await new Promise(r => setTimeout(r, 50)); } throw new Error('Pin view timed out'); };
  const result = { ok: false };
  try {
    const doc = await invoke('get_pin');
    await wait(() => document.querySelector('.ferby-pin-preview__image')?.naturalWidth === 100);
    const scale = document.querySelector('[aria-label="Pin scale percentage"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(scale, '200'); scale.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(() => document.querySelector('.ferby-pin-preview__image')?.getBoundingClientRect().width === 200);
    const opacity = document.querySelector('[aria-label="Pin opacity percentage"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(opacity, '50'); opacity.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(() => document.querySelector('.ferby-pin-preview__image')?.style.opacity === '0.5');
    let rejected = false;
    try { await invoke('load_preferences'); } catch (error) { rejected = error.code === 'forbidden_window'; }
    if (!rejected || doc.sourceId !== 'acceptance-pin-source') throw new Error('Pin ownership boundary failed');
    result.ok = true; result.checks = ['actual native child renders its owned raster', 'actual native pin scale 200% and image opacity 50%', 'main-only command is rejected from actual pin window'];
  } catch (error) { result.error = String(error); }
  await invoke('plugin:event|emit', { event: 'ferby-acceptance-pin-report', payload: result });
  await invoke('close_pin');
})().catch(error => console.error('Pin acceptance failed', error));
