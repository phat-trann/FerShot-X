# Archive panel

`ArchivePanel` is a controlled UI for the local archive workflow. Import and
export callbacks are supplied by the caller; this component performs no
filesystem, URL, persistence or native operations. Export is disabled when the
current library is empty, and cancellation is available only while busy.

The import description reflects the workflow contract: imported entries are
added to the current library rather than replacing it. Native archive I/O is
not implied by this presentation component.
