const apiUrl = "https://q2wy1am2oj.execute-api.us-east-1.amazonaws.com/prod/data";
let currentTab = "timeline";
let chartData = { remediations: [], blocked_ips: [] };
let barChart, pieChart, refreshInterval;

document.getElementById("daysSelect").addEventListener("change", fetchData);
document.getElementById("filterInput").addEventListener("input", updateCharts);
document.getElementById("autoRefresh").addEventListener("change", toggleAutoRefresh);
document.getElementById("downloadBtn").addEventListener("click", downloadCSV);

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.tab-btn[onclick*="${tab}"]`).classList.add("active");
  updateCharts();
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

function toggleAutoRefresh() {
  if (document.getElementById("autoRefresh").checked) {
    refreshInterval = setInterval(fetchData, 60000);
  } else {
    clearInterval(refreshInterval);
  }
}

function updateCharts() {
  const filter = document.getElementById("filterInput").value.toLowerCase();
  let dataset = chartData[currentTab] || [];

  // Filter by text
  dataset = dataset.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(filter)
    )
  );

  const ctxBar = document.getElementById("barChart").getContext("2d");
  const ctxPie = document.getElementById("pieChart").getContext("2d");

  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  // Handle TIMELINE tab separately
  if (currentTab === "timeline") {
    const counts = {};
    dataset.forEach(item => {
      const date = (item.timestamp || item.CreatedAt || "").substring(0, 10);
      if (date) counts[date] = (counts[date] || 0) + 1;
    });
    const labels = Object.keys(counts).sort();
    const values = labels.map(date => counts[date]);

    barChart = new Chart(ctxBar, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Threats per Day",
          data: values,
          borderColor: "teal",
          backgroundColor: "lightcyan",
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: "Date" } },
          y: { beginAtZero: true, title: { display: true, text: "Count" } }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    pieChart = new Chart(ctxPie, {
      type: "doughnut",
      data: {
        labels: ["Total Events"],
        datasets: [{ data: [dataset.length], backgroundColor: ["#00acc1"] }]
      },
      options: {
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });

    return;
  }

  // Other tabs: remediations or blocked_ips
  const key = currentTab === "remediations" ? "event_type" : "ip_address";
  const counts = {};
  dataset.forEach(item => {
    const label = item[key] || "Unknown";
    counts[label] = (counts[label] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = labels.map(l => counts[l]);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = labels.map((_, i) => `hsl(${i * 45}, 70%, 55%)`);

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
      plugins: { legend: { display: false } },
      scales: {
        x: {
          title: { display: true, text: "Type" },
          ticks: { minRotation: 90, maxRotation: 90 }
        },
        y: {
          title: { display: true, text: "Number of Events" },
          beginAtZero: true
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });

  pieChart = new Chart(ctxPie, {
    type: "pie",
    data: {
      labels: labels.map((l, i) => `${l} (${values[i]}, ${(values[i] / total * 100).toFixed(1)}%)`),
      datasets: [{ data: values, backgroundColor: colors }]
    },
    options: {
      plugins: {
        legend: { position: "right" }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function downloadCSV() {
  const rows = chartData[currentTab] || [];
  if (!rows.length) return alert("No data to export");

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(h => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentTab}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

fetchData();
