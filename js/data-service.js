const TREASURY_ADDRESS = "0x7b9b7d4f870a38e92c9a181b00f9b33cc8ef5321";
const LP_ADDRESS = "0x882df4b0fb50a229c3b4124eb18c759911485bfb";
const DAI_ADDRESS = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063";
const LGNS_ADDRESS = "0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01";
const CHAIN_ID = "137";
const ETHERSCAN_API_BASE = "https://api.etherscan.io/v2/api";
const ETHERSCAN_STORAGE_KEY = "origin-monitor:etherscan-api-key";
const DEFAULT_ETHERSCAN_API_KEY = "1YRPNBUZT8CXW5NSFDFEVIV1FGH5UN5IMG";
const PUBLIC_RPC_URLS = [
  "https://polygon-rpc.com",
  "https://polygon.drpc.org",
  "https://polygon.publicnode.com"
];

const LARGE_TRADE_THRESHOLD = 500;
const MAX_DAI_RESERVE = 250000000;
const WARNING_DAI_RESERVE = 150000000;
const DANGER_DAI_RESERVE = 100000000;

const METHOD_MAP = {
  "0xc380cc1a": { type: "Deposit", risk: "good", desc: "项目方向 Treasury 继续存入资金。" },
  "0x00f714ce": { type: "Withdraw", risk: "danger", desc: "从 Treasury 提款，通常偏危险。" },
  "0xd3e2dcd0": { type: "Manage", risk: "danger", desc: "转移或调度 Treasury 资产。" },
  "0x058ecdb4": { type: "MintRewards", risk: "danger", desc: "铸造奖励，偏高风险。" },
  "0x869871ab": { type: "SwapReserve", risk: "watch", desc: "调整储备结构。" },
  "0xbc157ac1": { type: "IncurDebt", risk: "watch", desc: "新增债务，说明 Treasury 在动用债务能力。" },
  "0x46d2fbbb": { type: "Toggle", risk: "watch", desc: "修改权限，属于警惕信号。" },
  "0xa79a1986": { type: "Queue", risk: "watch", desc: "排队修改权限，属于警惕信号。" },
  "0x238dafe0": { type: "PushManagement", risk: "danger", desc: "转交管理权限，属于高风险动作。" },
  "0xbf7e214f": { type: "PullManagement", risk: "danger", desc: "收回管理权限，属于高风险动作。" }
};

