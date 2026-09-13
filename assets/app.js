const themeToggle = document.querySelector(".theme-toggle");
const savedTheme = localStorage.getItem("knowledge-theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;

  if (!themeToggle) return;

  themeToggle.textContent = theme === "dark" ? "☀" : "☾";
  themeToggle.setAttribute("aria-label", theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え");
  themeToggle.setAttribute("title", theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え");
};

applyTheme(savedTheme || preferredTheme);

themeToggle?.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme || "dark";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  localStorage.setItem("knowledge-theme", nextTheme);
  applyTheme(nextTheme);
});

const sidebarToggle = document.querySelector(".sidebar-toggle");
if (window.matchMedia("(max-width: 980px)").matches) document.body.classList.add("sidebar-collapsed");

const syncSidebarToggle = () => {
  if (!sidebarToggle) return;

  const isOpen = !document.body.classList.contains("sidebar-collapsed");

  sidebarToggle.setAttribute("aria-expanded", String(isOpen));
  sidebarToggle.setAttribute("title", isOpen ? "ナビゲーションを閉じる" : "ナビゲーションを開く");
  sidebarToggle.setAttribute("aria-label", isOpen ? "ナビゲーションを閉じる" : "ナビゲーションを開く");
};

sidebarToggle?.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-collapsed");

  syncSidebarToggle();
});

syncSidebarToggle();

const removePageToc = () => {
  document.querySelector(".toc")?.remove();
  document.querySelector(".sidebar-page-menu")?.remove();
};

removePageToc();

const enhancePageSummaries = () => {
  document.querySelectorAll("main.content > p.lead").forEach((lead) => {
    const summary = document.createElement("div");

    summary.className = "page-summary";
    lead.before(summary);
    summary.append(lead);
  });
};

enhancePageSummaries();

let pageUserValues = (document.body.dataset.userValues || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .sort((left, right) => right.length - left.length);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let userValuePatterns = [
  { pattern: /<[A-Z][A-Z0-9_:-]*>/g, group: 0 },
  { pattern: /\{[A-Z][A-Z0-9_:-]*\}/g, group: 0 },
  { pattern: /[:/]role\/([A-Za-z0-9+=,.@_-]+)/g, group: 1 },
  ...pageUserValues.map((value) => ({ pattern: new RegExp(escapeRegExp(value), "g"), group: 0 })),
];

const collectUserValueRanges = (text) => {
  const ranges = [];

  userValuePatterns.forEach(({ pattern, group }) => {
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text))) {
      const value = match[group];
      const offset = group === 0 ? 0 : match[0].lastIndexOf(value);
      const start = match.index + offset;
      const end = start + value.length;
      const overlaps = ranges.some((range) => start < range.end && end > range.start);

      if (!overlaps) ranges.push({ start, end });
    }
  });

  return ranges.sort((left, right) => left.start - right.start);
};

const highlightUserValues = () => {
  document.querySelectorAll("main").forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let textNode;

    while ((textNode = walker.nextNode())) {
      if (!textNode.parentElement?.closest("script, style, .user-value") && collectUserValueRanges(textNode.nodeValue).length > 0) {
        textNodes.push(textNode);
      }
    }

    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      const ranges = collectUserValueRanges(node.nodeValue);
      let cursor = 0;

      ranges.forEach(({ start, end }) => {
        if (start > cursor) fragment.append(document.createTextNode(node.nodeValue.slice(cursor, start)));

        const value = document.createElement("span");
        value.className = "user-value";
        value.textContent = node.nodeValue.slice(start, end);
        fragment.append(value);
        cursor = end;
      });

      if (cursor < node.nodeValue.length) fragment.append(document.createTextNode(node.nodeValue.slice(cursor)));

      node.replaceWith(fragment);
    });
  });
};

