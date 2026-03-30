// Модуль профиля пользователя с календарём на месяц
window.Profile = {
    currentMonth: null,   // текущий месяц (Date, установлен на 1-е число)
    currentYear: null,
    events: [],           // все события за текущий месяц
    
    // Отображение страницы профиля
    async showProfilePage() {
        console.log('👤 Открываем страницу профиля');
        const mainContainer = document.getElementById('main-container');
        if (!mainContainer) return;
        
        // Устанавливаем текущий месяц
        const today = new Date();
        this.currentMonth = today.getMonth();
        this.currentYear = today.getFullYear();
        
        // Загружаем события за текущий месяц
        await this.loadEvents();
        
        const profile = window.currentProfile;
        if (!profile) {
            Swal.fire('Ошибка', 'Профиль не загружен', 'error');
            return;
        }
        
        window.currentView = 'profile';
        
        const userName = profile.nickname || (profile.last_name + ' ' + profile.first_name);
        const isAdmin = profile.role === 'admin';
        
        mainContainer.innerHTML = `
            <div class="main-header">
                <div class="logo">
                    <h1>💃 Танцевальный менеджер</h1>
                    <p>Управление танцевальными коллективами</p>
                </div>
                <div class="user-info">
                    <span class="user-name">
                        <i class="fas fa-user-circle"></i> ${this.escapeHtml(userName)}
                        ${profile.unique_code ? '<span class="user-code" style="margin-left: 10px;">Код: ' + profile.unique_code + '</span>' : ''}
                        ${isAdmin ? '<span class="user-code" style="margin-left: 10px; background: #ef4444;">👑 Админ</span>' : ''}
                    </span>
                    <button class="btn btn-secondary" id="backToDashboardBtn">
                        <i class="fas fa-arrow-left"></i> Назад к коллективам
                    </button>
                    <button class="logout-btn" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Выйти
                    </button>
                </div>
            </div>
            
            <div class="profile-container">
                <div class="profile-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <h2 style="color: #a855f7;">Мой календарь</h2>
                    <button class="btn btn-primary" id="editProfileBtn">
                        <i class="fas fa-user-edit"></i> Редактировать профиль
                    </button>
                </div>
                
                <div class="month-navigation" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <button class="btn btn-secondary" id="prevMonthBtn">
                        <i class="fas fa-chevron-left"></i> Предыдущий
                    </button>
                    <h3 style="margin: 0;">${this.getMonthName(this.currentMonth)} ${this.currentYear}</h3>
                    <button class="btn btn-secondary" id="nextMonthBtn">
                        Следующий <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="calendar-month-grid">
                    <div class="calendar-weekdays">
                        ${['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => `<div class="weekday">${d}</div>`).join('')}
                    </div>
                    <div class="calendar-days" id="calendarDays">
                        ${this.renderMonthDays()}
                    </div>
                </div>
            </div>
        `;
        
        this.bindProfileEvents();
    },
    
    // Название месяца
    getMonthName(month) {
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        return months[month];
    },
    
    // Рендеринг дней месяца
    renderMonthDays() {
        const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = воскресенье
        // Преобразуем к понедельнику как началу недели
        let offset = (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1);
        
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        
        let daysHtml = '';
        
        // Пустые ячейки предыдущего месяца
        for (let i = 0; i < offset; i++) {
            const prevDate = daysInPrevMonth - offset + i + 1;
            daysHtml += `<div class="calendar-day other-month">${prevDate}</div>`;
        }
        
        // Дни текущего месяца
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = this.events.filter(e => e.date === dateStr);
            
            let eventsHtml = '';
            for (const ev of dayEvents) {
                const statusText = ev.status === 'free' ? '🟢' : (ev.status === 'busy' ? '🔴' : '⚪');
                eventsHtml += `
                    <div class="event-badge" data-event-id="${ev.id}" title="${ev.start_time}—${ev.end_time} ${ev.status === 'free' ? 'Свободен' : (ev.status === 'busy' ? 'Занят' : 'Неизвестно')}">
                        ${statusText} ${ev.start_time}—${ev.end_time}
                        <button class="delete-event-btn" data-event-id="${ev.id}" data-date="${dateStr}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 10px; margin-left: 5px;">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </div>
                `;
            }
            
            daysHtml += `
                <div class="calendar-day current-month" data-date="${dateStr}">
                    <div class="day-number">${d}</div>
                    <div class="day-events">
                        ${eventsHtml || '<div class="no-events">—</div>'}
                    </div>
                    <div class="add-event-btn" data-date="${dateStr}" title="Добавить событие">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                </div>
            `;
        }
        
        // Дополнительные ячейки следующего месяца для заполнения сетки
        const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
        const remaining = totalCells - (offset + daysInMonth);
        for (let i = 1; i <= remaining; i++) {
            daysHtml += `<div class="calendar-day other-month">${i}</div>`;
        }
        
        return daysHtml;
    },
    
    // Загрузка событий за текущий месяц
    async loadEvents() {
        const supabase = window.initSupabase();
        if (!supabase) return;
        
        const startDate = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const endDate = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${lastDay}`;
        
        const { data, error } = await supabase
            .from('user_schedule')
            .select('*')
            .eq('user_id', window.currentProfile.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error) {
            console.error('Ошибка загрузки событий:', error);
            return;
        }
        
        this.events = data || [];
    },
    
    // Перерисовать календарь
    async refreshCalendar() {
        await this.loadEvents();
        const daysContainer = document.getElementById('calendarDays');
        if (daysContainer) {
            daysContainer.innerHTML = this.renderMonthDays();
            this.attachDayEvents();
        }
        const monthHeader = document.querySelector('.month-navigation h3');
        if (monthHeader) monthHeader.textContent = `${this.getMonthName(this.currentMonth)} ${this.currentYear}`;
    },
    
    // Привязка событий к дням (после перерисовки)
    attachDayEvents() {
        // Клик по дню (не по кнопке)
        document.querySelectorAll('.calendar-day.current-month').forEach(day => {
            const date = day.dataset.date;
            day.addEventListener('click', (e) => {
                if (e.target.closest('.add-event-btn') || e.target.closest('.delete-event-btn')) return;
                this.showEventModal(date);
            });
        });
        
        // Кнопки добавления события
        document.querySelectorAll('.add-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const date = btn.dataset.date;
                this.showEventModal(date);
            });
        });
        
        // Кнопки удаления события
        document.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                const date = btn.dataset.date;
                const result = await Swal.fire({
                    title: 'Удалить событие?',
                    text: 'Это действие нельзя отменить',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Да, удалить',
                    cancelButtonText: 'Отмена'
                });
                if (result.isConfirmed) {
                    await this.deleteEvent(eventId);
                    await this.refreshCalendar();
                }
            });
        });
    },
    
    // Показать модалку добавления события
    async showEventModal(date) {
        // Загружаем существующие события на эту дату
        const dayEvents = this.events.filter(e => e.date === date);
        const supabase = window.initSupabase();
        
        Swal.fire({
            title: `Событие на ${new Date(date).toLocaleDateString('ru-RU')}`,
            html: `
                <div style="text-align: left;">
                    <div class="form-group">
                        <label>Начало</label>
                        <input type="time" id="event-start" step="60" value="09:00">
                    </div>
                    <div class="form-group">
                        <label>Конец</label>
                        <input type="time" id="event-end" step="60" value="10:00">
                    </div>
                    <div class="form-group">
                        <label>Статус</label>
                        <select id="event-status">
                            <option value="free">🟢 Свободен</option>
                            <option value="busy">🔴 Занят</option>
                            <option value="unknown">⚪ Неизвестно</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Сохранить',
            cancelButtonText: 'Отмена',
            preConfirm: async () => {
                const startTime = document.getElementById('event-start').value;
                const endTime = document.getElementById('event-end').value;
                const status = document.getElementById('event-status').value;
                
                if (!startTime || !endTime) {
                    Swal.showValidationMessage('Укажите время начала и конца');
                    return false;
                }
                if (startTime >= endTime) {
                    Swal.showValidationMessage('Время начала должно быть раньше окончания');
                    return false;
                }
                
                // Проверяем пересечения
                const overlapping = dayEvents.some(ev => {
                    return (startTime < ev.end_time && endTime > ev.start_time);
                });
                if (overlapping) {
                    Swal.showValidationMessage('Это время пересекается с существующим событием');
                    return false;
                }
                
                const { data, error } = await supabase
                    .from('user_schedule')
                    .insert([{
                        user_id: window.currentProfile.id,
                        date: date,
                        start_time: startTime,
                        end_time: endTime,
                        status: status
                    }])
                    .select();
                
                if (error) {
                    Swal.showValidationMessage('Ошибка: ' + error.message);
                    return false;
                }
                return data[0];
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                await this.refreshCalendar();
                Swal.fire('Успех!', 'Событие добавлено', 'success');
            }
        });
    },
    
    // Удаление события
    async deleteEvent(eventId) {
        const supabase = window.initSupabase();
        if (!supabase) return;
        
        const { error } = await supabase
            .from('user_schedule')
            .delete()
            .eq('id', eventId);
        
        if (error) {
            console.error('Ошибка удаления:', error);
            Swal.fire('Ошибка', 'Не удалось удалить событие', 'error');
        }
    },
    
    // Показать модалку редактирования профиля
    showEditProfileModal() {
        const profile = window.currentProfile;
        Swal.fire({
            title: 'Редактировать профиль',
            html: `
                <div class="form-group">
                    <label>Фамилия *</label>
                    <input type="text" id="edit-lastname" class="swal2-input" value="${this.escapeHtml(profile.last_name)}">
                </div>
                <div class="form-group">
                    <label>Имя *</label>
                    <input type="text" id="edit-firstname" class="swal2-input" value="${this.escapeHtml(profile.first_name)}">
                </div>
                <div class="form-group">
                    <label>Отчество</label>
                    <input type="text" id="edit-patronymic" class="swal2-input" value="${this.escapeHtml(profile.patronymic || '')}">
                </div>
                <div class="form-group">
                    <label>Никнейм (будет отображаться вместо имени)</label>
                    <input type="text" id="edit-nickname" class="swal2-input" value="${this.escapeHtml(profile.nickname || '')}">
                </div>
                <div class="form-group">
                    <label>Дата рождения *</label>
                    <input type="date" id="edit-birthdate" class="swal2-input" value="${profile.birth_date || ''}">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Сохранить',
            cancelButtonText: 'Отмена',
            preConfirm: async () => {
                const lastName = document.getElementById('edit-lastname').value.trim();
                const firstName = document.getElementById('edit-firstname').value.trim();
                const patronymic = document.getElementById('edit-patronymic').value.trim() || null;
                const nickname = document.getElementById('edit-nickname').value.trim() || null;
                const birthDate = document.getElementById('edit-birthdate').value;
                
                if (!lastName || !firstName || !birthDate) {
                    Swal.showValidationMessage('Заполните все обязательные поля');
                    return false;
                }
                
                const birthYear = new Date(birthDate).getFullYear();
                const currentYear = new Date().getFullYear();
                if (currentYear - birthYear < 5) {
                    Swal.showValidationMessage('Возраст должен быть не менее 5 лет');
                    return false;
                }
                
                const success = await window.Users.updateUser(profile.id, {
                    last_name: lastName,
                    first_name: firstName,
                    patronymic: patronymic,
                    nickname: nickname,
                    birth_date: birthDate
                });
                
                if (success) {
                    window.currentProfile = { ...window.currentProfile, last_name: lastName, first_name: firstName, patronymic: patronymic, nickname: nickname, birth_date: birthDate };
                }
                return success;
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                await this.showProfilePage();
                Swal.fire('Успех!', 'Профиль обновлён', 'success');
            }
        });
    },
    
    // Привязка событий на странице
    bindProfileEvents() {
        const backBtn = document.getElementById('backToDashboardBtn');
        if (backBtn) backBtn.addEventListener('click', () => window.Groups.renderDashboard());
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => window.Auth.logout());
        
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) editProfileBtn.addEventListener('click', () => this.showEditProfileModal());
        
        const prevMonthBtn = document.getElementById('prevMonthBtn');
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', async () => {
                if (this.currentMonth === 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                } else {
                    this.currentMonth--;
                }
                await this.refreshCalendar();
            });
        }
        
        const nextMonthBtn = document.getElementById('nextMonthBtn');
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', async () => {
                if (this.currentMonth === 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                } else {
                    this.currentMonth++;
                }
                await this.refreshCalendar();
            });
        }
        
        this.attachDayEvents();
    },
    
    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
};