const FALLBACK_MOCK_DATA = {
  meta: {
    title: "鲸鱼 LGNS 监控台",
    subtitle: "Treasury · DAI池 · 交易量 · 大户追踪 · 预警",
    lastUpdated: "2026-03-11 12:00:00"
  },
  coreStats: {
    price: "$0.149",
    priceChange: "+2.3%",
    daiPool: "$186.4M",
    daiPoolChange: "-1.8%",
    volume24h: "$51.0M",
    volume24hChange: "+12.6%",
    treasury: "$128万/日",
    treasuryStatus: "良好"
  },
  daiReserve: {
    current: 186400000,
    max: 250000000,
    warningLevel: 150000000,
    dangerLevel: 100000000
  },
  volumeAnalysis: {
    tradeTotal: "$51.0M",
    buyAmount: "$25.3M",
    sellAmount: "$25.7M",
    netFlow: "-$0.4M",
    incomeHint: "按 24h 卖出金额 × 5% 卖税估算，当前项目方参考收入约 $128 万/日。",
    buyTrades: "4,112 笔",
    sellTrades: "4,309 笔",
    status: "还行"
  },
  whales: {
    largeTrades: [
      { time: "03-11 11:42", address: "0x2f11...a9d2", side: "买入", amount: "$8,420", note: "单笔高额买入" },
      { time: "03-11 11:18", address: "0x7b9b...5321", side: "卖出", amount: "$5,610", note: "Treasury 相关地址" },
      { time: "03-11 10:57", address: "0xb40c...9187", side: "卖出", amount: "$4,980", note: "连续第二笔卖出" },
      { time: "03-11 10:31", address: "0xe8f5...3c77", side: "买入", amount: "$3,720", note: "疑似回流资金" }
    ],
    summary: [
      "过去 48h 内大额交易以卖出略多，卖出金额仍高于买入金额。",
      "前 10 个大户中有 3 个地址出现连续卖出，需要继续观察是否形成抛压。",
      "暂未看到单笔超大额清仓，但 Treasury 相关地址动作仍需和合约记录交叉验证。"
    ],
    frequentSellers: [
      { address: "0xb40c...9187", count: 6, amount: "$13,940" },
      { address: "0x7b9b...5321", count: 4, amount: "$11,220" },
      { address: "0x5c44...2de0", count: 3, amount: "$6,370" }
    ]
  },
  treasuryMonitor: {
    rules: [
      { type: "Deposit", desc: "项目方向 Treasury 继续存入资金，通常代表还在维护和补充池子，属于正常信号。" },
      { type: "IncurDebt", desc: "新增债务，意思是 Treasury 在举债/加杠杆，不是正常存入，需要重点关注。" },
      { type: "SwapReserve", desc: "调整储备结构，偏中性到警惕。" },
      { type: "Toggle / Queue", desc: "修改权限或排队修改权限，属于警惕信号。" },
      { type: "Withdraw", desc: "从 Treasury 提款，通常偏危险。" },
      { type: "Manage", desc: "转移或调度 Treasury 资产，通常偏危险。" },
      { type: "PushManagement / PullManagement", desc: "转交或收回管理权限，属于高风险权限动作。" }
    ],
    records: [],
    depositFrequency: "加载中...",
    depositDetails: [],
    summary: {
      depositCount: 0,
      watchCount: 0,
      dangerCount: 0,
      recentNonDeposit: "无"
    }
  },
  exitRules: {
    sellNow: [
      "Treasury 出现 Withdraw / Manage / PushManagement 等危险操作",
      "Treasury 连续 5 天无 Deposit",
      "DAI 池跌破 1 亿"
    ],
    reducePosition: [
      "DAI 池跌破 1.5 亿",
      "项目方收入显示动力减弱"
    ],
    highAlert: [
      "项目方收入显示可能停运"
    ],
    hold: [
      "Treasury 持续 Deposit + DAI 稳定或增长"
    ]
  },
  manualLinks: [
    { name: "DEX Screener", url: `https://dexscreener.com/polygon/${LP_ADDRESS}` },
    { name: "Treasury", url: `https://polygonscan.com/address/${TREASURY_ADDRESS}` },
    { name: "大户排行", url: `https://polygonscan.com/token/${LGNS_ADDRESS}#balances` }
  ]
};

function cloneFallback() {
  return JSON.parse(JSON.stringify(FALLBACK_MOCK_DATA));
}

function hasWindow() {
  return typeof window !== "undefined";
}

export function getStoredApiKey() {
  if (!hasWindow()) {
    return DEFAULT_ETHERSCAN_API_KEY;
  }

  return window.localStorage.getItem(ETHERSCAN_STORAGE_KEY) || DEFAULT_ETHERSCAN_API_KEY;
}

