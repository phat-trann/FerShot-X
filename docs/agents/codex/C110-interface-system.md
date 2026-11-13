# C110 — Interface system

Replaced 100 direct controls across 41 sources with shared UI primitives. Form actions use named Button variants; custom geometry alone uses `plain`. FTP/HTTP labels use FieldLabel; shared FieldGroup/FieldDescription and Progress support future forms. Native controls remain encapsulated within the library for accessible form/ref/event compatibility.

System typography, weights, spacing and rounded surfaces are defined in shared tokens and documented in `docs/design/INTERFACE.md`. Controls use 32px height/12px rounding; panels use 20px rounding. Annotation fonts, canvas handles and fixed status dimensions stay independent. No dependency versions changed.

Validation: 435 unit and 79 injected browser tests pass; TypeScript and renderer production build pass. Source guard prevents direct controls outside the library. Settings/Edit screenshots inspected. No native/server/credential actions. Version 1.1.11 synchronized. Existing functional acceptance remains 100% USER_REPORTED; new appearance and native notification delivery await user verification.
