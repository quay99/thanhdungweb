(() => {
  "use strict";

  const VERIFIED = Object.freeze({
    facebookUrl: "https://www.facebook.com/Thanhdungg.Kem",
    zaloUrl: "https://zalo.me/84368018920",
    zaloBoxSp1Url: "https://zalo.me/g/ryvnof825",
    fbGroupSp123Url: "https://www.facebook.com/groups/661620508010330?locale=vi_VN",
    zaloRawPhone: "0368018920",
    accountOwner: "NGUYỄN HOÀNG THANH DUNG",
    accountNumber: "0368018920",
    qrImageUrl: "/assets/qr-mb-thanhdung.jpg"
  });

  const metaCsrfEl = document.querySelector('meta[name="csrf-token"]');
  let csrfToken = metaCsrfEl ? metaCsrfEl.getAttribute("content") || "" : "";

  const readStorage = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage quota errors
    }
  };

  const removeStorage = (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat("vi-VN").format(num);

  const formatVND = (amount) => {
    if (!amount || amount <= 0) return "Liên hệ";
    return `${formatNumber(amount)} đ`;
  };

  const normalizeText = (str) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const safeImagePath = (src) => {
    if (typeof src !== "string") return "/assets/favicon.svg";
    if (/^\/uploads\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(src)) return src;
    if (/^\/assets\/[A-Za-z0-9._/-]+$/.test(src) && !src.includes("..")) return src;
    return "/assets/favicon.svg";
  };

  /* =========================================================
     1. Toast Notifications (Native Popover API + Fallback)
     ========================================================= */
  const toastEl = document.getElementById("app-toast");
  const toastMsgEl = document.getElementById("toast-message");
  const toastCloseBtn = document.getElementById("toast-close-btn");
  const supportsPopover = "popover" in HTMLElement.prototype;
  let toastTimer = null;

  const hideToast = () => {
    if (!toastEl) return;
    if (supportsPopover) {
      if (toastEl.matches(":popover-open")) {
        toastEl.hidePopover();
      }
    } else {
      toastEl.classList.remove("is-open");
    }
  };

  const showToast = (message) => {
    if (!toastEl || !toastMsgEl) return;
    toastMsgEl.textContent = message;

    if (supportsPopover) {
      if (!toastEl.matches(":popover-open")) {
        toastEl.showPopover();
      }
    } else {
      toastEl.classList.add("is-open");
    }

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4000);
  };

  if (toastCloseBtn && !supportsPopover) {
    toastCloseBtn.addEventListener("click", hideToast);
  }

  /* =========================================================
     2. Reliable Clipboard Helper (Zero inline styles for CSP)
     ========================================================= */
  const orderDialog = document.getElementById("order-dialog");

  const copyTextSync = (text) => {
    const host = orderDialog && orderDialog.open ? orderDialog : document.body;
    const prevFocus = document.activeElement;
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.className = "clipboard-proxy";
    host.appendChild(temp);
    temp.focus();
    temp.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    host.removeChild(temp);
    if (prevFocus && typeof prevFocus.focus === "function") {
      prevFocus.focus({ preventScroll: true });
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {});
      copied = true;
    }
    return copied;
  };

  const copyToClipboard = (text, label) => {
    const ok = copyTextSync(text);
    if (ok) {
      showToast(`Đã sao chép ${label}!`);
    } else {
      showToast("Trình duyệt chặn copy tự động, bạn hãy bôi đen và copy thủ công.");
    }
    return ok;
  };

  /* =========================================================
     3. Anti-Tamper DOM Guard & Backend Verification
     ========================================================= */
  const tamperBanner = document.getElementById("tamper-warning-banner");
  let suppressObserver = false;

  const expectedByRole = {
    "fb-link": { attr: "href", value: VERIFIED.facebookUrl },
    "zalo-link": { attr: "href", value: VERIFIED.zaloUrl },
    "box-sp1": { attr: "href", value: VERIFIED.zaloBoxSp1Url },
    "group-sp123": { attr: "href", value: VERIFIED.fbGroupSp123Url },
    "bank-stk": { text: VERIFIED.accountNumber },
    "bank-owner": { text: VERIFIED.accountOwner },
    "qr-img": { attr: "src", value: VERIFIED.qrImageUrl }
  };

  const verifyAndHealDom = () => {
    let tampered = false;
    suppressObserver = true;
    try {
      document.querySelectorAll("[data-verified-role]").forEach((el) => {
        const role = el.getAttribute("data-verified-role");
        const spec = expectedByRole[role];
        if (!spec) return;

        if (spec.attr) {
          const cur = el.getAttribute(spec.attr);
          if (cur !== spec.value) {
            tampered = true;
            el.setAttribute(spec.attr, spec.value);
          }
        }
        if (spec.text !== undefined) {
          if ((el.textContent || "").trim() !== spec.text) {
            tampered = true;
            el.textContent = spec.text;
          }
        }
      });

      document.querySelectorAll(".verified-bank-copy").forEach((btn) => {
        const target = btn.getAttribute("data-copy-target");
        const expected = target === "owner" ? VERIFIED.accountOwner : VERIFIED.accountNumber;
        if (btn.getAttribute("data-copy") !== expected) {
          tampered = true;
          btn.setAttribute("data-copy", expected);
        }
      });
    } finally {
      suppressObserver = false;
    }

    if (tampered && tamperBanner) {
      tamperBanner.hidden = false;
    }
    return !tampered;
  };

  const domObserver = new MutationObserver(() => {
    if (!suppressObserver) {
      verifyAndHealDom();
    }
  });

  domObserver.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["href", "src", "data-copy", "data-verified-role"]
  });

  verifyAndHealDom();

  const syncWithBackendShopData = async () => {
    try {
      const resp = await fetch("/api/shop-data", { credentials: "same-origin" });
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data || !data.ok) return;

      const expectedSha = document.body.getAttribute("data-config-sha256");
      const mismatch =
        (expectedSha && data.configSha256 !== expectedSha) ||
        !data.bank ||
        data.bank.accountNumber !== VERIFIED.accountNumber ||
        !data.contacts ||
        data.contacts.facebookUrl !== VERIFIED.facebookUrl ||
        data.contacts.zaloUrl !== VERIFIED.zaloUrl;

      if (mismatch && tamperBanner) {
        tamperBanner.hidden = false;
      }
      verifyAndHealDom();
    } catch {
      // Offline / transient error ignored cleanly
    }
  };
  syncWithBackendShopData();

  /* =========================================================
     4. Two-State Color Scheme Toggle (Namek Jade Locked)
     ========================================================= */
  const themeBtn = document.getElementById("theme-toggle");
  const themeLabel = document.getElementById("theme-toggle-label");
  const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
  const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const syncThemeUI = () => {
    const saved = readStorage("color-scheme");
    const systemIsDark = darkMediaQuery.matches;
    const isPinned = saved === "light" || saved === "dark";
    const activeTheme = isPinned ? saved : systemIsDark ? "dark" : "light";

    document.documentElement.classList.remove("theme-light", "theme-dark");
    if (isPinned) {
      document.documentElement.classList.add(saved === "dark" ? "theme-dark" : "theme-light");
      if (metaColorScheme) metaColorScheme.content = saved;
    } else {
      if (metaColorScheme) metaColorScheme.content = "light dark";
    }

    if (themeBtn && themeLabel) {
      const labelText = isPinned
        ? "Dùng theo máy"
        : activeTheme === "dark"
          ? "Chế độ Sáng"
          : "Chế độ Tối";
      themeBtn.setAttribute("aria-pressed", String(isPinned));
      themeBtn.setAttribute("aria-label", labelText);
      themeLabel.textContent = labelText;
    }
  };

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const saved = readStorage("color-scheme");
      if (saved === "light" || saved === "dark") {
        removeStorage("color-scheme");
      } else {
        const opposite = darkMediaQuery.matches ? "light" : "dark";
        writeStorage("color-scheme", opposite);
      }
      syncThemeUI();
    });
  }

  darkMediaQuery.addEventListener("change", syncThemeUI);
  syncThemeUI();

  /* =========================================================
     5. Sticky Header Scroll-State Fallback
     ========================================================= */
  const stickyHeader = document.querySelector(".sticky-header-container");
  const headerSentinel = document.getElementById("header-sentinel");
  if (stickyHeader && headerSentinel && !(window.CSS && CSS.supports("container-type", "scroll-state"))) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        stickyHeader.classList.toggle("is-stuck", !entry.isIntersecting);
      },
      { threshold: [0] }
    );
    observer.observe(headerSentinel);
  }

  /* =========================================================
     6. Unified Item Table Search & Category Filter (/mua-item)
     ========================================================= */
  const itemSearchForm = document.getElementById("item-search-form");
  const itemSearchInput = document.getElementById("item-search");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const filterBtns = Array.from(document.querySelectorAll(".filter-btn"));
  const itemTableRows = Array.from(document.querySelectorAll("#item-table-body tr.item-qty-row"));
  const itemEmptyRow = document.getElementById("item-empty-row");
  const itemTableStatus = document.getElementById("item-table-status");
  const resetItemFilterBtn = document.getElementById("reset-item-filter-btn");
  let activeCategory = "all";

  const applyItemTableFilter = () => {
    const query = normalizeText(itemSearchInput ? itemSearchInput.value.trim() : "");
    if (clearSearchBtn) {
      clearSearchBtn.hidden = query.length === 0;
    }

    let visibleCount = 0;
    itemTableRows.forEach((row) => {
      const cat = row.dataset.category || "";
      const haystack = normalizeText(`${row.textContent} ${row.dataset.keywords || ""}`);
      const matchCategory = activeCategory === "all" || cat === activeCategory;
      const matchQuery = !query || haystack.includes(query);
      const isVisible = matchCategory && matchQuery;
      row.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (itemEmptyRow) {
      itemEmptyRow.hidden = visibleCount > 0;
    }

    if (itemTableStatus) {
      if (visibleCount === 0) {
        itemTableStatus.textContent =
          "Không tìm thấy mặt hàng khớp từ khóa. Thử tìm: cuồng nộ, bổ huyết, đá nc, dùi đục, sao pha lê, ngọc rồng 3 sao, mảnh khỉ...";
      } else if (activeCategory === "all" && !query) {
        itemTableStatus.textContent = `Đang hiển thị tất cả ${visibleCount} mặt hàng.`;
      } else {
        itemTableStatus.textContent = `Đang hiển thị ${visibleCount} mặt hàng phù hợp.`;
      }
    }
  };

  const resetItemFilters = () => {
    activeCategory = "all";
    if (itemSearchInput) itemSearchInput.value = "";
    filterBtns.forEach((btn) => {
      const selected = (btn.dataset.category || "all") === "all";
      btn.classList.toggle("is-active", selected);
      btn.setAttribute("aria-pressed", String(selected));
    });
    applyItemTableFilter();
  };

  if (itemSearchForm) {
    itemSearchForm.addEventListener("submit", (e) => e.preventDefault());
  }
  if (itemSearchInput) {
    itemSearchInput.addEventListener("input", applyItemTableFilter);
  }
  if (clearSearchBtn && itemSearchInput) {
    clearSearchBtn.addEventListener("click", () => {
      itemSearchInput.value = "";
      applyItemTableFilter();
      itemSearchInput.focus();
    });
  }
  if (resetItemFilterBtn) {
    resetItemFilterBtn.addEventListener("click", () => {
      resetItemFilters();
      if (itemSearchInput) itemSearchInput.focus();
    });
  }
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category || "all";
      filterBtns.forEach((item) => {
        const selected = item === btn;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      applyItemTableFilter();
    });
  });

  /* =========================================================
     7. Bidirectional Gold & Gem Calculator (/mua-item)
     ========================================================= */
  const calcForm = document.getElementById("rate-calc-form");
  const calcAmountInput = document.getElementById("calc-amount");
  const calcInputLabel = document.getElementById("calc-input-label");
  const calcInputHint = document.getElementById("calc-input-hint");
  const calcOutputLabel = document.getElementById("calc-output-label");
  const calcResultMain = document.getElementById("calc-result-main");
  const calcResultSub = document.getElementById("calc-result-sub");
  const addCalcBtn = document.getElementById("add-calc-to-order");

  const computeRateCost = (qty, ratePerK) => Math.max(1, Math.round((qty / ratePerK) * 1000));

  const parseGroupedInt = (rawValue) => {
    const digits = String(rawValue ?? "").replace(/\D+/g, "");
    if (!digits) return 0;
    const num = Number(digits);
    return Number.isSafeInteger(num) ? num : Number.MAX_SAFE_INTEGER;
  };

  const formatGroupedInputElement = (inputEl) => {
    if (!inputEl) return;
    const raw = inputEl.value;
    const selStart = typeof inputEl.selectionStart === "number" ? inputEl.selectionStart : raw.length;
    const digitsAfterCaret = raw.slice(selStart).replace(/\D/g, "").length;
    const digitsOnly = raw.replace(/\D/g, "");
    if (!digitsOnly) {
      inputEl.value = "";
      return;
    }
    const num = Number(digitsOnly);
    const formatted = Number.isSafeInteger(num) ? formatNumber(num) : digitsOnly;
    if (formatted === raw) return;

    inputEl.value = formatted;
    if (typeof inputEl.setSelectionRange === "function") {
      let remaining = digitsAfterCaret;
      let nextPos = formatted.length;
      while (nextPos > 0 && remaining > 0) {
        nextPos -= 1;
        if (/\d/.test(formatted[nextPos])) {
          remaining -= 1;
        }
      }
      inputEl.setSelectionRange(nextPos, nextPos);
    }
  };

  const formatGoldWithBillion = (goldAmount) => {
    const formatted = `${formatNumber(goldAmount)} vàng`;
    if (goldAmount >= 1_000_000_000) {
      const billions = (goldAmount / 1_000_000_000).toLocaleString("vi-VN", {
        maximumFractionDigits: 3
      });
      return `${formatted} (${billions} tỷ vàng)`;
    }
    return formatted;
  };

  const formatRateBonusNote = (id, qty) => {
    if (id === "gem-ve") {
      const tickets = qty / 10;
      return Number.isInteger(tickets)
        ? `${formatNumber(tickets)} vé`
        : `~${tickets.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} vé`;
    }
    if ((id === "gold-fresh" || id === "gold-die") && qty >= 1_000_000_000) {
      return `${(qty / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} tỷ vàng`;
    }
    return "";
  };

  const CALC_CONFIG = {
    "gold-fresh": {
      id: "gold-fresh",
      orderName: "Vàng tươi (x15)",
      unit: "vàng",
      rateText: "Vàng tươi x15",
      qtyLabel: "Số vàng tươi muốn mua (ví dụ 1.500.000.000)",
      qtyHint: "Nhập số vàng tươi cần mua (ví dụ 1.500.000.000 vàng = 1,5 tỷ vàng = 100.000 đ).",
      unitsPerK: 15_000_000,
      computeFromMoneyVnd: (vnd) => formatGoldWithBillion(Math.round((vnd / 1000) * 15_000_000)),
      computeFromQty: (qty) => ({
        costVND: computeRateCost(qty, 15_000_000),
        subText: `Mua ${formatGoldWithBillion(qty)} theo tỉ lệ Vàng tươi x15`
      })
    },
    "gold-die": {
      id: "gold-die",
      orderName: "Vàng die (x60)",
      unit: "vàng",
      rateText: "Vàng die x60",
      qtyLabel: "Số vàng die muốn mua (ví dụ 6.000.000.000)",
      qtyHint: "Nhập số vàng die cần mua (ví dụ 6.000.000.000 vàng = 6 tỷ vàng = 100.000 đ).",
      unitsPerK: 60_000_000,
      computeFromMoneyVnd: (vnd) => formatGoldWithBillion(Math.round((vnd / 1000) * 60_000_000)),
      computeFromQty: (qty) => ({
        costVND: computeRateCost(qty, 60_000_000),
        subText: `Mua ${formatGoldWithBillion(qty)} theo tỉ lệ Vàng die x60`
      })
    },
    "gem-ki": {
      id: "gem-ki",
      orderName: "Ngọc kí (x11)",
      unit: "ngọc",
      rateText: "Ngọc kí x11",
      qtyLabel: "Số ngọc kí muốn mua (ví dụ 1.100)",
      qtyHint: "Nhập số lượng ngọc kí cần mua (ví dụ 1.100 ngọc = 100.000 đ theo tỉ lệ x11).",
      unitsPerK: 11,
      computeFromMoneyVnd: (vnd) => `${formatNumber(Math.round((vnd / 1000) * 11))} ngọc kí`,
      computeFromQty: (qty) => ({
        costVND: computeRateCost(qty, 11),
        subText: `Mua ${formatNumber(qty)} ngọc theo tỉ lệ Ngọc kí x11`
      })
    },
    "gem-ve": {
      id: "gem-ve",
      orderName: "Ngọc vé (x10)",
      unit: "ngọc",
      rateText: "Ngọc vé x10",
      qtyLabel: "Số ngọc vé muốn mua (mỗi vé = 10 ngọc)",
      qtyHint: "Nhập số lượng ngọc vé cần mua (ví dụ 1.000 ngọc = 100 vé = 100.000 đ).",
      unitsPerK: 10,
      computeFromMoneyVnd: (vnd) => {
        const gems = Math.round((vnd / 1000) * 10);
        const tickets = gems / 10;
        const ticketText = Number.isInteger(tickets)
          ? `${formatNumber(tickets)} vé`
          : `~${tickets.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} vé`;
        return `${formatNumber(gems)} ngọc (${ticketText})`;
      },
      computeFromQty: (qty) => {
        const costVND = computeRateCost(qty, 10);
        const ticketNote = formatRateBonusNote("gem-ve", qty);
        return {
          costVND,
          subText: `Mua ${formatNumber(qty)} ngọc theo tỉ lệ Ngọc vé x10 (${ticketNote})`
        };
      }
    }
  };

  let previousCalcMode = "by-money";
  let currentCalcSnapshot = {
    item: {
      id: "gold-fresh",
      name: "Vàng tươi (x15)",
      kind: "rate",
      price: 0,
      ratePerK: 15_000_000,
      unit: "vàng",
      step: 15_000_000
    },
    qty: 1_500_000_000
  };

  const getSelectedCalcMode = () => {
    if (!calcForm) return "by-money";
    const checked = calcForm.querySelector('input[name="calcMode"]:checked');
    return checked ? checked.value : "by-money";
  };

  const getSelectedCalcType = () => {
    if (!calcForm) return "gold-fresh";
    const checked = calcForm.querySelector('input[name="calcType"]:checked');
    return checked ? checked.value : "gold-fresh";
  };

  const syncCalcLabelsAndConversion = () => {
    if (!calcAmountInput || !calcInputLabel || !calcInputHint || !calcOutputLabel) return;
    const mode = getSelectedCalcMode();
    const typeKey = getSelectedCalcType();
    const config = CALC_CONFIG[typeKey] || CALC_CONFIG["gold-fresh"];

    if (mode !== previousCalcMode) {
      const currentVal = parseGroupedInt(calcAmountInput.value);
      if (currentVal >= 1) {
        const converted =
          mode === "by-qty"
            ? Math.max(1, Math.round((currentVal / 1000) * config.unitsPerK))
            : Math.max(1000, Math.round((currentVal / config.unitsPerK) * 1000));
        calcAmountInput.value = formatNumber(converted);
      } else {
        calcAmountInput.value =
          mode === "by-qty"
            ? formatNumber(Math.max(1, Math.round(100 * config.unitsPerK)))
            : formatNumber(100000);
      }
      previousCalcMode = mode;
    }

    if (mode === "by-money") {
      calcInputLabel.textContent = "Số tiền dự kiến mua (VNĐ, ví dụ 50.000 hoặc 100.000)";
      calcInputHint.textContent = "Nhập số tiền VNĐ đầy đủ (ví dụ 50.000 hoặc 100.000).";
      calcOutputLabel.textContent = "Ước tính nhận được:";
    } else {
      calcInputLabel.textContent = config.qtyLabel;
      calcInputHint.textContent = config.qtyHint;
      calcOutputLabel.textContent = "Số tiền cần thanh toán:";
    }
  };

  const updateCalculator = () => {
    if (!calcForm || !calcAmountInput || !calcResultMain || !calcResultSub) return;

    formatGroupedInputElement(calcAmountInput);
    syncCalcLabelsAndConversion();

    const mode = getSelectedCalcMode();
    const typeKey = getSelectedCalcType();
    const config = CALC_CONFIG[typeKey] || CALC_CONFIG["gold-fresh"];
    const rawVal = parseGroupedInt(calcAmountInput.value);
    const minValid = mode === "by-money" ? 1000 : 1;

    if (!rawVal || rawVal < minValid) {
      currentCalcSnapshot = null;
      calcResultMain.textContent =
        mode === "by-money" ? "Nhập số tiền từ 1.000 đ trở lên" : "Nhập số lượng từ 1 trở lên";
      calcResultSub.textContent = `Đang chọn: ${config.rateText}`;
      return;
    }

    const itemDescriptor = {
      id: config.id,
      name: config.orderName,
      kind: "rate",
      price: 0,
      ratePerK: config.unitsPerK,
      unit: config.unit,
      step: config.unitsPerK
    };

    if (mode === "by-money") {
      const clampedVnd = Math.min(1_000_000_000, rawVal);
      const resultText = config.computeFromMoneyVnd(clampedVnd);
      calcResultMain.textContent = resultText;
      calcResultSub.textContent = `Tương ứng ${formatVND(clampedVnd)} theo tỉ lệ ${config.rateText}`;
      currentCalcSnapshot = {
        item: itemDescriptor,
        qty: Math.max(1, Math.round((clampedVnd / 1000) * config.unitsPerK))
      };
    } else {
      const clampedQty = Math.min(100_000_000_000, rawVal);
      const calcQty = config.computeFromQty(clampedQty);
      calcResultMain.textContent = formatVND(calcQty.costVND);
      calcResultSub.textContent = calcQty.subText;
      currentCalcSnapshot = {
        item: itemDescriptor,
        qty: clampedQty
      };
    }
  };

  if (calcForm) {
    calcForm.addEventListener("input", updateCalculator);
    calcForm.addEventListener("change", updateCalculator);
    calcForm.addEventListener("submit", (e) => e.preventDefault());
    updateCalculator();
  }

  /* =========================================================
     8. Shared Cross-Path Quick Order Builder
     ========================================================= */
  const STORAGE_KEY = "thanhdung_nro_order_v3";
  const openOrderBtn = document.getElementById("open-order-btn");
  const openOrderFromItemsBtn = document.getElementById("open-order-from-items-btn");
  const openOrderInlineBtn = document.getElementById("open-order-inline-btn");
  const mobileOpenOrderBtn = document.getElementById("mobile-open-order");
  const orderCountEl = document.getElementById("order-count");
  const mobileOrderCountEl = document.getElementById("mobile-order-count");
  const inlineOrderSummaryEl = document.getElementById("inline-order-summary");
  const orderEmptyMsg = document.getElementById("order-empty-msg");
  const orderListEl = document.getElementById("order-items-list");
  const orderNoteEl = document.getElementById("order-note");
  const orderTotalPriceEl = document.getElementById("order-total-price");
  const orderSendStatusEl = document.getElementById("order-send-status");
  const sendFbOrderBtn = document.getElementById("send-fb-order-btn");
  const sendZaloOrderBtn = document.getElementById("send-zalo-order-btn");
  const copyOrderBtn = document.getElementById("copy-order-btn");
  const clearOrderBtn = document.getElementById("clear-order-btn");
  const orderSyntaxTextEl = document.getElementById("order-syntax-text");
  const copySyntaxBtn = document.getElementById("copy-syntax-btn");

  const orderConfirmDialog = document.getElementById("order-confirm-dialog");
  const confirmPlatformNameEl = document.getElementById("confirm-platform-name");
  const confirmSyntaxPreviewEl = document.getElementById("confirm-syntax-preview");
  const confirmOpenChatBtn = document.getElementById("confirm-open-chat-btn");
  const confirmRecopyBtn = document.getElementById("confirm-recopy-btn");
  const confirmBackBtn = document.getElementById("confirm-back-btn");

  let pendingChatUrl = "";
  let pendingPlatformName = "Zalo";
  let pendingOrderSyntax = "";

  const CLEAN_ITEM_NAMES_BY_ID = {
    "nap-cr": "Nạp CR",
    "bh-x99": "x99 Bổ huyết",
    "gx-x99": "x99 Giáp Xên bọ hung",
    "md-cskb": "x99 Máy dò Capsule kì bí",
    "dui-duc": "Dùi đục",
    "spl-441": "Sao pha lê đỏ",
    "spl-442": "Sao pha lê lam",
    "spl-446": "Sao pha lê vàng",
    "spl-447": "Sao pha lê lục",
    "nr-3s": "Ngọc Rồng 3 sao"
  };

  const LEGACY_DIRTY_ITEM_PATTERN = /\((?:ID\s*\d+|NR\s*3s|BH|GX|MD\s*CSKB)\)|\bID\s*718\b|done\s*3s/i;

  const normalizeOrderItem = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const rawId = typeof raw.id === "string" ? raw.id : "";
    const rawName = typeof raw.name === "string" ? raw.name : "Vật phẩm";
    const oldQty = Math.max(1, Math.floor(Number(raw.qty) || 1));

    // Migrate legacy "pack / gói" entries from v1/v2 calculators cleanly
    if (rawId.startsWith("calc-")) {
      const splMatch = rawId.match(/^calc-(spl-(?:441|442|446|447))-/);
      if (splMatch) {
        const splId = splMatch[1];
        const countMatch = rawName.match(/(\d+)\s*viên/i);
        const perUnit = countMatch ? Math.max(1, Number(countMatch[1])) : Math.max(1, Math.round(Number(raw.price || 1000) / 1000));
        return {
          id: splId,
          name: CLEAN_ITEM_NAMES_BY_ID[splId] || splId,
          kind: "fixed",
          price: 1000,
          ratePerK: 0,
          unit: "viên",
          step: 1,
          qty: Math.min(99999, perUnit * oldQty)
        };
      }
      if (rawId.startsWith("calc-nr3s-")) {
        const countMatch = rawName.match(/(\d+)\s*viên/i);
        const perUnit = countMatch ? Math.max(1, Number(countMatch[1])) : Math.max(1, Math.floor(Number(raw.price || 2500) / 2500));
        return {
          id: "nr-3s",
          name: "Ngọc Rồng 3 sao",
          kind: "fixed",
          price: 2500,
          ratePerK: 0,
          unit: "viên",
          step: 1,
          qty: Math.min(99999, perUnit * oldQty)
        };
      }
      const rateMatch = rawId.match(/^calc-(gold-fresh|gold-die|gem-ki|gem-ve)-/);
      if (rateMatch && CALC_CONFIG[rateMatch[1]]) {
        const cfg = CALC_CONFIG[rateMatch[1]];
        const perUnits = Math.max(1, Math.round((Number(raw.price || 1000) / 1000) * cfg.unitsPerK));
        return {
          id: cfg.id,
          name: cfg.orderName,
          kind: "rate",
          price: 0,
          ratePerK: cfg.unitsPerK,
          unit: cfg.unit,
          step: cfg.unitsPerK,
          qty: Math.min(10000000, perUnits * oldQty)
        };
      }
    }

    if (!rawId) return null;

    if (CALC_CONFIG[rawId]) {
      const cfg = CALC_CONFIG[rawId];
      const scaledQty =
        (rawId === "gold-fresh" || rawId === "gold-die") && raw.unit === "triệu vàng"
          ? oldQty * 1_000_000
          : oldQty;
      return {
        id: cfg.id,
        name: cfg.orderName,
        kind: "rate",
        price: 0,
        ratePerK: cfg.unitsPerK,
        unit: cfg.unit,
        step: cfg.unitsPerK,
        qty: Math.min(100_000_000_000, scaledQty)
      };
    }

    const price = Math.max(0, Number(raw.price) || 0);
    const ratePerK = Math.max(0, Number(raw.ratePerK) || 0);
    const kind =
      raw.kind === "rate" && ratePerK > 0
        ? "rate"
        : raw.kind === "fixed" || price > 0
          ? "fixed"
          : "quote";
    const step = Math.max(1, Math.floor(Number(raw.step) || (kind === "rate" && ratePerK > 0 ? ratePerK : 1)));
    const maxQty = kind === "rate" ? 100_000_000_000 : 99999;

    const resolvedName =
      CLEAN_ITEM_NAMES_BY_ID[rawId] && (!raw.name || LEGACY_DIRTY_ITEM_PATTERN.test(rawName))
        ? CLEAN_ITEM_NAMES_BY_ID[rawId]
        : rawName;

    return {
      id: rawId,
      name: resolvedName,
      kind,
      price,
      ratePerK,
      unit: typeof raw.unit === "string" && raw.unit ? raw.unit : "mục",
      step,
      qty: Math.min(maxQty, oldQty)
    };
  };

  const loadOrder = () => {
    try {
      const raw =
        readStorage(STORAGE_KEY) ||
        readStorage("thanhdung_nro_order_v2") ||
        readStorage("thanhdung_nro_order_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      const merged = [];
      parsed.forEach((entry) => {
        const normalized = normalizeOrderItem(entry);
        if (!normalized) return;
        const existing = merged.find((x) => x.id === normalized.id);
        if (existing) {
          const cap = existing.kind === "rate" ? 100_000_000_000 : 99999;
          existing.qty = Math.min(cap, existing.qty + normalized.qty);
        } else {
          merged.push(normalized);
        }
      });
      return merged;
    } catch {
      return [];
    }
  };

  let orderItems = loadOrder();

  const saveOrder = () => {
    writeStorage(STORAGE_KEY, JSON.stringify(orderItems));
  };

  const clearSendStatus = () => {
    if (orderSendStatusEl) {
      orderSendStatusEl.hidden = true;
      orderSendStatusEl.textContent = "";
    }
  };

  const getOrderItemSubtotal = (item) => {
    if (item.kind === "rate" && item.ratePerK > 0) {
      return computeRateCost(item.qty, item.ratePerK);
    }
    if (item.price > 0) {
      return item.price * item.qty;
    }
    return 0;
  };

  const formatOrderItemDetail = (item) => {
    if (item.kind === "rate" && item.ratePerK > 0) {
      const total = getOrderItemSubtotal(item);
      const bonus = formatRateBonusNote(item.id, item.qty);
      const qtySummary = bonus
        ? `${formatNumber(item.qty)} ${item.unit} (${bonus})`
        : `${formatNumber(item.qty)} ${item.unit}`;
      return `Tỉ lệ ${formatNumber(item.ratePerK)} ${item.unit} / 1.000 đ · ${qtySummary} = ${formatVND(total)}`;
    }
    if (item.price > 0) {
      return `${formatVND(item.price)} / ${item.unit} × ${formatNumber(item.qty)} = ${formatVND(item.price * item.qty)}`;
    }
    return `${formatNumber(item.qty)} ${item.unit} · Báo giá trực tiếp qua Zalo / FB`;
  };

  const buildOrderText = () => {
    if (orderItems.length === 0) return "";
    const lines = [
      " [ĐƠN ĐẶT HÀNG — SHOP THANH DUNG NRO]",
      "Chào shop Thanh Dung, mình gửi thông tin đơn cần đặt:",
      ""
    ];
    let totalVND = 0;
    let hasQuote = false;

    orderItems.forEach((item, index) => {
      const subTotal = getOrderItemSubtotal(item);
      if (subTotal <= 0) {
        hasQuote = true;
        lines.push(`${index + 1}. ${item.name} — SL: ${formatNumber(item.qty)} ${item.unit} (Chờ báo giá)`);
        return;
      }
      totalVND += subTotal;
      if (item.kind === "rate" && item.ratePerK > 0) {
        const bonus = formatRateBonusNote(item.id, item.qty);
        const qtyDesc = bonus
          ? `${formatNumber(item.qty)} ${item.unit} (${bonus})`
          : `${formatNumber(item.qty)} ${item.unit}`;
        lines.push(`${index + 1}. ${item.name} — SL: ${qtyDesc} — ${formatVND(subTotal)}`);
      } else {
        lines.push(
          `${index + 1}. ${item.name} — SL: ${formatNumber(item.qty)} ${item.unit} × ${formatVND(item.price)} = ${formatVND(subTotal)}`
        );
      }
    });

    lines.push("");
    lines.push("───────────────────────────────────");
    const totalLabel =
      totalVND > 0
        ? hasQuote
          ? `${formatVND(totalVND)} + mục báo giá`
          : formatVND(totalVND)
        : "Chờ báo giá trực tiếp";
    lines.push(`💰 TỔNG TẠM TÍNH: ${totalLabel}`);

    const note = orderNoteEl ? orderNoteEl.value.trim() : "";
    if (note) {
      lines.push(`📝 Ghi chú khách: ${note}`);
    }

    lines.push(`🏦 MB Bank chính chủ: ${VERIFIED.accountNumber} (${VERIFIED.accountOwner})`);
    lines.push("═══════════════════════════════════════");
    lines.push("(Cú pháp được gửi từ Website)");

    return lines.join("\n");
  };

  const updateOrderSummaryUi = () => {
    const lineCount = orderItems.length;
    let totalVND = 0;
    let hasQuoteItems = false;

    orderItems.forEach((item) => {
      const sub = getOrderItemSubtotal(item);
      if (sub <= 0) hasQuoteItems = true;
      totalVND += sub;
    });

    if (orderCountEl) orderCountEl.textContent = String(lineCount);
    if (openOrderBtn) openOrderBtn.setAttribute("aria-label", `Mở đơn tính nhanh (${lineCount} mặt hàng)`);
    if (mobileOrderCountEl) mobileOrderCountEl.textContent = String(lineCount);

    let priceSummaryText = "0 đ";
    if (lineCount > 0 && totalVND === 0 && hasQuoteItems) {
      priceSummaryText = "Chờ báo giá";
    } else if (lineCount > 0 && hasQuoteItems) {
      priceSummaryText = `${formatVND(totalVND)} + mục báo giá`;
    } else if (lineCount > 0) {
      priceSummaryText = formatVND(totalVND);
    }

    if (orderTotalPriceEl) {
      orderTotalPriceEl.textContent = priceSummaryText;
    }
    if (inlineOrderSummaryEl) {
      inlineOrderSummaryEl.textContent =
        lineCount === 0
          ? "Đơn tính nhanh: chưa có mặt hàng nào."
          : `Đơn tính nhanh (${lineCount} mặt hàng) — Tạm tính: ${priceSummaryText}`;
    }
    if (orderSyntaxTextEl) {
      orderSyntaxTextEl.value = buildOrderText();
    }
  };

  const renderOrder = () => {
    updateOrderSummaryUi();
    if (!orderListEl || !orderEmptyMsg) return;

    orderListEl.textContent = "";
    orderEmptyMsg.hidden = orderItems.length > 0;

    orderItems.forEach((item) => {
      const li = document.createElement("li");
      li.className = "order-row";

      const info = document.createElement("div");
      info.className = "order-row-info";

      const title = document.createElement("strong");
      title.textContent = item.name;

      const sub = document.createElement("span");
      sub.className = "order-row-detail";
      sub.textContent = formatOrderItemDetail(item);

      info.append(title, sub);

      const ctrl = document.createElement("div");
      ctrl.className = "order-row-ctrl";

      const step = Math.max(1, item.step || 1);
      const maxQty = item.kind === "rate" ? 100_000_000_000 : 99999;

      const decBtn = document.createElement("button");
      decBtn.type = "button";
      decBtn.className = "qty-btn";
      decBtn.textContent = "−";
      decBtn.setAttribute("aria-label", `Giảm số lượng ${item.name}`);

      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.className = "order-qty-input mono-num";
      qtyInput.min = "1";
      qtyInput.max = String(maxQty);
      qtyInput.step = "1";
      qtyInput.inputMode = "numeric";
      qtyInput.value = String(item.qty);
      qtyInput.setAttribute("aria-label", `Số lượng ${item.name} (${item.unit})`);

      const incBtn = document.createElement("button");
      incBtn.type = "button";
      incBtn.className = "qty-btn";
      incBtn.textContent = "+";
      incBtn.setAttribute("aria-label", `Tăng số lượng ${item.name}`);

      const unitTag = document.createElement("span");
      unitTag.className = "order-unit-tag";
      unitTag.textContent = item.unit;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-danger-outline btn-sm order-row-remove";
      removeBtn.textContent = "Xóa";
      removeBtn.setAttribute("aria-label", `Xóa ${item.name} khỏi đơn`);

      decBtn.addEventListener("click", () => {
        if (item.qty <= 1) {
          orderItems = orderItems.filter((x) => x.id !== item.id);
          clearSendStatus();
          saveOrder();
          renderOrder();
          return;
        }
        item.qty = Math.max(1, item.qty - step);
        qtyInput.value = String(item.qty);
        sub.textContent = formatOrderItemDetail(item);
        clearSendStatus();
        saveOrder();
        updateOrderSummaryUi();
      });

      incBtn.addEventListener("click", () => {
        item.qty = Math.min(maxQty, item.qty + step);
        qtyInput.value = String(item.qty);
        sub.textContent = formatOrderItemDetail(item);
        clearSendStatus();
        saveOrder();
        updateOrderSummaryUi();
      });

      qtyInput.addEventListener("input", () => {
        const raw = Math.floor(Number(qtyInput.value));
        if (!Number.isFinite(raw) || raw < 1) {
          sub.textContent = `Nhập số lượng từ 1 ${item.unit} trở lên`;
          return;
        }
        item.qty = Math.min(maxQty, raw);
        sub.textContent = formatOrderItemDetail(item);
        clearSendStatus();
        saveOrder();
        updateOrderSummaryUi();
      });

      qtyInput.addEventListener("change", () => {
        const raw = Math.floor(Number(qtyInput.value));
        item.qty = Number.isFinite(raw) && raw >= 1 ? Math.min(maxQty, raw) : 1;
        qtyInput.value = String(item.qty);
        sub.textContent = formatOrderItemDetail(item);
        clearSendStatus();
        saveOrder();
        updateOrderSummaryUi();
      });

      removeBtn.addEventListener("click", () => {
        orderItems = orderItems.filter((x) => x.id !== item.id);
        clearSendStatus();
        saveOrder();
        renderOrder();
      });

      ctrl.append(decBtn, qtyInput, incBtn, unitTag, removeBtn);
      li.append(info, ctrl);
      orderListEl.appendChild(li);
    });
  };

  const addItemToOrder = (newItem, qtyToAdd = 1) => {
    const normalized = normalizeOrderItem({ ...newItem, qty: qtyToAdd });
    if (!normalized) return;

    const existing = orderItems.find((item) => item.id === normalized.id);
    if (existing) {
      const cap = existing.kind === "rate" ? 100_000_000_000 : 99999;
      existing.qty = Math.min(cap, existing.qty + normalized.qty);
      clearSendStatus();
      saveOrder();
      renderOrder();
      showToast(
        `Đã cộng thêm ${formatNumber(normalized.qty)} ${normalized.unit} "${normalized.name}" (tổng trong đơn: ${formatNumber(existing.qty)} ${normalized.unit}).`
      );
      return;
    }

    orderItems.push(normalized);
    clearSendStatus();
    saveOrder();
    renderOrder();
    showToast(`Đã thêm ${formatNumber(normalized.qty)} ${normalized.unit} "${normalized.name}" vào đơn tính nhanh.`);
  };

  // Event delegation for dynamic + static order quick-add buttons
  document.addEventListener("click", (event) => {
    const addBtn = event.target.closest("button[data-id][data-name]");
    if (addBtn) {
      const price = Number(addBtn.dataset.price || 0);
      addItemToOrder(
        {
          id: addBtn.dataset.id,
          name: addBtn.dataset.name,
          kind: price > 0 ? "fixed" : "quote",
          price,
          ratePerK: 0,
          unit: addBtn.dataset.unit || "mục",
          step: 1
        },
        1
      );
      return;
    }

    const copyBtn = event.target.closest(".copy-btn");
    if (copyBtn) {
      const targetKey = copyBtn.getAttribute("data-copy-target");
      let value = copyBtn.getAttribute("data-copy") || "";
      if (targetKey === "stk") value = VERIFIED.accountNumber;
      else if (targetKey === "owner") value = VERIFIED.accountOwner;
      else if (targetKey === "zaloRawPhone") value = VERIFIED.zaloRawPhone;
      else if (targetKey === "facebookUrl") value = VERIFIED.facebookUrl;
      else if (targetKey === "zaloBoxSp1Url") value = VERIFIED.zaloBoxSp1Url;
      else if (targetKey === "fbGroupSp123Url") value = VERIFIED.fbGroupSp123Url;

      const label = copyBtn.getAttribute("data-label") || "nội dung";
      if (value) copyToClipboard(value, label);
    }
  });

  // Quantity steppers (Unified Item table rows, Set Hire rows, Starter Acc rows)
  document.querySelectorAll(".item-qty-row").forEach((row) => {
    const decBtn = row.querySelector(".row-dec");
    const incBtn = row.querySelector(".row-inc");
    const qtyInput = row.querySelector(".item-qty-input");
    const subtotalEl = row.querySelector(".row-subtotal");
    const hintEl = row.querySelector(".row-sub-hint");
    const addRowBtn = row.querySelector(".row-add-btn");

    const itemId = row.dataset.itemId || "item";
    const itemName = row.dataset.itemName || "Vật phẩm";
    const itemKind = row.dataset.itemKind || "fixed";
    const unitPrice = Number(row.dataset.itemPrice || 0);
    const ratePerK = Number(row.dataset.itemRatePerK || 0);
    const itemUnit = row.dataset.itemUnit || "mục";
    const step = Math.max(1, Number(row.dataset.itemStep || 1) || 1);
    const maxQty = Number(qtyInput ? qtyInput.max : 1000000) || 1000000;

    const getNormalizedQty = () => {
      const raw = Math.floor(Number(qtyInput ? qtyInput.value : 1));
      if (!Number.isFinite(raw) || raw < 1) return 1;
      return Math.min(maxQty, raw);
    };

    const renderRowSubtotal = (val, isValid = true) => {
      if (!subtotalEl) return;
      if (!isValid) {
        subtotalEl.textContent = "Nhập >= 1";
        if (hintEl) {
          hintEl.hidden = true;
          hintEl.textContent = "";
        }
        return;
      }

      if (itemKind === "quote" || (unitPrice <= 0 && ratePerK <= 0)) {
        subtotalEl.textContent = "Báo giá theo lô";
        if (hintEl) {
          hintEl.textContent = "Liên hệ Zalo / FB";
          hintEl.hidden = false;
        }
        return;
      }

      if (itemKind === "rate" && ratePerK > 0) {
        subtotalEl.textContent = formatVND(computeRateCost(val, ratePerK));
        if (hintEl) {
          const bonus = formatRateBonusNote(itemId, val);
          hintEl.textContent = bonus ? (itemId === "gem-ve" ? `= ${bonus}` : bonus) : "";
          hintEl.hidden = !bonus;
        }
        return;
      }

      subtotalEl.textContent = formatVND(unitPrice * val);
      if (hintEl) {
        hintEl.hidden = true;
        hintEl.textContent = "";
      }
    };

    if (decBtn && qtyInput) {
      decBtn.addEventListener("click", () => {
        const cur = getNormalizedQty();
        const next = Math.max(1, cur - step);
        qtyInput.value = String(next);
        renderRowSubtotal(next, true);
      });
    }

    if (incBtn && qtyInput) {
      incBtn.addEventListener("click", () => {
        const cur = getNormalizedQty();
        const next = Math.min(maxQty, cur + step);
        qtyInput.value = String(next);
        renderRowSubtotal(next, true);
      });
    }

    if (qtyInput) {
      qtyInput.addEventListener("input", () => {
        const raw = Math.floor(Number(qtyInput.value));
        if (!Number.isFinite(raw) || raw < 1) {
          renderRowSubtotal(1, false);
        } else {
          renderRowSubtotal(Math.min(maxQty, raw), true);
        }
      });
      qtyInput.addEventListener("change", () => {
        const val = getNormalizedQty();
        qtyInput.value = String(val);
        renderRowSubtotal(val, true);
      });
      renderRowSubtotal(getNormalizedQty(), true);
    }

    if (addRowBtn) {
      addRowBtn.addEventListener("click", () => {
        const chosenQty = getNormalizedQty();
        if (qtyInput) qtyInput.value = String(chosenQty);
        renderRowSubtotal(chosenQty, true);
        addItemToOrder(
          {
            id: itemId,
            name: itemName,
            kind: itemKind === "rate" && ratePerK > 0 ? "rate" : unitPrice > 0 ? "fixed" : "quote",
            price: unitPrice,
            ratePerK,
            unit: itemUnit,
            step
          },
          chosenQty
        );
      });
    }
  });

  if (addCalcBtn) {
    addCalcBtn.addEventListener("click", () => {
      updateCalculator();
      if (!currentCalcSnapshot) {
        showToast("Vui lòng nhập số lượng hoặc số tiền hợp lệ trước khi thêm.");
        return;
      }
      addItemToOrder(currentCalcSnapshot.item, currentCalcSnapshot.qty);
    });
  }

  const openOrderModal = () => {
    if (!orderDialog) return;
    renderOrder();
    if (!orderDialog.open) {
      orderDialog.showModal();
    }
  };

  if (openOrderBtn) openOrderBtn.addEventListener("click", openOrderModal);
  if (openOrderFromItemsBtn) openOrderFromItemsBtn.addEventListener("click", openOrderModal);
  if (openOrderInlineBtn) openOrderInlineBtn.addEventListener("click", openOrderModal);
  if (mobileOpenOrderBtn) mobileOpenOrderBtn.addEventListener("click", openOrderModal);

  const wireDialogBackdropFallback = (dlg) => {
    if (!dlg) return;
    dlg.addEventListener("close", () => {
      dlg.returnValue = "";
    });
    if ("closedBy" in HTMLDialogElement.prototype) return;

    const isOutsideDialog = (e) => {
      const rect = dlg.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    dlg.addEventListener("pointerdown", (event) => {
      pressedOutside = isOutsideDialog(event);
    });
    dlg.addEventListener("pointerup", (event) => {
      if (pressedOutside && isOutsideDialog(event) && dlg.open) {
        dlg.close();
      }
      pressedOutside = false;
    });
  };

  wireDialogBackdropFallback(orderDialog);
  wireDialogBackdropFallback(orderConfirmDialog);

  const openConfirmWithSyntax = (platform, syntax) => {
    copyTextSync(syntax);
    const isFb = platform === "facebook";
    pendingChatUrl = isFb ? VERIFIED.facebookUrl : VERIFIED.zaloUrl;
    pendingPlatformName = isFb ? "Facebook" : "Zalo";
    pendingOrderSyntax = syntax;

    if (confirmPlatformNameEl) confirmPlatformNameEl.textContent = pendingPlatformName;
    if (confirmSyntaxPreviewEl) confirmSyntaxPreviewEl.value = pendingOrderSyntax;
    if (confirmOpenChatBtn) {
      confirmOpenChatBtn.textContent = `OK — Nhắn Tin Qua ${pendingPlatformName}`;
      confirmOpenChatBtn.className = isFb ? "btn btn-facebook btn-lg" : "btn btn-zalo btn-lg";
    }

    if (orderConfirmDialog) {
      if (!orderConfirmDialog.open) {
        orderConfirmDialog.showModal();
      }
    } else {
      window.open(pendingChatUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (orderNoteEl) {
    orderNoteEl.addEventListener("input", () => {
      if (orderSyntaxTextEl) {
        orderSyntaxTextEl.value = buildOrderText();
      }
    });
  }

  if (copySyntaxBtn) {
    copySyntaxBtn.addEventListener("click", () => {
      const text = buildOrderText();
      if (!text) {
        showToast("Đơn đang trống — hãy chọn sản phẩm trước khi sao chép!");
        return;
      }
      copyToClipboard(text, "cú pháp tin nhắn đơn hàng");
    });
  }

  const handleSendOrder = (platform) => {
    if (orderItems.length === 0) {
      showToast("Đơn đang trống — hãy chọn sản phẩm trước khi gửi!");
      return;
    }

    verifyAndHealDom();
    const orderText = buildOrderText();
    openConfirmWithSyntax(platform, orderText);

    const isFb = platform === "facebook";
    const channelName = isFb ? "Facebook Thanh Dung" : "Zalo Thanh Dung";
    const noticeMsg = `Đã sao chép cú pháp đơn hàng! Bấm OK để mở ${channelName} và Dán (Ctrl+V) gửi chủ shop.`;

    if (orderSendStatusEl) {
      orderSendStatusEl.textContent = noticeMsg;
      orderSendStatusEl.hidden = false;
    }
    showToast("Đã sao chép cú pháp! Bấm OK để nhắn tin.");
  };

  if (confirmOpenChatBtn) {
    confirmOpenChatBtn.addEventListener("click", () => {
      if (pendingOrderSyntax) {
        copyTextSync(pendingOrderSyntax);
      }
      if (pendingChatUrl) {
        window.open(pendingChatUrl, "_blank", "noopener,noreferrer");
      }
      if (orderConfirmDialog && orderConfirmDialog.open) {
        orderConfirmDialog.close();
      }
      if (orderDialog && orderDialog.open) {
        orderDialog.close();
      }
      showToast(`Đang mở ${pendingPlatformName}! Vào chat bạn chỉ cần Dán (Ctrl+V / giữ Dán) để gửi shop.`);
    });
  }

  if (confirmRecopyBtn) {
    confirmRecopyBtn.addEventListener("click", () => {
      if (!pendingOrderSyntax) return;
      copyToClipboard(pendingOrderSyntax, "cú pháp tin nhắn đơn hàng");
    });
  }

  if (confirmBackBtn) {
    confirmBackBtn.addEventListener("click", () => {
      if (orderConfirmDialog && orderConfirmDialog.open) {
        orderConfirmDialog.close();
      }
    });
  }

  if (sendFbOrderBtn) sendFbOrderBtn.addEventListener("click", () => handleSendOrder("facebook"));
  if (sendZaloOrderBtn) sendZaloOrderBtn.addEventListener("click", () => handleSendOrder("zalo"));

  if (copyOrderBtn) {
    copyOrderBtn.addEventListener("click", () => {
      if (orderItems.length === 0) {
        showToast("Đơn đang trống — hãy chọn sản phẩm trước khi sao chép!");
        return;
      }
      copyToClipboard(buildOrderText(), "cú pháp tin nhắn đơn hàng");
    });
  }

  if (clearOrderBtn) {
    clearOrderBtn.addEventListener("click", () => {
      orderItems = [];
      clearSendStatus();
      saveOrder();
      renderOrder();
      showToast("Đã xóa toàn bộ đơn tính nhanh.");
    });
  }

  const jumpToQrLink = document.getElementById("jump-to-qr-link");
  if (jumpToQrLink && orderDialog) {
    jumpToQrLink.addEventListener("click", () => {
      if (orderDialog.open) orderDialog.close();
    });
  }

  /* =========================================================
     9. Account Gallery, Lightbox, Image Preview Upload & Admin
     ========================================================= */
  const accGalleryGrid = document.getElementById("acc-gallery-grid");
  const accGalleryStatus = document.getElementById("acc-gallery-status");
  const accFilterForm = document.getElementById("acc-filter-form");
  const accSearchInput = document.getElementById("acc-search-input");
  const accFilterServer = document.getElementById("acc-filter-server");
  const accFilterPlanet = document.getElementById("acc-filter-planet");
  const accFilterStatus = document.getElementById("acc-filter-status");

  const accLightboxDialog = document.getElementById("acc-lightbox-dialog");
  const accLightboxTitle = document.getElementById("acc-lightbox-title");
  const accLightboxSub = document.getElementById("acc-lightbox-sub");
  const accLightboxStage = document.getElementById("acc-lightbox-stage");
  const accLightboxImg = document.getElementById("acc-lightbox-img");
  const accLightboxNote = document.getElementById("acc-lightbox-note");
  const accLightboxAddBtn = document.getElementById("acc-lightbox-add-btn");
  const accLightboxZaloLink = document.getElementById("acc-lightbox-zalo-link");
  const accLightboxRawLink = document.getElementById("acc-lightbox-raw-link");
  const accLightboxExpandBtn = document.getElementById("acc-lightbox-expand-btn");
  const accZoomResetBtn = document.getElementById("acc-zoom-reset-btn");

  const accEditDialog = document.getElementById("acc-edit-dialog");
  const accEditForm = document.getElementById("acc-edit-form");
  const accEditIdInput = document.getElementById("acc-edit-id");
  const accEditCodeLabel = document.getElementById("acc-edit-code-label");
  const accEditTitleInput = document.getElementById("acc-edit-title-input");
  const accEditPriceInput = document.getElementById("acc-edit-price-input");
  const accEditPricePreview = document.getElementById("acc-edit-price-preview");
  const accEditServerSelect = document.getElementById("acc-edit-server-select");
  const accEditPlanetSelect = document.getElementById("acc-edit-planet-select");
  const accEditNoteInput = document.getElementById("acc-edit-note-input");
  const accEditStatusEl = document.getElementById("acc-edit-status");
  const accEditSubmitBtn = document.getElementById("acc-edit-submit-btn");
  const accEditCancelBtn = document.getElementById("acc-edit-cancel-btn");

  wireDialogBackdropFallback(accLightboxDialog);
  wireDialogBackdropFallback(accEditDialog);

  let currentAccountsCache = [];
  let currentLightboxAcc = null;

  const isAdminUiActive = () => {
    if (accGalleryGrid && accGalleryGrid.dataset.isAdmin === "1") return true;
    const uploadBox = document.getElementById("admin-upload-box");
    return Boolean(uploadBox && !uploadBox.hidden && csrfToken);
  };

  const createAccountCardElement = (acc, isAdmin) => {
    const isSold = acc.status === "sold";
    const article = document.createElement("article");
    article.className = isSold ? "account-card is-sold" : "account-card";
    article.dataset.accId = String(acc.id);

    const photoBtn = document.createElement("button");
    photoBtn.type = "button";
    photoBtn.className = "acc-photo-trigger";
    photoBtn.dataset.accLightboxId = String(acc.id);
    photoBtn.setAttribute("aria-label", `Phóng to ảnh ${acc.title || acc.code}`);

    const img = document.createElement("img");
    img.src = safeImagePath(acc.image_path);
    img.alt = `Ảnh tài khoản ${acc.code} - ${acc.server_name} - ${acc.planet}`;
    img.width = Number(acc.image_width) || 800;
    img.height = Number(acc.image_height) || 500;
    img.loading = "lazy";
    img.className = "acc-photo-img";

    const badge = document.createElement("span");
    badge.className = "acc-photo-badge";
    badge.textContent = isSold ? "ĐÃ BÁN" : "SẴN HÀNG";

    const zoomHint = document.createElement("span");
    zoomHint.className = "acc-zoom-hint";
    zoomHint.textContent = "Phóng to & zoom xem kỹ";

    photoBtn.append(img, badge, zoomHint);

    const body = document.createElement("div");
    body.className = "acc-card-body";

    const metaTop = document.createElement("div");
    metaTop.className = "acc-meta-top";

    const codeSpan = document.createElement("span");
    codeSpan.className = "cat-badge mono-num";
    codeSpan.textContent = `#${acc.code}`;

    const pills = document.createElement("div");
    pills.className = "acc-pills";

    const svPill = document.createElement("span");
    svPill.className = "tag-pill tag-jade";
    svPill.textContent = acc.server_name;

    const plPill = document.createElement("span");
    const plClass =
      acc.planet === "Namếc"
        ? "planet-namek"
        : acc.planet === "Xayda"
          ? "planet-xayda"
          : "planet-earth";
    plPill.className = `tag-pill ${plClass}`;
    plPill.textContent = acc.planet;

    pills.append(svPill, plPill);
    metaTop.append(codeSpan, pills);

    const h3 = document.createElement("h3");
    h3.className = "acc-title";
    h3.textContent = acc.title;

    const noteP = document.createElement("p");
    noteP.className = "acc-note-text";
    noteP.textContent = acc.note;

    const priceRow = document.createElement("div");
    priceRow.className = "card-price-row";

    const priceMain = document.createElement("span");
    priceMain.className = "price-main mono-num";
    priceMain.textContent = formatVND(acc.price_vnd);

    const priceSub = document.createElement("span");
    priceSub.className = "price-sub";
    priceSub.textContent = isSold ? "Đã giao dịch xong" : "Có thể gửi đơn ngay";

    priceRow.append(priceMain, priceSub);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const orderBtn = document.createElement("button");
    orderBtn.type = "button";
    orderBtn.className = "btn btn-card-add acc-order-btn";
    orderBtn.dataset.id = `acc-${acc.id}`;
    orderBtn.dataset.name = `Acc #${acc.code} (${acc.server_name} · ${acc.planet})`;
    orderBtn.dataset.price = String(acc.price_vnd);
    orderBtn.dataset.unit = "acc";
    orderBtn.textContent = isSold ? "Đã bán" : "+ Thêm vào đơn";
    if (isSold) orderBtn.disabled = true;

    const checkLink = document.createElement("a");
    checkLink.href = VERIFIED.zaloUrl;
    checkLink.target = "_blank";
    checkLink.rel = "noopener noreferrer";
    checkLink.setAttribute("data-verified-role", "zalo-link");
    checkLink.className = "btn btn-card-link direct-acc-link";
    checkLink.dataset.accCode = String(acc.code || "");
    checkLink.dataset.accServer = String(acc.server_name || "");
    checkLink.dataset.accPlanet = String(acc.planet || "");
    checkLink.dataset.accPrice = formatVND(acc.price_vnd);
    checkLink.textContent = "Check Acc";

    actions.append(orderBtn, checkLink);
    body.append(metaTop, h3, noteP, priceRow, actions);

    if (isAdmin) {
      const adminBar = document.createElement("div");
      adminBar.className = "acc-admin-controls";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "btn btn-outline btn-sm acc-toggle-status-btn";
      toggleBtn.dataset.accId = String(acc.id);
      toggleBtn.dataset.nextStatus = isSold ? "available" : "sold";
      toggleBtn.textContent = isSold ? "Mở bán lại" : "Đánh dấu Đã bán";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-danger-outline btn-sm acc-delete-btn";
      delBtn.dataset.accId = String(acc.id);
      delBtn.dataset.accCode = acc.code;
      delBtn.textContent = "Xóa Acc";

      adminBar.append(toggleBtn, delBtn);
      body.appendChild(adminBar);
    }

    article.append(photoBtn, body);
    return article;
  };

  const renderAdminTable = (accounts) => {
    const adminAccCountEl = document.getElementById("admin-acc-count");
    const adminNavAccCountEl = document.getElementById("admin-nav-acc-count");
    if (adminAccCountEl) adminAccCountEl.textContent = String(accounts.length);
    if (adminNavAccCountEl) adminNavAccCountEl.textContent = String(accounts.length);

    const tbody = document.getElementById("admin-acc-tbody");
    if (!tbody) return;
    tbody.textContent = "";

    if (accounts.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Chưa có tài khoản nào được đăng.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    accounts.forEach((acc) => {
      const isSold = acc.status === "sold";
      const tr = document.createElement("tr");
      tr.dataset.accRowId = String(acc.id);

      const thCode = document.createElement("th");
      thCode.scope = "row";
      thCode.className = "mono-num";
      const codeStrong = document.createElement("strong");
      codeStrong.textContent = `#${acc.code}`;
      thCode.appendChild(codeStrong);

      const tdInfo = document.createElement("td");
      const infoWrap = document.createElement("div");
      infoWrap.className = "table-item-cell";
      const thumb = document.createElement("img");
      thumb.src = safeImagePath(acc.image_path);
      thumb.alt = "";
      thumb.width = Number(acc.image_width) || 64;
      thumb.height = Number(acc.image_height) || 40;
      thumb.className = "table-sprite";
      const titleSpan = document.createElement("span");
      titleSpan.textContent = acc.title;
      infoWrap.append(thumb, titleSpan);
      tdInfo.appendChild(infoWrap);

      const tdSvPl = document.createElement("td");
      tdSvPl.textContent = `${acc.server_name} · ${acc.planet}`;

      const tdPrice = document.createElement("td");
      tdPrice.className = "td-admin-price";
      const priceBox = document.createElement("div");
      priceBox.className = "admin-inline-price-box";

      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.className = "acc-inline-price-input admin-inline-price-input mono-num";
      priceInput.value = String(Number(acc.price_vnd));
      priceInput.min = "1000";
      priceInput.max = "500000000";
      priceInput.step = "1000";
      priceInput.inputMode = "numeric";
      priceInput.setAttribute("aria-label", `Giá Acc ${acc.code}`);

      const savePriceBtn = document.createElement("button");
      savePriceBtn.type = "button";
      savePriceBtn.className = "btn btn-outline btn-sm acc-save-price-btn";
      savePriceBtn.dataset.accId = String(acc.id);
      savePriceBtn.textContent = "Lưu giá";

      const priceCaption = document.createElement("span");
      priceCaption.className = "admin-unit-caption mono-num";
      priceCaption.textContent = formatVND(acc.price_vnd);

      priceBox.append(priceInput, savePriceBtn);
      tdPrice.append(priceBox, priceCaption);

      const tdStatus = document.createElement("td");
      const stPill = document.createElement("span");
      stPill.className = `tag-pill ${isSold ? "tag-crimson" : "tag-jade"}`;
      stPill.textContent = isSold ? "Đã bán" : "Đang bán";
      tdStatus.appendChild(stPill);

      const tdActions = document.createElement("td");
      tdActions.className = "td-admin-actions";
      const actGroup = document.createElement("div");
      actGroup.className = "table-action-group";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-outline btn-sm acc-edit-btn";
      editBtn.dataset.accId = String(acc.id);
      editBtn.textContent = "Sửa";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "btn btn-outline btn-sm acc-toggle-status-btn";
      toggleBtn.dataset.accId = String(acc.id);
      toggleBtn.dataset.nextStatus = isSold ? "available" : "sold";
      toggleBtn.textContent = isSold ? "Mở bán" : "Đã bán";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-danger-outline btn-sm acc-delete-btn";
      delBtn.dataset.accId = String(acc.id);
      delBtn.dataset.accCode = acc.code;
      delBtn.textContent = "Xóa";

      actGroup.append(editBtn, toggleBtn, delBtn);
      tdActions.appendChild(actGroup);

      tr.append(thCode, tdInfo, tdSvPl, tdPrice, tdStatus, tdActions);
      tbody.appendChild(tr);
    });
  };

  const fetchAndRenderAccounts = async () => {
    const params = new URLSearchParams();
    if (accSearchInput && accSearchInput.value.trim()) {
      params.set("q", accSearchInput.value.trim());
    }
    if (accFilterServer && accFilterServer.value !== "all") {
      params.set("server", accFilterServer.value);
    }
    if (accFilterPlanet && accFilterPlanet.value !== "all") {
      params.set("planet", accFilterPlanet.value);
    }
    if (accFilterStatus && accFilterStatus.value !== "all") {
      params.set("status", accFilterStatus.value);
    }

    try {
      const resp = await fetch(`/api/accounts?${params.toString()}`, { credentials: "same-origin" });
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data || !data.ok || !Array.isArray(data.accounts)) return;

      currentAccountsCache = data.accounts;
      const isAdmin = isAdminUiActive();

      if (accGalleryGrid) {
        accGalleryGrid.textContent = "";
        if (data.accounts.length === 0) {
          const empty = document.createElement("div");
          empty.className = "empty-state-box";
          const h3 = document.createElement("h3");
          h3.textContent = "Không có tài khoản nào khớp bộ lọc";
          const p = document.createElement("p");
          p.className = "pretty-text";
          p.textContent = "Thử chọn 'Tất cả Server / Hành tinh' hoặc nhắn Zalo shop để hỏi acc theo yêu cầu.";
          empty.append(h3, p);
          accGalleryGrid.appendChild(empty);
        } else {
          data.accounts.forEach((acc) => {
            accGalleryGrid.appendChild(createAccountCardElement(acc, isAdmin));
          });
        }
      }

      if (accGalleryStatus) {
        accGalleryStatus.textContent = `Đang hiển thị ${data.accounts.length} tài khoản phù hợp.`;
      }

      renderAdminTable(data.accounts);
      verifyAndHealDom();
    } catch {
      // Ignore transient network errors
    }
  };

  if (accGalleryGrid || document.getElementById("home-acc-teaser") || document.getElementById("admin-acc-tbody")) {
    fetch("/api/accounts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.ok && Array.isArray(d.accounts)) {
          currentAccountsCache = d.accounts;
        }
      })
      .catch(() => {});
  }

  let accFilterTimer = null;
  if (accFilterForm) {
    const initialParams = new URLSearchParams(window.location.search);
    if (accSearchInput && initialParams.has("q")) {
      accSearchInput.value = initialParams.get("q") || "";
    }
    if (accFilterServer && initialParams.has("server")) {
      const svVal = initialParams.get("server") || "all";
      if ([...accFilterServer.options].some((o) => o.value === svVal)) {
        accFilterServer.value = svVal;
      }
    }
    if (accFilterPlanet && initialParams.has("planet")) {
      const plVal = initialParams.get("planet") || "all";
      if ([...accFilterPlanet.options].some((o) => o.value === plVal)) {
        accFilterPlanet.value = plVal;
      }
    }
    if (accFilterStatus && initialParams.has("status")) {
      const stVal = initialParams.get("status") || "all";
      if ([...accFilterStatus.options].some((o) => o.value === stVal)) {
        accFilterStatus.value = stVal;
      }
    }

    accFilterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      fetchAndRenderAccounts();
    });
    const triggerFilter = () => {
      if (accFilterTimer) clearTimeout(accFilterTimer);
      accFilterTimer = setTimeout(fetchAndRenderAccounts, 160);
    };
    if (accSearchInput) accSearchInput.addEventListener("input", triggerFilter);
    if (accFilterServer) accFilterServer.addEventListener("change", fetchAndRenderAccounts);
    if (accFilterPlanet) accFilterPlanet.addEventListener("change", fetchAndRenderAccounts);
    if (accFilterStatus) accFilterStatus.addEventListener("change", fetchAndRenderAccounts);
  }

  // Lightbox Zoom, Pan, Expand & Opening via event delegation
  // PC: smooth mouse-wheel cursor zoom + click-to-toggle 220% + drag pan
  // Mobile: native two-finger pinch-to-zoom + double-tap toggle
  const ZOOM_LEVELS = ["fit", "115", "130", "150", "175", "200", "220", "250", "300", "350", "400"];
  let currentLightboxZoom = "fit";
  let lastWheelZoomAt = 0;
  let lastPointerType = "mouse";
  let lastTouchTapAt = 0;

  const syncStageFitAxis = () => {
    if (!accLightboxStage || !accLightboxImg) return;
    const stageRect = accLightboxStage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;
    const natW = accLightboxImg.naturalWidth || Number(accLightboxImg.getAttribute("width")) || 800;
    const natH = accLightboxImg.naturalHeight || Number(accLightboxImg.getAttribute("height")) || 600;
    const imgRatio = natW / Math.max(1, natH);
    const stageRatio = stageRect.width / Math.max(1, stageRect.height);
    accLightboxStage.dataset.fitAxis = imgRatio >= stageRatio ? "width" : "height";
  };

  const setLightboxZoom = (nextZoom, focalPoint = null) => {
    if (!accLightboxStage || !accLightboxImg || !ZOOM_LEVELS.includes(nextZoom)) return;
    syncStageFitAxis();

    const stageRect = accLightboxStage.getBoundingClientRect();
    const oldImgRect = accLightboxImg.getBoundingClientRect();
    const cx = focalPoint ? focalPoint.clientX : stageRect.left + stageRect.width / 2;
    const cy = focalPoint ? focalPoint.clientY : stageRect.top + stageRect.height / 2;
    const rx =
      oldImgRect.width > 0
        ? Math.min(1, Math.max(0, (cx - oldImgRect.left) / oldImgRect.width))
        : 0.5;
    const ry =
      oldImgRect.height > 0
        ? Math.min(1, Math.max(0, (cy - oldImgRect.top) / oldImgRect.height))
        : 0.5;

    currentLightboxZoom = nextZoom;
    accLightboxStage.dataset.zoom = nextZoom;
    accLightboxStage.classList.toggle("is-pannable", nextZoom !== "fit");
    accLightboxStage.classList.remove("is-dragging");

    if (accZoomResetBtn) {
      accZoomResetBtn.textContent = nextZoom === "fit" ? "100%" : `${nextZoom}% ↺`;
      accZoomResetBtn.classList.toggle("is-active", nextZoom !== "fit");
    }

    if (nextZoom === "fit") {
      accLightboxStage.scrollLeft = 0;
      accLightboxStage.scrollTop = 0;
      return;
    }

    const newImgRect = accLightboxImg.getBoundingClientRect();
    const targetClientX = newImgRect.left + rx * newImgRect.width;
    const targetClientY = newImgRect.top + ry * newImgRect.height;
    accLightboxStage.scrollLeft += targetClientX - cx;
    accLightboxStage.scrollTop += targetClientY - cy;
  };

  if (accLightboxImg) {
    accLightboxImg.addEventListener("load", () => {
      syncStageFitAxis();
      if (currentLightboxZoom === "fit" && accLightboxStage) {
        accLightboxStage.scrollLeft = 0;
        accLightboxStage.scrollTop = 0;
      }
    });
  }

  window.addEventListener("resize", () => {
    if (accLightboxDialog && accLightboxDialog.open) {
      syncStageFitAxis();
    }
  });

  if (accZoomResetBtn) {
    accZoomResetBtn.addEventListener("click", () => {
      setLightboxZoom("fit");
    });
  }

  if (accLightboxExpandBtn && accLightboxDialog) {
    accLightboxExpandBtn.addEventListener("click", () => {
      const expanded = accLightboxDialog.dataset.expanded === "1";
      const next = expanded ? "0" : "1";
      accLightboxDialog.dataset.expanded = next;
      accLightboxExpandBtn.setAttribute("aria-pressed", String(next === "1"));
      accLightboxExpandBtn.textContent = next === "1" ? "Thu gọn" : "Toàn khung";
      requestAnimationFrame(syncStageFitAxis);
    });
  }

  if (accLightboxStage) {
    accLightboxStage.addEventListener(
      "wheel",
      (e) => {
        if (!accLightboxDialog || !accLightboxDialog.open) return;
        e.preventDefault();
        const now = Date.now();
        if (now - lastWheelZoomAt < 25) return;
        lastWheelZoomAt = now;
        const idx = ZOOM_LEVELS.indexOf(currentLightboxZoom);
        if (e.deltaY < 0 && idx < ZOOM_LEVELS.length - 1) {
          setLightboxZoom(ZOOM_LEVELS[idx + 1], { clientX: e.clientX, clientY: e.clientY });
        } else if (e.deltaY > 0 && idx > 0) {
          setLightboxZoom(ZOOM_LEVELS[idx - 1], { clientX: e.clientX, clientY: e.clientY });
        }
      },
      { passive: false }
    );

    let dragState = null;
    let suppressNextStageClick = false;

    accLightboxStage.addEventListener("pointerdown", (e) => {
      lastPointerType = e.pointerType || "mouse";
      if (e.pointerType === "touch" || e.button !== 0) return;
      if (currentLightboxZoom === "fit") return;
      dragState = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: accLightboxStage.scrollLeft,
        startScrollTop: accLightboxStage.scrollTop,
        moved: false
      };
      accLightboxStage.setPointerCapture(e.pointerId);
      accLightboxStage.classList.add("is-dragging");
    });

    accLightboxStage.addEventListener("pointermove", (e) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(dx, dy) > 4) {
        dragState.moved = true;
      }
      if (dragState.moved) {
        accLightboxStage.scrollLeft = dragState.startScrollLeft - dx;
        accLightboxStage.scrollTop = dragState.startScrollTop - dy;
      }
    });

    const endDrag = (e) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      if (dragState.moved) {
        suppressNextStageClick = true;
        setTimeout(() => {
          suppressNextStageClick = false;
        }, 0);
      }
      if (accLightboxStage.hasPointerCapture(e.pointerId)) {
        accLightboxStage.releasePointerCapture(e.pointerId);
      }
      accLightboxStage.classList.remove("is-dragging");
      dragState = null;
    };

    accLightboxStage.addEventListener("pointerup", endDrag);
    accLightboxStage.addEventListener("pointercancel", endDrag);

    accLightboxStage.addEventListener("click", (e) => {
      if (suppressNextStageClick) {
        suppressNextStageClick = false;
        return;
      }
      // On touch screens, let two-finger pinch-zoom handle scaling naturally without single-tap jumps;
      // double-tap toggles 200% <-> 100% cleanly.
      if (lastPointerType === "touch") {
        const now = Date.now();
        if (now - lastTouchTapAt < 320) {
          lastTouchTapAt = 0;
          if (currentLightboxZoom === "fit") {
            setLightboxZoom("200", { clientX: e.clientX, clientY: e.clientY });
          } else {
            setLightboxZoom("fit");
          }
        } else {
          lastTouchTapAt = now;
        }
        return;
      }

      if (currentLightboxZoom === "fit") {
        setLightboxZoom("220", { clientX: e.clientX, clientY: e.clientY });
      } else {
        setLightboxZoom("fit");
      }
    });
  }

  if (accLightboxDialog) {
    accLightboxDialog.addEventListener("keydown", (e) => {
      if (!accLightboxDialog.open) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const idx = ZOOM_LEVELS.indexOf(currentLightboxZoom);
        if (idx < ZOOM_LEVELS.length - 1) setLightboxZoom(ZOOM_LEVELS[idx + 1]);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        const idx = ZOOM_LEVELS.indexOf(currentLightboxZoom);
        if (idx > 0) setLightboxZoom(ZOOM_LEVELS[idx - 1]);
      } else if (e.key === "0") {
        e.preventDefault();
        setLightboxZoom("fit");
      }
    });
  }

  document.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-acc-lightbox-id]");
    if (!trigger || !accLightboxDialog) return;

    const accId = Number(trigger.dataset.accLightboxId);
    let acc = currentAccountsCache.find((x) => x.id === accId);
    if (!acc) {
      await fetchAndRenderAccounts();
      acc = currentAccountsCache.find((x) => x.id === accId);
    }
    if (!acc) return;

    const resolvedSrc = safeImagePath(acc.image_path);
    currentLightboxAcc = acc;
    if (accLightboxTitle) accLightboxTitle.textContent = `#${acc.code} · ${acc.title}`;
    if (accLightboxSub) {
      accLightboxSub.textContent = `${acc.server_name} · ${acc.planet} · Giá: ${formatVND(acc.price_vnd)}`;
    }
    if (accLightboxImg) {
      accLightboxImg.width = Number(acc.image_width) || 800;
      accLightboxImg.height = Number(acc.image_height) || 500;
      accLightboxImg.alt = `Ảnh tài khoản ${acc.code}`;
      accLightboxImg.src = resolvedSrc;
    }
    if (accLightboxRawLink) accLightboxRawLink.href = resolvedSrc;
    if (accLightboxNote) accLightboxNote.textContent = acc.note;
    if (accLightboxAddBtn) accLightboxAddBtn.disabled = acc.status === "sold";
    if (accLightboxZaloLink) accLightboxZaloLink.href = VERIFIED.zaloUrl;

    accLightboxDialog.dataset.expanded = "0";
    if (accLightboxExpandBtn) {
      accLightboxExpandBtn.setAttribute("aria-pressed", "false");
      accLightboxExpandBtn.textContent = "Toàn khung";
    }
    if (!accLightboxDialog.open) accLightboxDialog.showModal();
    requestAnimationFrame(() => {
      syncStageFitAxis();
      setLightboxZoom("fit");
    });
  });

  if (accLightboxAddBtn) {
    accLightboxAddBtn.addEventListener("click", () => {
      if (!currentLightboxAcc || currentLightboxAcc.status === "sold") return;
      addItemToOrder(
        {
          id: `acc-${currentLightboxAcc.id}`,
          name: `Acc #${currentLightboxAcc.code} (${currentLightboxAcc.server_name} · ${currentLightboxAcc.planet})`,
          price: currentLightboxAcc.price_vnd,
          unit: "acc"
        },
        1
      );
      if (accLightboxDialog && accLightboxDialog.open) accLightboxDialog.close();
    });
  }

  if (accLightboxZaloLink) {
    accLightboxZaloLink.addEventListener("click", (e) => {
      if (!currentLightboxAcc) return;
      e.preventDefault();
      const acc = currentLightboxAcc;
      const lines = [
        "═══════════════════════════════════════",
        " [HỎI MUA TÀI KHOẢN — SHOP THANH DUNG NRO]",
        "═══════════════════════════════════════",
        "Chào shop Thanh Dung, mình muốn hỏi mua tài khoản:",
        `• Mã Acc: #${acc.code}`,
        `• Server: ${acc.server_name}`,
        `• Hành tinh: ${acc.planet}`,
        `• Giá niêm yết: ${formatVND(acc.price_vnd)}`
      ];
      if (acc.note) {
        lines.push(`• Ghi chú: ${acc.note}`);
      }
      lines.push("───────────────────────────────────────");
      lines.push("Shop kiểm tra giúp mình tài khoản này còn để mình chốt nhé!");
      lines.push("═══════════════════════════════════════");
      openConfirmWithSyntax("zalo", lines.join("\n"));
    });
  }

  document.addEventListener("click", (e) => {
    const accBtn = e.target.closest(".direct-acc-link");
    if (accBtn) {
      e.preventDefault();
      const code = accBtn.dataset.accCode || "";
      const server = accBtn.dataset.accServer || "";
      const planet = accBtn.dataset.accPlanet || "";
      const price = accBtn.dataset.accPrice || "";
      const lines = [
        "═══════════════════════════════════════",
        " [HỎI MUA TÀI KHOẢN — SHOP THANH DUNG NRO]",
        "═══════════════════════════════════════",
        "Chào shop Thanh Dung, mình muốn hỏi mua tài khoản:",
        `• Mã Acc: #${code}`,
        `• Server: ${server}`,
        `• Hành tinh: ${planet}`,
        `• Giá niêm yết: ${price}`,
        "───────────────────────────────────────",
        "Shop kiểm tra giúp mình tài khoản này còn không nhé!",
        "═══════════════════════════════════════"
      ];
      openConfirmWithSyntax("zalo", lines.join("\n"));
      return;
    }

    const svcBtn = e.target.closest(".direct-service-link");
    if (svcBtn) {
      e.preventDefault();
      const name = svcBtn.dataset.serviceName || "";
      const price = svcBtn.dataset.servicePrice || "";
      const lines = [
        "═══════════════════════════════════════",
        " [ĐẶT DỊCH VỤ — SHOP THANH DUNG NRO]",
        "═══════════════════════════════════════",
        "Chào shop Thanh Dung, mình cần đặt dịch vụ:",
        `• Dịch vụ: ${name}`,
        `• Giá niêm yết: ${price}`,
        "───────────────────────────────────────",
        "Shop tư vấn và tiếp nhận đơn giúp mình nhé!",
        "═══════════════════════════════════════"
      ];
      openConfirmWithSyntax("zalo", lines.join("\n"));
    }
  });

  /* Admin Auth & Account Upload/CRUD */
  const adminAuthBox = document.getElementById("admin-auth-box");
  const adminUploadBox = document.getElementById("admin-upload-box");
  const adminSessionUserEl = document.getElementById("admin-session-user");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminLoginError = document.getElementById("admin-login-error");
  const loginPasswordInput = document.getElementById("login-password");
  const togglePasswordBtn = document.getElementById("toggle-password-btn");
  const adminLogoutBtn = document.getElementById("admin-logout-btn");

  const accountUploadForm = document.getElementById("account-upload-form");
  const accImageInput = document.getElementById("acc-image-input");
  const accPreviewFrame = document.getElementById("acc-preview-frame");
  const accPreviewImg = document.getElementById("acc-preview-img");
  const accPreviewInfo = document.getElementById("acc-preview-info");
  const accPreviewClearBtn = document.getElementById("acc-preview-clear-btn");
  const accPriceInput = document.getElementById("acc-price");
  const accPricePreview = document.getElementById("acc-price-preview");
  const accountUploadStatus = document.getElementById("account-upload-status");
  const accountUploadSubmit = document.getElementById("account-upload-submit");

  let activePreviewBlobUrl = "";

  const revokeActivePreview = () => {
    if (activePreviewBlobUrl) {
      URL.revokeObjectURL(activePreviewBlobUrl);
      activePreviewBlobUrl = "";
    }
    if (accPreviewFrame) accPreviewFrame.hidden = true;
    if (accPreviewImg) accPreviewImg.src = "/assets/favicon.svg";
    if (accPreviewInfo) accPreviewInfo.textContent = "";
  };

  if (togglePasswordBtn && loginPasswordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const showing = loginPasswordInput.type === "text";
      loginPasswordInput.type = showing ? "password" : "text";
      togglePasswordBtn.setAttribute("aria-pressed", String(!showing));
      togglePasswordBtn.textContent = showing ? "Hiện" : "Ẩn";
      togglePasswordBtn.setAttribute("aria-label", showing ? "Hiện mật khẩu" : "Ẩn mật khẩu");
    });
  }

  if (accImageInput) {
    accImageInput.addEventListener("change", () => {
      revokeActivePreview();
      const file = accImageInput.files && accImageInput.files[0];
      if (!file) return;

      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        showToast("Chỉ chấp nhận ảnh PNG, JPG hoặc WebP.");
        accImageInput.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast("Ảnh vượt quá giới hạn 5 MB.");
        accImageInput.value = "";
        return;
      }

      activePreviewBlobUrl = URL.createObjectURL(file);
      if (accPreviewImg) {
        accPreviewImg.src = activePreviewBlobUrl;
        accPreviewImg.onload = () => {
          if (accPreviewInfo) {
            const kb = Math.round(file.size / 1024);
            accPreviewInfo.textContent = `${accPreviewImg.naturalWidth}x${accPreviewImg.naturalHeight}px · ${kb} KB`;
          }
        };
        accPreviewImg.onerror = () => {
          showToast("Không thể giải mã file ảnh này — hãy chọn ảnh PNG/JPG/WebP hợp lệ.");
          accImageInput.value = "";
          revokeActivePreview();
        };
      }
      if (accPreviewFrame) accPreviewFrame.hidden = false;
    });
  }

  if (accPreviewClearBtn && accImageInput) {
    accPreviewClearBtn.addEventListener("click", () => {
      accImageInput.value = "";
      revokeActivePreview();
    });
  }

  if (accPriceInput && accPricePreview) {
    const updatePricePreview = () => {
      const val = Number(accPriceInput.value);
      accPricePreview.textContent =
        Number.isFinite(val) && val >= 1000
          ? `Hiển thị: ${formatVND(Math.floor(val))}`
          : "Hiển thị: —";
    };
    accPriceInput.addEventListener("input", updatePricePreview);
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (adminLoginError) adminLoginError.hidden = true;

      const username = document.getElementById("login-username").value.trim();
      const password = loginPasswordInput ? loginPasswordInput.value : "";

      try {
        const resp = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ username, password })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          if (adminLoginError) {
            adminLoginError.textContent = data.error || "Đăng nhập thất bại.";
            adminLoginError.hidden = false;
          }
          return;
        }

        csrfToken = data.csrfToken || "";
        if (document.body.getAttribute("data-route") === "/admin") {
          window.location.reload();
          return;
        }

        if (adminAuthBox) adminAuthBox.hidden = true;
        if (adminUploadBox) adminUploadBox.hidden = false;
        if (adminSessionUserEl) adminSessionUserEl.textContent = data.username;
        if (accGalleryGrid) accGalleryGrid.dataset.isAdmin = "1";
        showToast("Đăng nhập quản trị thành công!");
        await fetchAndRenderAccounts();
      } catch {
        if (adminLoginError) {
          adminLoginError.textContent = "Không thể kết nối máy chủ.";
          adminLoginError.hidden = false;
        }
      }
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "X-CSRF-Token": csrfToken },
          credentials: "same-origin"
        });
      } catch {
        // Ignore
      }
      csrfToken = "";
      window.location.reload();
    });
  }

  if (accountUploadForm) {
    accountUploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (accountUploadStatus) {
        accountUploadStatus.hidden = true;
        accountUploadStatus.classList.remove("is-error");
      }

      const file = accImageInput && accImageInput.files && accImageInput.files[0];
      if (!file) {
        if (accountUploadStatus) {
          accountUploadStatus.textContent = "Vui lòng chọn ảnh tài khoản trước khi đăng.";
          accountUploadStatus.classList.add("is-error");
          accountUploadStatus.hidden = false;
        }
        return;
      }

      const formData = new FormData(accountUploadForm);
      if (accountUploadSubmit) accountUploadSubmit.disabled = true;

      try {
        const resp = await fetch("/api/accounts", {
          method: "POST",
          headers: { "X-CSRF-Token": csrfToken },
          credentials: "same-origin",
          body: formData
        });
        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          if (accountUploadStatus) {
            accountUploadStatus.textContent = data.error || "Đăng acc thất bại.";
            accountUploadStatus.classList.add("is-error");
            accountUploadStatus.hidden = false;
          }
          return;
        }

        accountUploadForm.reset();
        revokeActivePreview();
        if (accPricePreview) accPricePreview.textContent = "Hiển thị: —";
        if (accountUploadStatus) {
          accountUploadStatus.textContent = `Đã đăng thành công Acc #${data.account.code}!`;
          accountUploadStatus.hidden = false;
        }
        showToast(`Đã đăng Acc #${data.account.code} lên shop!`);
        await fetchAndRenderAccounts();
      } catch {
        if (accountUploadStatus) {
          accountUploadStatus.textContent = "Lỗi kết nối khi tải ảnh lên máy chủ.";
          accountUploadStatus.classList.add("is-error");
          accountUploadStatus.hidden = false;
        }
      } finally {
        if (accountUploadSubmit) accountUploadSubmit.disabled = false;
      }
    });
  }

  if (accEditCancelBtn && accEditDialog) {
    accEditCancelBtn.addEventListener("click", () => {
      if (accEditDialog.open) accEditDialog.close();
    });
  }

  if (accEditPriceInput && accEditPricePreview) {
    accEditPriceInput.addEventListener("input", () => {
      const val = Number(accEditPriceInput.value);
      accEditPricePreview.textContent =
        Number.isFinite(val) && val >= 1000
          ? `Hiển thị: ${formatVND(Math.floor(val))}`
          : "Hiển thị: —";
    });
  }

  if (accEditForm) {
    accEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = Number(accEditIdInput ? accEditIdInput.value : 0);
      if (!id) return;

      if (accEditStatusEl) {
        accEditStatusEl.hidden = true;
        accEditStatusEl.classList.remove("is-error");
      }

      const payload = {
        title: accEditTitleInput ? accEditTitleInput.value.trim() : "",
        price_vnd: Math.floor(Number(accEditPriceInput ? accEditPriceInput.value : 0)),
        server_name: accEditServerSelect ? accEditServerSelect.value : "",
        planet: accEditPlanetSelect ? accEditPlanetSelect.value : "",
        note: accEditNoteInput ? accEditNoteInput.value.trim() : ""
      };

      if (accEditSubmitBtn) accEditSubmitBtn.disabled = true;
      try {
        const resp = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          credentials: "same-origin",
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          if (accEditStatusEl) {
            accEditStatusEl.textContent = data.error || "Không thể cập nhật tài khoản.";
            accEditStatusEl.classList.add("is-error");
            accEditStatusEl.hidden = false;
          }
          return;
        }
        if (accEditDialog && accEditDialog.open) accEditDialog.close();
        showToast(`Đã cập nhật thông tin Acc #${data.account.code}.`);
        await fetchAndRenderAccounts();
      } catch {
        if (accEditStatusEl) {
          accEditStatusEl.textContent = "Lỗi kết nối máy chủ.";
          accEditStatusEl.classList.add("is-error");
          accEditStatusEl.hidden = false;
        }
      } finally {
        if (accEditSubmitBtn) accEditSubmitBtn.disabled = false;
      }
    });
  }

  document.addEventListener("click", async (event) => {
    const saveAccPriceBtn = event.target.closest(".acc-save-price-btn");
    if (saveAccPriceBtn) {
      const id = Number(saveAccPriceBtn.dataset.accId);
      const row = saveAccPriceBtn.closest("tr");
      const priceInput = row ? row.querySelector(".acc-inline-price-input") : null;
      const nextPrice = Math.floor(Number(priceInput ? priceInput.value : 0));
      if (!Number.isInteger(nextPrice) || nextPrice < 1000 || nextPrice > 500000000) {
        showToast("Giá tài khoản phải từ 1.000 đ đến 500.000.000 đ.");
        if (priceInput) priceInput.focus();
        return;
      }

      saveAccPriceBtn.disabled = true;
      try {
        const resp = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          credentials: "same-origin",
          body: JSON.stringify({ price_vnd: nextPrice })
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          showToast(`Đã lưu giá mới Acc #${data.account.code}: ${formatVND(data.account.price_vnd)}.`);
          await fetchAndRenderAccounts();
        } else {
          showToast(data.error || "Không thể cập nhật giá Acc.");
        }
      } catch {
        showToast("Không thể kết nối máy chủ.");
      } finally {
        saveAccPriceBtn.disabled = false;
      }
      return;
    }

    const editAccBtn = event.target.closest(".acc-edit-btn");
    if (editAccBtn && accEditDialog) {
      const id = Number(editAccBtn.dataset.accId);
      let acc = currentAccountsCache.find((x) => x.id === id);
      if (!acc) {
        await fetchAndRenderAccounts();
        acc = currentAccountsCache.find((x) => x.id === id);
      }
      if (!acc) {
        showToast("Không tìm thấy dữ liệu tài khoản để sửa.");
        return;
      }

      if (accEditIdInput) accEditIdInput.value = String(acc.id);
      if (accEditCodeLabel) accEditCodeLabel.textContent = `#${acc.code}`;
      if (accEditTitleInput) accEditTitleInput.value = acc.title || "";
      if (accEditPriceInput) accEditPriceInput.value = String(Number(acc.price_vnd) || 1000);
      if (accEditPricePreview) {
        accEditPricePreview.textContent = `Hiển thị: ${formatVND(acc.price_vnd)}`;
      }
      if (accEditServerSelect) {
        if (![...accEditServerSelect.options].some((o) => o.value === acc.server_name)) {
          const opt = document.createElement("option");
          opt.value = acc.server_name;
          opt.textContent = acc.server_name;
          accEditServerSelect.appendChild(opt);
        }
        accEditServerSelect.value = acc.server_name;
      }
      if (accEditPlanetSelect) accEditPlanetSelect.value = acc.planet;
      if (accEditNoteInput) accEditNoteInput.value = acc.note || "";
      if (accEditStatusEl) {
        accEditStatusEl.hidden = true;
        accEditStatusEl.classList.remove("is-error");
      }

      if (!accEditDialog.open) accEditDialog.showModal();
      return;
    }

    const toggleBtn = event.target.closest(".acc-toggle-status-btn");
    if (toggleBtn) {
      const id = toggleBtn.dataset.accId;
      const nextStatus = toggleBtn.dataset.nextStatus;
      toggleBtn.disabled = true;
      try {
        const resp = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          credentials: "same-origin",
          body: JSON.stringify({ status: nextStatus })
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          showToast(
            nextStatus === "sold"
              ? `Đã chuyển #${data.account.code} sang Đã bán.`
              : `Đã mở bán lại #${data.account.code}.`
          );
          await fetchAndRenderAccounts();
        } else {
          showToast(data.error || "Không thể cập nhật trạng thái.");
        }
      } finally {
        toggleBtn.disabled = false;
      }
      return;
    }

    const delBtn = event.target.closest(".acc-delete-btn");
    if (delBtn) {
      const id = delBtn.dataset.accId;
      const code = delBtn.dataset.accCode || id;
      if (!window.confirm(`Xác nhận xóa vĩnh viễn tài khoản #${code}?`)) {
        return;
      }
      delBtn.disabled = true;
      try {
        const resp = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { "X-CSRF-Token": csrfToken },
          credentials: "same-origin"
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          showToast(`Đã xóa Acc #${code}.`);
          await fetchAndRenderAccounts();
        } else {
          showToast(data.error || "Xóa Acc thất bại.");
        }
      } finally {
        delBtn.disabled = false;
      }
    }
  });

  /* =========================================================
     10. Admin CMS: Shop Items & Services Pricing (/admin)
     ========================================================= */
  const adminItemForm = document.getElementById("admin-item-form");
  const itemEditBanner = document.getElementById("item-edit-banner");
  const itemEditBannerName = document.getElementById("item-edit-banner-name");
  const itemEditCancelBtn = document.getElementById("item-edit-cancel-btn");
  const itemEditIdEl = document.getElementById("item-edit-id");
  const itemNameEl = document.getElementById("item-name");
  const itemCategoryEl = document.getElementById("item-category");
  const itemKindEl = document.getElementById("item-kind");
  const itemPriceEl = document.getElementById("item-price");
  const adminItemPricePreviewEl = document.getElementById("admin-item-price-preview");
  const itemUnitEl = document.getElementById("item-unit");
  const itemDefaultQtyEl = document.getElementById("item-default-qty");
  const itemSortOrderEl = document.getElementById("item-sort-order");
  const itemTagEl = document.getElementById("item-tag");
  const itemTagClassEl = document.getElementById("item-tag-class");
  const itemIconSelectEl = document.getElementById("item-icon-select");
  const itemIconFileEl = document.getElementById("item-icon-file");
  const itemIconFileClearBtn = document.getElementById("item-icon-file-clear");
  const adminItemIconPreviewEl = document.getElementById("admin-item-icon-preview");
  const itemDescEl = document.getElementById("item-desc");
  const itemKeywordsEl = document.getElementById("item-keywords");
  const itemIsActiveEl = document.getElementById("item-is-active");
  const adminItemStatusEl = document.getElementById("admin-item-status");
  const adminItemSubmitBtn = document.getElementById("admin-item-submit");
  const adminItemResetBtn = document.getElementById("admin-item-reset-btn");
  const adminItemSearchEl = document.getElementById("admin-item-search");
  const adminItemsTbody = document.getElementById("admin-items-tbody");
  const adminItemsCountEl = document.getElementById("admin-items-count");
  const adminNavItemsCountEl = document.getElementById("admin-nav-items-count");
  const adminItemsStatusEl = document.getElementById("admin-items-status");

  let adminItemsCache = [];
  let activeItemIconBlobUrl = "";

  const revokeItemIconBlob = () => {
    if (activeItemIconBlobUrl) {
      URL.revokeObjectURL(activeItemIconBlobUrl);
      activeItemIconBlobUrl = "";
    }
  };

  const formatItemUnitPreviewText = (kind, price, unit) => {
    if (kind === "quote" || !price || Number(price) <= 0) {
      return "Hiển thị: Báo giá theo lô";
    }
    const formatted = `${formatNumber(Math.floor(Number(price)))} đ`;
    const cleanUnit = String(unit || "").trim() || "món";
    if (cleanUnit === "lô 999") return `Hiển thị: ${formatted} / 999 viên`;
    if (/^(x\d+|lô|gói|bộ|set)/i.test(cleanUnit)) return `Hiển thị: ${formatted} / ${cleanUnit}`;
    return `Hiển thị: ${formatted} / 1 ${cleanUnit}`;
  };

  const updateAdminItemFormPreview = () => {
    const kind = itemKindEl ? itemKindEl.value : "fixed";
    const isQuote = kind === "quote";
    if (itemPriceEl) {
      itemPriceEl.disabled = isQuote;
      itemPriceEl.required = !isQuote;
    }
    if (adminItemPricePreviewEl) {
      const priceVal = itemPriceEl ? Number(itemPriceEl.value) : 0;
      const unitVal = itemUnitEl ? itemUnitEl.value : "cái";
      adminItemPricePreviewEl.textContent = formatItemUnitPreviewText(kind, priceVal, unitVal);
    }
  };

  const syncItemIconPreviewFromSelect = () => {
    if (!adminItemIconPreviewEl || !itemIconSelectEl) return;
    if (activeItemIconBlobUrl) return;
    adminItemIconPreviewEl.src = safeImagePath(itemIconSelectEl.value || "/assets/icons/2754.png");
  };

  const clearCustomIconOption = () => {
    if (!itemIconSelectEl) return;
    itemIconSelectEl.querySelectorAll('[data-custom-upload-opt="1"]').forEach((opt) => {
      opt.remove();
    });
  };

  const resetItemForm = () => {
    if (!adminItemForm) return;
    revokeItemIconBlob();
    clearCustomIconOption();
    adminItemForm.reset();
    if (itemEditIdEl) itemEditIdEl.value = "";
    if (itemEditBanner) itemEditBanner.hidden = true;
    if (itemEditBannerName) itemEditBannerName.textContent = "";
    if (adminItemSubmitBtn) adminItemSubmitBtn.textContent = "+ Thêm Item Vào Bảng Giá";
    if (itemIconFileEl) itemIconFileEl.value = "";
    if (itemIconFileClearBtn) itemIconFileClearBtn.hidden = true;
    if (itemIsActiveEl) itemIsActiveEl.checked = true;
    if (adminItemStatusEl) {
      adminItemStatusEl.hidden = true;
      adminItemStatusEl.classList.remove("is-error");
    }
    updateAdminItemFormPreview();
    syncItemIconPreviewFromSelect();
  };

  const populateItemFormForEdit = (item) => {
    if (!adminItemForm || !item) return;
    revokeItemIconBlob();
    clearCustomIconOption();

    if (itemEditIdEl) itemEditIdEl.value = String(item.dbId);
    if (itemEditBannerName) itemEditBannerName.textContent = item.name;
    if (itemEditBanner) itemEditBanner.hidden = false;
    if (adminItemSubmitBtn) adminItemSubmitBtn.textContent = "Lưu Thay Đổi Mặt Hàng";

    if (itemNameEl) itemNameEl.value = item.name || "";
    if (itemCategoryEl) itemCategoryEl.value = item.category || "khac";
    if (itemKindEl) itemKindEl.value = item.kind === "quote" ? "quote" : "fixed";
    if (itemPriceEl) {
      itemPriceEl.value = item.kind === "quote" ? "10000" : String(Number(item.price) || 1000);
    }
    if (itemUnitEl) itemUnitEl.value = item.unit || "cái";
    if (itemDefaultQtyEl) {
      itemDefaultQtyEl.value = String(Math.max(1, Number(item.defaultQty) || 1));
    }
    if (itemSortOrderEl) {
      const sortNum = Number(item.sortOrder);
      itemSortOrderEl.value = Number.isFinite(sortNum) ? String(sortNum) : "200";
    }
    if (itemTagEl) itemTagEl.value = item.tag || "";
    if (itemTagClassEl) itemTagClassEl.value = item.tagClass || "";
    if (itemDescEl) itemDescEl.value = item.desc || "";
    if (itemKeywordsEl) itemKeywordsEl.value = (item.keywords || "").slice(0, 180);
    if (itemIsActiveEl) itemIsActiveEl.checked = Boolean(item.isActive);
    if (itemIconFileEl) itemIconFileEl.value = "";
    if (itemIconFileClearBtn) itemIconFileClearBtn.hidden = true;

    if (itemIconSelectEl && item.icon) {
      const hasOpt = [...itemIconSelectEl.options].some((o) => o.value === item.icon);
      if (!hasOpt) {
        const customOpt = document.createElement("option");
        customOpt.value = item.icon;
        customOpt.textContent = "Ảnh Icon đã tải lên hiện tại";
        customOpt.dataset.customUploadOpt = "1";
        itemIconSelectEl.prepend(customOpt);
      }
      itemIconSelectEl.value = item.icon;
    }

    if (adminItemStatusEl) {
      adminItemStatusEl.hidden = true;
      adminItemStatusEl.classList.remove("is-error");
    }

    updateAdminItemFormPreview();
    syncItemIconPreviewFromSelect();
    adminItemForm.scrollIntoView({ behavior: "smooth", block: "start" });
    if (itemNameEl) itemNameEl.focus({ preventScroll: true });
  };

  const renderAdminItemsRows = (itemsList) => {
    if (!adminItemsTbody) return;
    const query = normalizeText(adminItemSearchEl ? adminItemSearchEl.value.trim() : "");
    const filtered = !query
      ? itemsList
      : itemsList.filter((it) =>
          normalizeText(`${it.name} ${it.desc} ${it.group} ${it.tag} ${it.keywords}`).includes(query)
        );

    if (adminItemsCountEl) adminItemsCountEl.textContent = String(itemsList.length);
    if (adminNavItemsCountEl) adminNavItemsCountEl.textContent = String(itemsList.length);
    if (adminItemsStatusEl) {
      adminItemsStatusEl.textContent = query
        ? `Tìm thấy ${filtered.length} / ${itemsList.length} mặt hàng khớp "${adminItemSearchEl.value.trim()}".`
        : `Đang có ${itemsList.length} mặt hàng trong kho bảng giá.`;
    }

    adminItemsTbody.textContent = "";

    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = itemsList.length === 0
        ? "Chưa có mặt hàng nào. Hãy thêm mặt hàng mới ở biểu mẫu bên trên."
        : "Không có mặt hàng nào khớp từ khóa tìm kiếm.";
      tr.appendChild(td);
      adminItemsTbody.appendChild(tr);
      return;
    }

    filtered.forEach((item) => {
      const tr = document.createElement("tr");
      tr.dataset.itemDbId = String(item.dbId);
      if (!item.isActive) tr.classList.add("is-hidden-row");

      const thItem = document.createElement("th");
      thItem.scope = "row";
      thItem.className = "th-admin-item";

      const cellWrap = document.createElement("div");
      cellWrap.className = "table-item-cell";

      const img = document.createElement("img");
      img.src = safeImagePath(item.icon);
      img.alt = "";
      img.width = Number(item.width) || 48;
      img.height = Number(item.height) || 48;
      img.className = "table-sprite";

      const copyDiv = document.createElement("div");
      copyDiv.className = "table-item-copy";

      const titleRow = document.createElement("div");
      titleRow.className = "table-item-title-row";

      const strongName = document.createElement("strong");
      strongName.textContent = item.name;
      const catBadge = document.createElement("span");
      catBadge.className = "cat-badge";
      catBadge.textContent = item.group || "";
      titleRow.append(strongName, catBadge);

      if (item.tag) {
        const tagSpan = document.createElement("span");
        tagSpan.className = `tag-pill ${item.tagClass || ""}`.trim();
        tagSpan.textContent = item.tag;
        titleRow.appendChild(tagSpan);
      }

      const descSpan = document.createElement("span");
      descSpan.className = "table-item-desc";
      descSpan.textContent = item.desc || "";

      copyDiv.append(titleRow, descSpan);
      cellWrap.append(img, copyDiv);
      thItem.appendChild(cellWrap);

      const tdPrice = document.createElement("td");
      tdPrice.className = "td-admin-price";
      if (item.kind === "quote") {
        const quoteBadge = document.createElement("span");
        quoteBadge.className = "tag-pill";
        quoteBadge.textContent = "Báo giá theo lô";
        const quoteCap = document.createElement("span");
        quoteCap.className = "admin-unit-caption";
        quoteCap.textContent = "Khách liên hệ Zalo / FB";
        tdPrice.append(quoteBadge, quoteCap);
      } else {
        const priceBox = document.createElement("div");
        priceBox.className = "admin-inline-price-box";

        const priceInput = document.createElement("input");
        priceInput.type = "number";
        priceInput.className = "admin-inline-price-input mono-num";
        priceInput.value = String(Number(item.price));
        priceInput.min = "100";
        priceInput.max = "500000000";
        priceInput.step = "100";
        priceInput.inputMode = "numeric";
        priceInput.setAttribute("aria-label", `Đơn giá ${item.name}`);

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "btn btn-outline btn-sm admin-item-save-price-btn";
        saveBtn.dataset.itemDbId = String(item.dbId);
        saveBtn.textContent = "Lưu giá";

        priceBox.append(priceInput, saveBtn);

        const capSpan = document.createElement("span");
        capSpan.className = "admin-unit-caption mono-num";
        capSpan.textContent = item.unitPriceLabel || formatVND(item.price);

        tdPrice.append(priceBox, capSpan);
      }

      const tdStatus = document.createElement("td");
      tdStatus.className = "td-admin-status";
      const statusBadge = document.createElement("span");
      statusBadge.className = `tag-pill ${item.isActive ? "tag-jade" : "tag-crimson"}`;
      statusBadge.textContent = item.isActive ? "Đang bán" : "Đang ẩn";
      tdStatus.appendChild(statusBadge);

      const tdActions = document.createElement("td");
      tdActions.className = "td-admin-actions";
      const actGroup = document.createElement("div");
      actGroup.className = "table-action-group";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-outline btn-sm admin-item-edit-btn";
      editBtn.dataset.itemDbId = String(item.dbId);
      editBtn.textContent = "Sửa";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "btn btn-outline btn-sm admin-item-toggle-btn";
      toggleBtn.dataset.itemDbId = String(item.dbId);
      toggleBtn.dataset.nextActive = item.isActive ? "0" : "1";
      toggleBtn.textContent = item.isActive ? "Ẩn" : "Hiện";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-danger-outline btn-sm admin-item-delete-btn";
      deleteBtn.dataset.itemDbId = String(item.dbId);
      deleteBtn.dataset.itemName = item.name;
      deleteBtn.textContent = "Xóa";

      actGroup.append(editBtn, toggleBtn, deleteBtn);
      tdActions.appendChild(actGroup);

      tr.append(thItem, tdPrice, tdStatus, tdActions);
      adminItemsTbody.appendChild(tr);
    });
  };

  const fetchAndRenderAdminItems = async () => {
    if (!adminItemsTbody) return;
    try {
      const resp = await fetch("/api/items?include_hidden=1", { credentials: "same-origin" });
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data || !data.ok || !Array.isArray(data.items)) return;
      adminItemsCache = data.items;
      renderAdminItemsRows(adminItemsCache);
    } catch {
      // Ignore transient network errors
    }
  };

  if (adminItemsTbody) {
    fetchAndRenderAdminItems();
  }

  if (adminItemForm) {
    if (itemKindEl) itemKindEl.addEventListener("change", updateAdminItemFormPreview);
    if (itemPriceEl) itemPriceEl.addEventListener("input", updateAdminItemFormPreview);
    if (itemUnitEl) itemUnitEl.addEventListener("input", updateAdminItemFormPreview);

    document.querySelectorAll(".admin-unit-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (!itemUnitEl) return;
        itemUnitEl.value = chip.dataset.unit || "cái";
        updateAdminItemFormPreview();
        itemUnitEl.focus();
      });
    });

    if (itemIconSelectEl) {
      itemIconSelectEl.addEventListener("change", () => {
        if (itemIconFileEl && itemIconFileEl.files && itemIconFileEl.files.length > 0) {
          itemIconFileEl.value = "";
          if (itemIconFileClearBtn) itemIconFileClearBtn.hidden = true;
        }
        revokeItemIconBlob();
        syncItemIconPreviewFromSelect();
      });
    }

    if (itemIconFileEl) {
      itemIconFileEl.addEventListener("change", () => {
        revokeItemIconBlob();
        const file = itemIconFileEl.files && itemIconFileEl.files[0];
        if (!file) {
          if (itemIconFileClearBtn) itemIconFileClearBtn.hidden = true;
          syncItemIconPreviewFromSelect();
          return;
        }
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
          showToast("Chỉ chấp nhận icon định dạng PNG, JPG hoặc WebP.");
          itemIconFileEl.value = "";
          if (itemIconFileClearBtn) itemIconFileClearBtn.hidden = true;
          syncItemIconPreviewFromSelect();
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          showToast("Ảnh icon không được vượt quá 5 MB.");
          itemIconFileEl.value = "";
          if (itemIconFileClearBtn) itemIconFileClearBtn.hidden = true;
          syncItemIconPreviewFromSelect();
          return;
        }
        activeItemIconBlobUrl = URL.createObjectURL(file);
        if (adminItemIconPreviewEl) {
          adminItemIconPreviewEl.src = activeItemIconBlobUrl;
        }
        if (itemIconFileClearBtn) itemIconFileClearBtn.hidden = false;
      });
    }

    if (itemIconFileClearBtn && itemIconFileEl) {
      itemIconFileClearBtn.addEventListener("click", () => {
        itemIconFileEl.value = "";
        itemIconFileClearBtn.hidden = true;
        revokeItemIconBlob();
        syncItemIconPreviewFromSelect();
      });
    }

    if (itemEditCancelBtn) {
      itemEditCancelBtn.addEventListener("click", resetItemForm);
    }
    if (adminItemResetBtn) {
      adminItemResetBtn.addEventListener("click", resetItemForm);
    }

    updateAdminItemFormPreview();
    syncItemIconPreviewFromSelect();

    adminItemForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (adminItemStatusEl) {
        adminItemStatusEl.hidden = true;
        adminItemStatusEl.classList.remove("is-error");
      }

      const editId = Number(itemEditIdEl ? itemEditIdEl.value : 0);
      const isEdit = Number.isInteger(editId) && editId > 0;
      const formData = new FormData(adminItemForm);

      formData.set("isActive", itemIsActiveEl && itemIsActiveEl.checked ? "1" : "0");
      if (itemKindEl && itemKindEl.value === "quote") {
        formData.set("price", "0");
      }
      if (!itemIconFileEl || !itemIconFileEl.files || itemIconFileEl.files.length === 0) {
        formData.delete("iconFile");
      }

      if (adminItemSubmitBtn) adminItemSubmitBtn.disabled = true;

      try {
        const resp = await fetch(isEdit ? `/api/items/${encodeURIComponent(editId)}` : "/api/items", {
          method: isEdit ? "PATCH" : "POST",
          headers: { "X-CSRF-Token": csrfToken },
          credentials: "same-origin",
          body: formData
        });
        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          if (adminItemStatusEl) {
            adminItemStatusEl.textContent = data.error || "Không thể lưu mặt hàng.";
            adminItemStatusEl.classList.add("is-error");
            adminItemStatusEl.hidden = false;
          }
          return;
        }

        const savedName = data.item ? data.item.name : "mặt hàng";
        resetItemForm();
        if (adminItemStatusEl) {
          adminItemStatusEl.textContent = isEdit
            ? `Đã lưu thay đổi "${savedName}" và đồng bộ ngay lên trang Mua Item!`
            : `Đã thêm thành công "${savedName}" vào trang Mua Item!`;
          adminItemStatusEl.hidden = false;
        }
        showToast(isEdit ? `Đã cập nhật "${savedName}".` : `Đã thêm "${savedName}" lên shop!`);
        await fetchAndRenderAdminItems();
      } catch {
        if (adminItemStatusEl) {
          adminItemStatusEl.textContent = "Lỗi kết nối máy chủ khi lưu mặt hàng.";
          adminItemStatusEl.classList.add("is-error");
          adminItemStatusEl.hidden = false;
        }
      } finally {
        if (adminItemSubmitBtn) adminItemSubmitBtn.disabled = false;
      }
    });
  }

  if (adminItemSearchEl) {
    adminItemSearchEl.addEventListener("input", () => {
      renderAdminItemsRows(adminItemsCache);
    });
  }

  document.addEventListener("click", async (event) => {
    const saveItemPriceBtn = event.target.closest(".admin-item-save-price-btn");
    if (saveItemPriceBtn) {
      const dbId = Number(saveItemPriceBtn.dataset.itemDbId);
      const row = saveItemPriceBtn.closest("tr");
      const priceInput = row ? row.querySelector(".admin-inline-price-input") : null;
      const nextPrice = Math.floor(Number(priceInput ? priceInput.value : 0));
      if (!Number.isInteger(nextPrice) || nextPrice < 100 || nextPrice > 500000000) {
        showToast("Đơn giá item phải từ 100 đ đến 500.000.000 đ.");
        if (priceInput) priceInput.focus();
        return;
      }

      saveItemPriceBtn.disabled = true;
      try {
        const resp = await fetch(`/api/items/${encodeURIComponent(dbId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          credentials: "same-origin",
          body: JSON.stringify({ price: nextPrice })
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          showToast(`Đã cập nhật giá "${data.item.name}": ${data.item.unitPriceLabel}`);
          await fetchAndRenderAdminItems();
        } else {
          showToast(data.error || "Không thể lưu đơn giá.");
        }
      } catch {
        showToast("Không thể kết nối máy chủ.");
      } finally {
        saveItemPriceBtn.disabled = false;
      }
      return;
    }

    const editItemBtn = event.target.closest(".admin-item-edit-btn");
    if (editItemBtn) {
      const dbId = Number(editItemBtn.dataset.itemDbId);
      let item = adminItemsCache.find((x) => x.dbId === dbId);
      if (!item) {
        await fetchAndRenderAdminItems();
        item = adminItemsCache.find((x) => x.dbId === dbId);
      }
      if (!item) {
        showToast("Không tìm thấy dữ liệu mặt hàng.");
        return;
      }
      populateItemFormForEdit(item);
      return;
    }

    const toggleItemBtn = event.target.closest(".admin-item-toggle-btn");
    if (toggleItemBtn) {
      const dbId = Number(toggleItemBtn.dataset.itemDbId);
      const nextActive = toggleItemBtn.dataset.nextActive === "1";
      toggleItemBtn.disabled = true;
      try {
        const resp = await fetch(`/api/items/${encodeURIComponent(dbId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          credentials: "same-origin",
          body: JSON.stringify({ isActive: nextActive })
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          showToast(
            nextActive
              ? `Đã hiện "${data.item.name}" trên trang Mua Item.`
              : `Đã tạm ẩn "${data.item.name}" khỏi trang Mua Item.`
          );
          await fetchAndRenderAdminItems();
        } else {
          showToast(data.error || "Không thể cập nhật hiển thị.");
        }
      } catch {
        showToast("Không thể kết nối máy chủ.");
      } finally {
        toggleItemBtn.disabled = false;
      }
      return;
    }

    const deleteItemBtn = event.target.closest(".admin-item-delete-btn");
    if (deleteItemBtn) {
      const dbId = Number(deleteItemBtn.dataset.itemDbId);
      const itemName = deleteItemBtn.dataset.itemName || `#${dbId}`;
      if (!window.confirm(`Xác nhận xóa vĩnh viễn mặt hàng "${itemName}"?`)) {
        return;
      }
      deleteItemBtn.disabled = true;
      try {
        const resp = await fetch(`/api/items/${encodeURIComponent(dbId)}`, {
          method: "DELETE",
          headers: { "X-CSRF-Token": csrfToken },
          credentials: "same-origin"
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          if (itemEditIdEl && Number(itemEditIdEl.value) === dbId) {
            resetItemForm();
          }
          showToast(`Đã xóa mặt hàng "${itemName}".`);
          await fetchAndRenderAdminItems();
        } else {
          showToast(data.error || "Xóa mặt hàng thất bại.");
        }
      } catch {
        showToast("Không thể kết nối máy chủ.");
      } finally {
        deleteItemBtn.disabled = false;
      }
      return;
    }

    const saveSvcBtn = event.target.closest(".admin-svc-save-btn");
    if (saveSvcBtn) {
      const key = saveSvcBtn.dataset.serviceKey;
      const row = saveSvcBtn.closest("tr");
      if (!key || !row) return;

      const nameInput = row.querySelector(".admin-svc-name-input");
      const noteInput = row.querySelector(".admin-svc-note-input");
      const priceInput = row.querySelector(".admin-svc-price-input");
      const captionEl = row.querySelector(".th-admin-svc .admin-unit-caption");

      const name = nameInput ? nameInput.value.trim() : "";
      const note = noteInput ? noteInput.value.trim() : "";
      const price = Math.floor(Number(priceInput ? priceInput.value : 0));

      if (!name || name.length < 2) {
        showToast("Tên dịch vụ cần tối thiểu 2 ký tự.");
        if (nameInput) nameInput.focus();
        return;
      }
      if (!Number.isInteger(price) || (price !== 0 && price < 1000) || price > 500000000) {
        showToast("Giá dịch vụ phải bằng 0 (báo giá) hoặc từ 1.000 đ.");
        if (priceInput) priceInput.focus();
        return;
      }

      saveSvcBtn.disabled = true;
      try {
        const resp = await fetch(`/api/services/${encodeURIComponent(key)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          credentials: "same-origin",
          body: JSON.stringify({ name, note, price })
        });
        const data = await resp.json();
        if (resp.ok && data.ok && data.service) {
          if (captionEl) {
            captionEl.textContent = `Hiển thị: ${data.service.priceText}`;
          }
          showToast(`Đã lưu giá "${data.service.name}": ${data.service.priceText}`);
        } else {
          showToast(data.error || "Không thể lưu dịch vụ.");
        }
      } catch {
        showToast("Không thể kết nối máy chủ.");
      } finally {
        saveSvcBtn.disabled = false;
      }
    }
  });

  renderOrder();
})();
