const apiUrl = "https://q2wy1am2oj.execute-api.us-east-1.amazonaws.com/prod/data";
let currentTab = "threats";

document.getElementById("daysSelect").addEventListener("change", fetchData);
document.getElementById("filterInput").addEventListener("input", updateCharts);
document.getElementById("autoRefresh").addEventListener("change", autoRefreshToggle);

let chartData = { threats: [], remediations: [], blocked_ips: [] };
let barChart, pieChart, refreshInterval;

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");
  updateCharts();
}

function autoRefreshToggle() {
  if (document.getElementById("autoRefresh").checked) {
    refreshInterval = setInterval(fetchData, 60000);
  } else {
    clearInterval(refreshInterval);
  }
}

function fetchData() {
  const days = document.getElementById("daysSelect").value;
  fetch(`${apiUrl}?days=${days}`)
    .then(res => res.json())
    .then(data => {
      chartData = data;
      updateCharts();
    })
    .catch(console.error);
}

function updateCharts() {
  const dataSet = chartData[currentTab] || [];
  const filter = document.getElementById("filterInput").value.toLowerCase();
  const filtered = dataSet.filter(item => JSON.stringify(item).toLowerCase().includes(filter));

  const counts = {};
  filtered.forEach(item => {
    const type = item.event_type || item.reason || item.country || "Unknown";
    counts[type] = (counts[type] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = Object.values(counts);
  const colors = labels.map((_, i) => `hsl(${i * 45}, 70%, 55%)`);

  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  const ctxBar = document.getElementById("barChart").getContext("2d");
  const ctxPie = document.getElementById("pieChart").getContext("2d");

  barChart = new Chart(ctxBar, {
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
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          title: { display: true, text: "Type" },
          ticks: { maxRotation: 90, minRotation: 90 }
        },
        y: {
          title: { display: true, text: "Number of Events" },
          beginAtZero: true
        }
      }
    }
  });

  pieChart = new Chart(ctxPie, {
    type: "pie",
    data: {
      labels: labels.map((l, i) => `${l} (${values[i]}, ${((values[i] / values.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`),
      datasets: [{
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      plugins: {
        legend: { position: "right" }
      }
    }
  });
}

function downloadCSV() {
  const rows = chartData[currentTab];
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${currentTab}_${Date.now()}.csv`;
  a.click();
}

fetchData();
