---
name: No interpolated innerHTML in JS
description: Never build innerHTML from interpolated values in dashboard JS; static strings and trusted variable writes are fine
type: feedback
---

Don't assign `innerHTML` / `insertAdjacentHTML` / `outerHTML` using **interpolated** markup in dashboard JS files.

- NOT OK: `el.innerHTML = \`<span>${name}</span>\``
- NOT OK: `el.innerHTML = "<tag>" + x + "</tag>"`
- OK: `el.innerHTML = ""` (clearing — `replaceChildren()` is preferred but not required)
- OK: `el.innerHTML = "<static literal markup>"`
- OK: `el.innerHTML = trustedConstant` (e.g. `body.innerHTML = DISCLOSURE_HTML`, the `body` param to `_createModal`)

**Why:** Phase 1 of the HTML cleanup (2026-04) migrated all structural/repeating markup sites to `<template>` elements with `cloneTpl` + `data-tpl` slots. What remains is prose/editorial content and modal bodies — `html-validate` provides near-zero value on those, but interpolation sinks remain the XSS risk and the place where structural bugs hide. The earlier blanket "no new innerHTML anywhere" rule was overscoped and has been retired. Phase 2 (`_createModal` body refactor) is explicitly cancelled — leave it alone.

**How to apply:** For any new dynamic DOM work with variable values, use `document.createElement` + `.textContent`/attributes, or clone a `<template id="...">` via `cloneTpl(id)` and fill `[data-tpl]` slots with `textContent`. Trusted constants and empty strings can still be written to `innerHTML`. If a future ESLint rule `no-interpolated-innerhtml` is added, it should flag TemplateLiterals-with-expressions and `+`-concat BinaryExpressions on the right-hand side of `innerHTML`/`outerHTML`/`insertAdjacentHTML` calls.