function shortAddr(address = "") {
  if (!address) {
    return "--";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimeStamp(unixSeconds) {
  const value = Number(unixSeconds || 0) * 1000;
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function nowText() {
  const date = new Date();
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ];
  const time = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ];
  return `${parts.join("-")} ${time.join(":")}`;
}

function toMillionsText(value) {
  return `$${(value / 1e6).toFixed(1)}M`;
}

function toWanDollarText(value) {
  return `$${(value / 1e4).toFixed(0)}万/日`;
}

function toDollarText(value) {
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }

  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(1)}K`;
  }

  return `$${value.toFixed(0)}`;
}

function integerStringToDecimal(value, decimals = 18, precision = 4) {
  const raw = String(value ?? "0").replace(/^0+/, "") || "0";
  const padded = raw.padStart(decimals + 1, "0");
  const integerPart = padded.slice(0, -decimals) || "0";
  const fractionPart = padded.slice(-decimals, -decimals + precision).replace(/0+$/, "");
  const normalized = fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
  return Number(normalized);
}

function decodeMethod(input = "") {
  if (!input || input.length < 10) {
    return {
      type: "普通转账",
      risk: "watch",
      desc: "没有合约方法签名，按普通转账处理。"
    };
  }

  return METHOD_MAP[input.slice(0, 10)] || {
    type: `未知操作 ${input.slice(0, 10)}`,
    risk: "watch",
    desc: "未命中已知方法签名，建议手动核对。"
  };
}

function classifyTreasuryStatus(totalVolume) {
  if (totalVolume < 1e7) {
    return "可能停运";
  }

  if (totalVolume < 2e7) {
    return "动力减弱";
  }

  if (totalVolume < 4e7) {
    return "还行";
  }

  return "良好";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) {
    throw new Error(`请求失败 ${response.status}`);
  }
  return await response.json();
}

async function loadSyncedData() {
  const dataUrl = new URL("../data/live-data.json", import.meta.url);
  const payload = await fetchJson(dataUrl);
  if (!payload?.meta || !payload?.coreStats) {
    throw new Error("live-data.json 结构无效");
  }
  return payload;
}

async function callEtherscan(params) {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error("缺少 Etherscan API Key。");
  }

  const query = new URLSearchParams({
    chainid: CHAIN_ID,
    ...params,
    apikey: apiKey
  });
  const data = await fetchJson(`${ETHERSCAN_API_BASE}?${query.toString()}`);

  if (String(data.status) === "1") {
    return data.result;
  }

  if (Array.isArray(data.result) && data.result.length === 0) {
    return [];
  }

  if (typeof data.result === "string" && /No transactions found/i.test(data.result)) {
    return [];
  }

  throw new Error(String(data.result || data.message || "Etherscan 返回异常"));
}

async function callPolygonRpc(method, params) {
  let lastError = null;

  for (const rpcUrl of PUBLIC_RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params
        })
      });

      if (!response.ok) {
        throw new Error(`RPC ${response.status}`);
      }

      const payload = await response.json();
      if (payload.error) {
        throw new Error(payload.error.message || "RPC 调用失败");
      }

      return payload.result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Polygon RPC 不可用");
}

async function fetchDexReference() {
  const data = await fetchJson(`https://api.dexscreener.com/latest/dex/pairs/polygon/${LP_ADDRESS}`);
  const pair = data.pairs?.[0];

  if (!pair) {
    throw new Error("DexScreener 未返回有效交易对");
  }

  return {
    price: Number(pair.priceUsd || 0),
    priceChange24h: Number(pair.priceChange?.h24 || 0),
    liquidityUsd: Number(pair.liquidity?.usd || 0)
  };
}

async function fetchDaiReserve() {
  const selector = "70a08231";
  const paddedAddress = LP_ADDRESS.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const data = `0x${selector}${paddedAddress}`;
  const result = await callPolygonRpc("eth_call", [
    {
      to: DAI_ADDRESS,
      data
    },
    "latest"
  ]);

  return integerStringToDecimal(BigInt(result).toString(), 18, 4);
}

