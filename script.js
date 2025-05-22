const API_URL = "https://q2wy1am2oj.execute-api.us-east-1.amazonaws.com/prod/data";
let currentTab = "threats";
let allData = {};

const barChartCtx = document.getElementById("barChart").getContext("2d");
const pieChartCtx = document.getElementById("pieChart").getContext("2d");
let barChart, pieChart;

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.tab-btn[onclick*="${tab}"]`).classList.add("active");
  updateCharts();
}

function fetchData() {
  const days = document.getElementById("timeRange").value;
  fetch(`${API_URL}?days=${days}`)
    .then(res => res.json())
    .then(data => {
      allData = data;
      updateCharts();
    });
}

function updateCharts() {
  const raw = allData[currentTab] || [];
  const filter = document.getElementById("filter").value.toLowerCase();
  const items = raw.filter(entry =>
    Object.values(entry).some(value => String(value).toLowerCase().includes(filter))
  );

  const labelKey = currentTab === "threats" ? "ActionType" :
                   currentTab === "remediations" ? "event_type" : "ip_address";

  const counts = items.reduce((acc, item) => {
    const key = item[labelKey] || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(counts);
  const values = Object.values(counts);

  const colors = labels.map((_, i) => `hsl(${i * 60 % 360}, 60%, 50%)`);

  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  barChart = new Chart(barChartCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Count",
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  pieChart = new Chart(pieChartCtx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function downloadCSV() {
  const raw = allData[currentTab] || [];
  if (raw.length === 0) return alert("No data to export.");

  const headers = Object.keys(raw[0]);
  const rows = raw.map(row => headers.map(h => `"${row[h] || ""}"`).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${currentTab}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

document.getElementById("filter").addEventListener("input", updateCharts);
document.getElementById("timeRange").addEventListener("change", fetchData);
document.getElementById("autoRefresh").addEventListener("change", function () {
  if (this.checked) {
    window.refreshInterval = setInterval(fetchData, 60000);
  } else {
    clearInterval(window.refreshInterval);
  }
});

fetchData();
