const apiUrl = "https://q2wy1am2oj.execute-api.us-east-1.amazonaws.com/prod/data";
let rawData = {};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("timeFilter").addEventListener("change", fetchAndRender);
  document.getElementById("search").addEventListener("input", renderCards);
  document.getElementById("downloadCsv").addEventListener("click", downloadCSV);
  document.querySelectorAll(".tab-button").forEach(btn =>
    btn.addEventListener("click", switchTab)
  );
  document.getElementById("autoRefresh").addEventListener("change", toggleAutoRefresh);

  fetchAndRender();
});

let activeTab = "threats";
let refreshInterval;

function toggleAutoRefresh() {
  if (document.getElementById("autoRefresh").checked) {
    refreshInterval = setInterval(fetchAndRender, 60000);
  } else {
    clearInterval(refreshInterval);
  }
}

function switchTab(e) {
  document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
  e.target.classList.add("active");
  activeTab = e.target.dataset.tab;
  renderCharts();
  renderCards();
}

function fetchAndRender() {
  const days = document.getElementById("timeFilter").value;
  fetch(`${apiUrl}?days=${days}`)
    .then(res => res.json())
    .then(data => {
      rawData = data;
      renderCharts();
      renderCards();
    })
    .catch(err => console.error("Failed to load API:", err));
}

function renderCharts() {
  const dataset = rawData[activeTab] || [];

  const labels = {};
  dataset.forEach(item => {
    const key = item.event_type || item.country || "Unknown";
    labels[key] = (labels[key] || 0) + 1;
  });

  const keys = Object.keys(labels);
  const values = Object.values(labels);

  const barCtx = document.getElementById("barChart").getContext("2d");
  const pieCtx = document.getElementById("pieChart").getContext("2d");

  if (window.barChart) window.barChart.destroy();
  if (window.pieChart) window.pieChart.destroy();

  window.barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: keys,
      datasets: [{
        label: "Count",
        data: values
      }]
    }
  });

  window.pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: keys,
      datasets: [{
        data: values
      }]
    }
  });
}

function renderCards() {
  const container = document.getElementById("cards");
  const search = document.getElementById("search").value.toLowerCase();
  const dataset = rawData[activeTab] || [];

  container.innerHTML = "";

  dataset
    .filter(item =>
      Object.values(item).some(val =>
        String(val).toLowerCase().includes(search)
      )
    )
    .forEach(item => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = Object.entries(item)
        .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
        .join("<br>");
      container.appendChild(card);
    });
}

function downloadCSV() {
  const dataset = rawData[activeTab] || [];
  if (dataset.length === 0) return;

  const keys = Object.keys(dataset[0]);
  const csv = [
    keys.join(","),
    ...dataset.map(row => keys.map(k => JSON.stringify(row[k] || "")).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `${activeTab}_export.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
