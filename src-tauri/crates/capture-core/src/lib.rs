//! macOS screenshot acquisition behind an injectable runner. No shell is used.
use std::{
    ffi::OsString,
    fmt, fs, io,
    path::{Path, PathBuf},
    process::Command,
};
use tempfile::TempDir;

pub const EXECUTABLE: &str = "/usr/sbin/screencapture";
pub const MAX_CAPTURE_BYTES: u64 = 32 * 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CaptureMode {
    Fullscreen,
    Area,
    Window,
}

#[derive(Debug, Clone)]
pub struct CaptureCommand {
    pub executable: PathBuf,
    pub args: Vec<OsString>,
}

#[derive(Debug, Clone)]
pub struct CommandOutcome {
    pub success: bool,
    pub code: Option<i32>,
    pub stderr: String,
}

pub trait CommandRunner {
    fn run(&self, command: &CaptureCommand) -> io::Result<CommandOutcome>;
}

pub struct SystemRunner;
impl CommandRunner for SystemRunner {
    fn run(&self, command: &CaptureCommand) -> io::Result<CommandOutcome> {
        let output = Command::new(&command.executable)
            .args(&command.args)
            .stdin(std::process::Stdio::null())
            .output()?;
        Ok(CommandOutcome {
            success: output.status.success(),
            code: output.status.code(),
            stderr: String::from_utf8_lossy(&output.stderr)
                .chars()
                .take(1000)
                .collect(),
        })
    }
}

#[derive(Debug)]
pub enum CaptureError {
    UnsupportedPlatform,
    Cancelled,
    PermissionDenied,
    ProcessFailure { code: Option<i32>, detail: String },
    InvalidOutput,
    Io(io::Error),
}
impl fmt::Display for CaptureError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedPlatform => {
                write!(f, "Screen capture is currently supported on macOS only.")
            }
            Self::Cancelled => write!(f, "Capture cancelled."),
            Self::PermissionDenied => write!(f, "Screen capture permission was denied by macOS."),
            Self::ProcessFailure { code, detail } => {
                write!(f, "Screen capture failed ({code:?}): {detail}")
            }
            Self::InvalidOutput => write!(f, "Capture did not produce a bounded regular PNG file."),
            Self::Io(error) => write!(f, "Capture IO error: {error}"),
        }
    }
}
impl std::error::Error for CaptureError {}
impl From<io::Error> for CaptureError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

/// The temporary output lives exactly as long as this value. Fully decode it in
/// the image layer before displaying it; a PNG signature alone is not validation.
pub struct CapturedFile {
    path: PathBuf,
    _directory: TempDir,
}
impl CapturedFile {
    pub fn path(&self) -> &Path {
        &self.path
    }
    pub fn read(&self) -> Result<Vec<u8>, CaptureError> {
        use io::Read;
        let metadata = fs::symlink_metadata(&self.path)?;
        if !metadata.file_type().is_file() || metadata.len() > MAX_CAPTURE_BYTES {
            return Err(CaptureError::InvalidOutput);
        }
        let mut bytes = Vec::new();
        fs::File::open(&self.path)?
            .take(MAX_CAPTURE_BYTES + 1)
            .read_to_end(&mut bytes)?;
        if bytes.len() as u64 > MAX_CAPTURE_BYTES || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
            return Err(CaptureError::InvalidOutput);
        }
        Ok(bytes)
    }
}

fn command(mode: CaptureMode, path: &Path) -> CaptureCommand {
    let mut args: Vec<OsString> = ["-x", "-t", "png"].into_iter().map(Into::into).collect();
    match mode {
        CaptureMode::Fullscreen => args.push("-m".into()),
        CaptureMode::Area => args.extend(["-i".into(), "-s".into()]),
        CaptureMode::Window => args.extend(["-i".into(), "-w".into()]),
    }
    args.push(path.as_os_str().to_owned());
    CaptureCommand {
        executable: EXECUTABLE.into(),
        args,
    }
}

pub fn capture(mode: CaptureMode) -> Result<CapturedFile, CaptureError> {
    capture_with_runner(mode, &SystemRunner)
}

pub fn capture_with_runner(
    mode: CaptureMode,
    runner: &impl CommandRunner,
) -> Result<CapturedFile, CaptureError> {
    capture_on_platform(mode, runner, cfg!(target_os = "macos"))
}

