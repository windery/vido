# Electron → Tauri migration: technical feasibility and measured trade-offs for a keyboard-first, vim-modal editor

**Date:** 2026-09-11
**Subject:** `vido` — Electron 29 + Vue 3.3 + Vite 5 desktop todo app, ~14,900 lines of renderer TS/Vue, macOS/Windows/Linux desktop-only.
**Scope:** research only. No decision is recommended here. Findings, sources, and explicit uncertainty.

## How to read this report

Every non-obvious claim carries a URL. Claims are tagged:

| Tag | Meaning |
| --- | --- |
| **[M]** | Measured, or stated in an official/primary source (docs, source code, spec, tracker, package index). |
| **[V]** | Vendor-reported (someone selling the thing being measured), or marketing without stated methodology. |
| **[I]** | Inference drawn by this report from the cited facts. Not itself sourced. |

**Version policy:** Tauri **v2** unless a finding is explicitly marked v1. Webview-engine behaviour is mostly Tauri-version-agnostic (the OS webview is the same component in v1 and v2); where version matters it is called out.

**Method / limitations.**

- `web_fetch` was non-functional in this environment (every public hostname rejected as "non-public IP"). All retrieval was done with `curl` and the `gh` CLI, and every cited URL was actually fetched. Secondary summaries were not used as sources.
- Every cited URL was re-checked for resolution at write time (browser user-agent, following redirects). All resolve; the single non-200 is `https://v2.tauri.app/start/migrate/from-electron/`, whose **404 is itself a finding** (§7.2).
- `bugs.webkit.org` was **intermittently returning HTTP 503** throughout, and was down for the whole write-up pass. Citations marked **"⚠︎unconfirmed"** were read during research but could not be re-confirmed afterwards; everything else in this report was re-confirmed against the live source. The unconfirmed set is: WebKit bugs 38394, 247718, 304117, 196380, 172058, 49358, 237501, 285023, 263496, 103430, 200558, 204694, 321420. The unmarked WebKit citations — **24943, 169209, 296765** — were re-confirmed directly, and **165004** is corroborated by the MDN browser-compat-data note quoted in §4.1 (a primary source that cites the bug).
- The in-repo baseline is from [`docs/perf/startup-baseline.md`](./startup-baseline.md): macOS arm64, Electron 29.4.6, startup (process create → `ready-to-show`) **292 ms**, process-tree total RSS **389 MB**, main process **175 MB**. Those numbers are used as the "before" side; there is no measured "after" side for a Tauri build of this app (see §5).
- Where a finding depends on what this app actually does (rather than on what apps of this class generally do), the renderer source was read directly and the file/line is cited inline. Those file references are the only non-URL evidence in the report and are reproducible from this checkout.

---

## 1. Rendering engine differences

Tauri uses the OS webview: **WKWebView** (macOS), **WebView2/Chromium** (Windows), **WebKitGTK** (Linux). Tauri's own process-model page states the consequence plainly:

> "Unlike other similar solutions, the WebView libraries are not included in your final executable but dynamically linked at runtime. This makes your application significantly smaller, but it also means that you need to keep platform differences in mind, just like traditional web development."
> — <https://v2.tauri.app/concept/process-model/>

That page also confirms the engine mapping and that WebView2 is Chromium-based: "Currently, Tauri uses Microsoft Edge WebView2 on Windows, WKWebView on macOS and webkitgtk on Linux." **[M]**

### 1.1 API availability is a non-issue; behaviour is the issue

The MDN browser-compat-data shows every API this editor needs has been in Safari for years, so nothing is *missing* on WKWebView:

| API | Chrome | Safari (= WKWebView proxy) |
| --- | --- | --- |
| `Range.getClientRects()` | 4 | 5 |
| `Range.getBoundingClientRect()` | 4 | 5 |
| `Selection.setBaseAndExtent()` | 1 | 1.3 |
| `Selection.modify()` (non-standard) | 1 | 1.3 |
| `KeyboardEvent.key` | 51 | 10.1 |
| `KeyboardEvent.isComposing` | 56 | 10.1 (partial — see §4) |
| `InputEvent.getTargetRanges()` | 60 | 10.1 |

Source: MDN `browser-compat-data` `api/Range.json`, `api/Selection.json`, `api/KeyboardEvent.json`, `api/InputEvent.json` — <https://github.com/mdn/browser-compat-data/blob/main/api/Range.json>, <https://github.com/mdn/browser-compat-data/blob/main/api/KeyboardEvent.json> **[M]**

