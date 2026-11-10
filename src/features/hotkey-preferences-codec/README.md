# Global hotkey preferences codec

This local FerShot sidecar stores version `1` bindings for all five known global
actions. Binding fields and modifier types are strict, keys are bounded
printable strings, and existing validation rejects missing modifiers, reserved
system shortcuts and duplicates. The codec returns owned immutable copies and
enforces a 16,384-byte UTF-8 limit.

The codec performs no native registration, listeners or OS operations. C13
owns registration as a separate seam; this format does not claim equivalence
to reference application's shortcut storage or behavior.
