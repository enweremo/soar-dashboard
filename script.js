const apiUrl = "https://q2wy1am2oj.execute-api.us-east-1.amazonaws.com/prod/data";
let currentTab = "timeline";
let chartData = {};
let barChart, pieChart, autoRefreshInterval;

document.getElementById("daysSelect").addEventListener("change", fetchData);
document.getElementById("filterInput").addEventListener("input", updateCharts);
document.getElementById("autoRefresh").addEventListener("change", toggleAutoRefresh);

fetchData();

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.tab-btn[onclick*="${tab}"]`).classList.add("active");
  updateCharts();
}

function toggleAutoRefresh() {
  if (document.getElementById("autoRefresh").checked) {
    autoRefreshInterval = setInterval(fetchData, 60000);
  } else {
    clearInterval(autoRefreshInterval);
  }
}

function fetchData() {
  const days = document.getElementById("daysSelect").value;
  fetch(`${apiUrl}?days=${days}`)
    .then(res => res.json())
    .then(data => {
      chartData = data;
      updateCharts();
    });
}

function updateCharts() {
  const filter = document.getElementById("filterInput").value.toLowerCase();
  let data = chartData[currentTab] || [];

  data = data.filter(item =>
    Object.values(item).some(val => String(val).toLowerCase().includes(filter))
  );

  const ctxBar = document.getElementById("barChart").getContext("2d");
  const ctxPie = document.getElementById("pieChart").getContext("2d");
  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  if (currentTab === "timeline") {
    const dateCount = {};
    data.forEach(item => {
      const ts = item.timestamp || item.CreatedAt || "";
      const date = ts.substring(0, 10);
      if (date) {
        dateCount[date] = (dateCount[date] || 0) + 1;
      }
    });

    const labels = Object.keys(dateCount).sort();
    const values = labels.map(l => dateCount[l]);

    barChart = new Chart(ctxBar, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Threats per Day",
          data: values,
          borderColor: "#00acc1",
          backgroundColor: "#b2ebf2",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: "Date" } },
          y: { title: { display: true, text: "Number of Events" }, beginAtZero: true }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    pieChart = new Chart(ctxPie, {
      type: "doughnut",
      data: {
        labels: ["Total Events"],
        datasets: [{
          data: [data.length],
          backgroundColor: ["#00acc1"]
        }]
      },
      options: {
        plugins: { legend: { position: "bottom" } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
    return;
  }

  // REMEDIATIONS or BLOCKED_IPS
  const key = currentTab === "remediations" ? "event_type" : "ip_address";
  const countMap = {};
  data.forEach(item => {
    const label = item[key] || "Unknown";
    countMap[label] = (countMap[label] || 0) + 1;
  });

  const labels = Object.keys(countMap);
  const values = labels.map(l => countMap[l]);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = labels.map((_, i) => `hsl(${i * 50 % 360}, 70%, 55%)`);

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
      datasets: [{
        data: values,
        backgroundColor: colors
      }]
    },
    options: {
      plugins: { legend: { position: "right" } },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function downloadCSV() {
  const data = chartData[currentTab] || [];
  if (!data.length) return alert("No data to export.");

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentTab}_export_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
