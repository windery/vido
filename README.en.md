# Vido

[中文](README.md) | English

> **A Todo for programmers** — fully vim-keybound, with the terminal-geek aesthetic of monochrome CRT phosphor green, monospace type, and a block cursor.
> Hands never leave the keyboard; manage tasks the way you edit code.

```
  1 !!! › buy milk                  #errand ⚑
  2 !!  › weekly report      ◷ 2026-08-14
  3 !   › read "The Pragmatic Programmer"  ▰▰▰▱ 3/4
-- NORMAL -- (j k move · o new · i content · ? help)
```

Vido is a desktop todo app (macOS / Windows / Linux) whose interaction layer follows the vim paradigm: modal editing, key sequences (`dd`, `yy`, `gg`), count prefixes, and zero mouse dependency.

## Features

- **Fully keyboard-driven**: vim modes (NORMAL / INSERT / VISUAL block), every feature has a binding — the mouse is decoration
- **Task-level vim editing**: the task list is a buffer — `j/k` move, `dd` delete, `yy`/`p` copy/paste tasks, `u`/`Ctrl-R` undo/redo, `{n}G` jump, `zz` center
- **Content is vim too**: full vim text editing inside task content (`dw`/`cw`/`y$`/`r`/`~`/`J`…) plus **Ctrl+V visual-block editing** (rectangular selection delete/copy, `p` replaces the block)
- **Markdown content**: content renders as Markdown (headings / code blocks / lists / quotes) and stays plain text while editing
- **Scheduling**: quick schedules (today / tomorrow / next week), custom date & time, daily/weekly/monthly/yearly repeats, overdue hints
- **Calendar view**: `g c` opens it — day/week/month granularities, `jkhl` 2D movement, number jumps to dates, Enter drills into the day's tasks
- **Priority / flag / tags / indent**: ANSI red-yellow-green `!!!`/`!!`/`!` marks, `⚑` flag, `#tag`, subtask indentation
- **Seamless system clipboard**: `p` pastes whatever you copied elsewhere; yanks are written back to the system clipboard
- **Local-first**: data persisted as JSON (auto-save), no account, no uploads, no cloud
- **Programmer aesthetics**: phosphor-green monochrome + ANSI color codes + ASCII `▰▱` progress bars + block cursor

## Install

