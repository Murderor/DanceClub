// Инициализация Supabase
const supabaseUrl = 'https://hjeknoxsqtytylhzogwm.supabase.co';
const supabaseKey = 'sb_publishable_op0u5_yEH_nC8wzEBMo5yw_m_-sdGjf';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Глобальные переменные
let currentUser = null;
let currentRole = null;

// Элементы DOM
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');

// Слушаем изменения состояния авторизации
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        loadProfileAndRender();
    } else {
        currentUser = null;
        currentRole = null;
        showAuth();
    }
});

// Проверяем сессию при загрузке
checkSession();

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadProfileAndRender();
    } else {
        showAuth();
    }
}

async function loadProfileAndRender() {
    // Получаем роль из profiles
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', currentUser.id)
        .single();

    if (error) {
        console.error('Ошибка загрузки профиля', error);
        // возможно профиль ещё не создан, создадим вручную
        await supabase.from('profiles').insert({ id: currentUser.id, name: currentUser.email, role: 'member' });
        currentRole = 'member';
    } else {
        currentRole = profile.role;
    }
    renderDashboard();
}

function showAuth() {
    authContainer.style.display = 'block';
    mainContainer.style.display = 'none';
    authContainer.innerHTML = `
        <h2>Вход / Регистрация</h2>
        <form id="auth-form">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Пароль" required>
            <button type="submit" id="signin-btn">Войти</button>
            <button type="button" id="signup-btn" class="secondary">Зарегистрироваться</button>
        </form>
    `;

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert('Ошибка входа: ' + error.message);
    });

    document.getElementById('signup-btn').addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert('Ошибка регистрации: ' + error.message);
        else alert('Проверьте почту для подтверждения!');
    });
}

