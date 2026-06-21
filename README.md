# TCloud Extension Example

A tiny, fully-working example of a **TCloud community extension**. Clone it,
rename it, and use it as the starting point for your own.

It demonstrates everything you need:

- a sidebar page,
- a file context-menu action,
- calling the TCloud API,
- a clean, folder-based **i18n** system for your extension's own strings,
- publishing for **auto-update**.

---

## What is a TCloud extension?

An extension is a **single JavaScript file** that TCloud loads in the browser
and runs with the logged-in user's session. It can add UI (sidebar entries,
file actions) and talk to the TCloud API — the same one the app itself uses.

Extensions are **client-side only**. Nothing from your repo runs on the server.
The owner installs an extension by pasting your GitHub repository URL into
**Admin → Settings → Extensions**.

> Because an extension runs with the user's session, only install extensions
> from sources you trust. See [Security](#security).

---

## Repository layout

```
extension.json     ← the manifest (required)
index.js           ← the entry file named by the manifest (required)
i18n/
  en.json          ← source strings (English)
LICENSE
README.md
```

You can name the entry file anything you like — just point `"entry"` at it.

---

## The manifest — `extension.json`

```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "entry": "index.js",
  "description": "Minimal example: adds a sidebar page and a file action.",
  "author": "Your Name",
  "homepage": "https://github.com/your-user/tcloud-extension-example"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Unique, stable id. `a–z 0–9 . _ -`, 2–64 chars. Changing it later installs a *second* copy. |
| `name` | yes | Human-readable name shown in the Extensions list. |
| `version` | yes | Bump this on every release so auto-update can detect changes. |
| `entry` | yes | Path (within the repo) to the JavaScript file to load. No `..`. |
| `description` | no | Short one-liner shown under the name. |
| `author` | no | Your name / handle. |
| `homepage` | no | Link to your repo or site. |

---

## The entry file

Your entry file runs as the **body of a function**. Two variables are already
in scope:

```js
TCloudExt   // the extension API (see below)
extension   // { id, name, version, repo, ref, manifest }
```

Rules:

- **Do not** use `import`, `require`, or `module.exports`. Just write code that
  calls `TCloudExt.*`.
- Wrapping your code in an IIFE (`(function () { ... })();`) is a good habit so
  your variables don't leak into the page.
- Keep it resilient: wrap risky calls in `try/catch`. A throwing extension is
  caught by TCloud and simply won't load, but a defensive extension degrades
  gracefully.

### The `extension` object

| Field | Description |
|-------|-------------|
| `id`, `name`, `version` | From your manifest. |
| `manifest` | The full parsed `extension.json` (use it for your own custom fields). |
| `repo` | `"owner/name"` of the repo it was installed from. |
| `ref` | The tag or branch it was installed from (e.g. `v1.0.0`). |

`repo` + `ref` let you load your own assets at runtime — that's exactly how the
i18n system below works.

---

## The `TCloudExt` API

Everything the example uses:

```js
// Add a sidebar entry under the "Extensions" section.
TCloudExt.registerNav({
  id: 'hello-world',          // unique within your extension
  label: 'Hello World',       // sidebar text
  emoji: '👋',                 // optional icon
  onClick: function (api) {}, // called when the entry is clicked; `api` === TCloudExt
});

// Add an action to a file's context menu.
TCloudExt.registerFileAction({
  id: 'my-action',
  label: 'Do something',
  test: function (file) { return true; }, // return true to show it for this file
  run:  function (file, api) {},          // called when chosen
});

TCloudExt.api(path, opts)   // call the TCloud REST API (returns parsed JSON).
                            //   await TCloudExt.api('/list')
                            //   await TCloudExt.api('/files/123/text', { method:'POST', json:{ content:'…' } })
TCloudExt.t(key, vars)      // translate using TCloud's OWN dictionary (app strings).
TCloudExt.esc(str)          // HTML-escape a string before inserting it into the DOM.
TCloudExt.toast(message)    // show a short message to the user.
TCloudExt.setContent(html)  // replace the main content area with your HTML.
TCloudExt.setBreadcrumb(s)  // set the breadcrumb label for your page.
```

`file` objects passed to file actions include at least `id`, `name`, `size`,
`mime` and `folder_id`.

---

## Translations (i18n)

TCloud itself is translated through [Crowdin](https://crowdin.com), but your
extension keeps **its own** strings — TCloud does not manage them for you. The
example uses a simple, robust pattern:

1. Put your strings in `/i18n/<lang>.json`, keyed by the **English text**:

   ```json
   { "Hello World": "Ciao Mondo" }
   ```

2. At runtime, read the active language and load the matching file straight
   from your repo (using `extension.repo` + `extension.ref`):

   ```js
   var lang = localStorage.getItem('tcloud_lang') || 'en';
   var base = 'https://raw.githubusercontent.com/' + extension.repo + '/' + extension.ref;
   var res  = await fetch(base + '/i18n/' + lang + '.json');   // fall back to /i18n/en.json
   ```

3. Translate with a tiny helper that falls back to the key:

   ```js
   function et(key) { return STRINGS[key] || key; }
   ```

See `index.js` for the complete, commented implementation.

### Optional: Crowdin for your extension too

If you want community translations for **your** extension, the same approach
TCloud uses works here. A ready `crowdin.yml` is included:

```yaml
files:
  - source: /i18n/en.json
    translation: /i18n/%two_letters_code%.json
```

Connect the repo in Crowdin, keep `i18n/en.json` as the source, and merge the
translation PRs Crowdin opens. New `i18n/<lang>.json` files are picked up
automatically by the loader above.

---

## Publishing & auto-update

TCloud installs and updates from your repository's **latest GitHub Release**:

1. Commit your changes and bump `"version"` in `extension.json`.
2. Create a **Release** (a Git tag, e.g. `v1.0.1`) on GitHub.
3. In TCloud, press **⟳ Update** on the extension (or re-install). TCloud reads
   the latest release tag, re-fetches `extension.json` + your entry file, and
   stores the new version.

If a repository has no releases, TCloud falls back to the default branch
(`main`/`master`) — handy while developing.

---

## Installing in TCloud

1. Push this repo to GitHub (public).
2. In TCloud, open **Admin → Settings → Extensions**.
3. Paste the repository URL (`https://github.com/your-user/your-repo`) and press
   **Install**.
4. Toggle it on/off any time — the sidebar updates immediately.

---

## Security

- Extensions run **in the browser**, with the current user's session and
  permissions. Treat installing an extension like running someone's script.
- Only the **owner** can install, update, or remove extensions.
- Nothing from your repo executes on the server; there is no server-side plugin
  code in this version.
- Prefer pinning to **release tags** (not a moving branch) so you control
  exactly which code runs after an update.

---

## License

MIT — see [LICENSE](LICENSE). Replace the copyright holder with your name.