Download the installer for your platform from [GitHub Releases](https://github.com/windery/vido/releases) (every `v*` tag builds all platforms automatically):

| Platform | Formats |
|---|---|
| macOS (Intel / Apple Silicon / Universal) | dmg + zip |
| Windows (x64 / arm64) | NSIS installer + portable zip |
| Linux (x64 / arm64) | AppImage + deb |

> **macOS "unidentified developer" on first launch** (downloaded apps carry a quarantine attribute): right-click Vido.app → Open → Open again; or System Settings → Privacy & Security → Open Anyway. If it says "damaged": run `xattr -cr /Applications/Vido.app` in the terminal.

> **Slow Electron downloads (CN network)**: set the mirror `export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` when building from source.

## Quick start

1. Launch Vido → press `o` → type a task title → `Enter`
2. `j` / `k` select tasks, `Space` toggles completion, `f` flags, `dd` deletes
3. With a task selected press `i` to edit its content as vim Markdown notes; `Esc` to go back
4. Press `cc` to open the config panel for schedule / priority / tags; `T` switches dark/light theme
5. Stuck? Press `?` anytime for the full keymap of the current context

## Keymap

### Task list (NORMAL mode)

| Key | Action |
|---|---|
| `j` / `k` | Move down / up |
| `gg` / `G` | First / last task |
| `{n}G` / `{n}gg` | Jump to the n-th task |
| `zz` / `zt` / `zb` | Scroll: selected to center / top / bottom |
| `Ctrl-D` / `Ctrl-U` | Half page down / up |
| `o` / `O` | New task below / above |
| `Enter` | Edit title |
| `i` | Edit content (vim text mode) |
| `Space` | Toggle completion |
| `f` | Toggle flag `⚑` |
| `dd` | Delete task |
| `yy` / `p` | Copy / paste task |
| `u` / `Ctrl-R` | Undo / redo |
| `Tab` / `Shift+Tab` | Indent as subtask / unindent |
| `/` | Search (`n` / `N` next / previous) |
| `*` / `#` | Search by selected title, next / previous |
| `g c` | Calendar view |
| `cc` | Config panel (press again to close; open/clear never share a key) |
| `cs` / `cp` / `ct` | Jump straight to schedule / priority / tags |
| `T` | Dark / light theme |
| `?` | Context-scoped help (press again to close) |

### Content editing (vim text mode)

| Key | Action |
|---|---|
| `h` `j` `k` `l` | Move cursor |
| `w` / `b` / `e` | Word start / back / end |
| `0` / `$` | Line start / end |
| `gg` / `G` | First / last line |
| `i` / `a` / `A` / `I` | Insert: at cursor / after cursor / line end / line start |
| `o` / `O` | New line below / above |
| `x` / `X` | Delete char under / before cursor |
| `d` + motion | Delete: `dw db de d$ d0 dd dgg dG` |
| `c` + motion | Change (delete then insert): `cw cb ce c$ cc` |
| `y` + motion | Copy: `yw y$ yy` |
| `p` / `P` | Paste (**system clipboard first**, yank buffer as fallback) |
| `Ctrl+V` | Visual block: move to extend the rectangle, `x`/`d` delete, `y` copy, `p`/`P` replace, `c` change, `Esc` exit |
| `r{char}` | Replace char under cursor |
| `~` | Swap case |
| `J` | Join line below |
| `u` / `Ctrl-R` | Undo / redo |
| `Esc` | Back to task list |

### Config panel (opened with `cc`)

| Key | Action |
|---|---|
| `J` / `K` | Switch sections: schedule ↔ priority ↔ tags |
| `cs` / `cp` / `ct` | Jump straight to a section |
| `j` / `k` / `0` / `$` | Highlight candidates (`j/0` first, `k/$` last), `Enter` selects |
| Schedule `1` / `2` / `3` | Today / tomorrow / next week |
| Schedule `Enter` | Custom input: `2026-03-06`, `2026-03-06 14:30`, `202603061530`, `15:33` (Tab completes) |
| Priority `1` / `2` / `3` | `!!!` / `!!` / `!` |
| Tags `Enter` | Add a tag |
| Tags `1-9` | Jump to the N-th tag (multi-digit: `12` → 12th; invalid cancels the highlight) |
| `x` | Clear current item (tags: delete highlighted / clear all; schedule/priority: clear) |
| `ed` / `ew` / `em` / `ey` | Repeat: daily / weekly / monthly / yearly |
| `cd` / `cw` / `cm` / `cy` | Clear the matching repeat |
| `Esc` | Exit navigation / collapse panel |

### Calendar view (`g c`, default month)

| Key | Action |
|---|---|
| `h` / `l` | Left / right ±1 day |
| `j` / `k` | Up / down ±7 days (week view: previous / next week) |
| `1-31` | Number jump: month → day of month (multi-digit); week → `1-7` weekday column; invalid cancels focus |
| `Enter` | Grid: open the day's task detail; detail: open the task |
| `Esc` | Detail back to grid / exit calendar |
| `H` / `L` | Granularity: day / week / month |
| `[` / `]` | Previous / next page |

> The month grid renders only the actual days of the month (the 1st aligned to its weekday column, no prev/next-month cells); `[`/`]` changes the display only — the highlight stays on the date you picked. The week view is a **7-column day planner** (Sun–Sat, one column per day; a week crossing months labels each date with its month: 8/30, 31, 9/1…).

### Commands & search (opened with `:`)

| Command | Action |
|---|---|
| `:w` / `:wq` | Save / save & quit |
| `:q` | Quit |
| `:help` | Help |
| `:sort <title\|priority\|created\|updated\|completed>` | Sort |
| `:new [title]` | Create task |
| `:delete` | Delete current task |
| `:p <1\|2\|3\|clear>` | Set / clear priority |
| `:t <tag>` | Add tag |
| `:schedule <…>` | Set schedule (today / tomorrow / weekday names / `2026-03-06 14:30` / every monday…) |
| `:time` | Show current schedule |
| `:theme <dark\|light>` | Switch theme |
| `:clear` | Clear search |
| `:undo` / `:redo` | Undo / redo |
| `↑` / `↓` | Command history; `Tab` completes |

## Guides

### Managing tasks

The task list is a vim buffer: `o` creates a task below the cursor and drops you into the title (`Enter` confirms), `j/k` move, `Space` completes (strikethrough + dim), `f` flags, `Tab` indents a task as a subtask of the previous one. `dd`/`yy`/`p` delete/copy/paste exactly like vim; `u` undoes any mistake. Can't remember a title? `*` searches by the current title.

### Schedules & repeats

Select a task, `cc` → `cs` (or `J/K` inside the panel) to open the schedule section: `1/2/3` for today/tomorrow/next week; `Enter` for any date & time (numeric formats: `2026-03-06`, `202603061530`, `15:33` — Tab completes). `ed/ew/em/ey` add daily/weekly/monthly/yearly repeats, `cd/cw/cm/cy` clear them. Schedules show as `◷` on the task meta line and turn red when overdue.

### Using the calendar

`g c` opens the calendar (default month view, anchored to the selected task's schedule date or today). `jkhl` moves day to day like a cursor, `1-31` jumps to a day of the month (week view: `1-7` weekday column), `Enter` opens the day's task list and another `Enter` opens the task itself. `H/L` switches day/week/month — the week view is a 7-column day planner with one column per day. `[`/`]` flips pages without moving the highlight. `Esc` walks back out layer by layer.

### Content & Markdown

Task content is Markdown: `# heading`, `- list`, \`\`\`code blocks\`\`\`, `>` quotes all render. While editing it's plain text with the full vim toolkit; `Ctrl+V` enters block mode for rectangular selection — delete or copy table-like text blocks, and `p`/`P` replace them with pasted text.

### Copy & paste

`p`/`P` prefer the **system clipboard** (anything copied from a browser or editor pastes directly, multi-line text splits into lines); yanks (`yy`/`yw`/block copies) are written back to the system clipboard, so Vido and your OS clipboard work both ways.

### Data & saving

- 100% local: production data lives in `~/.vido/` (`data/tasks.json` tasks, `data/prefs.json` preferences); development is isolated in `~/.vido-dev/`
- Every change **auto-saves with an 800ms debounce**; the statusline `[+]` marks unsaved changes and `:w` flushes immediately
- No account, no network dependency, no telemetry

## FAQ

**macOS says "unidentified developer" / "damaged"?** See Install above: right-click → Open to allow, or `xattr -cr /Applications/Vido.app` to strip the quarantine attribute.

**Can I switch themes?** `T` or `:theme dark|light` toggles instantly; the preference persists.

**Too many keys to remember?** Press `?` in any context for just that context's keymap (list / config / content / calendar / commands each have one); the statusline also keeps a one-line minimal hint. Intuitive keys (Esc to go back) are never hinted.

**Can I migrate my data?** Back up / move `~/.vido/data/tasks.json` — it's plain, readable JSON.

## Development & build

```bash
pnpm install
pnpm dev          # Vite + Electron with HMR
pnpm test         # all tests (Vitest)
pnpm typecheck    # vue-tsc
pnpm lint
```

**Releasing**: push a `v*` tag (e.g. `v0.2.0`) to trigger GitHub Actions, which builds macOS (x64/arm64/universal, dmg+zip), Windows (x64/arm64, NSIS+zip), Linux (x64/arm64, AppImage+deb) and publishes them to Releases; you can also trigger it manually via `workflow_dispatch`. Locally: `pnpm build:mac[:arm64|x64|universal]`, `pnpm build:win`, `pnpm build:linux`, `pnpm build:unpack`.

**Signing**: packages ship unsigned by default; macOS builds are ad-hoc signed after packaging (to avoid the Gatekeeper "damaged" state), and a real Developer ID certificate automatically skips ad-hoc signing.

For detailed development conventions (architecture layering, logging, automated testing) see [CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE) © windery
