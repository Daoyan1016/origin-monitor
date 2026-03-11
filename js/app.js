import { loadLiveData, loadMockData } from "./data-service.js";
import { renderApp, renderError, renderPageMeta, showToast, updateActionStatus } from "./render.js";

const APP_CONTAINER = document.getElementById("app");
const STORAGE_KEY = "origin-monitor:api-key";

function getRequestedSource() {
  const url = new URL(window.location.href);
  return url.searchParams.get("source") === "live" ? "live" : "mock";
}

async function getDashboardData() {
  const requestedSource = getRequestedSource();

  if (requestedSource === "live") {
    try {
      const liveData = await loadLiveData();
      return { data: liveData, sourceLabel: "Live" };
    } catch (error) {
      const mockData = await loadMockData();
      mockData.meta.notice = "实时数据接口尚未接入，当前自动回退到 mock 数据。";
      return { data: mockData, sourceLabel: "Mock" };
    }
  }

  const mockData = await loadMockData();
  return { data: mockData, sourceLabel: "Mock" };
}

async function initializeDashboard() {
  try {
    const { data, sourceLabel } = await getDashboardData();
    renderPageMeta(data.meta, sourceLabel);
    renderApp(APP_CONTAINER, data);
    bindActions();

    if (data.meta?.notice) updateActionStatus(data.meta.notice, "watch");
    else updateActionStatus("页面已加载，可继续替换 mock 数据或接入真实同步脚本。");
  } catch (error) {
    renderError(APP_CONTAINER, error);
  }
}

async function handleNotification() {
  if (!("Notification" in window)) {
    updateActionStatus("当前浏览器不支持通知 API。", "danger");
    showToast("当前浏览器不支持通知 API。");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    updateActionStatus("浏览器通知已授权，后续可接入真实预警推送。", "good");
    showToast("通知权限已开启。");
    return;
  }

  updateActionStatus("通知权限未授权，当前仅保留按钮入口。", "watch");
  showToast("通知权限未授权。");
}

function handleApiKey() {
  const currentValue = window.localStorage.getItem(STORAGE_KEY) || "";
  const nextValue = window.prompt("请输入新的 API Key。当前先保存在浏览器本地，后续可接入真实接口。", currentValue);

  if (nextValue === null) {
    updateActionStatus("已取消 API Key 修改。");
    return;
  }

  const trimmed = nextValue.trim();
  if (!trimmed) {
    window.localStorage.removeItem(STORAGE_KEY);
    updateActionStatus("已清空本地 API Key。", "watch");
    showToast("API Key 已清空。");
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, trimmed);
  updateActionStatus("API Key 已保存到浏览器本地。当前页面仍使用 mock 数据。", "good");
  showToast("API Key 已保存。");
}

async function handleRefresh(button) {
  if (button) button.disabled = true;
  updateActionStatus("正在刷新数据...");
  try {
    await initializeDashboard();
    showToast("页面数据已刷新。");
  } finally {
    if (button) button.disabled = false;
  }
}

function bindActions() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.getAttribute("data-action");
      if (action === "enable-notifications") {
        await handleNotification();
        return;
      }
      if (action === "set-api-key") {
        handleApiKey();
        return;
      }
      if (action === "refresh-all") {
        await handleRefresh(button);
      }
    }, { once: true });
  });
}

initializeDashboard();
