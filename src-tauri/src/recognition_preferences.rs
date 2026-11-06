use crate::{application_preferences::{self, Document}, imaging::NativeError};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, path::Path};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecognitionMode { Ocr, Qr, Both }
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RecognitionPreferences { mode: RecognitionMode, languages: Vec<String>, preserve_line_breaks: bool }
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Envelope { version: u8, recognition: RecognitionPreferences }
fn error(reason: impl ToString) -> NativeError { NativeError::new("recognition_preferences_failed", reason.to_string()) }
impl Default for RecognitionPreferences {
    fn default() -> Self { Self { mode: RecognitionMode::Both, languages: vec!["en-us".into()], preserve_line_breaks: true } }
}
impl RecognitionPreferences {
    fn validate(&self) -> Result<(), NativeError> {
        let mut seen = BTreeSet::new();
        if self.languages.len() > 16 || self.languages.iter().any(|tag| tag.is_empty() || tag.len() > 32 ||
            !tag.as_bytes()[0].is_ascii_alphabetic() || tag.ends_with('-') || tag.contains("--") ||
            !tag.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-') || !seen.insert(tag.to_ascii_lowercase())) {
            return Err(error("Expected at most16 unique OCR language tags."));
        }
        Ok(())
    }
}
pub fn load(path: &Path) -> Result<RecognitionPreferences, NativeError> {
    let Some(raw) = application_preferences::read_document(path, Document::Recognition)? else { return Ok(RecognitionPreferences::default()); };
    let envelope: Envelope = serde_json::from_slice(&raw).map_err(error)?;
    if envelope.version != 1 { return Err(error("Unsupported recognition preference schema.")); }
    envelope.recognition.validate()?; Ok(envelope.recognition)
}
pub fn save(path: &Path, preferences: RecognitionPreferences) -> Result<RecognitionPreferences, NativeError> {
    preferences.validate()?;
    let raw = serde_json::to_vec(&Envelope { version: 1, recognition: preferences.clone() }).map_err(error)?;
    application_preferences::write_document(path, Document::Recognition, &raw)?; Ok(preferences)
}
