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
    records: [
      {
        time: "03-11 11:51",
        type: "IncurDebt",
        address: "0x7B9B...5321",
        txHash: "0xe1e7...73d9",
        risk: "watch",
        desc: "新增债务，说明 Treasury 正在动用债务能力。"
      },
      {
        time: "03-10 18:06",
        type: "Deposit",
        address: "0x3411...c291",
        txHash: "0xa624...bc10",
        risk: "good",
        desc: "继续向 Treasury 注入资金。"
      },
      {
        time: "03-10 09:42",
        type: "SwapReserve",
        address: "0x7B9B...5321",
        txHash: "0xb723...4ff2",
        risk: "watch",
        desc: "调整储备结构。"
      },
      {
        time: "03-09 21:15",
        type: "Deposit",
        address: "0x3411...c291",
        txHash: "0x7c20...3dd5",
        risk: "good",
        desc: "资金继续补入 Treasury。"
      }
    ],
    depositFrequency: "最近 7 天记录到 4 次 Deposit，节奏为间断维护，尚未出现连续多日完全停更。",
    depositDetails: [
      { time: "03-10 18:06", address: "0x3411...c291", amount: "120,000 DAI", txHash: "0xa624...bc10" },
      { time: "03-09 21:15", address: "0x3411...c291", amount: "85,000 DAI", txHash: "0x7c20...3dd5" },
      { time: "03-08 16:23", address: "0x91fe...1020", amount: "90,000 DAI", txHash: "0x9f11...de31" },
      { time: "03-06 08:50", address: "0x91fe...1020", amount: "75,000 DAI", txHash: "0xe311...9a72" }
    ],
    summary: {
      depositCount: 4,
      watchCount: 2,
      dangerCount: 0,
      recentNonDeposit: "IncurDebt"
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
    { name: "DEX Screener", url: "https://dexscreener.com/" },
    { name: "Treasury", url: "https://polygonscan.com/" },
    { name: "大户排行", url: "https://polygonscan.com/" }
  ]
};

function cloneFallback() {
  return JSON.parse(JSON.stringify(FALLBACK_MOCK_DATA));
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
  throw new Error("loadLiveData() 预留给真实数据同步逻辑，当前版本尚未接入。");
}
