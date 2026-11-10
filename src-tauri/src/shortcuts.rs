use crate::imaging::{NativeError, NativeJobs};
use serde::{Serialize, Deserialize};
use std::{collections::{BTreeMap, BTreeSet}, str::FromStr, sync::Mutex};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent, ShortcutState};

const ACTIONS: [&str; 8] = [
    "capture-fullscreen",
    "capture-area",
    "capture-window",
    "capture-active-window",
    "capture-repeat-region",
    "capture-scrolling",
    "ocr-capture",
    "show-workspace",
];
type Bindings = BTreeMap<String, Option<String>>;
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct SavedBindings { version: u8, bindings: Bindings }

pub fn load_saved_at(path: &std::path::Path) -> Result<ShortcutStatus, NativeError> {
    let raw = crate::application_preferences::read_document(path, crate::application_preferences::Document::Shortcuts)?;
    let bindings = if let Some(raw) = raw {
        #[derive(Deserialize)]
        struct AnyVersion { version: u8, bindings: BTreeMap<String, Option<String>> }
        let saved: AnyVersion = serde_json::from_slice(&raw).map_err(|e| NativeError::new("invalid_shortcut", e.to_string()))?;
        if saved.version != 1 && saved.version != 2 {
            return Err(NativeError::new("invalid_shortcut", "Unsupported shortcut preferences version."));
        }
        let mut full = empty();
        for (k, v) in saved.bindings {
            if ACTIONS.contains(&k.as_str()) {
                full.insert(k.clone(), if k == "ocr-capture" { None } else { v });
            }
        }
        parse(&full)?;
        full
    } else {
        empty()
    };
    Ok(ShortcutStatus { bindings, faulted: false })
}

pub fn save_at(path: &std::path::Path, bindings: Bindings) -> Result<ShortcutStatus, NativeError> {
    parse(&bindings)?;
    let raw = serde_json::to_vec(&SavedBindings { version: 2, bindings: bindings.clone() })
        .map_err(|e| NativeError::new("invalid_shortcut", e.to_string()))?;
    crate::application_preferences::write_document(path, crate::application_preferences::Document::Shortcuts, &raw)?;
    Ok(ShortcutStatus { bindings, faulted: false })
}
fn empty() -> Bindings { ACTIONS.into_iter().map(|action| (action.into(), None)).collect() }
fn parse(input: &Bindings) -> Result<Vec<(String, Shortcut)>, NativeError> {
    if input.len() != ACTIONS.len() || input.keys().any(|action| !ACTIONS.contains(&action.as_str())) {
        return Err(NativeError::new("invalid_shortcut", "Expected the eight supported capture actions."));
    }
    let mut ids = BTreeSet::new(); let mut parsed = Vec::new();
    for (action, raw) in input {
        let Some(raw) = raw else { continue; };
        if action == "ocr-capture" { return Err(NativeError::new("unsupported_action", "Text recognition has been removed.")); }
        if raw.is_empty() || raw.len() > 128 { return Err(NativeError::new("invalid_shortcut", "Shortcut exceeds bounds.")); }
        let shortcut = Shortcut::from_str(raw).map_err(|error| NativeError::new("invalid_shortcut", error.to_string()))?;
        if !shortcut.mods.intersects(Modifiers::SUPER | Modifiers::CONTROL | Modifiers::ALT)
            || [Code::KeyQ, Code::KeyW, Code::KeyS, Code::Tab, Code::Space].iter().any(|key| shortcut.matches(Modifiers::SUPER, key))
            || !ids.insert(shortcut.id()) {
            return Err(NativeError::new("invalid_shortcut", "Unmodified, reserved or duplicate shortcut."));
        }
        parsed.push((action.clone(), shortcut));
    }
    Ok(parsed)
}

trait Registry {
    fn register(&mut self, key: Shortcut) -> Result<(), String>;
    fn unregister(&mut self, key: Shortcut) -> Result<(), String>;
}
struct NativeRegistry<'a>(&'a tauri::AppHandle);
impl Registry for NativeRegistry<'_> {
    fn register(&mut self, key: Shortcut) -> Result<(), String> { self.0.global_shortcut().register(key).map_err(|error| error.to_string()) }
    fn unregister(&mut self, key: Shortcut) -> Result<(), String> { self.0.global_shortcut().unregister(key).map_err(|error| error.to_string()) }
}

