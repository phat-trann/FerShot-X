// Runs only inside a binary compiled with native-acceptance. All IPC below is real.
(async () => {
  if (window.__FERBY_NATIVE_ACCEPTANCE_RUNNING__) return;
  window.__FERBY_NATIVE_ACCEPTANCE_RUNNING__ = true;
  const invoke = (command, args = {}) => window.__TAURI_INTERNALS__.invoke(command, args);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (predicate, label) => {
    const until = Date.now() + 20000;
    while (Date.now() < until) { const result = predicate(); if (result) return result; await pause(60); }
    throw new Error(`Timed out: ${label}`);
  };
  const button = name => [...document.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === name || node.textContent.trim() === name);
  const click = async name => { const node = await wait(() => { const n = button(name); return n && !n.disabled && n.getClientRects().length ? n : null; }, name); node.click(); await pause(120); };
  const set = (node, value) => {
    Object.getOwnPropertyDescriptor(node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  };
  const report = { ok: false, checks: [], exports: [], native: true, capture: 'NOT EXECUTED', clipboard: 'NOT EXECUTED' };
  const check = (condition, message) => { if (!condition) throw new Error(message); report.checks.push(message); };
  try {
    await wait(() => button('Settings'), 'React mount'); await pause(1000);
    const phase = window.__FERBY_ACCEPTANCE_PHASE__;
    await click('Settings');
    [...document.querySelectorAll('summary')].find(n => n.textContent === 'Preferences').click();
    const quality = await wait(() => { const q = document.querySelector('[aria-label="Preferred JPEG quality"]'); return q && !q.disabled ? q : null; }, 'native preference load');
    if (phase === 1) {
      check(quality.value === '90', 'isolated native defaults reach actual WKWebView');
      set(quality, '73');
      await click('Save preferences');
      await wait(() => document.body.textContent.includes('Preferences saved.'), 'actual preference save');
      check((await invoke('load_preferences')).jpegQuality === 73, 'real preference handler persisted quality 73');
      await click('Close settings');
      const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 80;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 100, 80);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const transfer = new DataTransfer(); transfer.items.add(new File([blob], 'synthetic-native.png', { type: 'image/png' }));
      const picker = document.querySelector('input[type=file]'); picker.files = transfer.files; picker.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(() => document.querySelector('.canvas-image')?.naturalWidth === 100, 'actual file import');
      check(true, 'synthetic File decoded and shown in native WKWebView');
      // Native GUI crop through the actual React form -> invoke -> Rust codec -> actual image.
      [...document.querySelectorAll('summary')].find(n => n.textContent === 'Crop').click();
      set(document.querySelector('[aria-label="Crop width"]'), '60'); set(document.querySelector('[aria-label="Crop height"]'), '50');
      await pause(100); await click('Apply crop');
      await wait(() => document.querySelector('.canvas-image')?.naturalWidth === 60, 'native crop displayed');
      check(document.querySelector('.canvas-image').naturalHeight === 50, 'real native crop command returns 60x50 pixels into actual GUI');
      await click('Return to source image');
      await click('Annotate image'); await click('Advanced annotation tools'); await click('Tool: highlight'); await click('Add highlight effect');
      await wait(() => document.querySelector('[aria-label="Advanced item count"]')?.textContent.includes('1 items'), 'highlight annotation');
      for (let i = 0; i < 2; i++) {
        await click('Save image…');
        await wait(() => document.querySelector('.statusbar')?.textContent.includes('Image saved.'), 'actual native save');
      }
      check(true, 'actual annotate/render/save UI executed twice through production IPC');


      // The configured folder is private and known by Rust; validate its actual filesystem output there.
      report.destination = await invoke('read_export_destination');
      // Raw direct OCR also exercises actual framework discovery and malformed-input errors.
      const languages = await invoke('recognition_languages'); check(languages.length > 0, 'actual native Vision language discovery');
      let failure = false;
      try { await invoke('recognize_image', { request: { pngBase64: 'broken', mode: 'ocr', languages: [languages[0]], preserveLineBreaks: true, maxResults: 100 } }); }
      catch (error) { failure = !!error.code; }
      check(failure, 'actual malformed native recognition rejects with a structured error');
      const source = document.createElement('canvas'); source.width = 800; source.height = 180;
      const c = source.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 800, 180); c.fillStyle = '#000'; c.font = 'bold 64px Helvetica'; c.fillText('FERBY NATIVE TEST', 20, 110);
      const pngBase64 = source.toDataURL('image/png').split(',')[1];
      const recognized = await invoke('recognize_image', { request: { pngBase64, mode: 'ocr', languages: [languages.find(v => /^en/i.test(v)) || languages[0]], preserveLineBreaks: true, maxResults: 100 } });
      report.recognition = recognized;
      check(JSON.stringify(recognized).toUpperCase().includes('FERBY'), 'actual Vision recognizes synthetic FERBY text through real WKWebView IPC');
      const ocrBlob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
      const ocrTransfer = new DataTransfer(); ocrTransfer.items.add(new File([ocrBlob], 'native-ocr.png', { type: 'image/png' }));
      picker.files = ocrTransfer.files; picker.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(() => document.querySelector('.canvas-image')?.naturalWidth === 800, 'OCR fixture import');
      await click('Annotate image'); await click('Recognize text / QR'); await click('Recognize Text');
      await wait(() => document.querySelector('[aria-label="Recognized text output"]')?.textContent?.toUpperCase().includes('FERBY'), 'actual GUI recognition output');
      check(true, 'actual OCR panel renders real Vision result for selected synthetic document');

    } else if (phase === 2) {
      check(quality.value === '73', 'actual process restart reloads saved preference into GUI');
      check((await invoke('load_preferences')).jpegQuality === 73, 'real native handler agrees after restart');
    } else {
      check(quality.value === '90', 'corrupt isolated preference file recovers to default GUI state');
      await wait(() => document.body.textContent.includes('Saved preferences could not be loaded. Defaults are active.'), 'corrupt preference notice');
      let failed = false; try { await invoke('load_preferences'); } catch (error) { failed = error.code === 'settings_failed'; }
      check(failed, 'real native handler rejects corruption while UI remains usable');
    }
    report.ok = true;
  } catch (error) { report.error = `${error?.message || String(error)}\n${error?.stack || ''}`; }
  await invoke('plugin:event|emit', { event: 'ferby-acceptance-report', payload: report });
})().catch(error => console.error('Native acceptance driver failed', error));
