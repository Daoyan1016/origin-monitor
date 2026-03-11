#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

TREASURY_ADDRESS = "0x7b9b7d4f870a38e92c9a181b00f9b33cc8ef5321"
LP_ADDRESS = "0x882df4b0fb50a229c3b4124eb18c759911485bfb"
DAI_ADDRESS = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
LGNS_ADDRESS = "0xeb51d9a39ad5eef215dc0bf39a8821ff804a0f01"
CHAIN_ID = "137"
ETHERSCAN_API_BASE = "https://api.etherscan.io/v2/api"
DEFAULT_ETHERSCAN_API_KEY = "1YRPNBUZT8CXW5NSFDFEVIV1FGH5UN5IMG"
PUBLIC_RPC_URLS = [
    "https://polygon-rpc.com",
    "https://polygon.drpc.org",
    "https://polygon.publicnode.com",
]
LIVE_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "live-data.json")
LARGE_TRADE_THRESHOLD = 500

METHOD_MAP = {
    "0xc380cc1a": ("Deposit", "good", "项目方向 Treasury 继续存入资金。"),
    "0x00f714ce": ("Withdraw", "danger", "从 Treasury 提款，通常偏危险。"),
    "0xd3e2dcd0": ("Manage", "danger", "转移或调度 Treasury 资产。"),
    "0x058ecdb4": ("MintRewards", "danger", "铸造奖励，偏高风险。"),
    "0x869871ab": ("SwapReserve", "watch", "调整储备结构。"),
    "0xbc157ac1": ("IncurDebt", "watch", "新增债务，说明 Treasury 在动用债务能力。"),
    "0x46d2fbbb": ("Toggle", "watch", "修改权限，属于警惕信号。"),
    "0xa79a1986": ("Queue", "watch", "排队修改权限，属于警惕信号。"),
    "0x238dafe0": ("PushManagement", "danger", "转交管理权限，属于高风险动作。"),
    "0xbf7e214f": ("PullManagement", "danger", "收回管理权限，属于高风险动作。"),
}

TREASURY_RULES = [
    {"type": "Deposit", "desc": "项目方向 Treasury 继续存入资金，通常代表还在维护和补充池子，属于正常信号。"},
    {"type": "IncurDebt", "desc": "新增债务，意思是 Treasury 在举债/加杠杆，不是正常存入，需要重点关注。"},
    {"type": "SwapReserve", "desc": "调整储备结构，偏中性到警惕。"},
    {"type": "Toggle / Queue", "desc": "修改权限或排队修改权限，属于警惕信号。"},
    {"type": "Withdraw", "desc": "从 Treasury 提款，通常偏危险。"},
    {"type": "Manage", "desc": "转移或调度 Treasury 资产，通常偏危险。"},
    {"type": "PushManagement / PullManagement", "desc": "转交或收回管理权限，属于高风险权限动作。"},
]

EXIT_RULES = {
    "sellNow": [
        "Treasury 出现 Withdraw / Manage / PushManagement 等危险操作",
        "Treasury 连续 5 天无 Deposit",
        "DAI 池跌破 1 亿",
    ],
    "reducePosition": [
        "DAI 池跌破 1.5 亿",
        "项目方收入显示动力减弱",
    ],
    "highAlert": [
        "项目方收入显示可能停运",
    ],
    "hold": [
        "Treasury 持续 Deposit + DAI 稳定或增长",
    ],
}


def http_json(url, method="GET", data=None, headers=None, timeout=25):
    payload = None
    if data is not None:
        payload = json.dumps(data).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method=method)
    request.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
    request.add_header("Accept", "application/json, text/plain, */*")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def short_addr(address):
    if not address:
        return "--"
    return f"{address[:6]}...{address[-4:]}"


def fmt_ts(ts):
    dt = datetime.fromtimestamp(int(ts))
    return dt.strftime("%m-%d %H:%M")


def now_text():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def integer_to_decimal(value, decimals=18):
    text = str(value or "0").strip()
    if not text:
        return 0.0
    integer = int(text)
    return integer / (10 ** decimals)


def to_m_text(value):
    return f"${value / 1e6:.1f}M"


def to_wan_per_day(value):
    return f"${value / 1e4:.0f}万/日"


def to_money_text(value):
    if value >= 1e6:
        return f"${value / 1e6:.2f}M"
    if value >= 1e3:
        return f"${value / 1e3:.1f}K"
    return f"${value:.0f}"