function renderDashboard() {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';

    // Базовая структура
    mainContainer.innerHTML = `
        <div class="dashboard">
            <div class="header">
                <h2>Добро пожаловать, ${currentUser.email}</h2>
                <button id="logout-btn">Выйти</button>
            </div>
            <div class="tabs">
                <button class="tab-btn active" data-tab="events">Ближайшие репетиции</button>
                <button class="tab-btn" data-tab="availability">Моё расписание</button>
                ${currentRole === 'admin' ? '<button class="tab-btn" data-tab="admin">Админ панель</button>' : ''}
            </div>
            <div id="tab-content"></div>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => supabase.auth.signOut());

    // Переключение вкладок
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            if (tab === 'events') renderEventsTab();
            else if (tab === 'availability') renderAvailabilityTab();
            else if (tab === 'admin') renderAdminTab();
        });
    });

    // Показываем первую вкладку
    renderEventsTab();
}

// ======================= ВКЛАДКА СОБЫТИЙ =======================
async function renderEventsTab() {
    const container = document.getElementById('tab-content');
    container.innerHTML = '<p>Загрузка...</p>';

    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

    if (error) {
        container.innerHTML = '<p>Ошибка загрузки событий</p>';
        return;
    }

    if (!events.length) {
        container.innerHTML = '<p>Пока нет запланированных репетиций</p>';
        return;
    }

    let html = '<h3>Ближайшие репетиции</h3><ul>';
    events.forEach(ev => {
        const start = new Date(ev.start_time).toLocaleString();
        const end = new Date(ev.end_time).toLocaleString();
        html += `<li><strong>${ev.title}</strong><br>${start} – ${end}<br>${ev.description || ''}</li>`;
    });
    html += '</ul>';
    container.innerHTML = html;
}

// ======================= ВКЛАДКА ДОСТУПНОСТИ =======================
async function renderAvailabilityTab() {
    const container = document.getElementById('tab-content');
    container.innerHTML = '<p>Загрузка вашего расписания...</p>';

    // Загружаем существующие слоты
    const { data: slots, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', currentUser.id);

    if (error) {
        container.innerHTML = '<p>Ошибка загрузки</p>';
        return;
    }

    // Группируем по дням
    const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    const slotsByDay = Array(7).fill().map(() => []);
    slots.forEach(slot => {
        slotsByDay[slot.day_of_week].push(slot);
    });

    let html = `<h3>Ваше свободное время (повторяется еженедельно)</h3>
                <div class="days-grid">`;

    for (let i = 0; i < days.length; i++) {
        html += `
            <div class="day-card" data-day="${i}">
                <div class="day-title">${days[i]}</div>
                <div class="time-slots" id="day-${i}-slots"></div>
                <div class="add-slot">
                    <button class="add-slot-btn" data-day="${i}">+ Добавить интервал</button>
                </div>
            </div>
        `;
    }
    html += `</div>`;
    container.innerHTML = html;

    // Заполняем слоты
    for (let i = 0; i < days.length; i++) {
        const slotsContainer = document.getElementById(`day-${i}-slots`);
        slotsContainer.innerHTML = '';
        slotsByDay[i].forEach(slot => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'time-slot';
            slotDiv.innerHTML = `
                <span>${slot.start_time.substring(0,5)} – ${slot.end_time.substring(0,5)}</span>
                <button class="remove-slot" data-id="${slot.id}">✖</button>
            `;
            slotsContainer.appendChild(slotDiv);
        });
    }

    // Обработчики добавления/удаления
    document.querySelectorAll('.add-slot-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const day = parseInt(btn.dataset.day);
            const start = prompt('Время начала (ЧЧ:ММ)', '18:00');
            if (!start) return;
            const end = prompt('Время окончания (ЧЧ:ММ)', '20:00');
            if (!end) return;

            const { error } = await supabase.from('availability').insert({
                user_id: currentUser.id,
                day_of_week: day,
                start_time: start,
                end_time: end
            });
            if (error) alert('Ошибка: ' + error.message);
            else renderAvailabilityTab(); // обновляем
        });
    });

    document.querySelectorAll('.remove-slot').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.dataset.id;
            const { error } = await supabase.from('availability').delete().eq('id', id);
            if (error) alert('Ошибка удаления');
            else renderAvailabilityTab();
        });
    });
}

// ======================= АДМИН ПАНЕЛЬ (КАЛЕНДАРЬ) =======================
async function renderAdminTab() {
    const container = document.getElementById('tab-content');
    container.innerHTML = `
        <h3>Календарь репетиций</h3>
        <div id="calendar"></div>
        <div id="availability-check" style="margin-top: 1rem;"></div>
    `;

    // Загружаем события
    const { data: events } = await supabase.from('events').select('*');

    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay'
        },
        selectable: true,
        select: async (info) => {
            // Показываем окно с проверкой доступности
            await showAvailabilityModal(info.start, info.end);
        },
        events: events.map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.start_time,
            end: ev.end_time
        })),
        eventClick: async (info) => {
            if (confirm('Удалить событие?')) {
                await supabase.from('events').delete().eq('id', info.event.id);
                calendar.refetchEvents();
            }
        }
    });
    calendar.render();
}

async function showAvailabilityModal(start, end) {
    // Получаем всех пользователей
    const { data: users } = await supabase.from('profiles').select('id, name');
    // Получаем все доступности
    const { data: allAvailability } = await supabase.from('availability').select('*');

    // Для каждого пользователя определяем свободен ли в выбранное время
    const availabilityMap = {};
    allAvailability.forEach(a => {
        if (!availabilityMap[a.user_id]) availabilityMap[a.user_id] = [];
        availabilityMap[a.user_id].push(a);
    });

    const dateTime = start; // Date объект
    const jsDay = dateTime.getDay(); // 0=вс
    const ourDay = jsDay === 0 ? 6 : jsDay - 1; // преобразуем в нашу нумерацию (0=пн)
    const hours = dateTime.getHours();
    const minutes = dateTime.getMinutes();
    const timeMinutes = hours * 60 + minutes;

    const freeUsers = [];
    const busyUsers = [];

    for (const user of users) {
        const slots = availabilityMap[user.id] || [];
        let isFree = false;
        for (const slot of slots) {
            if (slot.day_of_week !== ourDay) continue;
            const startMinutes = parseInt(slot.start_time.split(':')[0]) * 60 + parseInt(slot.start_time.split(':')[1]);
            const endMinutes = parseInt(slot.end_time.split(':')[0]) * 60 + parseInt(slot.end_time.split(':')[1]);
            if (timeMinutes >= startMinutes && timeMinutes <= endMinutes) {
                isFree = true;
                break;
            }
        }
        if (isFree) freeUsers.push(user.name);
        else busyUsers.push(user.name);
    }

    // Модальное окно с результатами
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h4>Доступность на ${start.toLocaleString()}</h4>
            <h5>Свободны (${freeUsers.length})</h5>
            <ul>${freeUsers.map(n => `<li>${n}</li>`).join('') || '<li>Нет</li>'}</ul>
            <h5>Заняты / не указали (${busyUsers.length})</h5>
            <ul>${busyUsers.map(n => `<li>${n}</li>`).join('') || '<li>Нет</li>'}</ul>
            <form id="create-event-form">
                <input type="text" id="event-title" placeholder="Название репетиции" required>
                <textarea id="event-desc" placeholder="Описание"></textarea>
                <button type="submit">Создать репетицию</button>
                <button type="button" class="danger" id="close-modal">Отмена</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('close-modal').addEventListener('click', () => modal.remove());
    document.getElementById('create-event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('event-title').value;
        const desc = document.getElementById('event-desc').value;
        const { error } = await supabase.from('events').insert({
            title,
            description: desc,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            created_by: currentUser.id
        });
        if (error) alert('Ошибка: ' + error.message);
        else {
            modal.remove();
            renderAdminTab(); // обновим календарь
        }
    });
}