# A33: Final Vision output string budget

Codex took over the free A33 producer scope under the explicit user instruction; original Antigravity authorship and immutable packets remain preserved. Source review identified missing newline/space separator and QR symbology bytes in the declared output budget. Two new counting-fake-backend boundary tests reproduced the defect before the fix (2 failed, 2 passed). Added saturating separator and symbology accounting before result allocation, preserving schema, public APIs, dependency versions and macOS baseline.

After the fix: codex_output_budget and copilot_p64 integration targets passed 4 tests each (8 total). Earlier named pure validation test passed with native runtime test filtered out. No native language query/recognition or OS action was executed. Boundary acceptance covers exact joined output cap and combined text/QR fields. Duplicate text-block and recognizedText representations plus metadata are not a serialized JSON-body size guarantee; callers still bound transport.

The new Codex snapshot needs independent review before consumption by root integration; this session cannot approve its own change. No OCR/native acceptance gate or percentage was raised. Formatting/lint delegated to Copilot H01. Pending C08 wiring and real OCR acceptance remain separate.
