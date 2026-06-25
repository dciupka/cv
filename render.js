/* =============================================================
   RENDERER — builds the page from window.CV (see content.js).
   You normally don't need to touch this file. Edit content.js,
   or use the visual editor (run: node editor-server.js).
   ============================================================= */
(function () {
  let cv = window.CV;
  let lang =
    cv && cv.meta && cv.meta.defaultLang === "pl" ? "pl" : "en";

  // Pick the right language out of a value that may be
  // { en, pl } or a plain (language-neutral) string.
  function t(value) {
    if (value && typeof value === "object" && ("en" in value || "pl" in value)) {
      return value[lang] != null ? value[lang] : value.en;
    }
    return value != null ? value : "";
  }

  // Tiny DOM helper: h("div", { class: "x" }, child, child, ...)
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else el.setAttribute(k, v);
      }
    }
    for (const child of children.flat()) {
      if (child == null) continue;
      el.append(child.nodeType ? child : document.createTextNode(child));
    }
    return el;
  }

  function link(href, text, extra) {
    return h("a", Object.assign({ href, text }, extra || {}));
  }

  // Render a value as a clickable link when it is a bare URL,
  // otherwise as plain text. The link text drops the scheme for
  // readability (https://chessmaster.appevil.pl/ -> chessmaster.appevil.pl).
  function valueNode(value) {
    const s = value == null ? "" : String(value);
    if (/^https?:\/\/\S+$/.test(s.trim())) {
      const url = s.trim();
      const display = url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
      return h("a", { href: url, target: "_blank", rel: "noopener", text: display });
    }
    return h("span", { text: s });
  }

  // ---- Header (screen + print variants) -------------------------
  function renderHeader() {
    const c = cv.contact || {};
    const li = cv.linkedin || {};

    const printName = h(
      "div",
      { class: "print-only" },
      h("h1", { text: cv.name }),
      h("p", { class: "title", text: t(cv.role) })
    );

    const badge = h(
      "div",
      { class: "header-badge" },
      h(
        "div",
        {
          class: "badge-base LI-profile-badge",
          "data-locale": "en_US",
          "data-size": "large",
          "data-theme": "dark",
          "data-type": "HORIZONTAL",
          "data-vanity": li.vanity,
          "data-version": "v1",
        },
        h("a", {
          class: "badge-base__link LI-simple-link",
          href: li.url,
          target: "_blank",
        })
      )
    );

    const screenInfo = h(
      "div",
      { class: "header-info" },
      h("p", { class: "tagline", text: t(cv.tagline) }),
      h(
        "div",
        { class: "contact" },
        link(c.github, "GitHub", { target: "_blank" }),
        link("mailto:" + c.email, c.email),
        link("tel:" + c.phone, c.phoneDisplay),
        h("span", { class: "contact-location", text: t(c.location) })
      )
    );

    const screenHeader = h(
      "div",
      { class: "header-text screen-only" },
      badge,
      screenInfo
    );

    const printContact = h(
      "div",
      { class: "print-only" },
      h("p", { class: "tagline", text: t(cv.tagline) }),
      h(
        "div",
        { class: "contact" },
        link(c.portfolio, t(c.portfolioLabel), { target: "_blank" }),
        link(c.github, "GitHub", { target: "_blank" }),
        link("mailto:" + c.email, c.email),
        link("tel:" + c.phone, c.phoneDisplay),
        link(li.url, "LinkedIn", { target: "_blank" })
      )
    );

    return h(
      "header",
      null,
      h("div", { class: "header-main" }, printName, screenHeader, printContact)
    );
  }

  // ---- Section renderers ----------------------------------------
  function sectionShell(heading, ...body) {
    return h("section", null, h("h2", { text: t(heading) }), ...body);
  }

  function renderAbout(s) {
    const paras = (s.paragraphs || []).map((p) => h("p", { text: t(p) }));
    const tags = h(
      "div",
      { class: "mindset-items", style: "margin-top: 1rem;" },
      (s.tags || []).map((tag) => h("span", { text: t(tag) }))
    );
    return sectionShell(s.heading, ...paras, tags);
  }

  function renderProjects(s) {
    const items = (s.items || []).map((proj) =>
      h(
        "div",
        { class: "project" },
        h("h3", { text: t(proj.title) }),
        h(
          "ul",
          null,
          (proj.rows || []).map((row) =>
            h(
              "li",
              null,
              h("strong", { text: t(row.label) }),
              " ",
              valueNode(t(row.text))
            )
          )
        )
      )
    );
    return sectionShell(s.heading, ...items);
  }

  function renderSkills(s) {
    const groups = (s.groups || []).map((g) =>
      h(
        "div",
        { class: "skill-group" },
        h("h4", { text: t(g.title) }),
        h(
          "ul",
          null,
          (g.items || []).map((item) => h("li", { text: t(item) }))
        )
      )
    );
    return sectionShell(s.heading, h("div", { class: "skills-grid" }, groups));
  }

  function renderExperience(s) {
    const items = (s.items || []).map((job) =>
      h(
        "div",
        { class: "project" },
        h(
          "div",
          { class: "exp-header" },
          h("h3", { text: t(job.role) }),
          h("span", { class: "exp-date", text: t(job.date) })
        ),
        h("p", { class: "exp-company", text: t(job.company) }),
        h(
          "ul",
          null,
          (job.bullets || []).map((b) => h("li", { text: t(b) }))
        )
      )
    );
    return sectionShell(s.heading, ...items);
  }

  function renderLanguages(s) {
    return sectionShell(
      s.heading,
      h(
        "ul",
        { class: "tag-list" },
        (s.items || []).map((item) => h("li", { text: t(item) }))
      )
    );
  }

  const RENDERERS = {
    about: renderAbout,
    projects: renderProjects,
    skills: renderSkills,
    experience: renderExperience,
    languages: renderLanguages,
  };

  // ---- Mount / language switching -------------------------------
  function render() {
    cv = window.CV || {};
    document.documentElement.lang = lang;
    if (cv.meta && cv.meta.title) document.title = cv.meta.title;

    const desc = document.querySelector('meta[name="description"]');
    if (desc && cv.meta && cv.meta.description) {
      desc.setAttribute("content", cv.meta.description);
    }

    const container = document.getElementById("cv");
    if (!container) return;
    container.textContent = "";
    container.append(renderHeader());

    for (const section of cv.sections || []) {
      const fn = RENDERERS[section.type];
      if (fn) container.append(fn(section));
    }

    // (Re)load the LinkedIn badge widget after the badge node exists.
    if (window.LI && typeof window.LI.init === "function") {
      try {
        window.LI.init();
      } catch (e) {
        /* ignore */
      }
    }

    const toggle = document.getElementById("langToggle");
    if (toggle) toggle.textContent = lang === "en" ? "PL" : "EN";

    document.querySelectorAll(".print-btn").forEach((btn) => {
      btn.textContent = lang === "en" ? "Download PDF" : "Pobierz PDF";
    });
  }

  // Exposed so the visual editor can drive rendering live.
  window.CVApp = {
    render: render,
    setLang: function (l) {
      lang = l === "pl" ? "pl" : "en";
      render();
    },
    getLang: function () {
      return lang;
    },
  };

  function init() {
    render();
    const toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        lang = lang === "en" ? "pl" : "en";
        render();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
