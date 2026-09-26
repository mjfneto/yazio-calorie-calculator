const ACTIVITY_FILE = 'activities.json';
const STORAGE_KEY = 'yazio-calorie-calculator.activities.v1';
const DATA_VERSION = 1;
const DEFAULT_ICON = 'fa-person-walking';

const TIME_POINTS = [15, 30, 45, 60, 90, 120, 180];
const WEIGHT_POINTS = [50, 60, 70, 80, 90, 100, 110];
const TABLE_DURATIONS = TIME_POINTS.slice(0, 6);
const TABLE_WEIGHTS = WEIGHT_POINTS.slice(0, 6);

const CHART_FONT_COLOR = '#94A3B8';
const CHART_GRID_COLOR = '#334155';

let activities = [];
let currentActivity = null;
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
const addActivityBtn = document.getElementById('addActivityBtn');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const dataStatus = document.getElementById('dataStatus');

const weightSlider = document.getElementById('weightSlider');
const weightNum = document.getElementById('weightNum');
const weightVal = document.getElementById('weightVal');
const timeSlider = document.getElementById('timeSlider');
const timeNum = document.getElementById('timeNum');
const timeVal = document.getElementById('timeVal');
const timeHoursVal = document.getElementById('timeHoursVal');

const activityModal = document.getElementById('activityModal');
const activityForm = document.getElementById('activityForm');
const activityTitle = document.getElementById('activityTitle');
const activityMet = document.getElementById('activityMet');
const activityDescription = document.getElementById('activityDescription');
const activityIcon = document.getElementById('activityIcon');
const activityFormError = document.getElementById('activityFormError');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

window.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();

    try {
        const loaded = await loadActivities();
        activities = loaded.activities;
        currentActivity = activities[0];

        renderActivityList();
        updateActivityPanel();
        createCharts();
        updateCalculations();
        setDataStatus(
            loaded.source === 'local'
                ? 'Lista personalizada salva neste navegador.'
                : 'Lista padrão carregada de activities.json.'
        );
    } catch (error) {
        console.error(error);
        setDataStatus('Não foi possível carregar a lista padrão. Importe um JSON ou adicione uma atividade para continuar.', true);
        setApplicationDisabled(true);
    }
}

function setupEventListeners() {
    activityListEl.addEventListener('click', event => {
        const deleteButton = event.target.closest('.delete-activity-btn');
        if (deleteButton) {
            deleteActivity(deleteButton.dataset.activityId);
            return;
        }

        const activityButton = event.target.closest('.activity-btn');
        if (activityButton) selectActivity(activityButton.dataset.activityId);
    });

    [weightSlider, weightNum].forEach(input => {
        input.addEventListener('input', event => syncWeight(event.target.value));
    });

    [timeSlider, timeNum].forEach(input => {
        input.addEventListener('input', event => syncTime(event.target.value));
    });

    copyBtn.addEventListener('click', copyToClipboard);
    addActivityBtn.addEventListener('click', openActivityModal);
    closeModalBtn.addEventListener('click', closeActivityModal);
    cancelModalBtn.addEventListener('click', closeActivityModal);
    activityForm.addEventListener('submit', addActivity);
    activityModal.addEventListener('click', event => {
        if (event.target === activityModal) closeActivityModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !activityModal.hidden) closeActivityModal();
    });

    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importActivities);
    exportBtn.addEventListener('click', exportActivities);
}

