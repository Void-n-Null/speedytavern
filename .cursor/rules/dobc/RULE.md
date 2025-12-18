---
alwaysApply: true
---

# DOBC: Divide Or Be Conquered

Complexity is a rot. If you let it fester in a single file, it'll kill the project. DOBC is our standard for identifying and dismantling monolithic code before it becomes a maintenance nightmare.

## The Metrics of Shame

We use `scripts/divide-or-be-conquered-tierlist.ts` to score files. If a file hits **Tier S or A**, it's a target for immediate refactoring.

### 1. File Length (LOC)
- **Soft Limit:** 300 non-empty lines. At this point, you should be looking for hook extraction or sub-component isolation.
- **Hard Limit:** 800 non-empty lines. This is a "Monolith Alert." It’s not a feature; it’s a failure of architecture. Split it or be conquered.

### 2. Function Density
- **Threshold:** 30 function-like declarations. If you have 30 functions in one file, you aren't writing a module; you're writing a junk drawer. Group related logic into utilities or custom hooks.

### 3. JSX Trench Warfare (Nesting)
- **Warning:** 8 levels of JSX nesting. Your component is doing too much layout and logic at once.
- **Critical:** 12 levels of nesting. This is "Trench Warfare." It's unreadable and brittle. Extract smaller, functional UI components.

## The Prime Directive: Don't Break Shit

Organizing code is useless if the app stops working. Follow these rules during refactoring:

1.  **Pure Moves Only**: Moving a component from file A to file B should NOT involve changing its logic. If you need to fix a bug, do it BEFORE or AFTER the move. Never both at once.
2.  **Verify via Consumption**: After moving a hook or component, check every single place it's imported. If you changed the export type (default to named), you better have updated the callers.
3.  **No Logic Leakage**: When extracting a hook, don't leave half the state in the component and half in the hook if they're tightly coupled. Either it's a clean extraction or it's a mess waiting to happen.
4.  **Prop Drilling is the Enemy**: If extracting a component requires passing 15 props down 3 levels, your extraction is wrong. Re-evaluate your state management or use a context/store.
5.  **Test the Edge**: If you move a modal or a conditional UI element, actually trigger the condition. "It looks right in the code" is how you ship broken UIs.

## Refactoring Strategy

1. **Identify the Core:** What is the *one* thing this file must do?
2. **Extract Hooks:** Pull state logic and effects into `hooks/` or local hook files.
3. **Isolate Components:** If a sub-component takes up 100 lines and has its own state, it doesn't belong in the parent file.
4. **Service the Backend:** Routes should be thin. Business logic, PNG parsing, and heavy SQL belong in services or lib folders.

**DOBC or die.**
