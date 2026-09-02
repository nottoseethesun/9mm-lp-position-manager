# Debug Scripts Print the Inspector URL

> **Status:** Nice-to-have / developer experience &mdash; not a bug.
> Debugging works today. Funds are never at risk.

## Plain language

The four `npm run debug*` scripts start Node's debugger, but none of them
tells you plainly where to go next. Two rely on Node's own startup line,
which mixes into other output; the other two print several paragraphs of
alternatives with the useful part buried inside.

## Detail

In scope: `npm run debug`, `npm run debug-bot`, `npm run debug-attach`,
and `npm run debug-attach-bot`. Each should print one clean line:

> Visit chrome://inspect in your Chrome or Chrome-compatible web browser,
> and then click on "inspect" there to get started debugging.

`chrome://inspect` auto-discovers the local debugger once configured, so
the line does not need to repeat host and port. The browser qualifier
matters &mdash; Firefox and Safari have no Node-inspector UI, so someone
on either needs to know to switch.

## Fix when prioritized

For the two attach scripts, replace the multi-line "Connect with ONE of"
block with the single line above and move the Node REPL and VS Code
alternatives into `docs/engineering.md` for power users. For the two that
exec Node directly, add an npm pre-hook that prints the line before Node
spawns &mdash; no process wrapping, so no signal-forwarding surprises.
Pick it up next time the debug scripts are being touched anyway.