fn capture_on_platform(
    mode: CaptureMode,
    runner: &impl CommandRunner,
    macos: bool,
) -> Result<CapturedFile, CaptureError> {
    if !macos {
        return Err(CaptureError::UnsupportedPlatform);
    }
    let directory = tempfile::Builder::new()
        .prefix("ferby-capture-")
        .tempdir()?;
    let path = directory.path().join("capture.png");
    let output = runner.run(&command(mode, &path))?;
    let diagnostic = output.stderr.to_lowercase();
    if ["permission", "not authorized", "not permitted", "denied"]
        .iter()
        .any(|term| diagnostic.contains(term))
    {
        return Err(CaptureError::PermissionDenied);
    }
    if diagnostic.contains("cancelled")
        || diagnostic.contains("canceled")
        || (mode != CaptureMode::Fullscreen
            && !path.exists()
            && (output.success || (output.code == Some(1) && diagnostic.trim().is_empty())))
    {
        return Err(CaptureError::Cancelled);
    }
    if !output.success {
        return Err(CaptureError::ProcessFailure {
            code: output.code,
            detail: output.stderr.trim().to_owned(),
        });
    }
    let captured = CapturedFile {
        path,
        _directory: directory,
    };
    captured.read()?;
    Ok(captured)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;
    struct Fake {
        outcome: CommandOutcome,
        payload: Option<Vec<u8>>,
        fail_spawn: bool,
        seen: Mutex<Vec<CaptureCommand>>,
    }
    impl Fake {
        fn success() -> Self {
            Self {
                outcome: CommandOutcome {
                    success: true,
                    code: Some(0),
                    stderr: String::new(),
                },
                payload: Some(b"\x89PNG\r\n\x1a\nsynthetic-header-only".to_vec()),
                fail_spawn: false,
                seen: Mutex::new(vec![]),
            }
        }
        fn output_path(&self) -> PathBuf {
            PathBuf::from(
                self.seen
                    .lock()
                    .unwrap()
                    .last()
                    .unwrap()
                    .args
                    .last()
                    .unwrap(),
            )
        }
    }
    impl CommandRunner for Fake {
        fn run(&self, command: &CaptureCommand) -> io::Result<CommandOutcome> {
            self.seen.lock().unwrap().push(command.clone());
            if self.fail_spawn {
                return Err(io::Error::other("fake spawn failure"));
            }
            if let Some(bytes) = &self.payload {
                fs::write(command.args.last().unwrap(), bytes)?;
            }
            Ok(self.outcome.clone())
        }
    }
    #[test]
    fn modes_are_fixed_arguments_and_output_has_private_unique_ownership() {
        for (mode, expected) in [
            (CaptureMode::Fullscreen, vec!["-x", "-t", "png", "-m"]),
            (CaptureMode::Area, vec!["-x", "-t", "png", "-i", "-s"]),
            (CaptureMode::Window, vec!["-x", "-t", "png", "-i", "-w"]),
        ] {
            let runner = Fake::success();
            let result = capture_on_platform(mode, &runner, true).unwrap();
            let seen = runner.seen.lock().unwrap();
            assert_eq!(seen[0].executable, Path::new(EXECUTABLE));
            assert_eq!(
                seen[0].args[..expected.len()],
                expected.iter().map(OsString::from).collect::<Vec<_>>()
            );
            assert_eq!(result.path().file_name().unwrap(), "capture.png");
            assert!(
                result
                    .path()
                    .parent()
                    .unwrap()
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with("ferby-capture-")
            );
            let path = result.path().to_owned();
            drop(result);
            assert!(!path.exists());
        }
    }
    #[test]
    fn interactive_cancel_without_file_is_not_a_permission_claim() {
        let mut runner = Fake::success();
        runner.payload = None;
        runner.outcome.success = false;
        runner.outcome.code = Some(1);
        assert!(matches!(
            capture_on_platform(CaptureMode::Area, &runner, true),
            Err(CaptureError::Cancelled)
        ));
        assert!(!runner.output_path().parent().unwrap().exists());
    }
    #[test]
    fn explicit_permission_errors_take_precedence_and_remove_partial_files() {
        let mut runner = Fake::success();
        runner.outcome.success = false;
        runner.outcome.stderr = "Operation not permitted".into();
        assert!(matches!(
            capture_on_platform(CaptureMode::Window, &runner, true),
            Err(CaptureError::PermissionDenied)
        ));
        assert!(!runner.output_path().parent().unwrap().exists());
    }
    #[test]
    fn generic_failures_do_not_guess_permission_and_clean_up() {
        let mut runner = Fake::success();
        runner.outcome.success = false;
        runner.outcome.code = Some(2);
        runner.outcome.stderr = "could not create image from display".into();
        assert!(matches!(
            capture_on_platform(CaptureMode::Fullscreen, &runner, true),
            Err(CaptureError::ProcessFailure { code: Some(2), .. })
        ));
        assert!(!runner.output_path().parent().unwrap().exists());
    }
    #[test]
    fn malformed_output_and_spawn_failures_clean_up() {
        let mut runner = Fake::success();
        runner.payload = Some(b"not an image".to_vec());
        assert!(matches!(
            capture_on_platform(CaptureMode::Fullscreen, &runner, true),
            Err(CaptureError::InvalidOutput)
        ));
        assert!(!runner.output_path().parent().unwrap().exists());
        runner.fail_spawn = true;
        assert!(matches!(
            capture_on_platform(CaptureMode::Fullscreen, &runner, true),
            Err(CaptureError::Io(_))
        ));
        assert!(!runner.output_path().parent().unwrap().exists());
    }
    #[test]
    fn unsupported_host_never_invokes_runner() {
        let runner = Fake::success();
        assert!(matches!(
            capture_on_platform(CaptureMode::Area, &runner, false),
            Err(CaptureError::UnsupportedPlatform)
        ));
        assert!(runner.seen.lock().unwrap().is_empty());
    }
    #[cfg(unix)]
    #[test]
    fn replaced_output_symlink_is_refused_without_touching_target() {
        let runner = Fake::success();
        let captured = capture_on_platform(CaptureMode::Area, &runner, true).unwrap();
        let other = tempfile::NamedTempFile::new().unwrap();
        fs::write(other.path(), b"untouched").unwrap();
        fs::remove_file(captured.path()).unwrap();
        std::os::unix::fs::symlink(other.path(), captured.path()).unwrap();
        assert!(matches!(captured.read(), Err(CaptureError::InvalidOutput)));
        drop(captured);
        assert_eq!(fs::read(other.path()).unwrap(), b"untouched");
    }
}
