const API_BASE = 'https://q2wy1am2oj.execute-api.us-east-1.amazonaws.com/prod/data';
const barChart = document.getElementById('barChart');
const pieChart = document.getElementById('pieChart');
const lineChart = document.getElementById('lineChart');
const threatList = document.getElementById('threatList');
const filterInput = document.getElementById('filterInput');
const daySelect = document.getElementById('daySelect');

let fullData = [];

function fetchData(days = 7) {
  fetch(`${API_BASE}?days=${days}`)
    .then(res => res.json())
    .then(data => {
      fullData = data.threats || [];
      renderThreats(fullData);
      renderCharts(fullData);
    });
}

function renderThreats(data) {
  const filter = filterInput.value.toLowerCase();
  const filtered = data.filter(t =>
    t.ip_address.includes(filter) ||
    t.threat_type.toLowerCase().includes(filter) ||
    (t.country && t.country.toLowerCase().includes(filter))
  );

  threatList.innerHTML = '';
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <p><strong>Type:</strong> ${item.threat_type}</p>
      <p><strong>IP:</strong> ${item.ip_address}</p>
      <p><strong>Country:</strong> ${item.country || 'N/A'}</p>
      <p><strong>Timestamp:</strong> ${new Date(item.timestamp).toLocaleString()}</p>
      <p><strong>Status:</strong> ${item.status || 'N/A'}</p>
    `;
    threatList.appendChild(card);
  });
}

function renderCharts(data) {
  const threatCounts = {};
  const lineData = {};

  data.forEach(item => {
    const type = item.threat_type;
    const time = new Date(item.timestamp).toLocaleDateString();

    threatCounts[type] = (threatCounts[type] || 0) + 1;
    lineData[time] = (lineData[time] || 0) + 1;
  });

  const barData = {
    labels: Object.keys(threatCounts),
    datasets: [{
      label: 'Threat Count',
      data: Object.values(threatCounts),
      backgroundColor: '#3498db'
    }]
  };

  const pieData = {
    labels: Object.keys(threatCounts),
    datasets: [{
      data: Object.values(threatCounts),
      backgroundColor: ['#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c']
    }]
  };

  const lineDataObj = {
    labels: Object.keys(lineData),
    datasets: [{
      label: 'Threats per Day',
      data: Object.values(lineData),
      fill: false,
      borderColor: '#34495e',
      tension: 0.3
    }]
  };

  new Chart(barChart, { type: 'bar', data: barData });
  new Chart(pieChart, { type: 'pie', data: pieData });
  new Chart(lineChart, { type: 'line', data: lineDataObj });
}

// Events
filterInput.addEventListener('input', () => renderThreats(fullData));
daySelect.addEventListener('change', () => fetchData(daySelect.value));

// Initial load
fetchData(daySelect.value);
