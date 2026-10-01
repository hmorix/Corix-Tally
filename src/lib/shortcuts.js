// TallyPrime's real keyboard shortcuts, kept as a lookup table so the mobile
// ShortcutBar and a physical keyboard both fire the exact same action.
// Reference behaviour matches Tally's Gateway-of-Tally / voucher-entry keys.

export const TALLY_SHORTCUTS = [
  { combo: "F1", label: "F1", action: "select-company", hint: "Select / open company" },
  { combo: "Alt+F1", label: "⌥F1", action: "close-company", hint: "Shut the current company" },
  { combo: "F2", label: "F2", action: "change-date", hint: "Change voucher date" },
  { combo: "Alt+F2", label: "⌥F2", action: "change-period", hint: "Change reporting period" },
  { combo: "F3", label: "F3", action: "select-company-info", hint: "Select company (from any screen)" },
  { combo: "F4", label: "F4", action: "voucher-contra", hint: "Contra voucher" },
  { combo: "F5", label: "F5", action: "voucher-payment", hint: "Payment voucher" },
  { combo: "F6", label: "F6", action: "voucher-receipt", hint: "Receipt voucher" },
  { combo: "F7", label: "F7", action: "voucher-journal", hint: "Journal voucher" },
  { combo: "F8", label: "F8", action: "voucher-sales", hint: "Sales voucher" },
  { combo: "F9", label: "F9", action: "voucher-purchase", hint: "Purchase voucher" },
  { combo: "F10", label: "F10", action: "voucher-memo", hint: "Memo / reversing journal" },
  { combo: "F11", label: "F11", action: "features", hint: "Company features" },
  { combo: "F12", label: "F12", action: "configure", hint: "Configuration" },
  { combo: "Alt+C", label: "⌥C", action: "create-on-the-fly", hint: "Create master without leaving screen" },
  { combo: "Ctrl+A", label: "⌃A", action: "accept-form", hint: "Accept the current screen / save" },
  { combo: "Ctrl+Enter", label: "⌃⏎", action: "accept-fast", hint: "Accept without moving to narration" },
  { combo: "Alt+D", label: "⌥D", action: "delete-voucher", hint: "Delete current voucher / row" },
  { combo: "Alt+I", label: "⌥I", action: "insert-voucher", hint: "Insert a voucher before current" },
  { combo: "Alt+A", label: "⌥A", action: "add-voucher", hint: "Add a voucher after current" },
  { combo: "Alt+R", label: "⌥R", action: "remove-line", hint: "Remove a line" },
  { combo: "Ctrl+P", label: "⌃P", action: "print", hint: "Print current voucher / report" },
  { combo: "Escape", label: "Esc", action: "cancel", hint: "Quit screen without saving" },
  { combo: "Tab", label: "Tab", action: "next-field", hint: "Move to next field" }
];

// Modifier + base-key combos are dispatched on this single custom event so
// every page can subscribe once: window.addEventListener('corix:shortcut', ...)
export function fireShortcut(action) {
  window.dispatchEvent(new CustomEvent("corix:shortcut", { detail: { action } }));
}

// Translate a physical KeyboardEvent into one of the combos above, so a real
// keyboard (desktop, or a Bluetooth keyboard on Android) works identically
// to tapping the on-screen ShortcutBar.
export function comboFromEvent(e) {
  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  const key = e.key === "Enter" ? "Enter" : e.key === "Escape" ? "Escape" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(key);
  return parts.join("+");
}

export function matchShortcut(combo) {
  return TALLY_SHORTCUTS.find((s) => s.combo === combo);
}