def classify_status(total_volume):
    if total_volume < 1e7:
        return "可能停运"
    if total_volume < 2e7:
        return "动力减弱"
    if total_volume < 4e7:
        return "还行"
    return "良好"


def decode_method(input_data):
    if not input_data or len(input_data) < 10:
        return ("普通转账", "watch", "没有合约方法签名，按普通转账处理。")
    return METHOD_MAP.get(input_data[:10], (f"未知操作 {input_data[:10]}", "watch", "未命中已知方法签名，建议手动核对。"))


def etherscan_call(api_key, **params):
    query = {"chainid": CHAIN_ID, **params, "apikey": api_key}
    url = f"{ETHERSCAN_API_BASE}?{urllib.parse.urlencode(query)}"
    data = http_json(url)
    if str(data.get("status")) == "1":
      return data.get("result")
    result = data.get("result")
    if isinstance(result, list):
        return result
    if isinstance(result, str) and "No transactions found" in result:
        return []
    raise RuntimeError(str(result or data.get("message") or "Etherscan error"))


def rpc_call(method, params):
    last_error = None
    headers = {"Content-Type": "application/json"}
    for rpc_url in PUBLIC_RPC_URLS:
        try:
            payload = {"jsonrpc": "2.0", "id": int(time.time()), "method": method, "params": params}
            data = http_json(rpc_url, method="POST", data=payload, headers=headers)
            if data.get("error"):
                raise RuntimeError(data["error"].get("message") or "RPC error")
            return data.get("result")
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Polygon RPC unavailable: {last_error}")


def fetch_dex_reference():
    data = http_json(f"https://api.dexscreener.com/latest/dex/pairs/polygon/{LP_ADDRESS}")
    pair = (data.get("pairs") or [None])[0]
    if not pair:
        raise RuntimeError("DexScreener no pair returned")
    return {
        "price": float(pair.get("priceUsd") or 0),
        "price_change_24h": float((pair.get("priceChange") or {}).get("h24") or 0),
    }


def fetch_dai_reserve():
    selector = "70a08231"
    padded = LP_ADDRESS.lower().replace("0x", "").rjust(64, "0")
    call_data = f"0x{selector}{padded}"
    result = rpc_call("eth_call", [{"to": DAI_ADDRESS, "data": call_data}, "latest"])
    return int(result, 16) / (10 ** 18)


def fetch_pool_transfers(api_key, hours=48):
    cutoff = int(time.time()) - (hours * 3600)
    page_size = 200
    max_pages = 6
    transfers = []
    reached_cutoff = False

    for page in range(1, max_pages + 1):
        rows = etherscan_call(
            api_key,
            module="account",
            action="tokentx",
            address=LP_ADDRESS,
            startblock=0,
            endblock=99999999,
            page=page,
            offset=page_size,
            sort="desc",
        )
        if not rows:
            break

        for tx in rows:
            ts = int(tx.get("timeStamp") or 0)
            if ts < cutoff:
                reached_cutoff = True
                break
            if (tx.get("contractAddress") or "").lower() != DAI_ADDRESS:
                continue
            from_pool = (tx.get("from") or "").lower() == LP_ADDRESS
            to_pool = (tx.get("to") or "").lower() == LP_ADDRESS
            if not from_pool and not to_pool:
                continue
            amount = integer_to_decimal(tx.get("value"), int(tx.get("tokenDecimal") or 18))
            transfers.append(
                {
                    "timestamp": ts,
                    "amountUsd": amount,
                    "txHash": tx.get("hash"),
                    "type": "sell" if from_pool else "buy",
                    "userAddress": tx.get("to") if from_pool else tx.get("from"),
                }
            )
        if reached_cutoff or len(rows) < page_size:
            break

    return transfers


def fetch_treasury_transactions(api_key):
    return etherscan_call(
        api_key,
        module="account",
        action="txlist",
        address=TREASURY_ADDRESS,
        startblock=0,
        endblock=99999999,
        page=1,
        offset=30,
        sort="desc",
    )


