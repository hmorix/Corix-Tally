import { useEffect, useRef, useState } from "react";
import { TALLY_SHORTCUTS, fireShortcut, comboFromEvent, matchShortcut } from "../lib/shortcuts";

/**
 * A row of real Tally keys (Esc, Tab, Ctrl, Alt, Shift, F1–F12...) that
 * docks directly above the on-screen keyboard whenever a text field is
 * focused, AND listens for the same combos from a physical/Bluetooth
 * keyboard — both paths funnel into the same `corix:shortcut` window event
 * (see src/lib/shortcuts.js), so a page only ever has to listen once.
 */
export default function ShortcutBar() {
  const [visible, setVisible] = useState(false);
  const [mods, setMods] = useState({ Ctrl: false, Alt: false, Shift: false });
  const scrollerRef = useRef(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const baseline = window.innerHeight;
    const onResize = () => setVisible(baseline - vv.height > 120);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    function onFocusIn(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) setVisible(true);
    }
    function onFocusOut() {
      setTimeout(() => {
        const active = document.activeElement;
        const stillEditing = active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
        if (!stillEditing) setVisible(false);
      }, 80);
    }
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Physical keyboard: every combo in TALLY_SHORTCUTS also fires from a real
  // (or Bluetooth) keyboard, so behaviour matches the on-screen bar exactly.
  // Plain Tab/Enter/typing keys are left alone — only recognised combos are
  // intercepted, and only outside plain single-letter typing so users can
  // still type ordinary text into narration/name fields.
  useEffect(() => {
    function onKeyDown(e) {
      const combo = comboFromEvent(e);
      const shortcut = matchShortcut(combo);
      if (!shortcut) return;
      // don't hijack a bare Tab (normal field navigation) or bare typing
      if (combo === "Tab" && !e.ctrlKey && !e.altKey) return;
      e.preventDefault();
      fireShortcut(shortcut.action);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleMod(name) {
    setMods((m) => ({ ...m, [name]: !m[name] }));
  }

  function pressKey(shortcut) {
    fireShortcut(shortcut.action);
    setMods({ Ctrl: false, Alt: false, Shift: false });
    if (navigator.vibrate) navigator.vibrate(8);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 bg-ink text-paper border-t border-brass/40"
      style={{ bottom: "env(keyboard-inset-height, 0px)" }}
      role="toolbar"
      aria-label="Tally keyboard shortcuts"
    >
      <div ref={scrollerRef} className="flex gap-1.5 overflow-x-auto px-2 py-2" style={{ WebkitOverflowScrolling: "touch" }}>
        <ModKey name="Esc" onClick={() => fireShortcut("cancel")} />
        <ModKey name="Tab" onClick={() => fireShortcut("next-field")} />
        <ModKey name="Ctrl" active={mods.Ctrl} onClick={() => toggleMod("Ctrl")} />
        <ModKey name="Alt" active={mods.Alt} onClick={() => toggleMod("Alt")} />
        <ModKey name="Shift" active={mods.Shift} onClick={() => toggleMod("Shift")} />
        <div className="w-px bg-paper/20 mx-1 shrink-0" />
        {TALLY_SHORTCUTS.filter((s) => /^F\d/.test(s.label)).map((s) => (
          <FnKey key={s.combo} shortcut={s} onPress={pressKey} />
        ))}
        <div className="w-px bg-paper/20 mx-1 shrink-0" />
        {TALLY_SHORTCUTS.filter((s) => !/^F\d/.test(s.label) && s.label !== "Esc" && s.label !== "Tab").map((s) => (
          <FnKey key={s.combo} shortcut={s} onPress={pressKey} wide />
        ))}
      </div>
    </div>
  );
}

function ModKey({ name, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={"shrink-0 rounded-sm px-3 py-2 text-xs font-medium border " + (active ? "bg-brass text-ink border-brass" : "bg-transparent text-paper border-paper/30")}>
      {name}
    </button>
  );
}
function FnKey({ shortcut, onPress, wide }) {
  return (
    <button type="button" onClick={() => onPress(shortcut)} title={shortcut.hint} className={"shrink-0 rounded-sm px-2.5 py-2 text-xs font-tabular border border-paper/30 bg-transparent text-paper active:bg-brass active:text-ink " + (wide ? "px-3" : "")}>
      {shortcut.label}
    </button>
  );
}