/// Additions precede removals. Failures attempt every rollback, retaining old bindings when possible.
fn transition(old: &[Shortcut], next: &[Shortcut], registry: &mut impl Registry) -> Result<(), (String, bool)> {
    let mut added = Vec::new(); let mut removed = Vec::new();
    let operation = (|| {
        for key in next.iter().filter(|key| !old.contains(key)) { registry.register(*key)?; added.push(*key); }
        for key in old.iter().filter(|key| !next.contains(key)) { registry.unregister(*key)?; removed.push(*key); }
        Ok::<_, String>(())
    })();
    if let Err(error) = operation {
        let mut failed = false;
        for key in removed { failed |= registry.register(key).is_err(); }
        for key in added { failed |= registry.unregister(key).is_err(); }
        return Err((error, failed));
    }
    Ok(())
}

struct Config { bindings: Bindings, parsed: Vec<(String, Shortcut)>, known: Vec<Shortcut>, faulted: bool }
#[derive(Default)]
pub struct ShortcutStore { config: Mutex<Option<Config>>, gate: Mutex<()>, pressed: Mutex<BTreeSet<u32>> }
#[derive(Serialize)]
pub struct ShortcutStatus { bindings: Bindings, faulted: bool }
fn status(store: &ShortcutStore) -> Result<ShortcutStatus, NativeError> {
    let config = store.config.lock().map_err(|_| NativeError::new("shortcut_failed", "Shortcut state unavailable."))?;
    Ok(ShortcutStatus { bindings: config.as_ref().map(|state| state.bindings.clone()).unwrap_or_else(empty), faulted: config.as_ref().is_some_and(|state| state.faulted) })
}

fn apply(app: &tauri::AppHandle, store: &ShortcutStore, bindings: Bindings) -> Result<ShortcutStatus, NativeError> {
    let parsed = parse(&bindings)?;
    let _gate = store.gate.lock().map_err(|_| NativeError::new("shortcut_failed", "Shortcut update unavailable."))?;
    let (old, faulted) = {
        let config = store.config.lock().map_err(|_| NativeError::new("shortcut_failed", "Shortcut state unavailable."))?;
        (config.as_ref().map(|state| state.known.clone()).unwrap_or_default(), config.as_ref().is_some_and(|state| state.faulted))
    };
    let next: Vec<_> = parsed.iter().map(|(_, key)| *key).collect();
    if faulted && !next.is_empty() { return Err(NativeError::new("shortcut_cleanup", "Clear shortcuts before applying after a rollback failure.")); }
    let mut registry = NativeRegistry(app);
    let result = if faulted {
        let mut errors = Vec::new();
        for key in &old { if let Err(error) = registry.unregister(*key) { errors.push(error); } }
        if errors.is_empty() { Ok(()) } else { Err((errors.join("; "), true)) }
    } else { transition(&old, &next, &mut registry) };
    if let Err((message, rollback_failed)) = result {
        if rollback_failed {
            let mut known = old; for key in next { if !known.contains(&key) { known.push(key); } }
            *store.config.lock().map_err(|_| NativeError::new("shortcut_failed", "Shortcut state unavailable."))? = Some(Config { bindings, parsed: Vec::new(), known, faulted: true });
        }
        return Err(NativeError::new(if rollback_failed { "shortcut_cleanup" } else { "shortcut_conflict" }, message));
    }
    *store.config.lock().map_err(|_| NativeError::new("shortcut_failed", "Shortcut state unavailable."))? = Some(Config { bindings, parsed, known: next, faulted: false });
    if let Ok(mut pressed) = store.pressed.lock() { pressed.clear(); }
    status(store)
}

