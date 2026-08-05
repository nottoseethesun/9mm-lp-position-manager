---
name: No re-exports
description: Never re-export a symbol through a barrel/aggregator file; consumers import directly from the owning module
type: feedback
originSessionId: 19b37be7-a879-4f52-8b51-5d8a1c84f7fd
---
Never add a re-export to make a symbol available through a different module than its owner. Consumers must import directly from the file that defines the symbol.

**Why:** Re-exports create a fake-public-API layer that drifts: the barrel claims to own a symbol it doesn't, refactors have to update the barrel too, and `grep` for the definition becomes ambiguous. The user has flagged this as a hard rule.

**How to apply:** When extracting a function to a new module, do not leave a re-export in the original module "for backward compat" or "to keep tests working." Update every importer (including tests) to point at the new module. If `grep -rn "ext_name" src test` still shows imports from the old path after extraction, those are bugs to fix.