async function fetchPoolTransfers(hours = 48) {
  const cutoff = Math.floor(Date.now() / 1000) - (hours * 3600);
  const pageSize = 200;
  const maxPages = 6;
  const transfers = [];
  let reachedCutoff = false;

  for (let page = 1; page <= maxPages && !reachedCutoff; page += 1) {
    const rows = await callEtherscan({
      module: "account",
      action: "tokentx",
      address: LP_ADDRESS,
      startblock: 0,
      endblock: 99999999,
      page,
      offset: pageSize,
      sort: "desc"
    });

    if (!rows.length) {
      break;
    }

    for (const tx of rows) {
      const timestamp = Number(tx.timeStamp || 0);
      if (timestamp < cutoff) {
        reachedCutoff = true;
        break;
      }

      if ((tx.contractAddress || "").toLowerCase() !== DAI_ADDRESS) {
        continue;
      }

      const fromPool = (tx.from || "").toLowerCase() === LP_ADDRESS;
      const toPool = (tx.to || "").toLowerCase() === LP_ADDRESS;
      if (!fromPool && !toPool) {
        continue;
      }

      const amount = integerStringToDecimal(tx.value, Number(tx.tokenDecimal || 18), 4);
      transfers.push({
        timestamp,
        amountUsd: amount,
        txHash: tx.hash,
        type: fromPool ? "sell" : "buy",
        userAddress: fromPool ? tx.to : tx.from
      });
    }

    if (rows.length < pageSize) {
      break;
    }
  }

  return transfers;
}

async function fetchTreasuryTransactions() {
  return await callEtherscan({
    module: "account",
    action: "txlist",
    address: TREASURY_ADDRESS,
    startblock: 0,
    endblock: 99999999,
    page: 1,
    offset: 30,
    sort: "desc"
  });
}

function buildVolumeAnalysis(transfers24h) {
  const buyTransfers = transfers24h.filter((item) => item.type === "buy");
  const sellTransfers = transfers24h.filter((item) => item.type === "sell");
  const buyAmount = buyTransfers.reduce((sum, item) => sum + item.amountUsd, 0);
  const sellAmount = sellTransfers.reduce((sum, item) => sum + item.amountUsd, 0);
  const tradeTotal = buyAmount + sellAmount;
  const netFlow = buyAmount - sellAmount;
  const revenue = sellAmount * 0.05;
  const status = classifyTreasuryStatus(tradeTotal);

  return {
    raw: {
      buyAmount,
      sellAmount,
      tradeTotal,
      netFlow,
      revenue,
      buyCount: buyTransfers.length,
      sellCount: sellTransfers.length,
      status
    },
    view: {
      tradeTotal: toMillionsText(tradeTotal),
      buyAmount: toMillionsText(buyAmount),
      sellAmount: toMillionsText(sellAmount),
      netFlow: `${netFlow >= 0 ? "+" : "-"}$${(Math.abs(netFlow) / 1e6).toFixed(2)}M`,
      incomeHint: `按最近 24h LP 中 DAI 的卖出方向转账 × 5% 卖税估算，当前项目方参考收入约 ${toWanDollarText(revenue)}。`,
      buyTrades: `${buyTransfers.length.toLocaleString("zh-CN")} 笔`,
      sellTrades: `${sellTransfers.length.toLocaleString("zh-CN")} 笔`,
      status
    }
  };
}