def build_volume_analysis(transfers_24h):
    buys = [item for item in transfers_24h if item["type"] == "buy"]
    sells = [item for item in transfers_24h if item["type"] == "sell"]
    buy_amount = sum(item["amountUsd"] for item in buys)
    sell_amount = sum(item["amountUsd"] for item in sells)
    trade_total = buy_amount + sell_amount
    net_flow = buy_amount - sell_amount
    revenue = sell_amount * 0.05
    status = classify_status(trade_total)
    return {
        "raw": {
            "buy_amount": buy_amount,
            "sell_amount": sell_amount,
            "trade_total": trade_total,
            "net_flow": net_flow,
            "revenue": revenue,
            "buy_count": len(buys),
            "sell_count": len(sells),
            "status": status,
        },
        "view": {
            "tradeTotal": to_m_text(trade_total),
            "buyAmount": to_m_text(buy_amount),
            "sellAmount": to_m_text(sell_amount),
            "netFlow": f"{'+' if net_flow >= 0 else '-'}${abs(net_flow) / 1e6:.2f}M",
            "incomeHint": f"按最近 24h LP 中 DAI 的卖出方向转账 × 5% 卖税估算，当前项目方参考收入约 {to_wan_per_day(revenue)}。",
            "buyTrades": f"{len(buys)} 笔",
            "sellTrades": f"{len(sells)} 笔",
            "status": status,
        },
    }


def build_whales(transfers_48h):
    large_trades = [
        {
            "time": fmt_ts(item["timestamp"]),
            "address": short_addr(item["userAddress"]),
            "side": "卖出" if item["type"] == "sell" else "买入",
            "amount": to_money_text(item["amountUsd"]),
            "note": "基于 LP 中 DAI 转账方向识别",
        }
        for item in sorted(
            [t for t in transfers_48h if t["amountUsd"] >= LARGE_TRADE_THRESHOLD],
            key=lambda row: row["amountUsd"],
            reverse=True,
        )[:20]
    ]

    buy_amount = sum(item["amountUsd"] for item in transfers_48h if item["type"] == "buy")
    sell_amount = sum(item["amountUsd"] for item in transfers_48h if item["type"] == "sell")

    seller_stats = {}
    for item in transfers_48h:
        if item["type"] != "sell":
            continue
        key = item["userAddress"].lower()
        if key not in seller_stats:
            seller_stats[key] = {"address": short_addr(item["userAddress"]), "count": 0, "amount": 0.0}
        seller_stats[key]["count"] += 1
        seller_stats[key]["amount"] += item["amountUsd"]

    frequent_sellers = [
        {
            "address": row["address"],
            "count": row["count"],
            "amount": to_money_text(row["amount"]),
        }
        for row in sorted(seller_stats.values(), key=lambda item: (-item["count"], -item["amount"]))[:8]
    ]

    summary = [
        f"最近 48h 内识别到 {len(transfers_48h)} 笔与 LP 相关的 DAI 流动，买入 {to_money_text(buy_amount)}，卖出 {to_money_text(sell_amount)}。",
        "卖出金额高于买入金额，短线抛压偏强。" if sell_amount > buy_amount else "买入金额不弱于卖出金额，短线承接尚可。",
        f"当前最频繁卖出地址为 {frequent_sellers[0]['address']}，累计 {frequent_sellers[0]['count']} 笔，约 {frequent_sellers[0]['amount']}。"
        if frequent_sellers
        else "最近 48h 未识别到明显的频繁卖出地址。",
    ]

    return {
        "largeTrades": large_trades,
        "summary": summary,
        "frequentSellers": frequent_sellers,
    }


def build_treasury_monitor(transactions):
    records = []
    deposit_details = []
    deposit_count = 0
    watch_count = 0
    danger_count = 0
    recent_non_deposit = "无"
    last_deposit_ts = 0

    for tx in transactions:
        if tx.get("isError") == "1":
            continue
        tx_type, risk, desc = decode_method(tx.get("input", ""))
        ts = int(tx.get("timeStamp") or 0)
        records.append(
            {
                "time": fmt_ts(ts),
                "type": tx_type,
                "address": short_addr(tx.get("from")),
                "txHash": short_addr(tx.get("hash")),
                "risk": risk,
                "desc": desc,
            }
        )

        if tx_type == "Deposit":
            deposit_count += 1
            if not last_deposit_ts:
                last_deposit_ts = ts
            deposit_details.append(
                {
                    "time": fmt_ts(ts),
                    "address": short_addr(tx.get("from")),
                    "amount": f"{integer_to_decimal(tx.get('value'), 18):.4f} POL" if int(tx.get("value") or "0") > 0 else "--",
                    "txHash": short_addr(tx.get("hash")),
                }
            )
        else:
            if recent_non_deposit == "无":
                recent_non_deposit = tx_type
            if risk == "danger":
                danger_count += 1
            else:
                watch_count += 1

    frequency = f"最近 30 条 Treasury 交易中识别到 {deposit_count} 次 Deposit。"
    if last_deposit_ts:
        gap_hours = int((time.time() - last_deposit_ts) / 3600)
        frequency += f" 最近一次 Deposit 距今约 {gap_hours} 小时。"
        if gap_hours > 120:
            frequency += " 已超过 5 天未再次出现 Deposit，需要重点关注。"
        elif gap_hours > 48:
            frequency += " 已超过 48 小时未再次出现 Deposit。"
    else:
        frequency += " 最近这批交易里没有识别到 Deposit。"

    return {
        "rules": TREASURY_RULES,
        "records": records[:20],
        "depositFrequency": frequency,
        "depositDetails": deposit_details[:20],
        "summary": {
            "depositCount": deposit_count,
            "watchCount": watch_count,
            "dangerCount": danger_count,
            "recentNonDeposit": recent_non_deposit,
        },
    }


