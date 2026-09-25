// State Management
        let activities = [...initialActivities];
        let currentActivity = activities[0];
        let userWeight = 70;
        let userHeight = 165;
        let userDuration = 60; // in minutes

        // Chart References
        let timeChartInstance = null;
        let weightChartInstance = null;

        // DOM Element References
        const activityListEl = document.getElementById('activityList');
        const actIconEl = document.getElementById('actIcon');
        const actTitleEl = document.getElementById('actTitle');
        const actDescEl = document.getElementById('actDesc');

        const weightSlider = document.getElementById('weightSlider');
        const weightNum = document.getElementById('weightNum');
        const weightVal = document.getElementById('weightVal');

        const heightSlider = document.getElementById('heightSlider');
        const heightNum = document.getElementById('heightNum');
        const heightVal = document.getElementById('heightVal');

        const timeSlider = document.getElementById('timeSlider');
        const timeNum = document.getElementById('timeNum');
        const timeVal = document.getElementById('timeVal');
        const timeHoursVal = document.getElementById('timeHoursVal');

        const calcResultEl = document.getElementById('calcResult');
        const referenceTableBody = document.getElementById('referenceTableBody');

        window.addEventListener('DOMContentLoaded', () => {
            renderActivityList();
            setupEventListeners();
            selectActivity(activities[0].id);
        });

        function renderActivityList() {
            activityListEl.innerHTML = '';
            activities.forEach(act => {
                const btn = document.createElement('button');
                btn.className = `activity-btn ${act.id === currentActivity.id ? 'active' : ''}`;
                btn.onclick = () => selectActivity(act.id);
                btn.innerHTML = `
                    <i class="fa-solid ${act.icon}"></i>
                    <div class="act-info">
                        <span class="act-title">${act.title}</span>
                        <span class="act-met">${act.met} METs</span>
                    </div>
                `;
                activityListEl.appendChild(btn);
            });
        }

        function setupEventListeners() {
            // Weight Controls Sync
            weightSlider.addEventListener('input', (e) => syncWeight(e.target.value));
            weightNum.addEventListener('input', (e) => syncWeight(e.target.value));

            // Height Controls Sync
            heightSlider.addEventListener('input', (e) => syncHeight(e.target.value));
            heightNum.addEventListener('input', (e) => syncHeight(e.target.value));

            // Time Controls Sync
            timeSlider.addEventListener('input', (e) => syncTime(e.target.value));
            timeNum.addEventListener('input', (e) => syncTime(e.target.value));
        }

        function syncWeight(val) {
            userWeight = Math.max(30, Math.min(200, Number(val) || 70));
            weightSlider.value = userWeight;
            weightNum.value = userWeight;
            weightVal.textContent = userWeight;
            updateCalculations();
        }

        function syncHeight(val) {
            userHeight = Math.max(100, Math.min(230, Number(val) || 165));
            heightSlider.value = userHeight;
            heightNum.value = userHeight;
            heightVal.textContent = userHeight;
            updateCalculations();
        }

        function syncTime(val) {
            userDuration = Math.max(1, Math.min(360, Number(val) || 60));
            timeSlider.value = userDuration;
            timeNum.value = userDuration;
            timeVal.textContent = userDuration;
            timeHoursVal.textContent = (userDuration / 60).toFixed(1);
            updateCalculations();
        }

        function selectActivity(id) {
            currentActivity = activities.find(a => a.id === id) || activities[0];
            
            // Update Sidebar Selected State
            document.querySelectorAll('.activity-btn').forEach((btn, index) => {
                if (activities[index] && activities[index].id === id) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Update Panel Detail
            actIconEl.innerHTML = `<i class="fa-solid ${currentActivity.icon}"></i>`;
            actTitleEl.textContent = currentActivity.title;
            actDescEl.textContent = `${currentActivity.desc} (${currentActivity.met} METs)`;

            updateCalculations();
        }

        function calculateCalories(met, weightKg, durationMinutes) {
            // Standard Metabolic Equivalent Formula: Calories = MET * Weight (kg) * Duration (hours)
            const hours = durationMinutes / 60;
            return Math.round(met * weightKg * hours);
        }

        function updateCalculations() {
            // Main Calorie Output
            const calories = calculateCalories(currentActivity.met, userWeight, userDuration);
            calcResultEl.textContent = calories;

            // Render/Update Charts
            renderCharts();

            // Render Table
            renderTable();
        }

        function renderCharts() {
            const chartFontColor = '#94A3B8';
            const chartGridColor = '#334155';

            // Chart 1: Calories vs Time
            const timeLabels = ['15 min', '30 min', '45 min', '60 min', '90 min', '120 min', '180 min'];
            const timeMinutesArr = [15, 30, 45, 60, 90, 120, 180];
            const timeData = timeMinutesArr.map(m => calculateCalories(currentActivity.met, userWeight, m));

            const timeCtx = document.getElementById('timeChart').getContext('2d');
            if (timeChartInstance) timeChartInstance.destroy();

            timeChartInstance = new Chart(timeCtx, {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: `Gasto p/ ${userWeight}kg (kcal)`,
                        data: timeData,
                        borderColor: '#6366F1',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 5,
                        pointBackgroundColor: '#818CF8'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: chartFontColor } } },
                    scales: {
                        x: { ticks: { color: chartFontColor }, grid: { color: chartGridColor } },
                        y: { ticks: { color: chartFontColor }, grid: { color: chartGridColor } }
                    }
                }
            });

            // Chart 2: Calories vs Weight
            const weightLabels = ['50 kg', '60 kg', '70 kg', '80 kg', '90 kg', '100 kg', '110 kg'];
            const weightValuesArr = [50, 60, 70, 80, 90, 100, 110];
            const weightData = weightValuesArr.map(w => calculateCalories(currentActivity.met, w, userDuration));

            const weightCtx = document.getElementById('weightChart').getContext('2d');
            if (weightChartInstance) weightChartInstance.destroy();

            weightChartInstance = new Chart(weightCtx, {
                type: 'bar',
                data: {
                    labels: weightLabels,
                    datasets: [{
                        label: `Gasto em ${userDuration} min (kcal)`,
                        data: weightData,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: '#10B981',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: chartFontColor } } },
                    scales: {
                        x: { ticks: { color: chartFontColor }, grid: { color: chartGridColor } },
                        y: { ticks: { color: chartFontColor }, grid: { color: chartGridColor } }
                    }
                }
            });
        }

        function renderTable() {
            const weights = [50, 60, 70, 80, 90, 100];
            const durations = [15, 30, 45, 60, 90, 120];

            referenceTableBody.innerHTML = '';

            weights.forEach(w => {
                const tr = document.createElement('tr');
                if (w === userWeight) tr.style.background = 'rgba(99, 102, 241, 0.15)';

                let rowHTML = `<td><strong>${w} kg</strong></td>`;
                durations.forEach(d => {
                    const c = calculateCalories(currentActivity.met, w, d);
                    const isSelectedCell = (w === userWeight && d === userDuration);
                    rowHTML += `<td style="${isSelectedCell ? 'color:#10B981; font-weight:bold;' : ''}">${c} kcal</td>`;
                });

                tr.innerHTML = rowHTML;
                referenceTableBody.appendChild(tr);
            });
        }

        // Copy Result to Clipboard Function
        function copyToClipboard() {
            const calories = calculateCalories(currentActivity.met, userWeight, userDuration);
            const textToCopy = `${currentActivity.title} (${userDuration} min): ${calories} kcal`;

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy);
            } else {
                // Fallback using execCommand
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            // Show Toast
            const toast = document.getElementById('copyToast');
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }

        // Modal Controls
        function openModal(id) {
            document.getElementById(id).classList.add('active');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        // Handle Form Submission for Adding Custom Activity
        function handleAddActivity(e) {
            e.preventDefault();
            const title = document.getElementById('newTitle').value;
            const met = parseFloat(document.getElementById('newMET').value);
            const icon = document.getElementById('newIcon').value;
            const desc = document.getElementById('newDesc').value || 'Atividade personalizada.';

            const newAct = {
                id: 'custom_' + Date.now(),
                title,
                met,
                icon,
                desc
            };

            activities.push(newAct);
            renderActivityList();
            selectActivity(newAct.id);
            document.getElementById('addActivityForm').reset();
        }