pub fn on_shortcut(app: &tauri::AppHandle, shortcut: &Shortcut, event: ShortcutEvent) {
    let store = app.state::<ShortcutStore>();
    {
        let Ok(mut pressed) = store.pressed.lock() else { return; };
        if event.state() == ShortcutState::Released { pressed.remove(&shortcut.id()); return; }
        if !pressed.insert(shortcut.id()) { return; }
    }
    let action = store.config.lock().ok().and_then(|config| config.as_ref().filter(|state| !state.faulted)
        .and_then(|state| state.parsed.iter().find(|(_, key)| key == shortcut).map(|(action, _)| action.clone())));
    if app.get_webview_window("preferences").is_some_and(|w|w.is_focused().unwrap_or(false)) { return; }
    if let Some(action) = action { if action=="show-workspace" { let _=crate::library_window::show(app,"library");return; } if action=="capture-scrolling" {let _=crate::library_window::show(app,"main");} let _ = app.emit_to("main", "fershot-global-action", action); }
}

pub fn clear_on_close(app: &tauri::AppHandle) -> Result<(), NativeError> { apply(app, &app.state::<ShortcutStore>(), empty()).map(|_| ()) }

#[tauri::command]
pub fn get_shortcuts(window: tauri::WebviewWindow, store: tauri::State<'_, ShortcutStore>) -> Result<ShortcutStatus, NativeError> {
    crate::preferences_window::validate_label(window.label())?; status(&store)
}
#[tauri::command]
pub async fn apply_shortcuts(bindings: Bindings, window: tauri::WebviewWindow, app: tauri::AppHandle,
    store: tauri::State<'_, ShortcutStore>, jobs: tauri::State<'_, NativeJobs>) -> Result<ShortcutStatus, NativeError> {
    crate::preferences_window::validate_label(window.label())?; let _guard = jobs.acquire()?; apply(&app, &store, bindings)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[derive(Default)] struct Fake { keys: BTreeSet<u32>, reject_register: Option<u32>, reject_unregister: BTreeSet<u32> }
    impl Registry for Fake {
        fn register(&mut self, key: Shortcut) -> Result<(), String> {
            if self.reject_register == Some(key.id()) { return Err("synthetic conflict".into()); }
            self.keys.insert(key.id()); Ok(())
        }
        fn unregister(&mut self, key: Shortcut) -> Result<(), String> {
            if self.reject_unregister.contains(&key.id()) { return Err("synthetic removal failure".into()); }
            self.keys.remove(&key.id()); Ok(())
        }
    }
    #[test] fn validates_full_map_modifiers_reserved_aliases_and_duplicates_without_os_registration() {
        let mut map = empty(); map.insert("capture-area".into(), Some("Super+Shift+KeyA".into())); assert_eq!(parse(&map).unwrap().len(), 1);
        for bad in ["KeyA", "Super+Space", "Super+KeyQ", "Super+KeyS"] { map.insert("capture-area".into(), Some(bad.into())); assert!(parse(&map).is_err()); }
        map.insert("capture-area".into(), Some("Super+Shift+KeyA".into())); map.insert("capture-window".into(), Some("Super+Shift+KeyA".into())); assert!(parse(&map).is_err());
    }
    #[test] fn failed_addition_preserves_old_registration_and_cleans_earlier_additions() {
        let a = Shortcut::from_str("Super+Shift+KeyA").unwrap(); let b = Shortcut::from_str("Super+Shift+KeyB").unwrap(); let c = Shortcut::from_str("Super+Shift+KeyC").unwrap();
        let mut registry = Fake { keys: BTreeSet::from([a.id()]), reject_register: Some(c.id()), ..Fake::default() };
        assert_eq!(transition(&[a], &[b, c], &mut registry).unwrap_err().1, false); assert_eq!(registry.keys, BTreeSet::from([a.id()]));
    }
    #[test] fn rollback_failure_is_reported_for_explicit_cleanup() {
        let a = Shortcut::from_str("Super+Shift+KeyA").unwrap(); let b = Shortcut::from_str("Super+Shift+KeyB").unwrap();
        let mut registry = Fake { keys: BTreeSet::from([a.id()]), reject_unregister: BTreeSet::from([a.id(), b.id()]), ..Fake::default() };
        assert!(transition(&[a], &[b], &mut registry).unwrap_err().1);
    }
}
