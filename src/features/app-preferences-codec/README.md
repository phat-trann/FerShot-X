# App preferences sidecar codec

This local FerShot sidecar stores version `1` data for the existing application
preference fields, including the nested legacy `AppSettings` values. It
strictly validates enum strings, booleans, numeric ranges and exact field
sets, rejects unknown schemas/fields and enforces a 16,384-byte UTF-8 limit.
Parsing and serialization use owned immutable values.

The exported defaults are FerShot producer defaults only; they are not claims
about reference application defaults. Persistence remains an independent C10/C13 caller seam,
with no filesystem or operating-system effects in this codec.