async function loadActivities() {
    const localData = readLocalActivities();
    if (localData) return { activities: localData, source: 'local' };

    const response = await fetch(ACTIVITY_FILE, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar ${ACTIVITY_FILE}: ${response.status}`);

    return {
        activities: normalizeActivityData(await response.json()),
        source: 'file'
    };
}

function readLocalActivities() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        return normalizeActivityData(JSON.parse(saved));
    } catch (error) {
        console.warn('Não foi possível usar a lista local; usando o arquivo padrão.', error);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {}
        return null;
    }
}

function normalizeActivityData(data) {
    const list = Array.isArray(data) ? data : data?.activities;
    if (!Array.isArray(list) || list.length === 0) {
        throw new Error('O JSON deve conter pelo menos uma atividade.');
    }

    const usedIds = new Set();
    return list.map((item, index) => normalizeActivity(item, index, usedIds));
}

function normalizeActivity(item, index, usedIds) {
    if (!item || typeof item !== 'object') {
        throw new Error(`Atividade ${index + 1}: formato inválido.`);
    }

    const title = String(item.title ?? '').trim();
    const met = Number(item.met);

    if (!title) throw new Error(`Atividade ${index + 1}: informe "title".`);
    if (!Number.isFinite(met) || met <= 0) {
        throw new Error(`Atividade ${index + 1}: "met" deve ser um número maior que zero.`);
    }

    const baseId = slugify(String(item.id ?? title)) || `atividade-${index + 1}`;
    const id = makeUniqueId(baseId, usedIds);
    const icon = /^fa-[a-z0-9-]+$/i.test(String(item.icon ?? '')) ? String(item.icon) : DEFAULT_ICON;

    return {
        id,
        title,
        met,
        icon,
        desc: String(item.desc ?? '').trim()
    };
}

function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function makeUniqueId(baseId, usedIds) {
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    return id;
}

function renderActivityList() {
    const fragment = document.createDocumentFragment();

    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'activity-btn';
        button.dataset.activityId = activity.id;

        const icon = document.createElement('i');
        icon.className = `fa-solid ${activity.icon}`;

        const info = document.createElement('span');
        info.className = 'act-info';

        const title = document.createElement('span');
        title.className = 'act-title';
        title.textContent = activity.title;

        const met = document.createElement('span');
        met.className = 'act-met';
        met.textContent = `${activity.met} METs`;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-activity-btn';
        deleteButton.dataset.activityId = activity.id;
        deleteButton.title = `Excluir ${activity.title}`;
        deleteButton.setAttribute('aria-label', `Excluir ${activity.title}`);
        deleteButton.innerHTML = '<i class="fa-solid fa-trash-can"></i>';

        info.append(title, met);
        button.append(icon, info);
        item.append(button, deleteButton);
        fragment.appendChild(item);
    });

    activityListEl.replaceChildren(fragment);
    updateActiveActivityButton();
}

function openActivityModal() {
    activityForm.reset();
    activityIcon.value = DEFAULT_ICON;
    activityFormError.textContent = '';
    activityModal.hidden = false;
    document.body.classList.add('modal-open');
    activityTitle.focus();
}

function closeActivityModal() {
    activityModal.hidden = true;
    document.body.classList.remove('modal-open');
    activityFormError.textContent = '';
    addActivityBtn.focus();
}

function addActivity(event) {
    event.preventDefault();
    activityFormError.textContent = '';

    try {
        if (!activityForm.reportValidity()) return;

        const usedIds = new Set(activities.map(activity => activity.id));
        const newActivity = normalizeActivity({
            title: activityTitle.value,
            met: activityMet.value,
            desc: activityDescription.value,
            icon: activityIcon.value
        }, activities.length, usedIds);

        activities.push(newActivity);
        currentActivity = newActivity;

        setApplicationDisabled(false);
        renderActivityList();
        updateActivityPanel();
        if (!timeChart || !weightChart) createCharts();
        updateCalculations();
        closeActivityModal();
        persistActivityChanges(`Atividade “${newActivity.title}” adicionada.`);
    } catch (error) {
        activityFormError.textContent = error.message;
    }
}

function deleteActivity(id) {
    const index = activities.findIndex(activity => activity.id === id);
    if (index === -1) return;

    if (activities.length === 1) {
        setDataStatus('A última atividade não pode ser excluída. Adicione ou importe outra atividade primeiro.', true);
        return;
    }

    const activity = activities[index];
    if (!window.confirm(`Excluir “${activity.title}” da lista?`)) return;

    activities.splice(index, 1);

    if (currentActivity?.id === id) {
        currentActivity = activities[Math.min(index, activities.length - 1)];
    }

    renderActivityList();
    updateActivityPanel();
    updateCalculations();
    persistActivityChanges(`Atividade “${activity.title}” excluída.`);
}

function persistActivityChanges(message) {
    const storedLocally = saveLocalActivities(activities);
    setDataStatus(
        storedLocally
            ? `${message} Lista salva neste navegador.`
            : `${message} A alteração está apenas nesta sessão; exporte o JSON para não perdê-la.`,
        !storedLocally
    );
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
        button.classList.toggle('active', button.dataset.activityId === currentActivity?.id);
    });
}

function updateActivityPanel() {
    if (!currentActivity) return;

    const icon = document.createElement('i');
    icon.className = `fa-solid ${currentActivity.icon}`;
    actIconEl.replaceChildren(icon);
    actTitleEl.textContent = currentActivity.title;
    actDescEl.textContent = `${currentActivity.desc || 'Sem descrição.'} (${currentActivity.met} METs)`;
}

function calculateCalories(weightKg, durationMinutes) {
    if (!currentActivity) return 0;
    return Math.round(currentActivity.met * weightKg * (durationMinutes / 60));
}

function updateCalculations() {
    if (!currentActivity) return;

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
    if (!timeChart || !weightChart || !currentActivity) return;

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

async function importActivities() {
    const file = importFile.files?.[0];
    importFile.value = '';
    if (!file) return;

    try {
        const imported = normalizeActivityData(JSON.parse(await file.text()));
        activities = imported;
        currentActivity = activities[0];

        const storedLocally = saveLocalActivities(imported);
        setApplicationDisabled(false);
        renderActivityList();
        updateActivityPanel();
        if (!timeChart || !weightChart) createCharts();
        updateCalculations();
        setDataStatus(
            storedLocally
                ? `${activities.length} atividade(s) importada(s) e salva(s) neste navegador.`
                : `${activities.length} atividade(s) importada(s), mas o navegador não permitiu salvá-la(s) localmente.`,
            !storedLocally
        );
    } catch (error) {
        console.error(error);
        setDataStatus(`Importação recusada: ${error.message}`, true);
    }
}

function saveLocalActivities(list) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: DATA_VERSION, activities: list })
        );
        return true;
    } catch (error) {
        console.warn('Não foi possível salvar atividades no armazenamento local.', error);
        return false;
    }
}

function exportActivities() {
    if (!activities.length) return;

    const payload = {
        version: DATA_VERSION,
        activities
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'yazio-activities.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setDataStatus(`${activities.length} atividade(s) exportada(s) para JSON.`);
}

async function copyToClipboard() {
    if (!currentActivity) return;

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

function setDataStatus(message, isError = false) {
    dataStatus.textContent = message;
    dataStatus.classList.toggle('error', isError);
}

function setApplicationDisabled(disabled) {
    [copyBtn, exportBtn, weightSlider, weightNum, timeSlider, timeNum].forEach(element => {
        element.disabled = disabled;
    });
}