function buildWhaleSection(transfers48h) {
  const largeTrades = transfers48h
    .filter((item) => item.amountUsd >= LARGE_TRADE_THRESHOLD)
    .sort((a, b) => b.amountUsd - a.amountUsd)
    .slice(0, 20)
    .map((item) => ({
      time: formatTimeStamp(item.timestamp),
      address: shortAddr(item.userAddress),
      side: item.type === "sell" ? "卖出" : "买入",
      amount: toDollarText(item.amountUsd),
      note: "基于 LP 中 DAI 转账方向识别"
    }));

  const buyAmount48h = transfers48h.filter((item) => item.type === "buy").reduce((sum, item) => sum + item.amountUsd, 0);
  const sellAmount48h = transfers48h.filter((item) => item.type === "sell").reduce((sum, item) => sum + item.amountUsd, 0);

  const sellerStats = {};
  transfers48h
    .filter((item) => item.type === "sell")
    .forEach((item) => {
      const key = item.userAddress.toLowerCase();
      if (!sellerStats[key]) {
        sellerStats[key] = {
          address: shortAddr(item.userAddress),
          count: 0,
          amount: 0
        };
      }
      sellerStats[key].count += 1;
      sellerStats[key].amount += item.amountUsd;
    });

  const frequentSellers = Object.values(sellerStats)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.amount - a.amount;
    })
    .slice(0, 8)
    .map((item) => ({
      address: item.address,
      count: item.count,
      amount: toDollarText(item.amount)
    }));

  const summary = [
    `最近 48h 内识别到 ${transfers48h.length} 笔与 LP 相关的 DAI 流动，买入 ${toDollarText(buyAmount48h)}，卖出 ${toDollarText(sellAmount48h)}。`,
    sellAmount48h > buyAmount48h
      ? "卖出金额高于买入金额，短线抛压偏强。"
      : "买入金额不弱于卖出金额，短线承接尚可。",
    frequentSellers.length
      ? `当前最频繁卖出地址为 ${frequentSellers[0].address}，累计 ${frequentSellers[0].count} 笔，约 ${frequentSellers[0].amount}。`
      : "最近 48h 未识别到明显的频繁卖出地址。"
  ];

  return {
    largeTrades,
    summary,
    frequentSellers
  };
}

function buildTreasuryMonitor(transactions) {
  const records = [];
  const depositDetails = [];
  const depositByDay = {};

  let depositCount = 0;
  let watchCount = 0;
  let dangerCount = 0;
  let recentNonDeposit = "无";
  let lastDepositTimestamp = 0;

  for (const tx of transactions) {
    if (tx.isError === "1") {
      continue;
    }

    const method = decodeMethod(tx.input || "");
    const timestamp = Number(tx.timeStamp || 0);

    records.push({
      time: formatTimeStamp(timestamp),
      type: method.type,
      address: shortAddr(tx.from),
      txHash: shortAddr(tx.hash),
      risk: method.risk,
      desc: method.desc
    });

    if (method.type === "Deposit") {
      depositCount += 1;
      if (!lastDepositTimestamp) {
        lastDepositTimestamp = timestamp;
      }

      const dateKey = new Date(timestamp * 1000).toISOString().slice(0, 10);
      depositByDay[dateKey] = (depositByDay[dateKey] || 0) + 1;
      depositDetails.push({
        time: formatTimeStamp(timestamp),
        address: shortAddr(tx.from),
        amount: Number(tx.value || 0) > 0 ? `${integerStringToDecimal(tx.value, 18, 4)} POL` : "--",
        txHash: shortAddr(tx.hash)
      });
      continue;
    }

    if (recentNonDeposit === "无") {
      recentNonDeposit = method.type;
    }

    if (method.risk === "danger") {
      dangerCount += 1;
    } else {
      watchCount += 1;
    }
  }

  let frequencyText = `最近 30 条 Treasury 交易中识别到 ${depositCount} 次 Deposit。`;
  if (lastDepositTimestamp) {
    const gapHours = Math.floor((Date.now() - (lastDepositTimestamp * 1000)) / 3600000);
    frequencyText += ` 最近一次 Deposit 距今约 ${gapHours} 小时。`;
    if (gapHours > 120) {
      frequencyText += " 已超过 5 天未再次出现 Deposit，需要重点关注。";
    } else if (gapHours > 48) {
      frequencyText += " 已超过 48 小时未再次出现 Deposit。";
    }
  } else {
    frequencyText += " 最近这批交易里没有识别到 Deposit。";
  }

  return {
    rules: [
      { type: "Deposit", desc: "项目方向 Treasury 继续存入资金，通常代表还在维护和补充池子，属于正常信号。" },
      { type: "IncurDebt", desc: "新增债务，意思是 Treasury 在举债/加杠杆，不是正常存入，需要重点关注。" },
      { type: "SwapReserve", desc: "调整储备结构，偏中性到警惕。" },
      { type: "Toggle / Queue", desc: "修改权限或排队修改权限，属于警惕信号。" },
      { type: "Withdraw", desc: "从 Treasury 提款，通常偏危险。" },
      { type: "Manage", desc: "转移或调度 Treasury 资产，通常偏危险。" },
      { type: "PushManagement / PullManagement", desc: "转交或收回管理权限，属于高风险权限动作。" }
    ],
    records: records.slice(0, 20),
    depositFrequency: frequencyText,
    depositDetails: depositDetails.slice(0, 20),
    summary: {
      depositCount,
      watchCount,
      dangerCount,
      recentNonDeposit
    }
  };
}