const addCodeLineNumbers = () => {
  document.querySelectorAll("main.content .code pre code").forEach((code) => {
    if (code.classList.contains("line-numbered")) return;

    const text = code.textContent.replace(/\r\n?/g, "\n");
    const prompt = code.closest(".code")?.dataset.prompt || "";
    code.dataset.copyText = text;
    code.textContent = "";
    code.classList.add("line-numbered");

    text.split("\n").forEach((line) => {
      const row = document.createElement("span");
      row.className = "code-line";
      if (prompt) {
        row.classList.add("prompted");
        row.dataset.prompt = line && !line.trimStart().startsWith("#") ? prompt : "";
      }
      row.textContent = line || "\u200b";
      code.append(row);
    });
  });
};

addCodeLineNumbers();

if (document.body.dataset.userValueHighlighting !== "off") {
  highlightUserValues();
}

const copyWithLegacyApi = (text) => {
  const textarea = document.createElement("textarea");
  const activeElement = document.activeElement;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index))
    : [];

  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
    if (activeElement instanceof HTMLElement) {
      activeElement.focus({ preventScroll: true });
    }
  }

  return copied;
};

const writeClipboardText = async (text) => {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn("Clipboard API failed; trying the compatibility fallback", error);
    }
  }

  if (!copyWithLegacyApi(text)) {
    throw new Error("No clipboard method succeeded");
  }
};

document.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest(".copy") : null;
  if (!button || button.disabled) return;

  const code = button.closest(".code")?.querySelector("pre code");
  const originalLabel = button.dataset.copyLabel || button.textContent.trim() || "Copy";
  button.dataset.copyLabel = originalLabel;
  button.setAttribute("aria-live", "polite");
  button.disabled = true;

  try {
    if (!code) throw new Error("Copy button is not associated with a code block");
    const copyText = code.dataset.copyText || code.textContent.replace(/\r\n?/g, "\n");
    await writeClipboardText(copyText);
    button.textContent = "Copied";
  } catch (error) {
    console.error("Code copy failed", error);
    button.textContent = "Copy failed";
  }

  setTimeout(() => {
    button.textContent = originalLabel;
    button.disabled = false;
  }, 1400);
});

const initializeTabs = () => document.querySelectorAll("main [data-tabs]").forEach((group) => {
  const tabs = group.querySelectorAll("[role='tab']");
  const panels = group.querySelectorAll("[role='tabpanel']");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.setAttribute("aria-selected", "false"));
      panels.forEach((panel) => {
        panel.classList.remove("active");
        panel.hidden = true;
      });

      tab.setAttribute("aria-selected", "true");
      const activePanel = group.querySelector(`#${tab.getAttribute("aria-controls")}`);
      activePanel.classList.add("active");
      activePanel.hidden = false;
    });
  });
});

initializeTabs();

