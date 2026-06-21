/*
 * TCloud example extension — entry point
 * ----------------------------------------------------------------------------
 * This is the file named in `extension.json` -> "entry". TCloud downloads it
 * from your repository's latest release and runs it inside the browser.
 *
 * IMPORTANT: this file is executed as the *body* of a function. Two variables
 * are already in scope — do NOT use `import` / `require` / `module.exports`:
 *
 *   TCloudExt   The extension API (see the methods used below, and the README).
 *   extension   Metadata about THIS extension:
 *                 { id, name, version, repo, ref, manifest }
 *               `repo` is "owner/name" and `ref` is the tag/branch it was
 *               installed from — handy for loading your own assets at runtime.
 *
 * Everything an extension does is client-side: it runs with the logged-in
 * user's session, exactly like the rest of the TCloud web app.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1) Folder-based i18n                                                 *
   *                                                                      *
   * Translations live in this repo under /i18n/<lang>.json. We load the  *
   * right one at runtime from the exact repo + ref this extension was    *
   * installed from. Keys are the English text, so a missing translation  *
   * simply falls back to English.                                        *
   * ------------------------------------------------------------------ */
  var STRINGS = {};
  function et(key) { return (STRINGS && STRINGS[key]) || key; }

  // TCloud stores the active UI language in localStorage under "tcloud_lang".
  var lang = 'en';
  try { lang = localStorage.getItem('tcloud_lang') || 'en'; } catch (e) {}

  function rawBase() {
    // -> https://raw.githubusercontent.com/<owner>/<name>/<ref>
    if (extension && extension.repo && extension.ref) {
      return 'https://raw.githubusercontent.com/' + extension.repo + '/' + extension.ref;
    }
    return null;
  }

  async function loadStrings() {
    var base = rawBase();
    if (!base) return;
    // Try the active language first, then fall back to English.
    for (var i = 0; i < 2; i++) {
      var code = i === 0 ? lang : 'en';
      try {
        var res = await fetch(base + '/i18n/' + code + '.json');
        if (res.ok) { STRINGS = await res.json(); return; }
      } catch (e) { /* try the next one */ }
    }
  }

  /* ------------------------------------------------------------------ *
   * 2) A page, shown when the user clicks our sidebar entry             *
   *                                                                      *
   * We render plain HTML into the main content area. Re-using TCloud's   *
   * existing CSS classes (modal-btn, etc.) keeps it visually consistent. *
   * ------------------------------------------------------------------ */
  async function renderPage(api) {
    api.setBreadcrumb(et('Hello World'));
    api.setContent(
      '<div style="padding:24px;max-width:720px">' +
        '<h2 style="margin:0 0 8px">' + api.esc(et('Hello from an extension!')) + '</h2>' +
        '<p style="opacity:.8">' + api.esc(et('This page is rendered entirely by a community extension.')) + '</p>' +
        '<button id="ex-count" class="modal-btn primary">' + api.esc(et('Count my files')) + '</button>' +
        '<div id="ex-out" style="margin-top:14px;opacity:.85"></div>' +
      '</div>'
    );
    var btn = document.getElementById('ex-count');
    if (btn) btn.onclick = async function () {
      var out = document.getElementById('ex-out');
      out.textContent = et('Counting…');
      try {
        // api.api() calls the TCloud REST API with the current session.
        var data = await api.api('/list');
        var n = data && data.files ? data.files.length : 0;
        out.textContent = et('Files in your root folder:') + ' ' + n;
      } catch (e) {
        out.textContent = String(e.message || e);
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * 3) Register the extension's contributions                          *
   *                                                                      *
   * We wait for translations to load first, then register — TCloud      *
   * refreshes the sidebar automatically when a nav item is registered.  *
   * ------------------------------------------------------------------ */
  loadStrings().then(function () {
    // (a) A sidebar entry, shown under the "Extensions" section.
    TCloudExt.registerNav({
      id: 'hello-world',                 // unique within your extension
      label: et('Hello World'),          // shown in the sidebar
      emoji: '👋',                        // optional little icon
      onClick: function (api) { renderPage(api); },
    });

    // (b) An action added to every file's context menu.
    TCloudExt.registerFileAction({
      id: 'hello-file-info',
      label: et('Hello: show file info'),
      test: function (file) { return true; },   // return true to show it for this file
      run: function (file, api) {
        api.toast(et('You selected:') + ' ' + file.name);
      },
    });
  });
})();
