function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function statusToneFromText(value = "") {
  const text = String(value);
  if (/良好|正常|继续持有|稳定|增长/.test(text)) return "good";
  if (/危险|清仓|停运|高风险|异常/.test(text)) return "danger";
  if (/还行|关注|警惕|减弱/.test(text)) return "watch";
  return "neutral";
}

function riskTone(value = "") {
  if (value === "good" || value === "watch" || value === "danger") return value;
  return statusToneFromText(value);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(1)}万`;
  return value.toLocaleString("zh-CN");
}

function formatPercent(value) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}

function renderActionPanel() {
  return `
    <section class="panel" aria-labelledby="actions-title">
      <div class="panel-header">
        <div>
          <h2 id="actions-title" class="panel-title">操作区</h2>
          <p class="panel-subtitle">保留浏览器通知、API Key 和全局刷新入口，方便后续接入真实同步逻辑。</p>
        </div>
      </div>
      <div class="action-grid">
        <button class="action-button" type="button" data-action="enable-notifications">
          <span class="action-copy">
            <strong>开启浏览器通知</strong>
            <span>授权后可接入价格、Treasury 与风险动作通知</span>
          </span>
          <span class="pill neutral">通知</span>
        </button>
        <button class="action-button" type="button" data-action="set-api-key">
          <span class="action-copy">
            <strong>API Key</strong>
            <span>先保留本地录入与存储位置，后续对接真实接口</span>
          </span>
          <span class="pill neutral">配置</span>
        </button>
        <button class="action-button" type="button" data-action="refresh-all">
          <span class="action-copy">
            <strong>全部刷新</strong>
            <span>当前刷新 mock 数据，后续可切换成真实拉取</span>
          </span>
          <span class="pill neutral">刷新</span>
        </button>
      </div>
      <div id="actionStatus" class="status-line">当前为静态工程版，按钮保留基础交互与状态占位。</div>
    </section>
  `;
}

function renderCoreStats(coreStats = {}) {
  const cards = [
    { label: "价格", value: coreStats.price, change: coreStats.priceChange, note: "" },
    { label: "DAI池", value: coreStats.daiPool, change: coreStats.daiPoolChange, note: "" },
    { label: "24h成交", value: coreStats.volume24h, change: coreStats.volume24hChange, note: "" },
    { label: "Treasury", value: coreStats.treasury, change: "", note: coreStats.treasuryStatus }
  ];

  return `
    <section class="panel" aria-labelledby="core-title">
      <div class="panel-header">
        <div>
          <h2 id="core-title" class="panel-title">核心数据</h2>
          <p class="panel-subtitle">将价格、池子、成交与项目方收入放在同一视图，方便快速判断状态。</p>
        </div>
      </div>
      <div class="stats-grid">
        ${cards.map((card) => `
          <article class="stat-card">
            <p class="stat-label">${escapeHtml(card.label)}</p>
            <p class="stat-value">${escapeHtml(card.value ?? "--")}</p>
            <p class="stat-change">${escapeHtml(card.change || " ")}</p>
            ${card.note ? `<div class="stat-note"><span class="status-badge ${statusToneFromText(card.note)}">${escapeHtml(card.note)}</span></div>` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderDaiReserve(daiReserve = {}, coreStats = {}) {
  const current = Number(daiReserve.current || 0);
  const max = Number(daiReserve.max || 0);
  const warning = Number(daiReserve.warningLevel || 0);
  const danger = Number(daiReserve.dangerLevel || 0);
  const percent = max > 0 ? (current / max) * 100 : 0;

  return `
    <section class="panel" aria-labelledby="reserve-title">
      <div class="panel-header">
        <div>
          <h2 id="reserve-title" class="panel-title">DAI 储备 (0-2.5亿)</h2>
          <p class="panel-subtitle">展示当前储备、观察阈值与危险阈值，便于把流动性安全边界可视化。</p>
        </div>
        <span class="status-badge ${current <= danger ? "danger" : current <= warning ? "watch" : "good"}">${current <= danger ? "危险区" : current <= warning ? "观察区" : "安全区"}</span>
      </div>
      <div class="reserve-shell">
        <div class="reserve-hero">
          <div>
            <p class="stat-label">当前 DAI 储备</p>
            <p class="reserve-current">${escapeHtml(coreStats.daiPool || formatMoney(current))}</p>
          </div>
          <p class="muted">当前储备约为上限的 ${formatPercent(percent)}，低于 1.5 亿进入减仓观察，低于 1 亿进入强风险区。</p>
        </div>
        <div>
          <div class="reserve-meter" aria-hidden="true">
            <div class="reserve-fill" style="width:${percent}%"></div>
          </div>
          <div class="reserve-markers">
            <span>0</span>
            <span>1亿</span>
            <span>1.5亿</span>
            <span>2.5亿</span>
          </div>
        </div>
        <div class="threshold-grid">
          <article class="threshold-card">
            <span class="muted">当前值</span>
            <strong>${formatMoney(current)}</strong>
          </article>
          <article class="threshold-card">
            <span class="muted">观察阈值</span>
            <strong>${formatMoney(warning)}</strong>
          </article>
          <article class="threshold-card">
            <span class="muted">危险阈值</span>
            <strong>${formatMoney(danger)}</strong>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderVolumeAnalysis(volumeAnalysis = {}, coreStats = {}) {
  const buyRaw = Number(String(volumeAnalysis.buyAmount || "").replace(/[^\d.-]/g, ""));
  const sellRaw = Number(String(volumeAnalysis.sellAmount || "").replace(/[^\d.-]/g, ""));
  const total = Math.max(buyRaw + sellRaw, 1);
  const buyPct = (buyRaw / total) * 100;
  const sellPct = (sellRaw / total) * 100;

  return `
    <section class="panel" aria-labelledby="volume-title">
      <div class="panel-header">
        <div>
          <h2 id="volume-title" class="panel-title">交易量分析</h2>
          <p class="panel-subtitle">把 24h 真实成交拆成买入、卖出、净流向和项目方收入参考，避免只看笔数。</p>
        </div>
      </div>
      <div class="volume-grid">
        <div class="list-card">
          <div class="section-heading">
            <h3>24h 买卖金额</h3>
            <span class="pill neutral">${escapeHtml(volumeAnalysis.tradeTotal || coreStats.volume24h || "--")}</span>
          </div>
          <div class="flow-bar">
            <div class="stacked-bar" aria-label="24h 买卖金额占比">
              <div class="stacked-segment buy" style="width:${buyPct}%">买入 ${formatPercent(buyPct)}</div>
              <div class="stacked-segment sell" style="width:${sellPct}%">卖出 ${formatPercent(sellPct)}</div>
            </div>
            <div class="mini-stats">
              <article class="mini-card">
                <span class="muted">买入金额</span>
                <strong>${escapeHtml(volumeAnalysis.buyAmount || "--")}</strong>
                <span class="muted">${escapeHtml(volumeAnalysis.buyTrades || "--")}</span>
              </article>
              <article class="mini-card">
                <span class="muted">卖出金额</span>
                <strong>${escapeHtml(volumeAnalysis.sellAmount || "--")}</strong>
                <span class="muted">${escapeHtml(volumeAnalysis.sellTrades || "--")}</span>
              </article>
              <article class="mini-card">
                <span class="muted">净流向</span>
                <strong>${escapeHtml(volumeAnalysis.netFlow || "--")}</strong>
                <span class="pill ${statusToneFromText(volumeAnalysis.status)}">${escapeHtml(volumeAnalysis.status || "观察中")}</span>
              </article>
            </div>
          </div>
        </div>
        <div class="list-card">
          <div class="section-heading">
            <h3>项目方收入参考</h3>
            <span class="pill ${statusToneFromText(coreStats.treasuryStatus)}">${escapeHtml(coreStats.treasuryStatus || "加载中")}</span>
          </div>
          <div class="summary-list">
            <div class="summary-item">
              <strong>当前项目方日收入</strong>
              <span>${escapeHtml(coreStats.treasury || "--")}</span>
            </div>
            <div class="summary-item">
              <strong>当前交易量</strong>
              <span>${escapeHtml(coreStats.volume24h || volumeAnalysis.tradeTotal || "--")} / 24h</span>
            </div>
            <div class="summary-item">
              <strong>收入来源说明</strong>
              <span>${escapeHtml(volumeAnalysis.incomeHint || "加载中...")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderWhales(whales = {}) {
  return `
    <section class="panel" aria-labelledby="whales-title">
      <div class="panel-header">
        <div>
          <h2 id="whales-title" class="panel-title">大户追踪</h2>
          <p class="panel-subtitle">保留 48h 内大额交易、行为汇总和频繁卖出地址三块，后续可直接切换到实时接口。</p>
        </div>
        <div class="panel-actions">
          <span class="pill neutral">大额交易 (&gt;$500)</span>
          <span class="pill neutral">按金额排序</span>
          <span class="pill neutral">自动加载</span>
        </div>
      </div>
      <div class="whale-grid">
        <div class="table-card">
          <div class="section-heading"><h3>大额交易</h3></div>
          <div class="trade-list">
            ${safeArray(whales.largeTrades).map((trade) => `
              <article class="trade-item">
                <div class="trade-main">
                  <strong>${escapeHtml(trade.side || "--")} · ${escapeHtml(trade.amount || "--")}</strong>
                  <div class="trade-meta mono">${escapeHtml(trade.address || "--")}</div>
                  <div class="trade-meta">${escapeHtml(trade.note || "")}</div>
                </div>
                <span class="pill ${trade.side === "买入" ? "good" : "watch"}">${escapeHtml(trade.side || "--")}</span>
                <span class="trade-meta">${escapeHtml(trade.time || "--")}</span>
              </article>
            `).join("") || `<div class="empty-state"><p>暂无大额交易。</p></div>`}
          </div>
        </div>
        <div class="list-card">
          <div class="section-heading"><h3>大户行为汇总</h3></div>
          <div class="summary-list">
            ${safeArray(whales.summary).map((item) => `
              <div class="summary-item">
                <strong>观察点</strong>
                <span>${escapeHtml(item)}</span>
              </div>
            `).join("") || `<div class="empty-state"><p>暂无行为汇总。</p></div>`}
          </div>
        </div>
        <div class="list-card">
          <div class="section-heading"><h3>频繁卖出地址</h3></div>
          <div class="summary-list">
            ${safeArray(whales.frequentSellers).map((item) => `
              <div class="summary-item">
                <strong class="mono">${escapeHtml(item.address || "--")}</strong>
                <span>卖出次数 ${escapeHtml(item.count ?? "--")} 次 · 累计 ${escapeHtml(item.amount || "--")}</span>
              </div>
            `).join("") || `<div class="empty-state"><p>暂无频繁卖出地址。</p></div>`}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderTreasuryMonitor(treasuryMonitor = {}) {
  const summary = treasuryMonitor.summary || {};

  return `
    <section class="panel" aria-labelledby="treasury-title">
      <div class="panel-header">
        <div>
          <h2 id="treasury-title" class="panel-title">Treasury 监控</h2>
          <p class="panel-subtitle">全是 Deposit 视为偏正常，出现其他操作至少进入关注；后续可在这里替换成链上真实数据源。</p>
        </div>
      </div>
      <div class="treasury-grid">
        <div class="list-card">
          <div class="section-heading"><h3>指标说明</h3></div>
          <div class="rule-grid">
            ${safeArray(treasuryMonitor.rules).map((rule) => `
              <article class="rule-card">
                <strong>${escapeHtml(rule.type || "--")}</strong>
                <p class="muted">${escapeHtml(rule.desc || "")}</p>
              </article>
            `).join("") || `<div class="empty-state"><p>暂无规则。</p></div>`}
          </div>
        </div>
        <div class="list-card">
          <div class="section-heading">
            <h3>交易记录</h3>
            <span class="pill ${summary.dangerCount > 0 ? "danger" : summary.watchCount > 0 ? "watch" : "good"}">${summary.dangerCount > 0 ? "异常" : summary.watchCount > 0 ? "关注" : "正常"}</span>
          </div>
          <div class="record-list">
            ${safeArray(treasuryMonitor.records).map((record) => `
              <article class="record-item">
                <div class="record-main">
                  <strong>${escapeHtml(record.type || "--")}</strong>
                  <div class="record-meta">${escapeHtml(record.desc || "")}</div>
                  <div class="record-meta mono">${escapeHtml(record.address || "--")} · ${escapeHtml(record.txHash || "--")}</div>
                </div>
                <span class="pill ${riskTone(record.risk)}">${record.risk === "good" ? "正常" : record.risk === "danger" ? "危险" : "关注"}</span>
                <span class="record-meta">${escapeHtml(record.time || "--")}</span>
              </article>
            `).join("") || `<div class="empty-state"><p>暂无 Treasury 交易记录。</p></div>`}
          </div>
        </div>
      </div>
      <div class="list-card" style="margin-top:14px;">
        <div class="section-heading">
          <h3>Deposit 频率</h3>
          <span class="pill neutral">最近非 Deposit：${escapeHtml(summary.recentNonDeposit || "无")}</span>
        </div>
        <div class="deposit-layout">
          <div class="deposit-summary">
            <div><strong>Deposit 是什么：</strong>项目方向 Treasury 继续存入资金，通常代表还在维护和补充池子。</div>
            <div><strong>Deposit 频率意味着什么：</strong>Deposit 越稳定、越频繁，越说明项目方仍在持续维护；如果长期没有 Deposit，或者被其他操作替代，就要提高警惕。</div>
            <div><strong>最近统计：</strong>Deposit ${escapeHtml(summary.depositCount ?? "--")} 次，关注 ${escapeHtml(summary.watchCount ?? "--")} 次，危险 ${escapeHtml(summary.dangerCount ?? "--")} 次。</div>
            <div><strong>频率判断：</strong>${escapeHtml(treasuryMonitor.depositFrequency || "加载中...")}</div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>来源地址</th>
                  <th>金额</th>
                  <th>交易哈希</th>
                </tr>
              </thead>
              <tbody>
                ${safeArray(treasuryMonitor.depositDetails).map((detail) => `
                  <tr>
                    <td>${escapeHtml(detail.time || "--")}</td>
                    <td class="mono">${escapeHtml(detail.address || "--")}</td>
                    <td>${escapeHtml(detail.amount || "--")}</td>
                    <td class="mono">${escapeHtml(detail.txHash || "--")}</td>
                  </tr>
                `).join("") || `<tr><td colspan="4">暂无 Deposit 明细。</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderExitRules(exitRules = {}) {
  const cards = [
    { title: "立即清仓", items: safeArray(exitRules.sellNow), tone: "danger" },
    { title: "减仓观察", items: safeArray(exitRules.reducePosition), tone: "watch" },
    { title: "高度警惕", items: safeArray(exitRules.highAlert), tone: "watch" },
    { title: "继续持有", items: safeArray(exitRules.hold), tone: "good" }
  ];

  return `
    <section class="panel" aria-labelledby="exit-title">
      <div class="panel-header">
        <div>
          <h2 id="exit-title" class="panel-title">清仓规则</h2>
          <p class="panel-subtitle">把风险动作、Treasury 节奏和 DAI 储备阈值整理成可执行的观察规则。</p>
        </div>
      </div>
      <div class="exit-grid">
        ${cards.map((card) => `
          <article class="exit-card">
            <h3><span class="pill ${card.tone}">${escapeHtml(card.title)}</span></h3>
            <ul>${card.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>暂无规则</li>"}</ul>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderManualLinks(manualLinks = []) {
  return `
    <section class="panel" aria-labelledby="links-title">
      <div class="panel-header">
        <div>
          <h2 id="links-title" class="panel-title">手动检查</h2>
          <p class="panel-subtitle">保留外部检查入口，便于人工校验 DEX 数据、Treasury 地址与大户排行。</p>
        </div>
      </div>
      <div class="manual-grid">
        ${safeArray(manualLinks).map((link) => `
          <article class="manual-item">
            <strong>${escapeHtml(link.name || "--")}</strong>
            <span class="muted">${escapeHtml(link.url || "--")}</span>
            <a href="${escapeHtml(link.url || "#")}" target="_blank" rel="noreferrer noopener">打开链接</a>
          </article>
        `).join("") || `<div class="empty-state"><p>暂无检查链接。</p></div>`}
      </div>
    </section>
  `;
}

export function renderDashboard(data = {}) {
  return `
    ${renderActionPanel()}
    ${renderCoreStats(data.coreStats)}
    <div class="two-col">
      ${renderDaiReserve(data.daiReserve, data.coreStats)}
      ${renderVolumeAnalysis(data.volumeAnalysis, data.coreStats)}
    </div>
    ${renderWhales(data.whales)}
    ${renderTreasuryMonitor(data.treasuryMonitor)}
    ${renderExitRules(data.exitRules)}
    ${renderManualLinks(data.manualLinks)}
  `;
}

export function renderPageMeta(meta = {}, sourceLabel = "Mock") {
  document.title = meta.title || "鲸鱼 LGNS 监控台";
  const titleEl = document.getElementById("pageTitle");
  const subtitleEl = document.getElementById("pageSubtitle");
  const updatedEl = document.getElementById("lastUpdated");
  const sourceEl = document.getElementById("dataSourceBadge");

  if (titleEl) titleEl.textContent = meta.title || "鲸鱼 LGNS 监控台";
  if (subtitleEl) subtitleEl.textContent = meta.subtitle || "";
  if (updatedEl) updatedEl.textContent = meta.lastUpdated || "--";
  if (sourceEl) {
    sourceEl.textContent = sourceLabel;
    sourceEl.className = `status-badge ${sourceLabel === "Live" ? "watch" : "neutral"}`;
  }
}

export function renderApp(container, data) {
  if (container) container.innerHTML = renderDashboard(data);
}

export function renderError(container, error) {
  if (!container) return;
  container.innerHTML = `
    <section class="panel">
      <div class="empty-state">
        <div>
          <h2>页面加载失败</h2>
          <p class="muted">${escapeHtml(error?.message || "未知错误")}</p>
        </div>
      </div>
    </section>
  `;
}

export function updateActionStatus(message, tone = "neutral") {
  const target = document.getElementById("actionStatus");
  if (!target) return;
  target.textContent = message;
  target.className = "status-line";
  if (tone === "danger") target.style.color = "var(--danger)";
  else if (tone === "good") target.style.color = "var(--accent-2)";
  else if (tone === "watch") target.style.color = "var(--watch)";
  else target.style.color = "var(--muted)";
}

export function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}