**Caveat on the proxy [I]:** a Safari version is only an upper bound for WKWebView. On macOS the webview is a system component updated with the OS, and Tauri's own docs say: "It is considered a core component and is therefore updated with the regular OS updates. **This means unsupported macOS versions do not receive WebKit updates.**" (<https://v2.tauri.app/reference/webview-versions/>) **[M]** Tauri's default macOS deployment target is `bundle.macOS.minimumSystemVersion = "10.13"` (<https://v2.tauri.app/reference/config/>) **[M]**, which per Tauri's own table corresponds to WebKit ~605 / Safari 11.1-era (<https://v2.tauri.app/reference/webview-versions/>) — a decade-old engine. Electron 29 by contrast requires "macOS (Catalina and up)" (<https://github.com/electron/electron/blob/v29.0.0/README.md>) **[M]**. *So on macOS the engine floor is set by whatever `minimumSystemVersion` the project declares; leaving the Tauri default would widen engine support downward, not narrow it.* **[I]**

### 1.2 `keydown` / `keypress` fidelity and `preventDefault`

**The failure mode is not "preventDefault does not work" — it is "the keydown never arrives."**

- **[M]** On macOS, some `Cmd`+key chords in editable content never produce a `keydown` at all. WebKit bug 24943, "Command-B and Command-I do not generate keydown events in contentEditable regions" (RESOLVED, WebKit / HTML Editing, filed 2009-03-30, comment: "Pressing Command-B or Command-I while in a rich text area does not generate a keydown, keypress, or keyup event. Command-U gives keydown and keypress, but not keyup.") — <https://bugs.webkit.org/show_bug.cgi?id=24943>. The generalisation is current: WebKit bug 304117 (NEW, "Cmd+B/I/U are not hardcoded: they match native *menu actions*, and Safari has no Format menu") — <https://bugs.webkit.org/show_bug.cgi?id=304117> ⚠︎unconfirmed; see also the editing-spec discussion <https://github.com/w3c/editing/issues/492>. **[M]**
- **[M]** Menu key-equivalents are the mechanism. Tauri apps install native menu items with accelerators via `PredefinedMenuItem` (cut/copy/paste/undo/redo/select-all, "predefined behavior by the operating system or Tauri") and `setAccelerator` — <https://v2.tauri.app/learn/window-menu/>. Electron exposes the same interception point explicitly: `webContents`' `before-input-event` is documented as "Emitted before dispatching the keydown and keyup events in the page. Calling `event.preventDefault` will prevent the page keydown/keyup events **and the menu shortcuts**", and the docs' own example uses `setIgnoreMenuShortcuts` (<https://github.com/electron/electron/blob/v29.0.0/docs/api/web-contents.md>). **[M]** *Inference: in Electron the app can observe and veto menu-shortcut interception from one place; Tauri documents no equivalent `before-input-event` hook, so a chord claimed by a Tauri accelerator or by the OS may be unreachable from the renderer's central keydown handler.* **[I]**
- **[M]** Chromium-side, `keypress` is already unreliable: MDN BCD notes for `Element.keypress_event` that "Chrome does not fire the `keypress` event for known keyboard shortcuts" (<https://github.com/mdn/browser-compat-data/blob/main/api/Element.json>). A **keydown-only** design — which this app already has — is the correct cross-engine choice; nothing here argues for adding `keypress`. **[I]**
- **[M]** WebKit2 historically processed key events asynchronously, which broke `preventDefault()` cancellation of the follow-on text event in the Windows WK2 port: WebKit bugs 200558 → 204694 (RESOLVED FIXED, 2019) — <https://bugs.webkit.org/show_bug.cgi?id=200558> ⚠︎unconfirmed, <https://bugs.webkit.org/show_bug.cgi?id=204694> ⚠︎unconfirmed. Fixed, and not the macOS/Linux path, but it establishes that WebKit's key pipeline has had *different* cancellation semantics from Chromium's. **[M]**
- **[M]** On Windows the embedding host — not the page — sees `AcceleratorKeyPressed` first, and "the WebView is blocked waiting for the decision of if the accelerator is handled by the host" (<https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2acceleratorkeypressedeventargs>). WebView2 exposes `AreBrowserAcceleratorKeysEnabled=FALSE`, which disables Ctrl-F/F3, Ctrl-P, Ctrl-R/F5, zoom, Ctrl-Shift-C/F12 and Back/Forward/Search, but explicitly **not** Home/End/PageUp/PageDown or text-editing keys (<https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2settings3>). **[M]** Tauri exposes **no** config knob for this; "Disabling standard browser keyboard shortcuts" is an **open** feature request (tauri#7418, 2023-07-13, still open) — <https://github.com/tauri-apps/tauri/issues/7418>. **[M]**
- **[M]** Concrete Tauri-reported key-delivery bugs:
  - tauri#5771 "double keydown on macOS" (closed) and tauri#5741 "Keydown event trigger twice" (closed) — a modifier-held chord (`Cmd+P`) delivered twice in Tauri but not in Safari. <https://github.com/tauri-apps/tauri/issues/5771>, <https://github.com/tauri-apps/tauri/issues/5741>
  - tauri#5464 "Webview does not receive keyboard events until user interaction" (closed) / wry#739 (closed) — <https://github.com/tauri-apps/tauri/issues/5464>, <https://github.com/tauri-apps/wry/issues/739>. *A window that starts unfocused swallows keystrokes — relevant to a keyboard-first app whose first action is "type immediately".* **[I]**
  - tauri#10482 "Characters ignored in `<input>` field when using single key shortcuts (Linux)" (**open**, 2024-08-04) — single-key menu accelerators swallow characters in inputs on Linux but not macOS. <https://github.com/tauri-apps/tauri/issues/10482> This is the closest documented analogue to a vim app's single-key bindings colliding with accelerators. **[M]**
  - tauri#9257 "Turning on `unstable` feature breaks keyboard shortcuts for text manipulation" (**open**, v2 beta) — <https://github.com/tauri-apps/tauri/issues/9257>
  - tauri#11806 "on_window_event is fired when end of dom focus element is reached" (**open**, 2024-11-27) — <https://github.com/tauri-apps/tauri/issues/11806>
  - tauri#15859 "Tauri doesn't respect Compose key on Linux (KDE)" (**open**, 2026-08-10, label `status: upstream`) — `AltRight`+`e` fails to produce `é`; console logs `Couldn't get key from code: AltRight`. <https://github.com/tauri-apps/tauri/issues/15859>

### 1.3 `contenteditable`

- **[M]** tauri#15330 "Page scroll jumps on every keystroke when typing RTL text with spaces" (**open**, 2026-05-03): in a `contenteditable`/TipTap element, "the **page scroll jumps on every keystroke** when the text contains spaces (triggering word wrap)", and "This issue **only occurs in the Tauri desktop app** (macOS WebView), not in standard web browsers (Chrome, Safari, Firefox)." <https://github.com/tauri-apps/tauri/issues/15330> *For an app whose editor is inline, scroll position is part of the interaction contract; this is a documented case of a hosting-layer difference changing per-keystroke layout.* **[I]**
- **[M]** tauri#10148 "[v2] undo and redo shortcuts don't work in popular editor on MacOS" (**open** since 2024-06-28, v2-beta): the reporter's matrix is `textarea` works, `contenteditable` works, "the rest editors" do not — and it works on Tauri v1 and on Windows v2. <https://github.com/tauri-apps/tauri/issues/10148>. Related, closed: tauri#9426 (Cmd+Z fails when text was inserted by a shortcut rather than typed) — <https://github.com/tauri-apps/tauri/issues/9426>. *The distinction matters: plain `contenteditable` is reported working, so this app's own contenteditable may be unaffected — but "native undo state tracks programmatic mutations" is not something a vim app may rely on anyway.* **[I]**
- **[M]** tauri#7705 "Safari MacOS Spelling is Hiding the Styles / Underline for Errors" (**open**, 2023-08-28): native spellcheck underlines are not drawn in a Tauri macOS build though the spellchecker still functions on right-click. <https://github.com/tauri-apps/tauri/issues/7705> *Relevant because the app paints its own caret and translucent selection overlay; native text-decoration-adjacent UI interleaving with a self-drawn overlay is a fresh integration surface.* **[I]**
- **[M]** `beforeinput` is Safari 10.1 / Chrome 60 (<https://github.com/mdn/browser-compat-data/blob/main/api/Element.json>) so it cannot be the only signal across engines; and WebKit bug 321420 (NEW, Safari 26.5.2) reports that cancelling an `insertReplacementText` `beforeinput` suppresses the text **but still moves the caret** — i.e. `preventDefault()` is not a complete transaction boundary — <https://bugs.webkit.org/show_bug.cgi?id=321420> ⚠︎unconfirmed. `execCommand("paste")` is unsupported in Safari; `defaultParagraphSeparator` and `insertBrOnReturn` are unsupported in both Chrome and Safari (<https://github.com/mdn/browser-compat-data/blob/main/api/Document.json>). **[M]** *The app does not depend on `execCommand` for its core mutations, so this is a watch-item rather than a blocker.* **[I]**

### 1.4 `Selection` / `Range`

- **[M]** All required `Selection`/`Range` members exist in all three engines (table in §1.1). `Range.detach()` has been a no-op since Safari 10 (<https://github.com/mdn/browser-compat-data/blob/main/api/Range.json>) — harmless.
- **[M]** `scrollIntoViewIfNeeded()` is WebKit/Blink-only (MDN `api/Element.json`). `scrollIntoViewOptions` needs Safari 14 / Chrome 61. *If the editor uses `scrollIntoViewIfNeeded` today, it is already non-portable to Gecko but fine in both Chromium and WebKit; if it uses the promise-returning `scrollIntoView()`, that is Chrome-only (Chrome 150, `false` in Safari).* **[M]/[I]**
- **[M]** Geometry semantics — see §2; the documented engine divergences there are the substantive Selection/Range risk.

### 1.5 Rendering consistency

- **[M]** Tauri documents a dedicated Linux graphics troubleshooting page: "On Linux, Tauri renders through WebKitGTK. On some setups, most often NVIDIA GPUs, WebKitGTK and the graphics driver disagree and you get anything from a blank window to subtle rendering problems." Symptoms include blank/white window, flicker on resize, silent crash on resize, and `AcceleratedSurfaceDMABuf was unable to construct a complete framebuffer`. Workarounds include disabling the DMABUF renderer or accelerated compositing entirely. <https://v2.tauri.app/develop/debug/linux-graphics/>
- **[M]** The same page contains the sentence most relevant to an editor: "In practice this shows up as **high input latency or low frame rates in WebGL heavy views (terminal emulators, editors, maps, charts)**, while the same code is fast in a regular browser. If your app has a WebGL rendering path, give it a non-WebGL fallback on Linux…" It also warns that "WebKitGTK masks the WebGL renderer string for fingerprinting protection", so you cannot detect the slow path from JS. *This app's UI is DOM/CSS, not WebGL — so the specific WebGL warning is a lower risk, but the page is primary-source evidence that WebKitGTK's presentation path can silently degrade and that the degradation is undetectable from the frontend.* **[M]/[I]**
- **[M]** wry PR #15937 (closed unmerged, 2026-08-29) states: "WebKitGTK renders a blank window in environments without GPU acceleration (containers, VMs, CI) **and logs nothing**, so the workaround is undiscoverable." <https://github.com/tauri-apps/tauri/pull/15937>
- **[M]** tauri#14286 "Font-weight offset of 100 on webkitgtk (linux)" (**open**, 2025-10-12) — <https://github.com/tauri-apps/tauri/issues/14286>. *The app's visual language is monospace type, precise column alignment and ASCII/Unicode symbols; a font-weight/metric offset on one engine is directly visible.* **[I]**
- **[M]** tauri#15656 "[Linux/Wayland] `window.add_child()` child webview renders with incorrect bounds on Ubuntu 26.04 + WebKitGTK 2.52.3" (**open**, 2026-07-06) — <https://github.com/tauri-apps/tauri/issues/15656>
- **[V]** A real Tauri app vendor (Ironcall) lists WebKitGTK divergence they had to work around: no native undo in `<input>`/`<textarea>` (hand-written instead), OS-themed native `<select>` clashing with a dark UI, and `Ctrl+Shift+Tab` being **swallowed by GTK before JS sees it** — <https://dev.to/ironcall/our-api-client-is-a-29-mb-binary-and-starts-in-01s-heres-the-tauri-vs-electron-footprint-with-2h18>. The `Ctrl+Shift+Tab` item is a second, independent example of the §1.2 failure mode (a chord consumed below the webview).

### 1.6 How much of a risk is WebKitGTK, quantified

The common claim is that WebKitGTK lags badly. The measured distribution-package data does not support "years behind" on maintained LTS distributions:

| Source (measured 2026-09-11) | WebKitGTK version | URL |
| --- | --- | --- |
| Upstream latest **stable** | **2.52.6** (released 2026-08-19) | <https://webkitgtk.org/releases/> |
| Upstream unstable | 2.53.92 (2026-09-02) | <https://webkitgtk.org/releases/> |
| Ubuntu 24.04 LTS (`-updates`/`-security`) | **2.52.6** | <https://launchpad.net/ubuntu/noble/+package/libwebkit2gtk-4.1-0> |
| Ubuntu 22.04 LTS (`-updates`/`-security`) | **2.50.4** | <https://launchpad.net/ubuntu/jammy/+package/libwebkit2gtk-4.1-0> |
| Debian 13 (stable, `-security`) | **2.52.6** | <https://tracker.debian.org/pkg/webkit2gtk> |
| Debian 12 (oldstable) | **2.50.6** | <https://tracker.debian.org/pkg/webkit2gtk> |

**[M]** So mainstream LTS distros ship a WebKitGTK **1–2 minor releases (≈6–12 months) behind upstream**, delivered through the security pocket — not years. In contrast, Tauri's own reference table is stale: it lists "Ubuntu 22.04 → webkitgtk 2.36" (<https://v2.tauri.app/reference/webview-versions/>), while Launchpad shows jammy at 2.50.4 today. That same Tauri page concedes the general problem: "The diverse nature of the Linux ecosystem means it is **very hard to compile accurate information about WebKitGTK on the various distros**… You should always check your distro's repositories for up-to-date information." **[M]**

The real Linux risks are therefore **not** version lag but:

1. **Tauri v2 raises the Linux floor.** v2 requires the `webkit2gtk-4.1` API series (`libwebkit2gtk-4.1-dev` / `webkit2gtk-4.1` / `webkit2gtk4.1-devel`) — <https://v2.tauri.app/start/prerequisites/>. That package **does not exist at all** for Ubuntu 20.04 (focal) or 18.04 (bionic): "Not published at present" — <https://launchpad.net/ubuntu/focal/+package/libwebkit2gtk-4.1-0>, <https://launchpad.net/ubuntu/bionic/+package/libwebkit2gtk-4.1-0>. Electron 29 claims Ubuntu 18.04+, Fedora 32+, Debian 10+ (<https://github.com/electron/electron/blob/v29.0.0/README.md>). *Tauri v2 narrows the Linux support matrix relative to the current build.* **[M]/[I]**
2. **The GTK port is still GTK3.** wry's Linux target requires WebKitGTK ≥ 2.40 via feature `v2_40` (<https://github.com/tauri-apps/wry/blob/dev/Cargo.toml>) and `tauri-runtime-wry` still builds against GTK3. The GTK4 + WebKitGTK 6.0 migration is an **open PR** since 2025-12-21 (<https://github.com/tauri-apps/tauri/pull/14684>); a vendored variant was closed unmerged (<https://github.com/tauri-apps/tauri/pull/15680>). **[M]**
3. **The open bug cluster in §1.2–§1.5 lives on the GTK port**, plus the IME bug in §4 — so the per-platform defect rate is highest on Linux.

**Severity judgement [I]: MEDIUM–HIGH for Linux specifically.** The engine is not stale on mainstream distros, but this platform carries the densest set of open, editor-relevant bugs and the narrowest distro support.

---

## 2. Rectangular / block selection

### 2.1 No engine has a native block-selection API — so nothing regresses here

**[M]** The Selection API spec restricts a selection to **at most one range**. Multi-range selection (including "so the user could select a column of a table") existed only in Gecko: "Other browser engines never implemented the feature, and clamped selections to a single range in various incompatible fashions. This specification follows non-Gecko engines in restricting selections to at most one range…" — <https://w3c.github.io/selection-api/>.

*Therefore an app-drawn rectangular overlay is the only portable way to do block selection on **any** engine, including the Chromium it runs on today. This is parity, not a migration risk. `::selection` is a style-only pseudo-element with no geometry API, and `user-select` has no rectangular mode, so there is no engine feature being given up.* **[I]**

### 2.2 Per-character geometry via `Range.getClientRects()`

**[M] Spec text** (CSSOM View, *Extensions to the Range Interface*): `getClientRects()` must return an empty list only if the range is not in the document, and otherwise rects that match these constraints:

> "For each element selected by the range, whose parent is not selected by the range, include the border areas returned by invoking `getClientRects()` on the element. For each `Text` node selected or partially selected by the range (**including when the boundary-points are identical**), include scaled `DOMRect` object (**for the part that is selected, not the whole line box**). The bounds of these `DOMRect` objects are computed using font metrics…"
> — <https://drafts.csswg.org/cssom-view/>

Two consequences for this app:

1. **Collapsed ranges are spec-covered [M].** "including when the boundary-points are identical" is exactly the collapsed caret case, so a blocking custom caret *can* be positioned from the range API rather than from a measured marker element. **But this was historically ambiguous and engine-divergent**: CSSWG issue #1156 (opened 2017, **still open**) documents that for a collapsed range in a `contenteditable` div, Chrome/Safari returned either a zero-width rect or a *container-width* rect depending on content, while Firefox returned an empty sequence — <https://github.com/w3c/csswg-drafts/issues/1156>. The issue asks for the spec/behaviour to be pinned down and notes "Also behavior differs from browser to browser".
2. **A multi-line range yields one rect per selected line fragment, not one rect per character [M]** (spec: "for the part that is selected, not the whole line box", plus one rect per selected element). *So per-character geometry necessarily means constructing a `Range` per character position. That is the same work on Chromium today, i.e. no added cost from the migration — but it means the app's per-cell hit-testing is built entirely on top of engine behaviour that has documented bugs.*

### 2.3 Documented geometry bugs and gotchas

| Behaviour | Finding | Source |
| --- | --- | --- |
| Collapsed range inside an **empty** text node | WebKit returns **no rects**; reported as still **NEW**, measured on Safari 15.6, with Chromium matching and Firefox differing | WebKit bug 38394 — <https://bugs.webkit.org/show_bug.cgi?id=38394> ⚠︎unconfirmed |
| **Wrapped / multi-line** text | "Incorrect `getBoundingClientRect()` and `getClientRects()` for Wrapped Text" — **NEW** (2025-07-31), WebKit / Layout and Rendering | WebKit bug 296765 — <https://bugs.webkit.org/show_bug.cgi?id=296765> **[M]** |
| Line-layout mode changes rects | "simple line layout vs inline tree return different rects" | WebKit bug 172058 — <https://bugs.webkit.org/show_bug.cgi?id=172058> ⚠︎unconfirmed |
| Empty inline spans after a line break | mispositioned rects | WebKit bug 49358 — <https://bugs.webkit.org/show_bug.cgi?id=49358> ⚠︎unconfirmed |
| GTK/WPE layout-test failures in this area | Bugzilla tracks GTK/WPE failures for range geometry | WebKit bug 237501 — <https://bugs.webkit.org/show_bug.cgi?id=237501> ⚠︎unconfirmed |
| Grapheme clusters / surrogate pairs | one bug fixed (`288589@main`), one still NEW | WebKit bugs 285023, 263496 — <https://bugs.webkit.org/show_bug.cgi?id=285023>, <https://bugs.webkit.org/show_bug.cgi?id=263496> ⚠︎unconfirmed |
| Collapsed `getBoundingClientRect()` | historically always `0,0,0,0`, with Blink sharing the defect (Chromium 435438); fixed 2019 | WebKit bug 196380 (RESOLVED FIXED) — <https://bugs.webkit.org/show_bug.cgi?id=196380> ⚠︎unconfirmed |
| Hidden / overflow content | rects wrongly include hidden overflown content | WebKit bug 103430 — <https://bugs.webkit.org/show_bug.cgi?id=103430> ⚠︎unconfirmed |
| **Performance on CJK text** | `range.getClientRects()` "extremely slow on Japanese text" — **NEW**. *Directly relevant: per-cell hit-testing over a CJK line and the app's Chinese-input path* | WebKit bug 247718 — <https://bugs.webkit.org/show_bug.cgi?id=247718> ⚠︎unconfirmed |

**Assessment [I]: MEDIUM risk.** The overlay design ports unchanged and there is nothing to *lose*, because no engine offers block selection natively. The exposure is that correct per-character geometry depends on `getClientRects()` behaviour that has open WebKit bugs for exactly the two shapes this feature uses — *wrapped multi-line text* (296765) and *empty/blank positions* (38394) — plus an open CJK performance bug. Mitigations that follow from the sources: never assume `rects.length == visual lines`; fall back to a measured zero-width marker element or the container rect when the list is empty; and consider measuring geometry once per line rather than per cell if CJK lines are slow. None of these are Electron-specific capabilities — they are the same fallbacks the app would need on Chromium.

---

## 3. Clipboard

### 3.1 Tauri v2 has an official clipboard plugin — and v1's built-in API was removed

**[M]** Tauri v1 had built-in clipboard APIs; v2 **removed** them. The v1→v2 guide states: "The Rust `App::clipboard_manager` and `AppHandle::clipboard_manager` and JavaScript `@tauri-apps/api/clipboard` APIs have been removed. Use the `@tauri-apps/plugin-clipboard-manager` plugin instead." — <https://v2.tauri.app/start/migrate/from-tauri-1/>

**[M]** Platform support for the plugin: Windows/Linux/macOS full; Android/iOS partial ("Only plain-text content support") — <https://v2.tauri.app/plugin/clipboard/>

**[M]** Commands (all "Since 2.0.0", from <https://v2.tauri.app/reference/javascript/clipboard-manager/>):

- `readText(): Promise<string>` — all platforms
- `writeText(text, opts?)` — all platforms
- `readImage()`, `writeImage()` — not Android/iOS
- `writeHtml(html, altText?)` — not Android/iOS
- `clear()` — Android SDK 28+
- **There is no `readHtml`.** The docs say so directly: "we can read html data only as a string so there's just `readText()`, no `readHtml()`". Confirmed by the closed issue tauri#11917 "Missing readHtml function in plugin-clipboard-manager" — <https://github.com/tauri-apps/tauri/issues/11917>

*For a plain-text vim `p`/`y` path, `readText`/`writeText` is sufficient and is the one pair supported on all three desktop targets.* **[I]**

### 3.2 Permissions, and what fails at runtime

**[M]** The plugin is deny-by-default: "No features are enabled by default, as we believe the clipboard can be inherently dangerous and it is… Clipboard interaction needs to be explicitly enabled." Identifiers: `clipboard-manager:allow-read-text`, `allow-write-text`, `allow-read-image`, `allow-write-image`, `allow-write-html`, `allow-clear` (plus `deny-*`). — <https://v2.tauri.app/plugin/clipboard/>

**[M]** Enforcement is at the runtime authority, not only at build time: "If the origin is not allowed to call the command, the runtime authority will deny the request and the Tauri command is never invoked." — <https://v2.tauri.app/security/runtime-authority/> *So a missing capability surfaces as a rejected promise at the `p` keypress, not a silent no-op. A startup self-test is cheap insurance.* **[I]**

**[M]** Permission and **scope** are separate concerns in Tauri's ACL: on the fs plugin page, "By default all potentially dangerous plugin commands and scopes are blocked and cannot be accessed", and "Enabling a permission such as [`fs:allow-exists`] by itself does not allow access to any path." — <https://v2.tauri.app/plugin/file-system/>, <https://v2.tauri.app/security/scope/>

### 3.3 Focus / prompts

**[M]** Neither Tauri's clipboard page nor Electron's reports a focus or activation requirement. Electron 29's `clipboard` docs describe `readText([type])` returning `string` and `writeText(text[, type])`, with no focus caveat — <https://github.com/electron/electron/blob/v29.0.0/docs/api/clipboard.md>. Tauri's page likewise has none — <https://v2.tauri.app/plugin/clipboard/>. *Absence of documentation is not proof of absence.* **[I]**

**[M] Structural difference: the Tauri plugin is `async`.** All plugin commands are declared `async fn` (<https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/clipboard-manager/src/commands.rs>), so they run off the main thread. **[M] By contrast, Electron 29's main-process `clipboard.readText()` returns a `string` synchronously** (<https://github.com/electron/electron/blob/v29.0.0/docs/api/clipboard.md>). Electron is moving to a promise-based, W3C-shaped API in newer versions ("Using the clipboard API directly in the renderer process is deprecated", `readText()` "Returns Promise<string>") — <https://www.electronjs.org/docs/latest/api/clipboard>. **[M]**

*Inference for a vim app: today `p` can read the clipboard and splice text inside one keystroke's synchronous handling. With Tauri the read is a promise, so either the key handler becomes async-aware or the paste lands in a later task. That is a real semantic change to "vim-instant" paste, and it is the kind of thing the app's single-handler architecture has to absorb deliberately.* **[I]**

### 3.4 Known bugs and hazards (all v2)

| Item | State | Detail | Source |
| --- | --- | --- | --- |
| **macOS crash on `writeText()`** | **OPEN** (2026-01-12, 0 comments) | `EXC_BAD_ACCESS (SIGSEGV)`; the trace shows the plugin on a tokio worker racing `WebKit::WebPasteboardProxy::getPasteboardChangeCount` on the main thread via `NSPasteboard(NSInternal) _pasteboardWithName:`. Tauri 2.9.3 / plugin 2.3.2. Report cites Apple's rule that AppKit objects including `NSPasteboard` are main-thread-only | <https://github.com/tauri-apps/plugins-workspace/issues/3205> |
| **Linux deadlock hazard, documented in plugin source** | In-tree warning | `read_text` carries: "This method should not be used on the main thread! Otherwise the underlying libraries may deadlock on Linux, freezing the whole app, when trying to copy data copied from this app, for example if the user copies text from the WebView." | <https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/clipboard-manager/src/desktop.rs> |
| Linux `read_text` hangs indefinitely | CLOSED 2025-01-08 | Root cause of the warning above: a **synchronous** Rust command calling `read_text` hangs; making the command `async` fixed it for the reporter | <https://github.com/tauri-apps/plugins-workspace/issues/2267> |
| `readText()` on an empty clipboard rejects | **OPEN** (2024-08-10) | "The clipboard contents were not available in the requested format or the clipboard is empty" arrives as an **error**, not `""`. *This is exactly the app's "system clipboard empty → fall back to internal yank" branch: the fallback must be written against a rejection, not a falsy string* | <https://github.com/tauri-apps/plugins-workspace/issues/1646> |
| Windows: crash when the Win+V clipboard history panel is used | **OPEN** (2026-05-07) | Intermittent (~once/session), not reproducible on demand | <https://github.com/tauri-apps/plugins-workspace/issues/3415> |
| Clipboard left empty after app exit | **OPEN** (2024-03-24) | `arboard` requires the handle be dropped before exit; plugin handles it on `RunEvent::Exit` yet the issue remains open | <https://github.com/tauri-apps/plugins-workspace/issues/1107> |
| Wayland clipboard was broken | **CLOSED/fixed** | Reported in #2498, fixed by PR #2507; current v2 `Cargo.toml` uses `arboard` with `features = ["wayland-data-control"]` | <https://github.com/tauri-apps/plugins-workspace/issues/2498>, <https://github.com/tauri-apps/plugins-workspace/pull/2507> |
| **No primary-selection API** | Gap | `clipboard-manager` has no `readSelection`/`writeSelection`. Electron *does* expose a Linux `selection` clipboard (`clipboard.readText('selection')`, docs section "Properties — `selection`") | <https://v2.tauri.app/reference/javascript/clipboard-manager/>, <https://github.com/electron/electron/blob/v29.0.0/docs/api/clipboard.md> |
| `navigator.clipboard` in a Tauri webview | **OPEN** feature request | tauri#12007 reports `navigator.clipboard.*` "triggers a security prompt in the webview with an ugly dialog" — an independent reproduction of the original reason this app moved clipboard to the main process | <https://github.com/tauri-apps/tauri/issues/12007> |

**[V]/[I] macOS pasteboard privacy.** Apple's AppKit documentation reportedly announces a system alert when an app "programmatically reads the general pasteboard", shown only when the access "wasn't a result of someone's input on a UI element that the system considers paste-related" (reported at <https://9to5mac.com/2025/05/12/macos-16-clipboard-privacy-protection/>; Apple's own changelog could not be fetched in this session). No Tauri issue about this was found. *Inference: a vim `p` keystroke is a programmatic read that macOS is unlikely to classify as paste-related, making this a plausible future prompt — the same class of problem that pushed this app off `navigator.clipboard` in the first place.*

**Assessment [I]: MEDIUM–HIGH.** Read/write of plain text is officially supported on all three desktop targets and the permission model is straightforward, but (a) the macOS crash is open and trace-level attributable to the interaction between the plugin and **WKWebView's own pasteboard monitoring** — i.e. the exact combination this app creates, (b) the API is async where Electron's is sync, changing paste semantics, (c) the empty-clipboard case (the app's fallback trigger) arrives as an error, and (d) Linux primary selection has no equivalent.

---

## 4. IME support

This is the densest risk area for a CJK-capable keyboard app, with a live defect on **each** of the three platforms.

### 4.1 macOS (WKWebView)

- **[M] Safari's `isComposing` was a *partial* implementation until Safari 27.** MDN BCD records `KeyboardEvent.isComposing` with `version_added: 10.1` / `version_removed: 27` / `partial_implementation: true`, notes: *"The events for the keystroke that completes an IME composition session fire out of order, causing confusing `isComposing` values. The `keydown` and `input` events dispatch **after** the `compositionend` event fires instead of before. Consequently, the `isComposing` value is unexpectedly `false` instead of `true`. Events fired earlier in the session are unaffected."* See WebKit bug 165004 — <https://github.com/mdn/browser-compat-data/blob/main/api/KeyboardEvent.json>, <https://bugs.webkit.org/show_bug.cgi?id=165004>. The same partial implementation is recorded for `InputEvent.isComposing` (added 16.4, removed 27) — <https://github.com/mdn/browser-compat-data/blob/main/api/InputEvent.json>. **[M]**
  *This lands directly on this app's existing code.* Inspection of the repo shows the IME guard is `event.isComposing` and **nothing else** — there is no `keyCode === 229` fallback anywhere in `src/`:
  - `src/renderer/domain/keyboard/lastline-mode-handler.ts` (line 354) returns `event.isComposing || false`, with the in-code comment (lines 352–353) "当用户按回车确认拼音输入时，isComposing仍为true，直到组合完成" — *"when the user presses Enter to confirm pinyin input, `isComposing` remains true, until composition completes"* — and the `Enter` branch returns early only `if (isComposing)`.
  - `src/renderer/domain/keyboard/title-edit-mode-handler.ts` (line 15) uses `event.isComposing || false` and commits/exits edit mode on `key === 'Enter' && !isComposing`.

  *The documented WebKit behaviour on Safari < 27 is the exact inverse of that comment: the committing keystroke's `keydown` fires **after** `compositionend` with `isComposing === false`. So on a WKWebView older than Safari 27, a pinyin-confirming `Enter` would be read as a real command — the lastline handler would `preventDefault()` and execute the command, and the title handler would leave edit mode instead of letting the IME commit. Electron-side (Chromium) `isComposing` is correct, so this class of bug is invisible today. This is the concrete mechanism by which migration to WKWebView could break Chinese input, and the mitigation is the standard `keyCode === 229` fallback (or an explicit `compositionend`-timestamp guard) in addition to `isComposing`.* **[I]**
- **[M]** Composition events themselves are also used and are equally load-bearing: `src/renderer/components/TaskItem.vue` (lines 25–26, 66, 104) and `src/renderer/components/LastLine.vue` (line 8) bind `@compositionstart`/`@compositionend` to local flags — which is precisely the event trio WebKit bug 169209 reports as *not firing* on some IME paths (see below).
- **[M]** tauri#15924 "macOS: third-party IME drops the first keystroke inside the WebView (Safari with the same IME is unaffected)" — **OPEN**, 2026-08-27, Tauri 2.11.5 / wry 0.55.1. With the WeChat IME, `Shift+;` yields nothing the first press and the character on the second press, every time; Apple's built-in Pinyin is unaffected and **Safari on the same machine with the same IME is unaffected**, which the reporter uses to argue the fault is in the tao/wry hosting layer rather than WebKit. Secure Input was ruled out with `ioreg`. <https://github.com/tauri-apps/tauri/issues/15924>
- **[M]** tauri#13421 "Input event exception after using WeChat Input Method code 229" — **OPEN**, 2025-05-12, macOS, Tauri v2: the logged `keydown` shows a lowercase `k` reported with `key: "F"`, `code: "KeyF"`, `keyCode: 229`, `repeat: true`, with the reporter noting "No problem in chrome". <https://github.com/tauri-apps/tauri/issues/13421> *A wrong `key` value for a keystroke during/after IME use is precisely fatal to a key-identity-driven vim handler.* **[I]**
- **[M]** tauri#4256 "Input method can't restore chinese input state when back to tauri app" — **OPEN** since 2022-06-02 — <https://github.com/tauri-apps/tauri/issues/4256>
- **[M] WebKit has not always fired composition events for CJK IME input at all.** WebKit bug 169209 (status **NEW**, WebKit / DOM, filed 2017-03-06, re-confirmed during this research) reports that in a `contenteditable`, typing punctuation through the Sogou IME produces the event trace `textInput → input → keydown (229) → keyup (188)`, with three consequences stated by the reporter: "There is no `compositionstart`/`compositionupdate`/`compositionend` events, which there should be when using keydown WIN_IME"; "The `textInput`/`input` events are not between `keydown`/`keyup`"; and "There is no `keypress` event". <https://bugs.webkit.org/show_bug.cgi?id=169209>. *Together with the `isComposing` finding above, this means a macOS handler cannot rely on either composition events or `isComposing` alone to identify IME-originated input — a `keyCode === 229` fallback (absent from this codebase) would be doing real work here, and `keyup` cannot be assumed to match `keydown`.* **[I]**

### 4.2 Linux (WebKitGTK)

- **[M] IME preedit is disabled unconditionally in wry**, with the comment "Disable input preedit, fcitx input editor can anchor at edit cursor position":
  `if let Some(input_context) = webview.input_method_context() { input_context.set_enable_preedit(false); }`
  — <https://github.com/tauri-apps/wry/blob/dev/src/webkitgtk/mod.rs#L421-L423>
- **[M]** The pending fix, wry PR #1724 "feat(webkitgtk): make input method preedit configurable" (**open / not merged**, last updated 2026-07-22), documents the consequence: the call "landed in wry 0.29.0 to work around fcitx popup positioning on older webkit2gtk (tauri-apps/tauri#5986)" and therefore "*CJK users never see what they're composing* inside `<input>` / `<textarea>` / `contenteditable` elements — they only see characters appear after the IME commits, with **no underlined preedit** in between." A maintainer replied that wry's minimum WebKitGTK has since risen so enabling it by default might be safe, but that it "would require more testing… at least wayland and ideally also older webkitgtk/gtk versions." <https://github.com/tauri-apps/wry/pull/1724>. Applicability: wry 0.29.0+ ⇒ **late v1 and all v2**. *For an app that renders its own caret and inline editor, "composition text is never shown inline on Linux" is a user-visible functional regression, not a cosmetic one, and there is no released switch.* **[I]**
- **[M]** tauri#11412 "IME window position appears out of input/textarea (cannot inline-input) on Tauri v2 apps in Linux" — **OPEN**, 2024-10-19 (updated 2026-08-26) — fcitx/Mozc and iBus/Mozc, Tauri 2.0.4 / wry 0.46.2; the reporter states **"This issue appears only Tauri v2 apps (v1 apps do not have this issue)"**. <https://github.com/tauri-apps/tauri/issues/11412>
- **[M]** Related, closed: tauri#5986 (the report behind the preedit workaround), tauri#8264, wry#955. Still open on v1: tauri#11128 "Chinese characters cannot be input on Linux which is ubuntu 22.04" — <https://github.com/tauri-apps/tauri/issues/11128>

### 4.3 Windows (WebView2)

- **[M]** tauri#15436 "[Windows] WebView2 IME/TSF freezes on first focus of inputs with existing text (CJK input methods blocked)" — **OPEN**, 2026-05-24, Tauri 2.11.2 / wry 0.55.1, WebView2 148. Reporter's stack is **Vue 3 + Vite** — the same as this app. With a `<textarea>` or TipTap `contenteditable` **that already contains text**, the first focus freezes TSF, the composition window never opens, and "All keystrokes are swallowed until the user either types an English character or shifts focus to another input field. **Empty inputs are unaffected.**" Their root-cause claim: Chromium triggers TSF initialization and `TextInputStateChanged` simultaneously, and the out-of-order sync corrupts the `HIMC` context. <https://github.com/tauri-apps/tauri/issues/15436> *This is a direct hit: the app's inline editor is focused on a task that already has text, which is the exact trigger condition.* **[I]**
- **[M]** tauri#6879 (Weasel IME stuck in an always-on-top window) was **fixed** by wry#1451 — evidence this bug class is fixable in wry. <https://github.com/tauri-apps/wry/issues/1451>

**Assessment [I]: HIGHEST risk of the seven areas.** There is an open, current (2026) IME defect on every platform, and two of them match this app's design point exactly (a pre-populated editable on Windows; a programmatic single-handler keydown path on macOS). Linux has a structural limitation with no released opt-in. The `isComposing` finding means the app's IME guard is engine-conditional and must be tested per engine.

---

## 5. Measured startup and memory

### 5.1 No like-for-like benchmark exists

**[M]** No methodology-backed benchmark of the *same real app* in both Tauri v2 and Electron was found, on any platform — let alone a Vue 3 desktop app on macOS arm64. Every available comparison pits different applications against each other. This is the most important statement in this section.

### 5.2 The available data, with methodology and caveats

| Source | Apps compared | Platform | Startup | Memory | Methodology caveats | URL |
| --- | --- | --- | --- | --- | --- | --- |
| **Tauri official bench repo** **[M]**, read first-hand | `tauri_hello_world` / `_cpu_intensive` / `_3mb_transfer` vs `wry_*` vs `electron_*` — hello-world class only, **no real apps** | Linux/macOS/Windows CI | `exec_time` = hyperfine wall time of a self-terminating binary. Last 20 Tauri runs (2026-08-31 → 2026-09-10): **Linux** `hello_world` mean **0.686–0.764 s**; **macOS** mean **0.557–1.986 s** — a 3.6× spread on identical code. Last 20 Electron runs end **2023-09-24**: `hello_world` mean **0.453–0.646 s**. **Not startup-to-visible.** | **Linux only**, `mprof run -C` → max recursive process-tree RSS. Linux `tauri_hello_world` **259–419 MiB**; `tauri_cpu_intensive` **496–510 MiB**. Electron (2023-09) `hello_world` **425–521 MiB**; `cpu_intensive` **502–530 MiB**. | Memory is gated in source by `if cfg!(target_os = "linux")`: **`max_memory` is `{}` in all 20 recent macOS records** (verified first-hand), so no macOS/Windows memory was ever recorded. The Tauri and Electron series are ~3 years apart, so any chart of them compares different builds. Plain RSS, no PSS/USS correction. Binary size: Tauri **2.79 MB (macOS) / 2.95 MB (Linux)** vs Electron **166.5 MB**. | <https://github.com/tauri-apps/benchmark_results> (branch `gh-pages`), <https://github.com/tauri-apps/tauri/blob/dev/bench/src/run_benchmark.rs> |
| **GitSquid** **[V]** | GitSquid (Tauri 2.x, the vendor's own app) vs GitKraken & GitHub Desktop (Electron) vs Fork (native), same repo open | macOS 15, M2, 16 GB | Cold, human stopwatch until repo visible: Tauri ~0.7 s; Electron ~3.5 / ~2.0 s; native ~0.5 s | Idle: Tauri ~180 MB; Electron ~750 / ~450 MB; native ~150 MB. `ps -o rss` of "the main process and any helper processes", summed, after 30 s idle | Disclosed vendor blog. Stopwatch is operator-dependent. "Any helper processes" never specifies whether launchd-parented `com.apple.WebKit.WebContent` was counted — if walked by PPID the Tauri figure is understated. | <https://gitsquid.dev/blog/tauri-vs-electron-git-clients/> |
| **Ironcall** **[V]** | Ironcall (Tauri, vendor's own app) vs Postman vs Insomnia, clean profile | Linux (EndeavourOS, i9-14900KF, XWayland) | Cold time-to-window, median of 5: Tauri 0.095 s; Postman 0.47 s; Insomnia 1.08 s | Idle **PSS, full process tree**: Tauri 279 MB; Postman 664 MB; Insomnia 822 MB. Install 29 / 394 / 1538 MiB | Disclosed vendor blog. Explicitly states WebKitGTK helpers were counted ("Neither side gets undercounted") — the only source found that names WebKitGTK helper inclusion. Linux-only. | <https://dev.to/ironcall/our-api-client-is-a-29-mb-binary-and-starts-in-01s-heres-the-tauri-vs-electron-footprint-with-2h18> |
| **tauri#5889** (filed by a Postman engineer; neither vendor) **[M]** | Tauri v1 vs Electron vs Safari vs Chrome, loading `postman.com` and `vscode.dev` | macOS 12.6.1 / Ubuntu 22.04.1 / Windows 10 | not measured | postman.com: **macOS** Tauri 421 / Electron 337 / Safari 471 / Chrome 381 MB; **Ubuntu** Tauri 581 / Electron 240 / Chrome 370 MB; **Win10** Tauri 399 / Electron 318 MB. Ubuntu default apps: Electron USS 118 / PSS 207 MB; Tauri USS 125 / PSS 185 MB | Stated: 800×600 window, remote site via `window.location.replace`, 30–90 s rest, ≥2 runs, mean. Caveats: remote web apps not local apps; the main table applies **no shared-memory correction** (the reporter's whole point); on macOS "Memory" is Activity Monitor's `phys_footprint`, not RSS. Tauri maintainer Beanow in-thread: the official benchmark "need[s] to be taken with a good handful of salt… **by no means a scientific report**." | <https://github.com/tauri-apps/tauri/issues/5889> |
| **Microsoft WebView2 performance guidance** **[V]** | WebView2 itself | Windows | **No number.** Cold launch "must spin up its processes and disk caches, which can introduce a noticeable delay" | **No number.** "each control launches multiple browser engine processes that add memory and startup overhead" | Qualitative only. Also notes that version-matched Edge/WebView2 binaries are "already in memory, improving launch performance" — i.e. part of the engine cost is not attributable to your app. | <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance> |
| **Microsoft engineer, WebView2Feedback #799** (informal) | WebView2 baseline process set | Windows | not measured | No MB figure: "5 processes initially (browser, renderer, GPU, network, etc.)… each additional WebView2 is similar to opening a new browser tab" | Notes Task Manager vs Process Explorer disagree because one double-counts shared memory — the accounting caveat from the vendor's own side. | <https://github.com/MicrosoftEdge/WebView2Feedback/issues/799> |
| **Un-sourced figures — rejected here** | — | — | "Tauri <1 s" / "Electron 1–3 s" with no methodology | "Tauri 30–40 MB idle", "Rust backend ~8 MB, WebView ~25 MB"; an MS Q&A answer "each renderer process takes around 30MB" | **No methodology, machine, or versions.** The 30–40 MB claim is contradicted by every measured source above, including Tauri's own Linux *hello-world* at 402 MiB. Listed only so this report explicitly rejects them. | <https://learn.microsoft.com/en-ca/answers/questions/1187995/share-one-renderer-process-for-multiple-webview2-i> |

**[M]** The Linux-only gate on memory collection was verified directly in Tauri's harness: `if cfg!(target_os = "linux") { … new_data.max_memory = run_max_mem_benchmark(target)?; }` — <https://github.com/tauri-apps/tauri/blob/dev/bench/src/run_benchmark.rs>. The consequence is visible in the published data: **all 20 recent macOS records carry `max_memory: {}`**. So Tauri's own published comparison **cannot** support a memory claim on macOS or Windows at all. The `exec_time` figures are equally unusable as a startup comparison: they measure a self-terminating binary, not time-to-visible, and the macOS series for the *same* hello-world binary spans 0.557–1.986 s across 20 consecutive runs.

### 5.3 The memory-attribution trap (the most decision-relevant finding)

**[M]** On macOS, WKWebView's content processes are not reliably descendants of the app's process tree, so a "process-tree total RSS" measured the same way as this repo's 389 MB baseline will **silently omit them**. Evidence: a `cmux` PR exists specifically to "Preserve **ppid=1** WebKit WebContent accounting through explicit WebView root PID attribution", reporting `ps` output with 99 launchd-parented `com.apple.WebKit.WebContent` processes totalling ~6.3 GB RSS on one machine (<https://github.com/manaflow-ai/cmux/pull/4190>); a companion PR states WebKit GPU/Networking XPC helpers "are **not descendants of the app process tree**" (<https://github.com/manaflow-ai/cmux/pull/3587>). Separately, Activity Monitor's "Memory" column is `phys_footprint`, not `ps` RSS (<https://github.com/manaflow-ai/cmux/issues/4129>), which is why the #5889 macOS numbers are a third metric again.

*Inference: a naive Tauri-on-macOS measurement will flatter Tauri for instrumentation reasons alone. Any Tauri build must be measured with explicit WKWebView process attribution (by PID set, not by walking PPID) before its memory number means anything.* **[I]**

### 5.4 Per-platform asymmetry

- **[M]** **Windows:** WebView2 *is* Chromium and is "distributed as part of the operating system" on Windows 10 (April 2018+) and Windows 11 (<https://v2.tauri.app/distribute/windows-installer/>). *So the engine is already resident and version-matched; the removable part is Electron's Node runtime plus Electron's own main process, not the engine.* **[I]** In #5889's Windows row Tauri measured **higher** (399 vs 318 MB) **[M]**.
- **[M]** **macOS/Linux:** WKWebView and WebKitGTK are OS-provided but are still separate multi-process engines with their own memory. #5889 measured Tauri **higher** on both (macOS 421 vs 337; Ubuntu 581 vs 240 MB) **[M]**. Tauri's docs concede the general point: the webviews are "dynamically linked at runtime… you need to keep platform differences in mind" (<https://v2.tauri.app/concept/process-model/>) **[M]**.

### 5.5 Per-platform cost of *shipping* the webview

**[M]** On Windows the WebView2 runtime is bootstrapped by the installer: `webviewInstallMode` defaults to `{ "type": "downloadBootstrapper", "silent": true }`, which "downloads the bootstrapper and runs it. Requires an internet connection but results in a smaller installer size"; `embedBootstrapper` adds ~1.8 MB; `offlineInstaller` adds ~127 MB. — <https://v2.tauri.app/distribute/windows-installer/>, <https://v2.tauri.app/reference/config/> **[M]/[I]** *An offline-capable installer therefore costs ~127 MB on Windows — the size argument inverts for that target.*

---

## 6. What Tauri does NOT solve

### 6.1 Against this app's measured baseline

| Measured cost (in-repo baseline) | Does Tauri reduce it? |
| --- | --- |
| Startup 292 ms total, of which **~95 ms is the Electron binary launch floor** | **Partly, unquantified.** Tauri removes the Electron/Chromium launcher and Node init, but adds a Rust binary launch plus an OS-webview spawn. Microsoft documents that cold WebView2 launch "must spin up its processes and disk caches, which can introduce a noticeable delay" (<https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance>) **[V]**. **No source gives Tauri's own launch floor or WKWebView/WebView2 init cost in ms.** Tauri's harness has no startup-to-visible metric on any platform, and its `exec_time` for the *same* hello-world binary spanned 0.557–1.986 s across 20 consecutive macOS runs **[M]**. So the 95 ms figure has **no measured Tauri counterpart**. **[I]** |
| Startup ~197 ms of app logic (main init + renderer load + first frame) | **Not reduced.** It must be reimplemented in Rust/rewired and re-measured. The dev-server cost (352–921 ms of `did-finish-load`) is explicitly runtime-independent per the baseline doc. **[M] (baseline) / [I]** |
| Process-tree total RSS 389 MB | **Partly, unquantified, and possibly not as much as expected.** The Node/Electron main process is genuinely removable. The webview's DOM, JS heap, style/layout and compositor are not — they are intrinsic to running a webview at all, and per #5889 the web-side cost dominates for web-heavy apps **[M]**. On Windows the engine is already resident **[M]**. |
| Main process RSS 175 MB | **Largely removable [I]** — it is Electron's main process. *This is the single most defensible expected win, and it is the one component the baseline doc already identifies as architecture-bound.* |
| No measured "after" number exists | **Nothing to plan against.** There is no methodology-backed Tauri v2 figure for a real Vue/React frontend on macOS. **[M]** |

### 6.2 Is there a credible memory floor?

**[M]** No vendor publishes one. Microsoft says only that each WebView2 control launches multiple engine processes with added memory and startup cost (<https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance>); an MS engineer describes a 5-process baseline per control roughly equal to a new browser tab (<https://github.com/MicrosoftEdge/WebView2Feedback/issues/799>) **[V]**. The three real-app proxies found are Ironcall **279 MB PSS** (Linux, full tree, vendor, method stated), GitSquid **~180 MB summed RSS** (macOS, vendor, helper attribution ambiguous), and Tauri's own Linux **hello-world binary at 259–419 MiB across 20 recent CI runs** **[V]/[M]**.

**[V]/[I]** The widely repeated "Tauri idles at 30–40 MB" figure is unsourced and contradicted by every measured source including Tauri's own hello-world. *A defensible expectation for this app is the 180–400 MB class — likely well under 2× the current tree, not the 5–10× in marketing tables. That is an inference, not a measurement, and it should be replaced by an actual measurement before any decision.*

### 6.3 What Tauri *adds*

- **[M] Linux packaging.** AppImage "grows from the 2-6 MB range to 70+ MB" once dependencies are bundled, with `GLIBC_2.33 not found` if built on a newer base — "build using the oldest base system you intend to support" (<https://v2.tauri.app/distribute/appimage/>). The v2 `webkit2gtk-4.1` requirement drops Ubuntu ≤20.04 (§1.6).
- **[M] A binary-size regression v1→v2**, tracked in tauri#12820 ("roughly from 3 MiB to 6.2 MiB"; the same report's own `cargo-bloat` output is internally inconsistent at 6.2→9.8 MiB, so only the direction is reliable) — <https://github.com/tauri-apps/tauri/issues/12820>.
- **[M] An evergreen webview you do not control.** Microsoft's distribution guidance tells Evergreen apps to "set up testing infrastructure" and feature-detect, because the engine can change under a shipped app (<https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution>). On macOS the engine is pinned to the OS version, and "unsupported macOS versions do not receive WebKit updates" (<https://v2.tauri.app/reference/webview-versions/>).
- **[V] Cross-engine behavioural divergence to work around**, per two real Tauri app vendors: WebKitGTK has no native undo in text inputs, OS-themed `<select>`, `Ctrl+Shift+Tab` swallowed by GTK, strict CSP blocking `new Function()`, and no Linux in-place updater (<https://dev.to/ironcall/our-api-client-is-a-29-mb-binary-and-starts-in-01s-heres-the-tauri-vs-electron-footprint-with-2h18>); plus webview inconsistency, a required Rust toolchain on every dev machine, and a smaller ecosystem (<https://gitsquid.dev/blog/tauri-vs-electron-git-clients/>).
- **[I] The structural cost: three engines instead of one.** Today the app tests one Chromium. After migration it must validate its entire keyboard/selection/caret/IME contract against WKWebView **and** WebView2 **and** WebKitGTK. For a product whose entire value is keystroke fidelity, that is the largest recurring cost in this document, and no benchmark captures it.

---

## 7. Migration cost signals

### 7.1 The IPC pattern is directly supported

**[M]** Tauri's `invoke` ↔ `#[tauri::command]` pair is the direct analogue of `ipcRenderer.invoke` ↔ `ipcMain.handle`: commands are defined with `#[tauri::command]` and registered via `tauri::Builder::default().invoke_handler(tauri::generate_handler![…])`; the frontend calls `invoke` from `@tauri-apps/api/core`, which returns a promise. Command names must be unique (not module-scoped). — <https://v2.tauri.app/develop/calling-rust/>

**[M] Threading, verbatim:** "Async commands are executed on a separate async task using `async_runtime::spawn`. **Commands without the `async` keyword are executed on the main thread** unless defined with `#[tauri::command(async)]`." — <https://v2.tauri.app/develop/calling-rust/>. *This is what makes the clipboard main-thread deadlock (§3.4) a live trap: a sync command that touches the clipboard can freeze the app on Linux.*

**[M] Push counterpart and its documented limit:** `Emitter::emit`/`emit_to` (Rust) and `listen` (JS) — <https://v2.tauri.app/develop/calling-frontend/>. The event system "is not designed for low latency or high throughput situations", payloads are always JSON strings, and events/channels have no fine-grained capability control. **[M]**

**[M] v2 IPC rewrite:** the Tauri 2.0 post announces an "IPC Rewrite" adding Raw Payloads/Raw Requests, `tauri::ipc::Channel`, and custom protocols, stating "Previously all IPC payloads were json serialized and deserialized which caused an overhead. **This was noticeable once more than a few kilobytes were transfered.**" — <https://v2.tauri.app/blog/tauri-20/>. **No quantitative Tauri-vs-Electron IPC benchmark was found**; any speedup figure would be inference.

**[M] Argument-naming gotcha:** invoke arguments are sent as a JSON object and default to **camelCase** keys; `#[tauri::command(rename_all = "snake_case")]` opts out. The v1 module `@tauri-apps/api/tauri` was renamed to `@tauri-apps/api/core` in v2, and the non-core modules (`fs`, `dialog`, `os`, `clipboard`, `updater`) were moved out to `@tauri-apps/plugin-*` — <https://v2.tauri.app/develop/calling-rust/>, <https://v2.tauri.app/start/migrate/from-tauri-1/>

### 7.2 There is **no** official Electron → Tauri migration guide

**[M]** `https://v2.tauri.app/start/migrate/from-electron/` returns HTTP 404. The v2 sitemap's migrate section contains only `from-tauri-1` and `from-tauri-2-beta`, and the migrate index page describes exactly those two paths — <https://v2.tauri.app/sitemap-index.xml>, <https://v2.tauri.app/start/migrate/>. The confirmed guide is **Tauri v1 → v2, not Electron → v2** (<https://v2.tauri.app/start/migrate/from-tauri-1/>). Corroborating: tauri-docs issue #1344 lists "Electron to Tauri" as an unchecked roadmap item (<https://github.com/tauri-apps/tauri-docs/issues/1344>), and PR #1465 merged a 7-line `from-electron.mdx` containing only `<Stub />` that never shipped (<https://github.com/tauri-apps/tauri-docs/pull/1465>).

### 7.3 What has to be rewritten

| Electron construct (this app) | Tauri v2 equivalent | What changes | Source |
| --- | --- | --- | --- |
| `preload` + `contextBridge` | Native `invoke` + capabilities; optional `withGlobalTauri`; Isolation Pattern for IPC-input validation | No preload, no isolated world, **no Node APIs in the webview at all** | <https://v2.tauri.app/develop/calling-rust/>, <https://v2.tauri.app/concept/inter-process-communication/isolation/> |
| `ipcMain.handle` | `#[tauri::command]` + `generate_handler!` | Rewritten in **Rust**; unique names; `async` = off-main-thread task | <https://v2.tauri.app/develop/calling-rust/> |
| `ipcRenderer.invoke` | `invoke()` from `@tauri-apps/api/core` | Module renamed from `api/tauri`; camelCase args by default; promise rejects on `Err` | <https://v2.tauri.app/develop/calling-rust/> |
| Main-process `fs` for `tasks.json` / `prefs.json` under `~/.vido` | `@tauri-apps/plugin-fs` (`readTextFile`/`writeTextFile`) + `BaseDirectory`, or a custom Rust command using `std::fs` | Plugin route: needs **permission *and* an allow-scope** — "Enabling a permission such as `fs:allow-exists` by itself does not allow access to any path". Custom-command route: no scope needed (see note below) | <https://v2.tauri.app/plugin/file-system/>, <https://v2.tauri.app/security/scope/> |
| Main-process `clipboard` | `@tauri-apps/plugin-clipboard-manager` | Now a plugin with ACL; v1's built-in API was **deleted**; async only; reads can reject on an empty clipboard | <https://v2.tauri.app/plugin/clipboard/>, <https://github.com/tauri-apps/plugins-workspace/issues/1646> |
| Main-process `path`, `os` | `@tauri-apps/api/path` (core), `@tauri-apps/plugin-os` | `path` stayed core; `os` moved to a plugin | <https://v2.tauri.app/plugin/os-info/> |
| `webContents.send` / `ipcRenderer.on` | `emit`/`listen`; `Channel` for streams | JSON-only, not for low latency/high throughput | <https://v2.tauri.app/develop/calling-frontend/> |
| `electron-builder.json5` | `tauri.conf.json` `bundle` (`deb`, `rpm`, `appimage`, `nsis`, `msi`, `app`, `dmg`) | Config format and key names fully rewritten | <https://v2.tauri.app/reference/config/>, <https://v2.tauri.app/distribute/> |
| macOS universal (`@electron/universal`) | `tauri build --target universal-apple-darwin` | Requires both `aarch64-apple-darwin` and `x86_64-apple-darwin` installed; no ASAR-merge concept | <https://v2.tauri.app/reference/cli/> |
| `autoUpdater` / `electron-updater` | `@tauri-apps/plugin-updater` + static JSON manifest | Signature verification cannot be disabled; requires `pubkey` + `endpoints` + `createUpdaterArtifacts`. **Losing the private key permanently prevents updating installed users** | <https://v2.tauri.app/plugin/updater/> |
| `mac.notarize` (electron-builder) | `bundle.macOS.signingIdentity` + `APPLE_CERTIFICATE` / `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` (or API-key vars) | Notarization driven by CLI env vars rather than a builder option | <https://v2.tauri.app/distribute/sign/macos/>, <https://v2.tauri.app/reference/environment-variables/> |
| `win.certificateFile` (electron-builder) | `bundle.windows.certificateThumbprint` / `signCommand` + `TAURI_WINDOWS_SIGNTOOL_PATH` | Different key names; Azure Key Vault path documented | <https://v2.tauri.app/distribute/sign/windows/> |
| Unrestricted Node main process | **ACL**: capability files under `src-tauri/capabilities/` | Deny-by-default for plugin/core commands; per-command permission *and* scope | <https://v2.tauri.app/security/capabilities/>, <https://v2.tauri.app/plugin/file-system/> |
| GitHub Actions + curl installer upload | `tauri-apps/tauri-action@v1` | Action builds, signs and creates the release, and feeds the updater manifest | <https://v2.tauri.app/distribute/pipelines/github/> |
| **Vite + Vue renderer** | `build.beforeDevCommand` / `devUrl` / `frontendDist` | **Carries over** essentially unchanged (Tauri spawns Vite itself instead of the app waiting for an external dev server) | <https://v2.tauri.app/start/frontend/vite/> |

**[M]** One nuance that softens the ACL cost: **custom commands are not deny-by-default.** "By default, all commands that you registered in your app (using `tauri::Builder::invoke_handler`) are allowed to be used by all the windows and webviews of the app." Restricting them requires `AppManifest::commands` in `build.rs` — <https://v2.tauri.app/security/capabilities/>. The deny-by-default regime applies to **plugin** and core commands and scopes. **[I]** *So the task/prefs file I/O in §7.3 can be implemented as custom Rust commands without a scope declaration, sidestepping the fs-plugin scope entirely; the ACL burden falls mainly on the plugins you choose to adopt.*

**[I] Effort read:** the renderer (~14,900 lines) is largely reusable, including the entire keyboard layer, because it is DOM/JS and the webview is still a webview. The main process (small TS) is a full Rust rewrite plus an ACL pass. Packaging, signing, notarization and the updater are config rewrites plus a new key-management obligation. No official migration guide means the sequence must be derived from the v2 docs and this report's engine findings.
---

## Bottom line for a keyboard-first vim-modal editor

Ranked by severity for *this* product. "Risk" = probability × damage to the specific guarantees the app makes (every keystroke routed through one handler, unbound keys consumed, exact caret/selection geometry, synchronous-feeling paste, CJK entry).

| # | Risk | Severity | Why it is severe here | Sources |
| --- | --- | --- | --- | --- |
| 1 | **IME breaks the single-handler invariant, on all three engines** | **HIGH (blocking on Windows and Linux; code-level defect on macOS)** | Windows: a pre-populated `contenteditable` freezes TSF on first focus and swallows CJK keystrokes — the app's editor is focused on text that already exists. Linux: IME preedit is disabled unconditionally in wry, so composition text is never shown inline, with no released opt-in; the IME candidate window is mispositioned in v2 only. macOS: a third-party IME drops the first keystroke inside the WebView while Safari on the same machine is fine, and Safari's `isComposing` reports `false` for the composition-committing keystroke on any Safari older than 27 — which is **the only guard this app uses**, with no `keyCode === 229` fallback in `src/`, so a pinyin-confirming `Enter` would execute a lastline command or exit title editing. Composition events, which the app also binds, are additionally reported as not firing at all on some WebKit IME paths | §4.1–4.3; <https://github.com/tauri-apps/tauri/issues/15436>, <https://github.com/tauri-apps/wry/pull/1724>, <https://github.com/tauri-apps/wry/blob/dev/src/webkitgtk/mod.rs#L421-L423>, <https://github.com/tauri-apps/tauri/issues/11412>, <https://github.com/tauri-apps/tauri/issues/15924>, <https://github.com/mdn/browser-compat-data/blob/main/api/KeyboardEvent.json>, <https://bugs.webkit.org/show_bug.cgi?id=169209>, `src/renderer/domain/keyboard/lastline-mode-handler.ts`, `src/renderer/domain/keyboard/title-edit-mode-handler.ts` |
| 2 | **The "every keystroke reaches one keydown handler, unbound keys consumed" guarantee cannot be enforced against the OS/menu layer** | **HIGH** | Keys claimed by native menu accelerators or the GTK/host layer never produce a `keydown`, so no amount of `preventDefault` can consume them. Documented instances: Cmd+B/I/U in WebKit contenteditable, `Ctrl+Shift+Tab` swallowed by GTK, single-key accelerators swallowing characters in inputs on Linux, `Cmd`+Z broken in v2 editors on macOS. Electron at least exposes `before-input-event` + `setIgnoreMenuShortcuts`; Tauri documents no equivalent, and disabling browser shortcuts is still an open Tauri feature request | §1.2; <https://bugs.webkit.org/show_bug.cgi?id=24943>, <https://bugs.webkit.org/show_bug.cgi?id=304117>, <https://github.com/tauri-apps/tauri/issues/7418>, <https://github.com/tauri-apps/tauri/issues/10482>, <https://github.com/tauri-apps/tauri/issues/10148>, <https://github.com/electron/electron/blob/v29.0.0/docs/api/web-contents.md>, <https://dev.to/ironcall/our-api-client-is-a-29-mb-binary-and-starts-in-01s-heres-the-tauri-vs-electron-footprint-with-2h18> |
| 3 | **Test surface triples: one Chromium → WKWebView + WebView2 + WebKitGTK** | **HIGH (recurring, structural)** | The product IS its keyboard model, so every engine must be validated against key sequences, count prefixes, three visual modes, caret geometry, IME and paste. There is no benchmark or framework feature that reduces this; it is the true cost of "use the OS webview" | §1, §6.3 **[I]** |
| 4 | **Clipboard: open macOS crash on the exact plugin↔WKWebView interaction, async-only API, error-on-empty** | **MEDIUM–HIGH** | `writeText()` has an open `SIGSEGV` report traced to a race with `WebKit::WebPasteboardProxy`; the API is promise-based where Electron 29's is synchronous, changing paste from same-keystroke to deferred; an empty clipboard rejects rather than returning `""`, which is precisely this app's fallback trigger; no Linux primary-selection API; plus a plausible macOS pasteboard-privacy prompt for programmatic reads | §3.3–3.4; <https://github.com/tauri-apps/plugins-workspace/issues/3205>, <https://github.com/tauri-apps/plugins-workspace/issues/1646>, <https://github.com/electron/electron/blob/v29.0.0/docs/api/clipboard.md>, <https://github.com/tauri-apps/plugins-workspace/issues/2267> |
| 5 | **WebKitGTK as a third platform: open rendering/layout/IME bugs, and v2 narrows distro support** | **MEDIUM** | Blank-window/flicker/resize-crash class documented by Tauri itself; measurable font-weight offset; Wayland child-bounds bug; IME positioning regression vs v1; and `webkit2gtk-4.1` does not exist for Ubuntu ≤20.04, which Electron 29 currently supports. Version lag on mainstream LTS distros is only ~1–2 minor releases, so the risk is bug density and distro floor, not engine age | §1.5–1.6; <https://v2.tauri.app/develop/debug/linux-graphics/>, <https://github.com/tauri-apps/tauri/issues/14286>, <https://github.com/tauri-apps/tauri/issues/15656>, <https://launchpad.net/ubuntu/focal/+package/libwebkit2gtk-4.1-0> |
| 6 | **Per-character geometry for the block-selection overlay rests on buggy `getClientRects()` corners** | **MEDIUM** | The overlay design ports unchanged (no engine has native block selection), but correct geometry depends on WebKit rect behaviour that has **open** bugs for *wrapped multi-line text* and *empty/blank positions* — the two shapes a rectangular selection actually spans — plus an open bug for `getClientRects()` performance on CJK text. Requires per-engine calibration and explicit empty-rect fallbacks | §2.2–2.3; <https://bugs.webkit.org/show_bug.cgi?id=296765>, <https://bugs.webkit.org/show_bug.cgi?id=38394>⚠︎, <https://bugs.webkit.org/show_bug.cgi?id=247718>⚠︎, <https://github.com/w3c/csswg-drafts/issues/1156>, <https://w3c.github.io/selection-api/> |
| 7 | **Memory: real but unquantified, with a measurement trap that will overstate the win** | **MEDIUM (decision-relevant)** | Electron's Node/175 MB main process is genuinely removable; the webview's DOM/JS/compositor cost is not. The only non-vendor measurement of the same web app puts Tauri **higher** on macOS, Linux and Windows, and WKWebView's processes will be missed by a naive process-tree RSS sum on macOS — the same method used for this repo's 389 MB baseline | §5.3–5.5; <https://github.com/tauri-apps/tauri/issues/5889>, <https://github.com/manaflow-ai/cmux/pull/4190>, <https://github.com/tauri-apps/tauri/blob/dev/bench/src/run_benchmark.rs> |
| 8 | **Startup: only the ~95 ms Electron floor is addressable, and there is no measured Tauri counterpart** | **LOW–MEDIUM** | Tauri's own harness has no startup-to-visible metric and its Linux-only memory gate means no macOS number exists; Microsoft documents that cold WebView2 launch is not free. The other ~197 ms is app logic that must be rewritten and re-measured regardless | §5.2, §6.1; <https://github.com/tauri-apps/tauri/blob/dev/bench/src/run_benchmark.rs>, <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance> |
| 9 | **Native undo/redo desync and programmatic-mutation caveats** | **LOW** | The app has its own `u`/undo stack, so it does not depend on the engine's undo. Documented v2 macOS editor failures are a signal about the hosting layer, not a functional blocker | §1.3; <https://github.com/tauri-apps/tauri/issues/10148>, <https://github.com/tauri-apps/tauri/issues/9426> |
| 10 | **Migration effort: full Rust rewrite of the main process, ACL pass, code-signing and updater key management, with no official guide** | **MEDIUM (cost, not risk)** | Small main process today (IPC file I/O + clipboard + paths) makes this tractable; the renderer carries over. The updater's un-disableable signature scheme creates a new operational obligation (private-key loss ⇒ no future updates) | §7.3; <https://v2.tauri.app/start/migrate/>, <https://v2.tauri.app/plugin/updater/> |

**What Tauri would plausibly buy, stated conservatively [I]:** the Electron binary-launch share of startup (~95 ms of 292 ms) and the Node/main-process share of memory (up to ~175 MB of a 389 MB tree), on macOS and Linux, with a smaller share on Windows where the Chromium engine is already resident. Those two numbers are the whole of the quantified upside found in this research; everything else is either unmeasured, platform-conditional, or a new cost.

**What remains intrinsic to running a webview at all [I]:** the DOM/CSS/JS heap, style and layout, compositor and paint cost; per-keystroke layout and scroll behaviour; and the fact that keystroke fidelity is a property of the host webview rather than of the framework.

---

## Open questions / not found

1. **No methodology-backed benchmark of the same real app in Tauri v2 and Electron**, on any platform, let alone a Vue 3 app on macOS arm64. Every comparison found pits different apps against each other.
2. **No credible idle-memory figure for a Tauri v2 app with a real Vue/React frontend on macOS.** The available points are one vendor blog (~180 MB, helper attribution ambiguous) and an informal report of a `tauri://localhost` WKWebView at ~600–700 MB for a Monaco+xterm.js app, which states no methodology and is internally inconsistent (<https://github.com/Sidenai/sidex/issues/77>). Neither should be quoted.
3. **No numeric launch floor for Tauri, WKWebView init, or WebView2 cold init, in ms,** from any source reached. The 95 ms Electron floor therefore has no measured counterpart.
4. **Tauri's official benchmark has zero macOS/Windows memory data** (Linux-gated in source; `max_memory` is `{}` in all 20 recent macOS records) **and no startup-to-visible metric on any platform.** The Tauri and Electron series in that repo are also ~3 years apart, so its published charts compare different builds; the one directly usable number it yields is binary size (Tauri ~2.8 MB vs Electron ~166 MB).
5. **No independent (non-vendor) real-app Tauri-vs-Electron benchmark** was found; the two real-app comparisons are both published by the vendors of the Tauri apps measured.
6. **No source quantifies the Windows-only "Node runtime" saving in MB**, nor the saving from Edge/WebView2 binaries already being resident.
7. **No PSS/USS-corrected Tauri-vs-Electron comparison on macOS.** The only PSS data found is Linux (Tauri 185 vs Electron 207 MB).
8. **No Tauri measurement of WKWebView memory with explicit WebKit root-PID attribution** — the one experiment that would make the macOS memory question answerable.
9. **No WebKitGTK feature-parity matrix** (which upstream WebKit/Safari feature ships in which WebKitGTK release). Only version numbers and distro package data are available.
10. **No documented Tauri equivalent of Electron's `before-input-event` / `setIgnoreMenuShortcuts`**, and no documentation of whether menu accelerators can be made to defer to the webview. The absence of an API is not proof that one does not exist; it was not found in the v2 docs.
11. **No Tauri documentation of a focus/activation requirement for clipboard reads**, and Electron's page is likewise silent. Absence of documentation is not proof of absence.
12. **No Tauri issue found about macOS pasteboard-privacy alerts** affecting `NSPasteboard` reads; Apple's own AppKit changelog could not be fetched. The app-specific impact is inference.
13. **`bugs.webkit.org` was down (HTTP 503) for the entire write-up pass**, in both search and single-bug endpoints. The unconfirmed set is: WebKit bugs 38394, 247718, 304117, 196380, 172058, 49358, 237501, 285023, 263496, 103430, 200558, 204694, 321420. 24943, 169209 and 296765 were re-confirmed, and 165004 is corroborated by the MDN compatibility note quoted in §4.1. The load-bearing §2 geometry conclusions do not depend on any single unconfirmed bug: they are anchored on the CSSOM View spec algorithm and CSSWG issue #1156, both fetched directly.
14. **Not investigated in this pass:** the Rust toolchain / Xcode / WebKitGTK build prerequisites as a CI cost, the Isolation Pattern's performance overhead, Windows arm64 and Linux arm64 bundling specifics, and `tauri.conf.json` CSP implications for the app's inline styles.
