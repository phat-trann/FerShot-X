use fershot_settings_core::{
    load_settings, parse_settings_str, save_settings, serialize_settings_string, AppSettings,
    SaveFormat, SettingsError, MAX_SETTINGS_BYTES,
};

fn settings(quality: u8) -> AppSettings {
    AppSettings {
        save_format: SaveFormat::Jpeg,
        jpeg_quality: quality,
        downscale_retina: true,
        show_preview: false,
    }
}

#[test]
fn settings_size_limit_counts_utf8_bytes_not_characters() {
    let at_limit = "é".repeat((MAX_SETTINGS_BYTES as usize) / 2);
    assert_eq!(
        at_limit.len(),
        MAX_SETTINGS_BYTES as usize,
        "two-byte UTF-8 characters should reach the byte boundary"
    );
    assert!(matches!(
        parse_settings_str(&at_limit),
        Err(SettingsError::MalformedJson(_))
    ));

    let over_limit = "é".repeat((MAX_SETTINGS_BYTES as usize) / 2 + 1);
    assert!(matches!(
        parse_settings_str(&over_limit),
        Err(SettingsError::FileTooLarge { size, max })
            if size == MAX_SETTINGS_BYTES + 2 && max == MAX_SETTINGS_BYTES
    ));
}

#[test]
fn malformed_types_and_schema_versions_are_rejected() {
    let wrong_type = r#"{"version":1,"settings":{"saveFormat":"jpeg","jpegQuality":"90","downscaleRetina":true,"showPreview":true}}"#;
    assert!(matches!(
        parse_settings_str(wrong_type),
        Err(SettingsError::MalformedJson(_))
    ));

    let unsupported = r#"{"version":2,"settings":{"saveFormat":"jpeg","jpegQuality":90,"downscaleRetina":true,"showPreview":true}}"#;
    assert!(matches!(
        parse_settings_str(unsupported),
        Err(SettingsError::UnsupportedVersion(2))
    ));
}

#[test]
fn quality_boundaries_round_trip_through_serialization() {
    for quality in [1, 100] {
        let original = settings(quality);
        let encoded = serialize_settings_string(&original).unwrap();
        assert_eq!(parse_settings_str(&encoded).unwrap(), original);
    }
}

#[test]
fn invalid_save_preserves_existing_valid_settings() {
    let dir = tempfile::tempdir().unwrap();
    let original = settings(88);
    save_settings(dir.path(), &original).unwrap();

    let invalid = settings(0);
    assert!(matches!(
        save_settings(dir.path(), &invalid),
        Err(SettingsError::InvalidJpegQuality(0))
    ));
    assert_eq!(load_settings(dir.path()).unwrap(), original);
}