function buildCoreStats(dex, daiReserve, volume) {
  return {
    price: `$${dex.price.toFixed(3)}`,
    priceChange: `24h: ${dex.priceChange24h >= 0 ? "+" : ""}${dex.priceChange24h.toFixed(2)}%`,
    daiPool: toMillionsText(daiReserve),
    daiPoolChange: "链上实时储备",
    volume24h: toMillionsText(volume.tradeTotal),
    volume24hChange: `买 ${volume.buyCount.toLocaleString("zh-CN")} / 卖 ${volume.sellCount.toLocaleString("zh-CN")}`,
    treasury: toWanDollarText(volume.revenue),
    treasuryStatus: volume.status
  };
}

export async function loadMockData() {
  const dataUrl = new URL("../data/mock-data.json", import.meta.url);

  try {
    const response = await fetch(dataUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`mock-data.json 返回 ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    const fallback = cloneFallback();
    fallback.meta.lastUpdated = `${fallback.meta.lastUpdated} · 本地降级`;
    fallback.meta.notice = "当前通过 JS 内置 mock 数据降级加载。若需读取 JSON 文件，请使用本地静态服务访问。";
    return fallback;
  }
}

export async function loadLiveData() {
  try {
    return await loadSyncedData();
  } catch (error) {
    // 同源同步数据不存在时，再回退到浏览器直连模式。
  }

  const [dex, daiReserve, transfers48h, treasuryTransactions] = await Promise.all([
    fetchDexReference(),
    fetchDaiReserve(),
    fetchPoolTransfers(48),
    fetchTreasuryTransactions()
  ]);

  const cutoff24h = Math.floor(Date.now() / 1000) - (24 * 3600);
  const transfers24h = transfers48h.filter((item) => item.timestamp >= cutoff24h);
  const volume = buildVolumeAnalysis(transfers24h);
  const whales = buildWhaleSection(transfers48h);
  const treasuryMonitor = buildTreasuryMonitor(treasuryTransactions);

  return {
    meta: {
      title: "鲸鱼 LGNS 监控台",
      subtitle: "Treasury · DAI池 · 交易量 · 大户追踪 · 预警",
      lastUpdated: nowText(),
      notice: "价格来自 DexScreener；DAI 储备来自 Polygon 公共 RPC；24h 买卖、Treasury 与大户追踪来自 Etherscan Polygon 索引。"
    },
    coreStats: buildCoreStats(dex, daiReserve, volume.raw),
    daiReserve: {
      current: daiReserve,
      max: MAX_DAI_RESERVE,
      warningLevel: WARNING_DAI_RESERVE,
      dangerLevel: DANGER_DAI_RESERVE
    },
    volumeAnalysis: volume.view,
    whales,
    treasuryMonitor,
    exitRules: cloneFallback().exitRules,
    manualLinks: [
      { name: "DEX Screener", url: `https://dexscreener.com/polygon/${LP_ADDRESS}` },
      { name: "Treasury", url: `https://polygonscan.com/address/${TREASURY_ADDRESS}` },
      { name: "大户排行", url: `https://polygonscan.com/token/${LGNS_ADDRESS}#balances` }
    ]
  };
}
