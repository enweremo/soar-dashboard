const API_URL = 'https://q2wy1am2oj.execute-api.us-east-1.amazonaws.com/prod/data';
const filterInput = document.getElementById('filterInput');
const daySelect = document.getElementById('daySelect');
const cardList = document.getElementById('cardList');
const barChart = document.getElementById('barChart');
const pieChart = document.getElementById('pieChart');
const tabButtons = document.querySelectorAll('.tab');
const downloadBtn = document.getElementById('downloadBtn');
const autoRefreshToggle = document.getElementById('autoRefresh');

let fullData = { threats: [], remediations: [], blocked_ips: [] };
let currentTab = 'threats';
let currentData = [];
let chartObjects = [];

function fetchData(days = 7) {
  fetch(`${API_URL}?days=${days}`)
    .then(res => res.json())
    .then(data => {
      fullData = data;
      renderTab();
    });
}

function renderTab() {
  const keyword = filterInput.value.toLowerCase();
  currentData = (fullData[currentTab] || []).filter(item =>
    Object.values(item).some(val => String(val).toLowerCase().includes(keyword))
  );

  // Render cards
  cardList.innerHTML = '';
  currentData.forEach(item => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = Object.entries(item).map(([k, v]) =>
      `<p><strong>${k}:</strong> ${v}</p>`
    ).join('');
    cardList.appendChild(div);
  });

  // Render charts
  chartObjects.forEach(chart => chart.destroy());
  const types = {}, countries = {};
  currentData.forEach(d => {
    const type = d.threat_type || d.event_type || d.reason || 'Other';
    types[type] = (types[type] || 0) + 1;
    const country = d.country || 'Unknown';
    countries[country] = (countries[country] || 0) + 1;
  });

  chartObjects[0] = new Chart(barChart, {
    type: 'bar',
    data: {
      labels: Object.keys(types),
      datasets: [{ label: 'Count', data: Object.values(types), backgroundColor: '#00796b' }]
    }
  });

  chartObjects[1] = new Chart(pieChart, {
    type: 'pie',
    data: {
      labels: Object.keys(countries),
      datasets: [{ data: Object.values(countries), backgroundColor: ['#1abc9c','#f39c12','#e74c3c','#3498db','#9b59b6'] }]
    }
  });
}

// Download CSV
downloadBtn.addEventListener('click', () => {
  const csv = [Object.keys(currentData[0] || {}).join(',')];
  currentData.forEach(row => {
    csv.push(Object.values(row).join(','));
  });
  const blob = new Blob([csv.join('\\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${currentTab}_data.csv`;
  link.click();
});

// Events
filterInput.addEventListener('input', renderTab);
daySelect.addEventListener('change', () => fetchData(daySelect.value));
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.tab.active').classList.remove('active');
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    renderTab();
  });
});
autoRefreshToggle.addEventListener('change', () => {
  if (autoRefreshToggle.checked) {
    autoRefreshToggle.interval = setInterval(() => fetchData(daySelect.value), 60000);
  } else {
    clearInterval(autoRefreshToggle.interval);
  }
});

// Initial load
fetchData(daySelect.value);
