const apiUrl = "https://q2wy1am2oj.execute-api.us-east-1.amazonaws.com/prod/data";
let currentTab = "timeline";
let chartData = {};
let barChart, pieChart, refreshInterval;

document.getElementById("daysSelect").addEventListener("change", fetchData);
document.getElementById("autoRefresh").addEventListener("change", toggleAutoRefresh);

fetchData();

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.tab-btn[onclick*="${tab}"]`).classList.add("active");
  updateCharts();
}

function toggleAutoRefresh() {
  clearInterval(refreshInterval);
  if (document.getElementById("autoRefresh").checked) {
    refreshInterval = setInterval(fetchData, 60000);
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
  const data = chartData[currentTab] || [];

  const select = document.getElementById("filterInput");
  select.innerHTML = '<option value="all">All</option>';

  const groupKey = currentTab === "remediations" ? "event_type" :
                   currentTab === "blocked_ips" ? "ip_address" :
                   "timestamp";

  const labelMap = {};
  data.forEach(item => {
    const key = item[groupKey] || item.event_type || item.reason || item.country || "Unknown";
    if (!labelMap[key]) labelMap[key] = 0;
    labelMap[key]++;
  });

  Object.keys(labelMap).sort().forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    select.appendChild(opt);
  });

  const selected = select.value || "all";
  const filtered = selected === "all" ? data : data.filter(item => {
    const key = item[groupKey] || item.event_type || item.reason || item.country || "Unknown";
    return key === selected;
  });

  const counts = {};
  filtered.forEach(item => {
    const key = item[groupKey] || item.event_type || item.reason || item.country || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = labels.map(k => counts[k]);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = labels.map((_, i) => `hsl(${i * 45}, 70%, 55%)`);

  if (barChart) barChart.destroy();
  if (pieChart) pieChart.destroy();

  const ctxBar = document.getElementById("barChart").getContext("2d");
  const ctxPie = document.getElementById("pieChart").getContext("2d");

  if (currentTab === "timeline") {
    const dateMap = {};
    filtered.forEach(item => {
      const ts = item.timestamp || item.CreatedAt || "";
      const date = ts.substring(0, 10);
      if (date) dateMap[date] = (dateMap[date] || 0) + 1;
    });
    const dateLabels = Object.keys(dateMap).sort();
    const dateValues = dateLabels.map(d => dateMap[d]);

    barChart = new Chart(ctxBar, {
      type: "line",
      data: {
        labels: dateLabels,
        datasets: [{
          label: "Events per Day",
          data: dateValues,
          backgroundColor: "#b2ebf2",
          borderColor: "#00acc1",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: "Date", font: { weight: "bold" } } },
          y: { title: { display: true, text: "Number of Events", font: { weight: "bold" } }, beginAtZero: true }
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
          data: [filtered.length],
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
          title: { display: true, text: "Type", font: { weight: "bold" } },
          ticks: { maxRotation: 90, minRotation: 90 }
        },
        y: {
          title: { display: true, text: "Number of Events", font: { weight: "bold" } },
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
      labels: labels.map((l, i) =>
        `${l}\n${values[i]} events\n${((values[i] / total) * 100).toFixed(1)}%`
      ),
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
  const selected = document.getElementById("filterInput").value || "all";

  const filtered = selected === "all" ? data : data.filter(item => {
    const key = item.event_type || item.reason || item.country || "Unknown";
    return key === selected;
  });

  if (!filtered.length) return alert("No data to export.");

  const headers = Object.keys(filtered[0]);
  const csv = [
    headers.join(","),
    ...filtered.map(row =>
      headers.map(h => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentTab}_export_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
