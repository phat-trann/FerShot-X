use fershot_session_core::{
    load_session_archive, parse_session_manifest_str, save_session_archive, SessionArchiveInput,
    SessionError, SESSION_MANIFEST_FILE_NAME,
};
use serde_json::json;
use std::fs;

fn png(tag: u8) -> Vec<u8> {
    vec![0x89, b'P', b'N', b'G', b'\r', b'\n', 0x1a, b'\n', tag]
}

fn input(id: &str, tag: u8) -> SessionArchiveInput {
    SessionArchiveInput {
        id: id.to_string(),
        name: id.to_string(),
        width: 1,
        height: 1,
        mime_type: "image/png".to_string(),
        image_bytes: png(tag),
    }
}

#[test]
fn load_rejects_manifest_payload_size_mismatch() {
    let dir = tempfile::tempdir().unwrap();
    save_session_archive(dir.path(), &[input("shot-1", 1)], Some("shot-1")).unwrap();
    let manifest_path = dir.path().join(SESSION_MANIFEST_FILE_NAME);
    let mut manifest: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&manifest_path).unwrap()).unwrap();
    manifest["items"][0]["byteSize"] = json!(999);
    fs::write(&manifest_path, serde_json::to_vec(&manifest).unwrap()).unwrap();

    assert!(matches!(
        load_session_archive(dir.path()),
        Err(SessionError::InvalidImagePayload(id)) if id == "shot-1"
    ));
}

#[test]
fn manifest_parser_rejects_duplicate_ids_and_unknown_selection() {
    let duplicate = json!({
        "version": 1,
        "selectedId": "shot-1",
        "items": [
            {"id": "shot-1", "name": "One", "fileName": "shot-1.png", "width": 1, "height": 1, "mimeType": "image/png", "byteSize": 9},
            {"id": "shot-1", "name": "Two", "fileName": "shot-2.png", "width": 1, "height": 1, "mimeType": "image/png", "byteSize": 9}
        ]
    });
    assert!(matches!(
        parse_session_manifest_str(&duplicate.to_string()),
        Err(SessionError::DuplicateItemId(id)) if id == "shot-1"
    ));

    let unknown_selection = json!({
        "version": 1,
        "selectedId": "missing",
        "items": [
            {"id": "shot-1", "name": "One", "fileName": "shot-1.png", "width": 1, "height": 1, "mimeType": "image/png", "byteSize": 9}
        ]
    });
    assert!(matches!(
        parse_session_manifest_str(&unknown_selection.to_string()),
        Err(SessionError::UnknownSelectedId(id)) if id == "missing"
    ));
}

#[test]
fn failed_save_preserves_existing_manifest_and_payload() {
    let dir = tempfile::tempdir().unwrap();
    save_session_archive(dir.path(), &[input("shot-1", 1)], Some("shot-1")).unwrap();
    let manifest_path = dir.path().join(SESSION_MANIFEST_FILE_NAME);
    let image_path = dir.path().join("shot-1.png");
    let original_manifest = fs::read(&manifest_path).unwrap();
    let original_image = fs::read(&image_path).unwrap();

    let mut invalid = input("shot-2", 2);
    invalid.mime_type = "image/jpeg".to_string();
    assert!(matches!(
        save_session_archive(dir.path(), &[invalid], None),
        Err(SessionError::InvalidImagePayload(id)) if id == "shot-2"
    ));
    assert_eq!(fs::read(&manifest_path).unwrap(), original_manifest);
    assert_eq!(fs::read(&image_path).unwrap(), original_image);
}

#[test]
fn selected_id_round_trips_with_loaded_payload() {
    let dir = tempfile::tempdir().unwrap();
    let saved = save_session_archive(dir.path(), &[input("shot-1", 7)], Some("shot-1")).unwrap();
    let (loaded, items) = load_session_archive(dir.path()).unwrap();

    assert_eq!(loaded, saved);
    assert_eq!(loaded.selected_id.as_deref(), Some("shot-1"));
    assert_eq!(items[0].image_bytes, png(7));
}
