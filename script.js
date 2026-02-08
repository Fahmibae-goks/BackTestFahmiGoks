// State Management
let currentUser = null;
let trades = [];
let chart = null;

// DOM Elements
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');

// --- Auth Functions ---
function toggleAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
}

function handleRegister() {
    const user = document.getElementById('reg-user').value;
    const pass = document.getElementById('reg-pass').value;

    if (!user || !pass) return alert('Please fill all fields');

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.username === user)) return alert('User already exists');

    // Default initial balance is 0
    users.push({ username: user, password: btoa(pass), initialBalance: 0, currency: '$' });
    localStorage.setItem('users', JSON.stringify(users));
    alert('Registration successful! Please login.');
    toggleAuth();
}

function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const foundUser = users.find(u => u.username === user && u.password === btoa(pass));

    if (foundUser) {
        currentUser = foundUser;
        initDashboard();
    } else {
        alert('Invalid username or password');
    }
}

function handleLogout() {
    currentUser = null;
    dashboardContainer.style.display = 'none';
    authContainer.style.display = 'flex';
}

// --- Dashboard Logic ---
function initDashboard() {
    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    document.getElementById('display-user').innerText = `Hello, ${currentUser.username}`;
    
    // Set UI values from user profile
    document.getElementById('input-initial-balance').value = currentUser.initialBalance || 0;
    document.getElementById('currency-select').value = currentUser.currency || '$';

    // Load Trades
    const allTrades = JSON.parse(localStorage.getItem('trades') || '{}');
    trades = allTrades[currentUser.username] || [];
    
    updateUI();
}

function updateInitialBalance() {
    const newVal = parseFloat(document.getElementById('input-initial-balance').value) || 0;
    currentUser.initialBalance = newVal;
    
    // Save to localStorage users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const idx = users.findIndex(u => u.username === currentUser.username);
    if (idx !== -1) {
        users[idx].initialBalance = newVal;
        localStorage.setItem('users', JSON.stringify(users));
    }
    updateUI();
}

async function addTrade() {
    const pair = document.getElementById('input-pair').value;
    const strategy = document.getElementById('input-strategy').value;
    const type = document.getElementById('input-type').value;
    const amount = parseFloat(document.getElementById('input-amount').value);
    const datetime = document.getElementById('input-datetime').value;
    const notes = document.getElementById('input-notes').value;
    const ssFile = document.getElementById('input-ss-file').files[0];

    if (!pair || isNaN(amount) || !datetime) return alert('Please fill mandatory fields');

    let ssBase64 = '';
    if (ssFile) {
        ssBase64 = await toBase64(ssFile);
    }

    const newTrade = {
        id: Date.now(),
        date: datetime,
        pair,
        strategy,
        type,
        amount,
        notes,
        ss: ssBase64
    };

    trades.push(newTrade);
    saveTrades();
    updateUI();
    
    // Reset form
    document.getElementById('input-pair').value = '';
    document.getElementById('input-amount').value = '';
    document.getElementById('input-notes').value = '';
    document.getElementById('input-ss-file').value = '';
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function saveTrades() {
    const allTrades = JSON.parse(localStorage.getItem('trades') || '{}');
    allTrades[currentUser.username] = trades;
    localStorage.setItem('trades', JSON.stringify(allTrades));
}

function updateUI() {
    // Update currency in current profile
    currentUser.currency = document.getElementById('currency-select').value;
    
    updateStats();
    updateTable();
    updateChart();
}

function updateStats() {
    const initial = currentUser.initialBalance || 0;
    const cur = currentUser.currency;
    let current = initial;
    let wins = 0;

    trades.forEach(t => {
        if (t.type === 'Profit') {
            current += t.amount;
            wins++;
        } else {
            current -= t.amount;
        }
    });

    document.getElementById('stat-current').innerText = `${cur}${current.toLocaleString()}`;
    document.getElementById('stat-total').innerText = trades.length;
    
    const wr = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    document.getElementById('stat-winrate').innerText = `${wr.toFixed(1)}%`;
}

function updateTable() {
    const tbody = document.getElementById('trade-body');
    const cur = currentUser.currency;
    tbody.innerHTML = '';

    [...trades].reverse().forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(t.date).toLocaleString()}</td>
            <td>${t.pair}</td>
            <td>${t.strategy}</td>
            <td class="${t.type === 'Profit' ? 'text-profit' : 'text-loss'}">${t.type}</td>
            <td>${cur}${t.amount.toLocaleString()}</td>
            <td>${t.notes}</td>
            <td>${t.ss ? `<img src="${t.ss}" class="ss-img" onclick="viewImage('${t.ss}')">` : '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

function viewImage(src) {
    const win = window.open();
    win.document.write(`<img src="${src}" style="max-width:100%">`);
}

function getDayName(dateStr) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = new Date(dateStr);
    return days[d.getDay()];
}

function updateChart() {
    const ctx = document.getElementById('equityChart').getContext('2d');
    const cur = currentUser.currency;
    
    let balance = currentUser.initialBalance || 0;
    const data = [balance];
    const labels = ['Start'];

    trades.forEach((t) => {
        if (t.type === 'Profit') balance += t.amount;
        else balance -= t.amount;
        data.push(balance);
        labels.push(getDayName(t.date));
    });

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Equity Growth',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { callback: value => cur + value.toLocaleString() }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => `Balance: ${cur}${context.parsed.y.toLocaleString()}`
                    }
                }
            }
        }
    });
}

function exportToExcel() {
    if (trades.length === 0) return alert('No data to export');

    const worksheetData = trades.map(t => ({
        Date: t.date,
        Day: getDayName(t.date),
        Pair: t.pair,
        Strategy: t.strategy,
        Result: t.type,
        Amount: t.amount,
        Notes: t.notes
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Backtest Results");
    XLSX.writeFile(wb, `Backtest_By_Fahmi_Goks_${currentUser.username}.xlsx`);
}