const initializeMain = () => {
  removePageToc();
  enhancePageSummaries();
  pageUserValues = (document.body.dataset.userValues || "").split(",").map(v => v.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  userValuePatterns = [
    { pattern: /<[A-Z][A-Z0-9_:-]*>/g, group: 0 },
    { pattern: /\{[A-Z][A-Z0-9_:-]*\}/g, group: 0 },
    { pattern: /[:/]role\/([A-Za-z0-9+=,.@_-]+)/g, group: 1 },
    ...pageUserValues.map(value => ({ pattern: new RegExp(escapeRegExp(value), "g"), group: 0 })),
  ];
  addCodeLineNumbers();
  if (document.body.dataset.userValueHighlighting !== "off") highlightUserValues();
  initializeTabs();
};

// Keep the header and navigation DOM alive across internal page changes.
if (document.querySelector("#site-sidebar") && document.querySelector("main.content")) {
  const pageKey = url => new URL(url, location.href).pathname.replace(/\.html$/, "").replace(/\/$/, "");
  const sidebar = document.querySelector("#site-sidebar");
  // Relative sidebar URLs must retain their meaning when switching directory depth.
  sidebar.querySelectorAll("a[href]").forEach(a => a.setAttribute("href", a.href));
  document.querySelectorAll("header a[href]").forEach(a => a.setAttribute("href", a.href));
  document.querySelectorAll("header img[src]").forEach(img => img.setAttribute("src", img.src));
  history.replaceState({ ...history.state, contentNavigation: true, scrollY: window.scrollY }, "");
  history.scrollRestoration = "manual";
  let controller;
  let navigationId = 0;
  let transitioning = false;
  let scrollFrame;
  window.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      if (!transitioning) history.replaceState({ ...history.state, contentNavigation: true, scrollY: window.scrollY }, "");
    });
  }, { passive: true });

  const navigate = async (target, { pop = false, restoreY = 0 } = {}) => {
    const id = ++navigationId;
    transitioning = true;
    controller?.abort();
    controller = new AbortController();
    const currentMain = document.querySelector("main.content");
    currentMain.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(target.href, { signal: controller.signal, credentials: "same-origin" });
      if (!response.ok || new URL(response.url).origin !== location.origin || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Page unavailable");
      const incoming = new DOMParser().parseFromString(await response.text(), "text/html");
      const nextMain = incoming.querySelector("main.content");
      if (!nextMain || !incoming.querySelector("#site-sidebar")) throw new Error("Page requires full navigation");
      // Unknown scripts and legacy anchor redirects retain ordinary navigation.
      if ([...incoming.scripts].some(script => !script.src || !/\/(app|workspaces-legacy-routes)\.js(?:\?|$)/.test(script.getAttribute("src")))) throw new Error("Page has a dedicated initializer");
      const anchor = target.hash ? decodeURIComponent(target.hash.slice(1)) : "";
      if (anchor && !incoming.getElementById(anchor)) throw new Error("Legacy anchor needs full navigation");
      const base = response.url;
      nextMain.querySelectorAll("[href], [src], [poster], [action]").forEach(element => {
        for (const attribute of ["href", "src", "poster", "action"]) {
          if (element.hasAttribute(attribute)) element.setAttribute(attribute, new URL(element.getAttribute(attribute), base).href);
        }
      });
      for (const link of incoming.querySelectorAll('link[rel="stylesheet"]')) {
        const href = new URL(link.getAttribute("href"), base).href;
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(existing => new URL(existing.href).pathname === new URL(href).pathname)) {
          const sheet = document.createElement("link");
          sheet.rel = "stylesheet";
          sheet.href = href;
          await new Promise((resolve, reject) => { sheet.onload = resolve; sheet.onerror = reject; document.head.append(sheet); });
        }
      }
      if (id !== navigationId) return;
      if (!pop) {
        history.replaceState({ ...history.state, contentNavigation: true, scrollY: window.scrollY }, "");
        history.pushState({ contentNavigation: true, scrollY: 0 }, "", target.href);
      }
      const sidebarScroll = sidebar.scrollTop;
      document.title = incoming.title;
      for (const key of Object.keys(document.body.dataset)) delete document.body.dataset[key];
      Object.assign(document.body.dataset, incoming.body.dataset);
      document.querySelector(".layout").className = incoming.querySelector(".layout").className;
      currentMain.replaceWith(nextMain);
      initializeMain();
      sidebar.querySelectorAll("a[href]").forEach(a => {
        const active = pageKey(a.href) === pageKey(target.href);
        a.classList.toggle("active", active);
        if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      sidebar.scrollTop = sidebarScroll;
      const focus = nextMain.querySelector("h1") || nextMain;
      focus.setAttribute("tabindex", "-1");
      focus.focus({ preventScroll: true });
      if (pop) window.scrollTo({ top: restoreY, behavior: "instant" });
      else if (anchor) document.getElementById(anchor).scrollIntoView();
      else window.scrollTo({ top: 0, behavior: "instant" });
    } catch (error) {
      if (id === navigationId && error.name !== "AbortError") location.assign(target.href);
    } finally {
      if (id === navigationId) {
        transitioning = false;
        document.querySelector("main.content")?.removeAttribute("aria-busy");
      }
    }
  };

  document.addEventListener("click", event => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const target = new URL(link.href);
    if (target.origin !== location.origin || !/^https?:$/.test(target.protocol) || /\.[^/]+$/.test(target.pathname) && !target.pathname.endsWith(".html")) return;
    if (target.pathname === location.pathname && target.search === location.search) return;
    event.preventDefault();
    navigate(target);
  });
  window.addEventListener("popstate", event => {
    if (event.state?.contentNavigation) navigate(new URL(location.href), { pop: true, restoreY: event.state.scrollY || 0 });
    else location.reload();
  });
}
