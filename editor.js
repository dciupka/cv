/* =============================================================
   Visual editor for the CV. Builds a form from window.CV,
   keeps a live preview in the iframe, and saves content.js.
   ============================================================= */
(function () {
  // Working copy of the data (deep clone of what content.js loaded).
  const model = JSON.parse(JSON.stringify(window.CV));

  const formEl = document.getElementById("form");
  const frame = document.getElementById("preview");
  const statusEl = document.getElementById("status");
  const previewLang = document.getElementById("previewLang");

  // ---------- tiny DOM helper ----------
  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else node.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      node.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return node;
  }

  function toolBtn(label, onClick, extra) {
    const b = el("button", { class: "tool" + (extra ? " " + extra : ""), type: "button", text: label });
    b.addEventListener("click", onClick);
    return b;
  }

  // ---------- live preview ----------
  let previewTimer = null;
  function preview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(applyPreview, 120);
  }
  function applyPreview() {
    const win = frame.contentWindow;
    if (!win || !win.CVApp) return;
    win.CV = JSON.parse(JSON.stringify(model));
    win.CVApp.setLang(previewLang.value);
  }

  // ---------- translatable / plain field ----------
  // holder[key] is the value; may be a string (mono) or {en,pl}.
  // mono:true  -> single box, always stored as a string.
  // otherwise  -> EN + PL boxes; if PL empty the value is stored as a
  //               plain string, else as { en, pl }.
  function transField(holder, key, opts) {
    opts = opts || {};
    const val = holder[key];
    const isObj = val && typeof val === "object";
    const enVal = isObj ? val.en || "" : val == null ? "" : val;
    const plVal = isObj ? val.pl || "" : "";

    const wrap = el("div", { class: "trans" });
    const tag = opts.multiline ? "textarea" : "input";

    const enInput = el(tag, { class: "inp", placeholder: opts.placeholder || "" });
    enInput.value = enVal;

    function commitMono() {
      holder[key] = enInput.value;
      preview();
    }

    if (opts.mono) {
      enInput.addEventListener("input", commitMono);
      wrap.append(el("div", { class: "row" }, enInput));
      return wrap;
    }

    const plInput = el(tag, { class: "inp", placeholder: "(po polsku — puste = jak EN)" });
    plInput.value = plVal;

    function commit() {
      const e = enInput.value;
      const p = plInput.value;
      holder[key] = p.trim() ? { en: e, pl: p } : e;
      preview();
    }
    enInput.addEventListener("input", commit);
    plInput.addEventListener("input", commit);

    wrap.append(
      el("div", { class: "row" }, el("span", { class: "tag", text: "EN" }), enInput),
      el("div", { class: "row" }, el("span", { class: "tag", text: "PL" }), plInput)
    );
    return wrap;
  }

  function field(labelText, control) {
    return el("div", { class: "field" }, el("label", { class: "lbl", text: labelText }), control);
  }

  // ---------- generic list editor ----------
  // arr: array to edit. renderItem(item, idx) -> DOM. createItem() -> new entry.
  function listEditor(arr, renderItem, createItem, addLabel) {
    const wrap = el("div", { class: "list" });
    function rebuild() {
      wrap.textContent = "";
      arr.forEach((item, i) => {
        const tools = el(
          "div",
          { class: "item-tools" },
          toolBtn("↑", () => {
            if (i > 0) {
              [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
              rebuild();
              preview();
            }
          }),
          toolBtn("↓", () => {
            if (i < arr.length - 1) {
              [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
              rebuild();
              preview();
            }
          }),
          toolBtn("✕", () => {
            arr.splice(i, 1);
            rebuild();
            preview();
          }, "danger")
        );
        const body = el("div", { class: "body" }, renderItem(item, i));
        wrap.append(el("div", { class: "list-item" }, tools, body));
      });
      const add = el("button", { class: "add-btn", type: "button", text: "+ " + addLabel });
      add.addEventListener("click", () => {
        arr.push(createItem());
        rebuild();
        preview();
      });
      wrap.append(add);
    }
    rebuild();
    return wrap;
  }

  function subBlock(labelText, content) {
    return el("div", { class: "sub" }, el("div", { class: "sub-label", text: labelText }), content);
  }

  // ---------- identity / header form ----------
  function buildIdentity() {
    const body = el("div", { class: "section-body" });
    const c = model.contact;
    const m = model.meta;
    const li = model.linkedin;

    body.append(
      field("Imię i nazwisko", transField(model, "name", { mono: true })),
      field("Tytuł / rola", transField(model, "role", {})),
      field("Tagline", transField(model, "tagline", { multiline: true })),
      subBlock(
        "LinkedIn",
        el(
          "div",
          null,
          field("Vanity (login)", transField(li, "vanity", { mono: true })),
          field("URL", transField(li, "url", { mono: true }))
        )
      ),
      subBlock(
        "Kontakt",
        el(
          "div",
          null,
          field("Portfolio URL", transField(c, "portfolio", { mono: true })),
          field("Portfolio — etykieta", transField(c, "portfolioLabel", {})),
          field("GitHub URL", transField(c, "github", { mono: true })),
          field("Email", transField(c, "email", { mono: true })),
          field("Telefon (tel:)", transField(c, "phone", { mono: true })),
          field("Telefon (wyświetlany)", transField(c, "phoneDisplay", { mono: true })),
          field("Lokalizacja", transField(c, "location", {}))
        )
      ),
      subBlock(
        "Meta (zakładka / SEO)",
        el(
          "div",
          null,
          field("Tytuł strony", transField(m, "title", { mono: true })),
          field("Opis (description)", transField(m, "description", { mono: true, multiline: true })),
          field("Domyślny język", langSelect(m))
        )
      )
    );

    return section("Dane / Nagłówek", "identity", body, true);
  }

  function langSelect(m) {
    const sel = el("select", { class: "inp" });
    ["en", "pl"].forEach((v) => {
      const o = el("option", { value: v, text: v.toUpperCase() });
      if ((m.defaultLang || "en") === v) o.setAttribute("selected", "selected");
      sel.append(o);
    });
    sel.addEventListener("change", () => {
      m.defaultLang = sel.value;
      preview();
    });
    return sel;
  }

  // ---------- section wrapper ----------
  function section(titleText, badgeText, bodyEl, open) {
    const d = el("details", { class: "section" });
    if (open) d.setAttribute("open", "open");
    const sum = el(
      "summary",
      null,
      el("span", { text: titleText }),
      badgeText ? el("span", { class: "badge", text: badgeText }) : null
    );
    d.append(sum, bodyEl);
    return d;
  }

  // ---------- per-type section editors ----------
  function buildAbout(s) {
    const body = el("div", { class: "section-body" });
    body.append(
      field("Nagłówek sekcji", transField(s, "heading", {})),
      subBlock(
        "Akapity",
        listEditor(
          s.paragraphs,
          (item, i) => transField(s.paragraphs, i, { multiline: true }),
          () => "",
          "Dodaj akapit"
        )
      ),
      subBlock(
        "Tagi (mindset)",
        listEditor(
          s.tags,
          (item, i) => transField(s.tags, i, {}),
          () => ({ en: "", pl: "" }),
          "Dodaj tag"
        )
      )
    );
    return body;
  }

  function buildProjects(s) {
    const body = el("div", { class: "section-body" });
    body.append(
      field("Nagłówek sekcji", transField(s, "heading", {})),
      listEditor(
        s.items,
        (proj) => {
          const inner = el("div", null);
          inner.append(field("Tytuł projektu", transField(proj, "title", {})));
          inner.append(
            subBlock(
              "Wiersze (Kontekst / Zakres / Stack / Wynik …)",
              listEditor(
                proj.rows,
                (row) =>
                  el(
                    "div",
                    null,
                    field("Etykieta", transField(row, "label", {})),
                    field("Treść", transField(row, "text", { multiline: true }))
                  ),
                () => ({ label: { en: "", pl: "" }, text: { en: "", pl: "" } }),
                "Dodaj wiersz"
              )
            )
          );
          return inner;
        },
        () => ({ title: "", rows: [{ label: { en: "", pl: "" }, text: { en: "", pl: "" } }] }),
        "Dodaj projekt"
      )
    );
    return body;
  }

  function buildSkills(s) {
    const body = el("div", { class: "section-body" });
    body.append(
      field("Nagłówek sekcji", transField(s, "heading", {})),
      listEditor(
        s.groups,
        (group) => {
          const inner = el("div", null);
          inner.append(field("Nazwa grupy", transField(group, "title", {})));
          inner.append(
            subBlock(
              "Umiejętności",
              listEditor(
                group.items,
                (item, i) => transField(group.items, i, {}),
                () => "",
                "Dodaj umiejętność"
              )
            )
          );
          return inner;
        },
        () => ({ title: "", items: [""] }),
        "Dodaj grupę"
      )
    );
    return body;
  }

  function buildExperience(s) {
    const body = el("div", { class: "section-body" });
    body.append(
      field("Nagłówek sekcji", transField(s, "heading", {})),
      listEditor(
        s.items,
        (job) => {
          const inner = el("div", null);
          inner.append(
            field("Stanowisko", transField(job, "role", {})),
            field("Okres", transField(job, "date", {})),
            field("Firma", transField(job, "company", {})),
            subBlock(
              "Punkty",
              listEditor(
                job.bullets,
                (item, i) => transField(job.bullets, i, { multiline: true }),
                () => ({ en: "", pl: "" }),
                "Dodaj punkt"
              )
            )
          );
          return inner;
        },
        () => ({ role: { en: "", pl: "" }, date: "", company: "", bullets: [{ en: "", pl: "" }] }),
        "Dodaj doświadczenie"
      )
    );
    return body;
  }

  function buildLanguages(s) {
    const body = el("div", { class: "section-body" });
    body.append(
      field("Nagłówek sekcji", transField(s, "heading", {})),
      subBlock(
        "Języki",
        listEditor(
          s.items,
          (item, i) => transField(s.items, i, {}),
          () => ({ en: "", pl: "" }),
          "Dodaj język"
        )
      )
    );
    return body;
  }

  const SECTION_BUILDERS = {
    about: buildAbout,
    projects: buildProjects,
    skills: buildSkills,
    experience: buildExperience,
    languages: buildLanguages,
  };

  const SECTION_LABEL = {
    about: "O mnie",
    projects: "Projekty",
    skills: "Umiejętności",
    experience: "Doświadczenie",
    languages: "Języki",
  };

  function newSection(type) {
    switch (type) {
      case "about":
        return { type, heading: { en: "About", pl: "O mnie" }, paragraphs: [""], tags: [] };
      case "projects":
        return {
          type,
          heading: { en: "Projects", pl: "Projekty" },
          items: [{ title: "", rows: [{ label: { en: "", pl: "" }, text: { en: "", pl: "" } }] }],
        };
      case "skills":
        return { type, heading: { en: "Skills", pl: "Umiejętności" }, groups: [{ title: "", items: [""] }] };
      case "experience":
        return {
          type,
          heading: { en: "Experience", pl: "Doświadczenie" },
          items: [{ role: { en: "", pl: "" }, date: "", company: "", bullets: [{ en: "", pl: "" }] }],
        };
      case "languages":
        return { type, heading: { en: "Languages", pl: "Języki" }, items: [{ en: "", pl: "" }] };
      default:
        return null;
    }
  }

  // ---------- sections list (reorderable) ----------
  function buildSectionsArea() {
    const container = el("div", null);

    function rebuild() {
      container.textContent = "";
      model.sections.forEach((s, i) => {
        const builder = SECTION_BUILDERS[s.type];
        if (!builder) return;

        const heading =
          s.heading && typeof s.heading === "object" ? s.heading.en || s.heading.pl : s.heading || "";
        const titleText = heading || SECTION_LABEL[s.type] || s.type;

        const tools = el(
          "div",
          { class: "item-tools" },
          toolBtn("↑", () => {
            if (i > 0) {
              [model.sections[i - 1], model.sections[i]] = [model.sections[i], model.sections[i - 1]];
              rebuild();
              preview();
            }
          }),
          toolBtn("↓", () => {
            if (i < model.sections.length - 1) {
              [model.sections[i + 1], model.sections[i]] = [model.sections[i], model.sections[i + 1]];
              rebuild();
              preview();
            }
          }),
          toolBtn("✕", () => {
            if (confirm('Usunąć sekcję "' + titleText + '"?')) {
              model.sections.splice(i, 1);
              rebuild();
              preview();
            }
          }, "danger")
        );

        const d = section(titleText, SECTION_LABEL[s.type] || s.type, builder(s), false);
        // put reorder tools inside the summary line
        d.querySelector("summary").append(tools);
        container.append(d);
      });

      // add-section bar
      const sel = el("select", null);
      Object.keys(SECTION_LABEL).forEach((type) => {
        sel.append(el("option", { value: type, text: SECTION_LABEL[type] }));
      });
      const addBtn = el("button", { class: "add-btn", type: "button", text: "+ Dodaj sekcję" });
      addBtn.addEventListener("click", () => {
        const ns = newSection(sel.value);
        if (ns) {
          model.sections.push(ns);
          rebuild();
          preview();
        }
      });
      container.append(el("div", { class: "add-section-bar" }, sel, addBtn));
    }

    rebuild();
    return container;
  }

  // ---------- serialize + save ----------
  function serialize() {
    const json = JSON.stringify(model, null, 2);
    return (
      "/* =============================================================\n" +
      "   CV CONTENT — generated by the visual editor (editor.html).\n" +
      "   You can still edit this file by hand.\n" +
      "   - Bilingual value:  { \"en\": \"...\", \"pl\": \"...\" }\n" +
      "   - Same in both langs: a plain \"string\".\n" +
      "   ============================================================= */\n\n" +
      "const CV = " +
      json +
      ";\n\n" +
      "// Expose for the page renderer and the visual editor.\n" +
      'if (typeof window !== "undefined") window.CV = CV;\n'
    );
  }

  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = "hint" + (cls ? " " + cls : "");
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "text/javascript" });
    const a = el("a", { href: URL.createObjectURL(blob), download: filename });
    document.body.append(a);
    a.click();
    a.remove();
  }

  async function save() {
    const text = serialize();
    try {
      const res = await fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("Zapisano content.js ✓ (odśwież CV w przeglądarce)", "saved");
    } catch (e) {
      download("content.js", text);
      setStatus("Pobrano content.js — wrzuć plik do folderu repo (serwer nie działa).", "error");
    }
  }

  // ---------- mount ----------
  formEl.append(buildIdentity());
  formEl.append(buildSectionsArea());

  document.getElementById("saveBtn").addEventListener("click", save);
  document.getElementById("reloadBtn").addEventListener("click", applyPreview);
  previewLang.addEventListener("change", applyPreview);

  // Sync preview once the iframe (and its CVApp) is ready.
  frame.addEventListener("load", applyPreview);
  if (frame.contentWindow && frame.contentWindow.CVApp) applyPreview();
})();
