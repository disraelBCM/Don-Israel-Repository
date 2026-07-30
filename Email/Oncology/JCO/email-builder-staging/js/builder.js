(function () {
  "use strict";

  var TRACKING = "utm_source=ONC-JCO-${unique-id}&amp;utm_medium=email&amp;md5={{lead.MD5}}";
  var state = {
    activeTab: "content",
    selectedId: null,
    modules: []
  };
  var undoStack = [];
  var redoStack = [];
  var historyLimit = 80;
  var previewResizeObserver = null;

  var moduleLabels = {
    topLogo: "Top Logo",
    topHeading: "Top Heading",
    topCallout: "Top Callout",
    contentFloatingAd: "Content Links + 300x250 Ad",
    ctaButton: "CTA Button",
    contentLinks: "Content Links",
    headingTwo: "Heading Type 2",
    contentSet: "Content Set",
    bannerAd: "728x90 Ad",
    bottomCallout: "Bottom Callout"
  };

  var defaults = {
    topLogo: {
      logoSrc: "https://ww1.broadcastmed.com/rs/824-XOG-054/images/jco-journals-logo.jpg",
      logoAlt: "JCO Journals logo"
    },
    topHeading: {
      heading: "In-Depth Lung Cancer Research from JCO Journals"
    },
    topCallout: {
      includeImage: true,
      imageSrc: "https://info.lww.com/rs/681-FHE-429/images/ASID3561%20JCO%20cover.png",
      imageAlt: "Image alt text",
      imageLink: "#",
      text: "Callout text placeholder goes here."
    },
    contentFloatingAd: {
      includeAd: true,
      includeHeading: true,
      heading: "Journal of Clinical Oncology",
      articles: [
        {
          text: "Article link text placeholder goes here.",
          link: "#"
        }
      ]
    },
    ctaButton: {
      text: "Visit <em>JCO</em>",
      link: "#"
    },
    contentLinks: {
      includeHeading: true,
      heading: "Journal of Clinical Oncology",
      articles: [
        {
          text: "Article link text placeholder goes here.",
          link: "#"
        }
      ]
    },
    headingTwo: {
      heading: "More From ASCO"
    },
    contentSet: {
      sets: [
        {
          headline: "Article headline placeholder goes here.",
          body: "Article summary text placeholder goes here. Add a short description that introduces the linked content.",
          ctaText: "CTA text",
          link: "#"
        }
      ]
    },
    bannerAd: {
      adToken: "{{my.728x90-TOP}}"
    },
    bottomCallout: {
      text: "Bottom callout text placeholder goes here."
    }
  };

  var schemas = {
    topLogo: [
      field("logoSrc", "Logo image URL", "url"),
      field("logoAlt", "Logo alt text", "text")
    ],
    topHeading: [
      field("heading", "Heading text", "textarea")
    ],
    topCallout: [
      field("includeImage", "Include image column", "checkbox"),
      field("imageSrc", "Image URL", "url"),
      field("imageAlt", "Image alt text", "text"),
      field("imageLink", "Image link", "url"),
      field("text", "Callout text", "textarea")
    ],
    contentFloatingAd: [
      field("includeAd", "Include 300x250 ad", "checkbox"),
      field("includeHeading", "Include heading", "checkbox"),
      field("heading", "Heading text", "text"),
      repeatable("articles", "Article links", [
        field("text", "Link text", "textarea"),
        field("link", "Link URL", "url")
      ])
    ],
    ctaButton: [
      field("text", "Button text", "text", "Allowed inline tags: <em>, <strong>, <b>, <i>, <sup>, <sub>."),
      field("link", "Button link", "url")
    ],
    contentLinks: [
      field("includeHeading", "Include heading", "checkbox"),
      field("heading", "Heading text", "text"),
      repeatable("articles", "Article links", [
        field("text", "Link text", "textarea"),
        field("link", "Link URL", "url")
      ])
    ],
    headingTwo: [
      field("heading", "Heading text", "text")
    ],
    contentSet: [
      repeatable("sets", "Article sets", [
        field("headline", "Headline", "textarea"),
        field("body", "Body copy", "textarea"),
        field("ctaText", "CTA text", "text"),
        field("link", "Headline and CTA URL", "url")
      ])
    ],
    bannerAd: [],
    bottomCallout: [
      field("text", "Callout text", "textarea")
    ]
  };

  function field(name, label, type, note) {
    return { kind: "field", name: name, label: label, type: type, note: note || "" };
  }

  function repeatable(name, label, fields) {
    return { kind: "repeatable", name: name, label: label, fields: fields };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function snapshotState() {
    return clone(state);
  }

  function restoreState(snapshot) {
    state.activeTab = snapshot.activeTab;
    state.selectedId = snapshot.selectedId;
    state.modules = clone(snapshot.modules);
  }

  function pushHistory() {
    pushHistorySnapshot(snapshotState());
  }

  function pushHistorySnapshot(snapshot) {
    undoStack.push(clone(snapshot));
    if (undoStack.length > historyLimit) {
      undoStack.shift();
    }
    redoStack = [];
    updateHistoryButtons();
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshotState());
    restoreState(undoStack.pop());
    renderAll();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshotState());
    restoreState(redoStack.pop());
    renderAll();
  }

  function updateHistoryButtons() {
    var undoButton = document.getElementById("undoAction");
    var redoButton = document.getElementById("redoAction");
    if (undoButton) undoButton.disabled = undoStack.length === 0;
    if (redoButton) redoButton.disabled = redoStack.length === 0;
  }

  function uid() {
    return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function createModule(type) {
    return {
      id: uid(),
      type: type,
      data: clone(defaults[type])
    };
  }

  function resetState() {
    state.modules = [
      createModule("topLogo"),
      createModule("topHeading"),
      createModule("topCallout"),
      createModule("contentFloatingAd"),
      createModule("ctaButton"),
      createModule("contentLinks"),
      createModule("headingTwo"),
      createModule("contentSet"),
      createModule("bannerAd"),
      createModule("bottomCallout")
    ];
    state.activeTab = "content";
    state.selectedId = null;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escAttr(value) {
    return esc(value).replace(/\n/g, " ");
  }

  function textWithBreaks(value) {
    return inlineHtml(value).replace(/\r?\n/g, "<br>");
  }

  function inlineHtml(value) {
    return esc(value)
      .replace(/&lt;(\/?)(em|strong|b|i|sup|sub)&gt;/gi, "<$1$2>");
  }

  function cleanHref(value) {
    var href = String(value || "#").trim() || "#";
    href = href.replace(/[?&]utm_source=ONC-JCO-\$\{unique-id\}(?:&amp;|&)utm_medium=email(?:&amp;|&)md5=\{\{lead\.MD5\}\}/g, "");
    if (href.indexOf("#") === 0) {
      return "#?" + TRACKING;
    }
    return escAttr(href + (href.indexOf("?") === -1 ? "?" : "&amp;") + TRACKING);
  }

  function getSelected() {
    return state.modules.find(function (item) {
      return item.id === state.selectedId;
    });
  }

  function getSelectedIndex() {
    return state.modules.findIndex(function (item) {
      return item.id === state.selectedId;
    });
  }

  function moveModule(index, direction) {
    var next = index + direction;
    if (next < 0 || next >= state.modules.length) return;
    pushHistory();
    var item = state.modules.splice(index, 1)[0];
    state.modules.splice(next, 0, item);
    renderAll();
  }

  function duplicateModule(index) {
    pushHistory();
    var copy = clone(state.modules[index]);
    copy.id = uid();
    state.modules.splice(index + 1, 0, copy);
    state.selectedId = copy.id;
    renderAll();
  }

  function removeModule(index) {
    pushHistory();
    var removed = state.modules.splice(index, 1)[0];
    if (removed && removed.id === state.selectedId) {
      state.selectedId = null;
      state.activeTab = "content";
    }
    renderAll();
  }

  function insertModule(type, index) {
    pushHistory();
    var item = createModule(type);
    var safeIndex = Math.max(0, Math.min(index, state.modules.length));
    state.modules.splice(safeIndex, 0, item);
    state.activeTab = "content";
    state.selectedId = item.id;
    renderAll();
  }

  function moduleSummary(item) {
    var data = item.data;
    if (item.type === "topHeading" || item.type === "headingTwo") return data.heading;
    if (item.type === "topCallout" || item.type === "bottomCallout") return data.text;
    if (item.type === "ctaButton") return data.text.replace(/<[^>]*>/g, "");
    if (item.type === "contentSet") return data.sets.length + " article set" + (data.sets.length === 1 ? "" : "s");
    if (item.type === "contentLinks" || item.type === "contentFloatingAd") return data.articles.length + " article link" + (data.articles.length === 1 ? "" : "s");
    if (item.type === "bannerAd") return "Marketo token {{my.728x90-TOP}}";
    return data.logoAlt || "JCO Journals";
  }

  function renderModuleList() {
    var list = document.getElementById("moduleList");
    list.innerHTML = "";
    state.modules.forEach(function (item, index) {
      var card = document.createElement("article");
      card.className = "module-card" + (item.id === state.selectedId ? " is-active" : "");
      card.setAttribute("draggable", "true");

      var grip = document.createElement("span");
      grip.className = "material-symbols-outlined module-grip";
      grip.setAttribute("aria-hidden", "true");
      grip.textContent = "drag_indicator";

      var icon = document.createElement("span");
      icon.className = "material-symbols-outlined module-kind-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = moduleIcon(item.type);

      var chevron = document.createElement("span");
      chevron.className = "material-symbols-outlined module-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "chevron_right";

      var summary = document.createElement("button");
      summary.type = "button";
      summary.className = "module-summary";
      summary.innerHTML = "<span class=\"module-name\">" + esc(moduleLabels[item.type]) + "</span>";
      summary.addEventListener("click", function () {
        state.selectedId = item.id;
        state.activeTab = "settings";
        renderAll();
      });

      card.addEventListener("dragstart", function (event) {
        event.dataTransfer.setData("text/plain", "existing:" + item.id);
        event.dataTransfer.effectAllowed = "move";
      });

      card.appendChild(grip);
      card.appendChild(icon);
      card.appendChild(summary);
      card.appendChild(chevron);
      list.appendChild(card);
    });
  }

  function moduleIcon(type) {
    if (type === "bannerAd" || type === "contentFloatingAd") return "ad_units";
    if (type === "topLogo") return "image";
    if (type === "ctaButton") return "smart_button";
    if (type === "contentSet" || type === "contentLinks") return "article";
    return "view_quilt";
  }

  function renderEditor() {
    var item = getSelected();
    var form = document.getElementById("moduleEditor");
    form.innerHTML = "";
    if (!item) {
      return;
    }
    form.appendChild(sectionTitle(moduleLabels[item.type]));
    schemas[item.type].forEach(function (config) {
      if (config.kind === "repeatable") {
        form.appendChild(renderRepeatable(item, config));
      } else {
        form.appendChild(renderField(item.data, config, refreshOutput));
      }
    });
  }

  function renderModuleLibrary() {
    var library = document.getElementById("moduleLibrary");
    library.innerHTML = "";
    Object.keys(moduleLabels).forEach(function (type) {
      var item = document.createElement("article");
      item.className = "module-library-item";
      item.setAttribute("draggable", "true");
      item.innerHTML = '<div class="module-library-name">' + esc(moduleLabels[type]) + '</div><div class="module-library-preview' + (type === "bannerAd" ? " is-ad" : "") + '">' + moduleLibraryPreview(type) + '</div>';
      item.addEventListener("dragstart", function (event) {
        event.dataTransfer.setData("text/plain", "new:" + type);
        event.dataTransfer.effectAllowed = "copy";
      });
      library.appendChild(item);
    });
  }

  function moduleLibraryPreview(type) {
    if (type === "bannerAd") return "728 x 90";
    if (type === "contentFloatingAd") return "300 x 250";
    if (type === "topLogo") return "Logo";
    if (type === "ctaButton") return "CTA";
    if (type === "topHeading" || type === "headingTwo") return "Heading";
    if (type === "contentSet") return "Article Set";
    if (type === "contentLinks") return "Article Links";
    return "Callout";
  }

  function renderControlViews() {
    var contentTab = document.getElementById("contentTab");
    var modulesTab = document.getElementById("modulesTab");
    var contentView = document.getElementById("contentView");
    var settingsView = document.getElementById("settingsView");
    var moduleLibraryView = document.getElementById("moduleLibraryView");
    var tab = state.activeTab === "modules" ? "modules" : "content";
    var showSettings = state.activeTab === "settings" && !!getSelected();

    contentTab.classList.toggle("is-active", tab === "content");
    modulesTab.classList.toggle("is-active", tab === "modules");
    contentTab.setAttribute("aria-selected", tab === "content" ? "true" : "false");
    modulesTab.setAttribute("aria-selected", tab === "modules" ? "true" : "false");

    contentView.hidden = tab !== "content" || showSettings;
    settingsView.hidden = !showSettings;
    moduleLibraryView.hidden = tab !== "modules";
  }

  function sectionTitle(text) {
    var wrap = document.createElement("div");
    wrap.innerHTML = "<h3>" + esc(text) + "</h3><p class=\"small-note\">Changes update the preview and output code immediately.</p>";
    return wrap;
  }

  function renderField(target, config, afterChange) {
    var wrap = document.createElement("label");
    wrap.className = config.type === "checkbox" ? "checkbox-field" : "field";
    var note = config.note || "";
    if (!note && config.type !== "checkbox" && config.name.toLowerCase().indexOf("alt") === -1 && config.name.toLowerCase().indexOf("link") === -1 && config.name.toLowerCase().indexOf("url") === -1) {
      note = "Allowed inline tags: <em>, <strong>, <b>, <i>, <sup>, <sub>.";
    }
    var input;
    var startValue = target[config.name];
    var startSnapshot = snapshotState();
    if (config.type === "textarea") {
      input = document.createElement("textarea");
      input.value = target[config.name] || "";
    } else {
      input = document.createElement("input");
      input.type = config.type === "checkbox" ? "checkbox" : (config.type || "text");
      if (config.type === "checkbox") {
        input.checked = !!target[config.name];
      } else {
        input.value = target[config.name] || "";
      }
    }
    input.addEventListener("focus", function () {
      startValue = target[config.name];
      startSnapshot = snapshotState();
    });
    input.addEventListener("input", function () {
      target[config.name] = config.type === "checkbox" ? input.checked : input.value;
      afterChange();
    });
    input.addEventListener("change", function () {
      var nextValue = config.type === "checkbox" ? input.checked : input.value;
      if (startValue !== nextValue) {
        pushHistorySnapshot(startSnapshot);
      }
      target[config.name] = nextValue;
      afterChange();
    });
    if (config.type === "checkbox") {
      wrap.appendChild(input);
      wrap.insertAdjacentHTML("beforeend", "<span>" + esc(config.label) + "</span>");
    } else {
      wrap.insertAdjacentHTML("beforeend", "<span class=\"field-label\">" + esc(config.label) + "</span>");
      wrap.appendChild(input);
      if (note) wrap.insertAdjacentHTML("beforeend", "<span class=\"small-note\">" + esc(note) + "</span>");
    }
    return wrap;
  }

  function renderRepeatable(item, config) {
    var wrap = document.createElement("div");
    wrap.className = "repeatable";
    wrap.innerHTML = "<div class=\"panel-heading\"><h3>" + esc(config.label) + "</h3><button class=\"secondary-button\" type=\"button\">Add</button></div>";
    var list = document.createElement("div");
    var entries = item.data[config.name];

    entries.forEach(function (entry, index) {
      var entryWrap = document.createElement("div");
      entryWrap.className = "repeatable-item";
      config.fields.forEach(function (fieldConfig) {
        entryWrap.appendChild(renderField(entry, fieldConfig, refreshOutput));
      });
      var actions = document.createElement("div");
      actions.className = "list-actions";
      actions.innerHTML = "<button class=\"icon-button\" type=\"button\">Duplicate</button><button class=\"danger-button\" type=\"button\">Remove</button>";
      actions.querySelectorAll("button")[0].addEventListener("click", function () {
        pushHistory();
        entries.splice(index + 1, 0, clone(entry));
        renderAll();
      });
      actions.querySelectorAll("button")[1].addEventListener("click", function () {
        if (entries.length > 1) {
          pushHistory();
          entries.splice(index, 1);
          renderAll();
        }
      });
      entryWrap.appendChild(actions);
      list.appendChild(entryWrap);
    });

    wrap.querySelector("button").addEventListener("click", function () {
      pushHistory();
      entries.push(clone(entries[entries.length - 1] || {}));
      renderAll();
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderAll() {
    renderModuleList();
    renderModuleLibrary();
    renderEditor();
    renderControlViews();
    refreshOutput();
    updateHistoryButtons();
  }

  function refreshOutput() {
    var preview = document.getElementById("emailPreview");
    renderModuleList();
    document.getElementById("outputCode").value = renderEmail(false);
    preview.onload = bindPreviewDeselect;
    preview.srcdoc = renderEmail(true);
  }

  function clearSelection() {
    if (!state.selectedId) return;
    state.selectedId = null;
    renderAll();
  }

  function bindPreviewDeselect() {
    var preview = document.getElementById("emailPreview");
    if (!preview.contentDocument) return;
    scrollPreviewToSelected();
    ensureDropIndicator();
    preview.contentDocument.addEventListener("click", function (event) {
      var toggle = event.target.closest(".builder-preview-config");
      var action = event.target.closest("[data-builder-action]");
      var module = event.target.closest(".builder-preview-module");
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        togglePreviewMenu(toggle);
        return;
      }
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        runPreviewAction(action.getAttribute("data-builder-action"));
        return;
      }
      if (event.target.closest(".builder-preview-menu")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (module) {
        event.preventDefault();
        event.stopPropagation();
        state.selectedId = module.getAttribute("data-builder-module-id");
        state.activeTab = "settings";
        renderAll();
        return;
      }
      clearSelection();
    });
    preview.contentDocument.addEventListener("dragover", handlePreviewDragOver);
    preview.contentDocument.addEventListener("dragleave", function (event) {
      if (event.target === preview.contentDocument.documentElement) hideDropIndicator();
    });
    preview.contentDocument.addEventListener("drop", handlePreviewDrop);
    preview.contentWindow.addEventListener("resize", repositionOpenPreviewMenu);
    preview.contentWindow.addEventListener("scroll", repositionOpenPreviewMenu);
    if (!previewResizeObserver && window.ResizeObserver) {
      previewResizeObserver = new ResizeObserver(repositionOpenPreviewMenu);
      previewResizeObserver.observe(preview);
    }
  }

  function ensureDropIndicator() {
    var preview = document.getElementById("emailPreview");
    var doc = preview.contentDocument;
    if (!doc || doc.querySelector(".builder-drop-indicator")) return;
    var indicator = doc.createElement("div");
    indicator.className = "builder-drop-indicator";
    doc.body.appendChild(indicator);
  }

  function handlePreviewDragOver(event) {
    var payload = event.dataTransfer.types && Array.prototype.indexOf.call(event.dataTransfer.types, "text/plain") !== -1;
    if (!payload) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    showDropIndicator(getPreviewDropIndex(event.clientY));
  }

  function handlePreviewDrop(event) {
    event.preventDefault();
    var value = event.dataTransfer.getData("text/plain");
    var index = getPreviewDropIndex(event.clientY);
    hideDropIndicator();
    if (value.indexOf("new:") === 0) {
      insertModule(value.replace("new:", ""), index);
    } else if (value.indexOf("existing:") === 0) {
      moveExistingModuleToIndex(value.replace("existing:", ""), index);
    }
  }

  function moveExistingModuleToIndex(id, index) {
    var current = state.modules.findIndex(function (item) {
      return item.id === id;
    });
    if (current < 0) return;
    var target = current < index ? index - 1 : index;
    target = Math.max(0, Math.min(target, state.modules.length - 1));
    if (current === target) return;
    pushHistory();
    var item = state.modules.splice(current, 1)[0];
    state.modules.splice(Math.max(0, Math.min(target, state.modules.length)), 0, item);
    state.selectedId = item.id;
    state.activeTab = "content";
    renderAll();
  }

  function getPreviewDropIndex(y) {
    var preview = document.getElementById("emailPreview");
    var rows = Array.prototype.slice.call(preview.contentDocument.querySelectorAll(".builder-preview-module"));
    for (var i = 0; i < rows.length; i += 1) {
      var box = rows[i].getBoundingClientRect();
      if (y < box.top + box.height / 2) return i;
    }
    return rows.length;
  }

  function showDropIndicator(index) {
    var preview = document.getElementById("emailPreview");
    var doc = preview.contentDocument;
    var indicator = doc.querySelector(".builder-drop-indicator");
    var wrapper = doc.getElementById("wrapper");
    var rows = Array.prototype.slice.call(doc.querySelectorAll(".builder-preview-module"));
    if (!indicator || !wrapper) return;
    var wrapperBox = wrapper.getBoundingClientRect();
    var y;
    if (rows[index]) {
      y = rows[index].getBoundingClientRect().top;
    } else if (rows.length) {
      var last = rows[rows.length - 1].getBoundingClientRect();
      y = last.bottom;
    } else {
      y = wrapperBox.top;
    }
    indicator.style.left = wrapperBox.left + "px";
    indicator.style.top = y + "px";
    indicator.style.width = wrapperBox.width + "px";
    indicator.classList.add("is-visible");
  }

  function hideDropIndicator() {
    var preview = document.getElementById("emailPreview");
    var indicator = preview.contentDocument && preview.contentDocument.querySelector(".builder-drop-indicator");
    if (indicator) indicator.classList.remove("is-visible");
  }

  function togglePreviewMenu(toggle) {
    var preview = document.getElementById("emailPreview");
    var menu = preview.contentDocument && preview.contentDocument.querySelector(".builder-preview-menu");
    if (menu) {
      var willOpen = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", willOpen);
      if (willOpen) {
        menu.setAttribute("data-anchor-open", "true");
        positionPreviewMenu(toggle, menu);
      } else {
        menu.removeAttribute("data-anchor-open");
      }
    }
  }

  function positionPreviewMenu(toggle, menu) {
    var doc = menu.ownerDocument;
    var viewportHeight = doc.documentElement.clientHeight;
    var toggleBox = toggle.getBoundingClientRect();
    var menuHeight = 168;
    var left = toggleBox.right;
    var top = Math.min(toggleBox.top + 8, viewportHeight - menuHeight - 8);
    menu.style.left = left + "px";
    menu.style.top = Math.max(8, top) + "px";
  }

  function repositionOpenPreviewMenu() {
    var preview = document.getElementById("emailPreview");
    if (!preview.contentDocument) return;
    var menu = preview.contentDocument.querySelector(".builder-preview-menu.is-open");
    var toggle = preview.contentDocument.querySelector(".builder-preview-config");
    if (menu && toggle) {
      positionPreviewMenu(toggle, menu);
    }
  }

  function runPreviewAction(action) {
    var index = getSelectedIndex();
    if (index < 0) return;
    if (action === "move-up") {
      moveModule(index, -1);
    } else if (action === "move-down") {
      moveModule(index, 1);
    } else if (action === "duplicate") {
      duplicateModule(index);
    } else if (action === "delete") {
      removeModule(index);
    }
  }

  function scrollPreviewToSelected() {
    var preview = document.getElementById("emailPreview");
    if (!preview.contentDocument || !preview.contentWindow || !state.selectedId) return;
    var selected = preview.contentDocument.querySelector(".builder-preview-selected");
    if (selected) {
      var selectedBox = selected.getBoundingClientRect();
      var previewBox = preview.getBoundingClientRect();
      var currentTop = preview.contentWindow.pageYOffset || preview.contentDocument.documentElement.scrollTop || 0;
      var targetTop = currentTop + selectedBox.top - (previewBox.height / 2) + (selectedBox.height / 2);
      preview.contentWindow.scrollTo({
        top: Math.max(0, targetTop),
        left: 0,
        behavior: "smooth"
      });
    }
  }

  function renderModules(isPreview) {
    return state.modules.map(function (item) {
      var html = moduleRenderers[item.type](item.data);
      if (isPreview) {
        return markPreviewModule(html, item);
      }
      return html;
    }).join("\n");
  }

  function markPreviewModule(html, item) {
    var selectedClass = item.id === state.selectedId ? " builder-preview-selected" : "";
    var marked = html.replace("<tr", '<tr class="builder-preview-module' + selectedClass + '" data-builder-module-id="' + item.id + '"');
    if (item.id !== state.selectedId) {
      return marked;
    }
    return marked.replace(/<td([^>]*)>/, '<td$1><div class="builder-preview-tools"><button class="builder-preview-config" type="button" aria-label="Module options"><span class="material-symbols-outlined" aria-hidden="true">settings</span></button><div class="builder-preview-menu" aria-label="Module management options"><button type="button" data-builder-action="move-up"><span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span> Move up</button><button type="button" data-builder-action="move-down"><span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span> Move down</button><button type="button" data-builder-action="duplicate"><span class="material-symbols-outlined" aria-hidden="true">content_copy</span> Duplicate</button><button type="button" data-builder-action="delete"><span class="material-symbols-outlined" aria-hidden="true">delete</span> Delete</button></div></div>');
  }

  var moduleRenderers = {
    topLogo: function (data) {
      return '<tr><td style="padding: 36px 24px;" class="mobile-padding"><table width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 545px;"><tr><td style="padding-bottom: 16px;"><img src="' + escAttr(data.logoSrc) + '" width="188" alt="' + escAttr(data.logoAlt) + '" border="0" style="display: block; margin: 0 auto;"></td></tr><tr><td style="mso-height-rule: exactly; line-height: 8px; border-bottom: solid 8px #002557"></td></tr></table></td></tr>';
    },
    topHeading: function (data) {
      return '<tr><td><table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding: 0px 24px 36px 24px; text-align: center; font-family: sans-serif; font-size: 30px; mso-height-rule: exactly; line-height: 36px; color: #00837E; font-weight: bold;" class="mobile-padding">' + textWithBreaks(data.heading) + '</td></tr></table></td></tr>';
    },
    topCallout: function (data) {
      var image = data.includeImage ? '<td valign="middle" width="170" class="stack-column-center"><a href="' + cleanHref(data.imageLink) + '" target="_blank" style="padding: 8px 0"><img src="' + escAttr(data.imageSrc) + '" alt="' + escAttr(data.imageAlt) + '" width="170"></a></td>' : "";
      var padding = data.includeImage ? "8px 36px 8px 0" : "8px 0px";
      return '<tr><td style="padding: 0px 24px 36px 24px" class="mobile-padding-0"><table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#F5F8FA" style="padding: 20px 24px;" class="mobile-padding"><table width="100%" cellspacing="0" cellpadding="0" border="0" dir="rtl"><tr>' + image + '<td dir="ltr" valign="middle" class="stack-column-center mobile-padding-0" style="text-align: left; font-family: sans-serif; font-size: 20px; mso-height-rule: exactly; line-height: 28px; color: #272727; font-weight: normal; padding: ' + padding + ';">' + textWithBreaks(data.text) + '</td></tr></table></td></tr></table></td></tr>';
    },
    contentFloatingAd: function (data) {
      var ad = data.includeAd ? '<table class="table-ad-full-width" align="right" border="0" cellpadding="0" cellspacing="0" style="float: right;"><tr><td style="float: right; display: block; text-align: center; margin: 0px auto; padding: 0px 0px 36px 36px; font-family: sans-serif; min-width: 300px; min-height: 250px;" class="email-container ad-spot"><p style="margin: 0 0 3px 0; font-size: 10px; mso-height-rule: exactly; line-height: 12px;">ADVERTISEMENT</p>{{my.728x90-TOP}}</td></tr></table>' : "";
      var heading = data.includeHeading ? '<p style="margin: 0; font-size: 24px; mso-height-rule:exactly; line-height: 28px; font-style: italic; font-weight: bold;">' + textWithBreaks(data.heading) + '</p><div style="line-height:20px; height:20px; font-size:20px">&#8202;</div>' : "";
      return '<tr><td style="padding: 0px 24px 16px 24px;" class="mobile-padding"><table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="text-align: left; font-family: sans-serif; font-size: 15px; mso-height-rule: exactly; line-height: 20px; color: #272727;"><div style="display: table; width: 100%;">' + ad + heading + renderArticleLinks(data.articles) + '</div></td></tr></table></td></tr>';
    },
    ctaButton: function (data) {
      return '<tr><td><table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding: 0px 0px 36px 0px; text-align: center; font-family: sans-serif; font-size: 15px; mso-height-rule: exactly; line-height: 20px; color: #272727;" class="mobile-padding"><table cellspacing="0" cellpadding="0" border="0" align="center" style="margin: auto"><tr><td style="border-radius: 3px; background: #002557; text-align: center;" class="button-td"><a href="' + cleanHref(data.link) + '" style="background: #002557; border: 15px solid #002557; padding: 0 12px;color: #ffffff; font-family: sans-serif; font-size: 16px; line-height: 20px; text-align: center; text-decoration: none; display: block; border-radius: 3px; font-weight: bold;" class="button-a">' + inlineHtml(data.text) + '</a></td></tr></table></td></tr></table></td></tr>';
    },
    contentLinks: function (data) {
      var heading = data.includeHeading ? '<p style="margin: 0; font-size: 24px; mso-height-rule:exactly; line-height: 28px; font-style: italic; font-weight: bold;">' + textWithBreaks(data.heading) + '</p><div style="line-height:20px; height:20px; font-size:20px">&#8202;</div>' : "";
      return '<tr><td style="padding: 0px 24px 16px 24px;" class="mobile-padding"><table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="text-align: left; font-family: sans-serif; font-size: 15px; mso-height-rule: exactly; line-height: 20px; color: #272727;">' + heading + renderArticleLinks(data.articles) + '</td></tr></table></td></tr>';
    },
    headingTwo: function (data) {
      return '<tr><td style="padding: 0px 24px 20px 24px;" class="mobile-padding"><table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="text-align: center; font-family: sans-serif; color: #272727; font-size: 24px; mso-height-rule:exactly; line-height: 28px; font-weight: bold;">' + textWithBreaks(data.heading) + '</td></tr></table></td></tr>';
    },
    contentSet: function (data) {
      return '<tr><td style="padding: 0px 24px 36px 24px;" class="mobile-padding"><table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="text-align: left; font-family: sans-serif; font-size: 15px; mso-height-rule: exactly; line-height: 20px; color: #272727;">' + renderContentSets(data.sets) + '</td></tr></table></td></tr>';
    },
    bannerAd: function (data) {
      return '<tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="email-container"><tr><td style="text-align:center; padding: 16px 0 4px 0"><p style="text-align:center; font-family:Arial, sans-serif; font-size:10px; mso-height-rule: exactly; line-height:12px; margin: 0 0 0 0; color:#444444; text-transform:uppercase;">Advertisement</p></td></tr><tr><td style="text-align:center; padding: 0 0 36px 0" class="ad-spot">' + data.adToken + '</td></tr></table></td></tr>';
    },
    bottomCallout: function (data) {
      return '<tr><td style="padding: 16px 24px 36px 24px" class="mobile-padding-0"><table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#F5F8FA" style="padding: 20px 24px;" class="mobile-padding"><table width="100%" cellspacing="0" cellpadding="0" border="0" dir="rtl"><tr><td dir="ltr" valign="middle" class="stack-column-center mobile-padding-0" style="text-align: left; font-family: sans-serif; font-size: 16px; mso-height-rule: exactly; line-height: 20px; color: #272727; font-weight: normal; padding: 0;">' + textWithBreaks(data.text) + '</td></tr></table></td></tr></table></td></tr>';
    }
  };

  function renderArticleLinks(articles) {
    return articles.map(function (article) {
      return '<p style="margin: 0; font-size: 16px; mso-height-rule:exactly; line-height: 20px; font-weight: bold;"><a href="' + cleanHref(article.link) + '" target="_blank" style="color: #002557; text-decoration: none;">' + textWithBreaks(article.text) + '</a></p><div style="line-height:20px; height:20px; font-size:20px">&#8202;</div>';
    }).join("");
  }

  function renderContentSets(sets) {
    return sets.map(function (set, index) {
      var spacer = index < sets.length - 1 ? '<div style="line-height:20px; height:20px; font-size:20px">&#8202;</div>' : "";
      return '<p style="margin: 0; font-size: 16px; mso-height-rule:exactly; line-height: 20px; font-weight: bold;"><a href="' + cleanHref(set.link) + '" target="_blank" style="color: #002557; text-decoration: none;">' + textWithBreaks(set.headline) + '</a></p><div style="line-height:4px; height:4px; font-size:4px">&#8202;</div><p style="margin: 0; font-size: 16px; mso-height-rule:exactly; line-height: 20px; font-weight: normal;">' + textWithBreaks(set.body) + ' <a href="' + cleanHref(set.link) + '" target="_blank" style="color: #002557; text-decoration: none; font-weight: bold;">' + inlineHtml(set.ctaText) + '</a></p>' + spacer;
    }).join("");
  }

  function renderEmail(isPreview) {
    return '<!doctype html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n<title></title>\n<meta class="mktoString" id="unique-id" mktoName="Unique ID for Tracking String" default="GU-Abstract-MMDDYY" mktoModuleScope="false" />\n' + emailStyles(isPreview) + '\n<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->\n</head>\n<body width="100%" bgcolor="#efefef" style="margin: 0;" yahoo="yahoo">\n<div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;font-family: sans-serif;">&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>\n<table cellpadding="0" cellspacing="0" border="0" height="100%" width="100%" bgcolor="#efefef" style="border-collapse:collapse;"><tr><td><center style="width: 100%;"><div style="max-width: 728px;">\n<!--[if (gte mso 9)|(IE)]><table cellspacing="0" cellpadding="0" border="0" width="728" align="center"><tr><td><![endif]-->\n<table cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 728px;"><tr><td style="padding: 16px 0 28px 0; text-align: center; font-family: sans-serif; font-size: 12px; mso-height-rule: exactly; line-height: 16px; color: #333333;"><a href="{{system.viewAsWebpageLink}}" target="_blank" style="color: #272727; text-decoration: underline;">View in browser</a></td></tr></table>\n<table align="center" border="0" cellpadding="0" cellspacing="0" class="email-container"><tr><td style="text-align:center; padding: 0px 0 4px 0"><p style="text-align:center; font-family:Arial, sans-serif; font-size:10px; mso-height-rule: exactly; line-height:12px; margin: 0 0 0 0; color:#444444; text-transform:uppercase;">Advertisement</p></td></tr><tr><td style="text-align:center; padding: 0 0 12px 0" class="ad-spot">{{my.728x90-TOP}}</td></tr></table>\n<table cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#ffffff" width="100%" style="max-width: 728px;" id="wrapper">\n' + renderModules(isPreview) + '\n</table>\n' + emailFooter() + '\n<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->\n</div></center></td></tr></table>\n<img referrerpolicy="no-referrer-when-downgrade" src="https://matomo.broadcastmed.com/matomo.php?idsite=246&amp;rec=1&amp;action_name=ONC-JCO-${unique-id}&amp;uid={{lead.Email Address}}" style="border:0" alt="">\n</body>\n</html>';
  }

  function emailStyles(isPreview) {
    var previewFont = isPreview ? '<style type="text/css">@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&display=swap");</style>\n' : "";
    var previewCss = isPreview ? [
      '.builder-preview-module > td {position: relative !important;overflow: visible !important;cursor: pointer !important;}',
      '.builder-preview-module:hover > td {outline: 1px solid rgba(7,197,194,0.55) !important;outline-offset: -1px !important;box-shadow: inset 0 0 0 9999px rgba(7,197,194,0.05) !important;}',
      '.builder-preview-selected > td {outline: 1px solid rgba(0,131,126,0.2) !important;outline-offset: -1px !important;box-shadow: inset 0 0 0 9999px rgba(0,131,126,0.08) !important;}',
      '.builder-preview-tools {position: absolute !important;top: 0 !important;right: -20px !important;z-index: 9999 !important;font-family: Arial, sans-serif !important;line-height: 1 !important;}',
      '.builder-preview-tools .material-symbols-outlined {font-family: "Material Symbols Outlined" !important;font-weight: normal !important;font-style: normal !important;line-height: 1 !important;letter-spacing: 0 !important;text-transform: none !important;white-space: nowrap !important;font-feature-settings: "liga" !important;-webkit-font-feature-settings: "liga" !important;-webkit-font-smoothing: antialiased !important;}',
      '.builder-preview-config {width: 20px !important;height: 20px !important;margin: 0 !important;padding: 0 !important;border: 0 !important;border-radius: 0 !important;color: #ffffff !important;background: #07c5c2 !important;text-align: center !important;cursor: pointer !important;}',
      '.builder-preview-config .material-symbols-outlined {font-size: 20px !important;line-height: 20px !important;}',
      '.builder-preview-menu {display: none !important;position: fixed !important;width: 160px !important;padding: 4px 0 !important;background: #07c5c2 !important;box-shadow: 0 4px 10px rgba(0,0,0,0.2) !important;}',
      '.builder-preview-menu.is-open {display: block !important;}',
      '.builder-preview-menu button {display: block !important;width: 100% !important;margin: 0 !important;padding: 8px 8px !important;border: 0 !important;color: #000000 !important;background: transparent !important;font-family: Arial, sans-serif !important;font-size: 14px !important;line-height: 14px !important;text-align: left !important;cursor: pointer !important;}',
      '.builder-preview-menu button:hover {background: rgba(255,255,255,0.25) !important;}',
      '.builder-preview-menu .material-symbols-outlined {display: inline-block !important;width: 24px !important;color: #4b4b4b !important;font-size: 20px !important;line-height: 20px !important;vertical-align: -6px !important;}',
      '.builder-drop-indicator {display: none !important;position: fixed !important;height: 4px !important;background: #07c5c2 !important;box-shadow: 0 0 0 1px rgba(255,255,255,0.9) !important;z-index: 9998 !important;pointer-events: none !important;}',
      '.builder-drop-indicator.is-visible {display: block !important;}'
    ].join("") : "";
    return previewFont + '<style type="text/css">html, body {margin: 0 !important;padding: 0 !important;height: 100% !important;width: 100% !important;}* {-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;}.ExternalClass {width: 100%;}div[style*="margin: 16px 0"] {margin: 0 !important;}table, td {mso-table-lspace: 0pt !important;mso-table-rspace: 0pt !important;}table {border-spacing: 0 !important;border-collapse: collapse !important;table-layout: fixed !important;margin: 0 auto !important;}table table table {table-layout: auto;}img {-ms-interpolation-mode: bicubic;}.yshortcuts a {border-bottom: none !important;}a[x-apple-data-detectors] {color: inherit !important;}' + previewCss + '</style>\n<style type="text/css">.button-td, .button-a {transition: all 100ms ease-in;}.button-td:hover, .button-a:hover {background: #00367c !important;border-color: #00367c !important;}@media screen and (max-width: 600px) {.email-container {width: 100% !important;}.fluid, .fluid-centered {width: 100% !important;max-width: 100% !important;height: auto !important;margin-left: auto !important;margin-right: auto !important;}.fluid-centered {margin-left: auto !important;margin-right: auto !important;}.stack-column, .stack-column-center {display: block !important;width: 100% !important;max-width: 100% !important;direction: ltr !important;}.stack-column-center {text-align: center !important;}.center-on-narrow {text-align: center !important;display: block !important;margin-left: auto !important;margin-right: auto !important;float: none !important;}table.center-on-narrow {display: inline-block !important;}.text-wrap-header {display: table-header-group!important;width: 100%!important}.text-wrap-footer {display: table-footer-group!important;width: 100%!important;padding: 10px 0 0px 0!important;}.table-ad-full-width {width: 100%;}.mobile-padding {padding-left: 5% !important;padding-right: 5% !important;}.mobile-padding-0 {padding-left: 0 !important;padding-right: 0 !important;}}.ad-spot img{display: block}</style>';
  }

  function emailFooter() {
    return '<table cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#002557" style="max-width: 728px;"><tr><td style="padding: 20px 24px;" class="mobile-padding"><table width="100%" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td valign="top" class="stack-column-center" style="padding: 16px 0;"><table width="100%" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td style="text-align: left; font-family: sans-serif; color: #ffffff; font-size: 14px; mso-height-rule:exactly; line-height: 20px; padding-bottom: 12px;" class="center-on-narrow">American Society of Clinical Oncology<br>2318 Mill Road, Suite 800<br>Alexandria, VA 22314USA</td></tr><tr><td style="text-align: left; font-family: sans-serif; color: #ffffff; font-size: 14px; mso-height-rule:exactly; line-height: 20px; padding-bottom: 12px;" class="center-on-narrow">571-483-1300</td></tr><tr><td style="text-align: left; font-family: sans-serif; color: #ffffff; font-size: 14px; mso-height-rule:exactly; line-height: 20px;" class="center-on-narrow"><a href="' + cleanHref("https://www.ascop.org") + '" target="_blank" style="font-weight: bold; text-decoration: underline; color: #ffffff;">ASCO.org</a> &bull; <a href="' + cleanHref("https://www.ascopubs.org") + '" target="_blank" style="font-weight: bold; text-decoration: underline; color: #ffffff;">ascopubs.org</a></td></tr></table></td><td width="180" valign="top" class="stack-column-center" style="padding: 16px 0;"><table width="100%" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td style="padding-bottom: 12px"><a href="' + cleanHref("https://ascopost.com/") + '"><img width="180" src="https://ww1.broadcastmed.com/rs/824-XOG-054/images/JCO-RC_ASCO-logo-asco-white_3012560.png" alt="American Society of Clinical Oncology" style="display: block; margin: 0 auto;"></a></td></tr><tr><td><table cellspacing="0" cellpadding="0" border="0" align="center"><tr><td style="padding: 0 4px;"><a href="' + cleanHref("https://www.linkedin.com/company/asco-post/") + '" target="_blank"><img src="https://ww1.broadcastmed.com/rs/824-XOG-054/images/JCO-RC_icn-linkedin_3012567.png" alt="LinkedIn Icon" width="30" style="display: block;"></a></td><td style="padding: 0 4px;"><a href="' + cleanHref("https://www.facebook.com/TheASCOPost") + '" target="_blank"><img src="https://ww1.broadcastmed.com/rs/824-XOG-054/images/JCO-RC_icn-facebook_3012566.png" alt="Facebook Icon" width="30" style="display: block;"></a></td><td style="padding: 0 4px;"><a href="' + cleanHref("https://twitter.com/ascopost") + '" target="_blank"><img src="https://ww1.broadcastmed.com/rs/824-XOG-054/images/JCO-RC_icn-x_3012568.png" alt="X Icon" width="30" style="display: block;"></a></td></tr></table></td></tr></table></td></tr></table></td></tr></table><table cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 728px;"><tbody><tr><td style="padding: 16px 0px 4px 0px; text-align: center; font-family: sans-serif; font-size: 13px; mso-height-rule: exactly; line-height: 20px; color: #272727">You are receiving this email because you have an existing relationship with ASCO.</td></tr><tr><td style="padding: 0px 0px 4px 0px; text-align: center; font-family: sans-serif; font-size: 13px; mso-height-rule: exactly; line-height: 20px; color: #272727"><a href="https://ww1.broadcastmed.com/Journal-of-Clinical-Oncology-Resource-Center-Unsubscribe.html?mktemail={{lead.Email Address:default=edit me}}" style="text-decoration: underline; color:#002557;">Unsubscribe</a> from the JCO Conference Edition emails.</td></tr><tr><td style="padding: 0px 0px 8px 0px; text-align: center; font-family: sans-serif; font-size: 13px; mso-height-rule: exactly; line-height: 20px; color: #272727">Please do not reply to this email. This email was sent by:</td></tr><tr><td style="padding: 0px 0px 8px 0px; text-align: center; font-family: sans-serif; font-size: 13px; mso-height-rule: exactly; line-height: 20px; color: #272727">Journal of Clinical Oncology<br>400 N. Ashley Dr. Ste 2600<br>Tampa, FL 33602</td></tr></tbody></table>';
  }

  document.getElementById("contentTab").addEventListener("click", function () {
    state.activeTab = "content";
    state.selectedId = null;
    renderAll();
  });

  document.getElementById("modulesTab").addEventListener("click", function () {
    state.activeTab = "modules";
    state.selectedId = null;
    renderAll();
  });

  document.getElementById("backToContent").addEventListener("click", function () {
    state.activeTab = "content";
    state.selectedId = null;
    renderAll();
  });

  document.getElementById("settingsView").addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.getElementById("settingsView").addEventListener("change", function (event) {
    event.stopPropagation();
  });

  document.getElementById("undoAction").addEventListener("click", undo);

  document.getElementById("redoAction").addEventListener("click", redo);

  document.getElementById("resetBuilder").addEventListener("click", function () {
    pushHistory();
    resetState();
    renderAll();
  });

  document.addEventListener("click", function (event) {
    if (!state.selectedId) return;
    if (event.target.closest(".module-card")) return;
    if (event.target.closest("#settingsView")) return;
    if (event.target.closest(".builder-tabs")) return;
    clearSelection();
  });

  document.getElementById("copyCode").addEventListener("click", function () {
    var output = document.getElementById("outputCode");
    var done = function () {
      document.getElementById("copyStatus").textContent = "Copied";
      window.setTimeout(function () {
        document.getElementById("copyStatus").textContent = "";
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(output.value).then(done).catch(function () {
        output.select();
        document.execCommand("copy");
        done();
      });
    } else {
      output.select();
      document.execCommand("copy");
      done();
    }
  });

  resetState();
  renderAll();
})();