def build_payload():
    api_key = os.environ.get("ETHERSCAN_API_KEY", DEFAULT_ETHERSCAN_API_KEY).strip()
    if not api_key:
        raise RuntimeError("Missing ETHERSCAN_API_KEY")

    dex = fetch_dex_reference()
    dai_reserve = fetch_dai_reserve()
    transfers_48h = fetch_pool_transfers(api_key, 48)
    treasury_transactions = fetch_treasury_transactions(api_key)

    cutoff_24h = int(time.time()) - 24 * 3600
    transfers_24h = [item for item in transfers_48h if item["timestamp"] >= cutoff_24h]
    volume = build_volume_analysis(transfers_24h)
    whales = build_whales(transfers_48h)
    treasury_monitor = build_treasury_monitor(treasury_transactions)

    return {
        "meta": {
            "title": "鲸鱼 LGNS 监控台",
            "subtitle": "Treasury · DAI池 · 交易量 · 大户追踪 · 预警",
            "lastUpdated": now_text(),
            "notice": "当前页面正在读取本机同步的 live-data.json，由你的电脑通过 VPN 抓取外部数据后生成。",
        },
        "coreStats": {
            "price": f"${dex['price']:.3f}",
            "priceChange": f"24h: {'+' if dex['price_change_24h'] >= 0 else ''}{dex['price_change_24h']:.2f}%",
            "daiPool": to_m_text(dai_reserve),
            "daiPoolChange": "链上实时储备",
            "volume24h": to_m_text(volume["raw"]["trade_total"]),
            "volume24hChange": f"买 {volume['raw']['buy_count']} / 卖 {volume['raw']['sell_count']}",
            "treasury": to_wan_per_day(volume["raw"]["revenue"]),
            "treasuryStatus": volume["raw"]["status"],
        },
        "daiReserve": {
            "current": dai_reserve,
            "max": 250000000,
            "warningLevel": 150000000,
            "dangerLevel": 100000000,
        },
        "volumeAnalysis": volume["view"],
        "whales": whales,
        "treasuryMonitor": treasury_monitor,
        "exitRules": EXIT_RULES,
        "manualLinks": [
            {"name": "DEX Screener", "url": f"https://dexscreener.com/polygon/{LP_ADDRESS}"},
            {"name": "Treasury", "url": f"https://polygonscan.com/address/{TREASURY_ADDRESS}"},
            {"name": "大户排行", "url": f"https://polygonscan.com/token/{LGNS_ADDRESS}#balances"},
        ],
    }


def write_payload(payload):
    os.makedirs(os.path.dirname(LIVE_DATA_PATH), exist_ok=True)
    with open(LIVE_DATA_PATH, "w", encoding="utf-8") as file_obj:
        json.dump(payload, file_obj, ensure_ascii=False, indent=2)


def run_once():
    payload = build_payload()
    write_payload(payload)
    print(f"[{now_text()}] wrote {LIVE_DATA_PATH}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=60, help="sync interval in seconds")
    parser.add_argument("--once", action="store_true", help="run once and exit")
    args = parser.parse_args()

    if args.once:
        run_once()
        return 0

    while True:
        try:
            run_once()
        except Exception as exc:
            print(f"[{now_text()}] sync failed: {exc}", file=sys.stderr)
        time.sleep(max(args.interval, 15))


if __name__ == "__main__":
    raise SystemExit(main())
