const TIME_POINTS = [15, 30, 45, 60, 90, 120, 180];
const WEIGHT_POINTS = [50, 60, 70, 80, 90, 100, 110];
const TABLE_DURATIONS = TIME_POINTS.slice(0, 6);
const TABLE_WEIGHTS = WEIGHT_POINTS.slice(0, 6);

const CHART_FONT_COLOR = '#94A3B8';
const CHART_GRID_COLOR = '#334155';

let currentActivity = activities[0];
let userWeight = 70;
let userDuration = 60;
let timeChart;
let weightChart;

const activityListEl = document.getElementById('activityList');
const actIconEl = document.getElementById('actIcon');
const actTitleEl = document.getElementById('actTitle');
const actDescEl = document.getElementById('actDesc');
const calcResultEl = document.getElementById('calcResult');
const referenceTableBody = document.getElementById('referenceTableBody');
const copyBtn = document.getElementById('copyBtn');
const copyToast = document.getElementById('copyToast');

const weightSlider = document.getElementById('weightSlider');
const weightNum = document.getElementById('weightNum');
const weightVal = document.getElementById('weightVal');
const timeSlider = document.getElementById('timeSlider');
const timeNum = document.getElementById('timeNum');
const timeVal = document.getElementById('timeVal');
const timeHoursVal = document.getElementById('timeHoursVal');

window.addEventListener('DOMContentLoaded', init);

function init() {
    renderActivityList();
    setupEventListeners();
    updateActivityPanel();
    createCharts();
    updateCalculations();
}

function renderActivityList() {
    const fragment = document.createDocumentFragment();

    activities.forEach(activity => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'activity-btn';
        button.dataset.activityId = activity.id;
        button.innerHTML = `
            <i class="fa-solid ${activity.icon}"></i>
            <span class="act-info">
                <span class="act-title">${activity.title}</span>
                <span class="act-met">${activity.met} METs</span>
            </span>
        `;
        fragment.appendChild(button);
    });

    activityListEl.replaceChildren(fragment);
    updateActiveActivityButton();
}

function setupEventListeners() {
    activityListEl.addEventListener('click', event => {
        const button = event.target.closest('.activity-btn');
        if (button) selectActivity(button.dataset.activityId);
    });

    [weightSlider, weightNum].forEach(input => {
        input.addEventListener('input', event => syncWeight(event.target.value));
    });

    [timeSlider, timeNum].forEach(input => {
        input.addEventListener('input', event => syncTime(event.target.value));
    });

    copyBtn.addEventListener('click', copyToClipboard);
}

function normalizeValue(value, input, fallback) {
    if (String(value).trim() === '') return fallback;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;

    return Math.min(Number(input.max), Math.max(Number(input.min), parsed));
}

function syncWeight(value) {
    userWeight = normalizeValue(value, weightNum, 70);
    weightSlider.value = userWeight;
    weightNum.value = userWeight;
    weightVal.textContent = userWeight;
    updateCalculations();
}

function syncTime(value) {
    userDuration = normalizeValue(value, timeNum, 60);
    timeSlider.value = userDuration;
    timeNum.value = userDuration;
    timeVal.textContent = userDuration;
    timeHoursVal.textContent = (userDuration / 60).toFixed(1);
    updateCalculations();
}

function selectActivity(id) {
    const selectedActivity = activities.find(activity => activity.id === id);
    if (!selectedActivity || selectedActivity === currentActivity) return;

    currentActivity = selectedActivity;
    updateActiveActivityButton();
    updateActivityPanel();
    updateCalculations();
}

function updateActiveActivityButton() {
    activityListEl.querySelectorAll('.activity-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.activityId === currentActivity.id);
    });
}

function updateActivityPanel() {
    actIconEl.innerHTML = `<i class="fa-solid ${currentActivity.icon}"></i>`;
    actTitleEl.textContent = currentActivity.title;
    actDescEl.textContent = `${currentActivity.desc} (${currentActivity.met} METs)`;
}

function calculateCalories(weightKg, durationMinutes) {
    return Math.round(currentActivity.met * weightKg * (durationMinutes / 60));
}

function updateCalculations() {
    calcResultEl.textContent = calculateCalories(userWeight, userDuration);
    updateCharts();
    renderTable();
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: CHART_FONT_COLOR }
            }
        },
        scales: {
            x: {
                ticks: { color: CHART_FONT_COLOR },
                grid: { color: CHART_GRID_COLOR }
            },
            y: {
                ticks: { color: CHART_FONT_COLOR },
                grid: { color: CHART_GRID_COLOR }
            }
        }
    };
}

function createCharts() {
    timeChart = new Chart(document.getElementById('timeChart'), {
        type: 'line',
        data: {
            labels: TIME_POINTS.map(minutes => `${minutes} min`),
            datasets: [{
                label: '',
                data: [],
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                fill: true,
                tension: 0.35,
                pointRadius: 5,
                pointBackgroundColor: '#818CF8'
            }]
        },
        options: chartOptions()
    });

    weightChart = new Chart(document.getElementById('weightChart'), {
        type: 'bar',
        data: {
            labels: WEIGHT_POINTS.map(weight => `${weight} kg`),
            datasets: [{
                label: '',
                data: [],
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: '#10B981',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: chartOptions()
    });
}

function updateCharts() {
    if (!timeChart || !weightChart) return;

    timeChart.data.datasets[0].label = `Gasto p/ ${userWeight}kg (kcal)`;
    timeChart.data.datasets[0].data = TIME_POINTS.map(minutes =>
        calculateCalories(userWeight, minutes)
    );
    timeChart.update();

    weightChart.data.datasets[0].label = `Gasto em ${userDuration} min (kcal)`;
    weightChart.data.datasets[0].data = WEIGHT_POINTS.map(weight =>
        calculateCalories(weight, userDuration)
    );
    weightChart.update();
}

function renderTable() {
    referenceTableBody.innerHTML = TABLE_WEIGHTS.map(weight => {
        const rowClass = weight === userWeight ? 'selected-row' : '';
        const cells = TABLE_DURATIONS.map(duration => {
            const cellClass = weight === userWeight && duration === userDuration
                ? 'selected-cell'
                : '';
            return `<td class="${cellClass}">${calculateCalories(weight, duration)} kcal</td>`;
        }).join('');

        return `
            <tr class="${rowClass}">
                <td><strong>${weight} kg</strong></td>
                ${cells}
            </tr>
        `;
    }).join('');
}

async function copyToClipboard() {
    const calories = calculateCalories(userWeight, userDuration);
    const text = `${currentActivity.title} (${userDuration} min): ${calories} kcal`;

    try {
        if (!navigator.clipboard || !window.isSecureContext) throw new Error();
        await navigator.clipboard.writeText(text);
    } catch {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
    }

    copyToast.classList.add('show');
    setTimeout(() => copyToast.classList.remove('show'), 2000);
}
