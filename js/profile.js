// Модуль профиля пользователя с календарём
window.Profile = {
    currentWeekStart: null,
    events: [],
    
    async showProfilePage() {
        console.log('👤 Открываем страницу профиля');
        const mainContainer = document.getElementById('main-container');
        if (!mainContainer) return;
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        this.currentWeekStart = new Date(today);
        this.currentWeekStart.setDate(today.getDate() - diffToMonday);
        this.currentWeekStart.setHours(0, 0, 0, 0);
        
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
                <div class="profile-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #a855f7;">Мой календарь</h2>
                    <button class="btn btn-primary" id="editProfileBtn">
                        <i class="fas fa-user-edit"></i> Редактировать профиль
                    </button>
                </div>
                
                <div class="week-navigation" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <button class="btn btn-secondary" id="prevWeekBtn">
                        <i class="fas fa-chevron-left"></i> Предыдущая
                    </button>
                    <h3>${this.formatWeekRange()}</h3>
                    <button class="btn btn-secondary" id="nextWeekBtn">
                        Следующая <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;">
                    ${this.renderWeekDays()}
                </div>
            </div>
        `;
        
        this.bindProfileEvents();
        
        // Применяем мобильную прокрутку, если нужно
        this.applyMobileScroll();
    },
    
    applyMobileScroll() {
        const calendarGrid = document.querySelector('.calendar-grid');
        if (window.innerWidth <= 768 && calendarGrid) {
            calendarGrid.style.display = 'flex';
            calendarGrid.style.overflowX = 'auto';
            calendarGrid.style.gap = '12px';
            calendarGrid.style.paddingBottom = '10px';
            calendarGrid.style.scrollSnapType = 'x mandatory';
            calendarGrid.style.WebkitOverflowScrolling = 'touch';
            
            const days = calendarGrid.querySelectorAll('.calendar-day');
            days.forEach(day => {
                day.style.flex = '0 0 280px';
                day.style.scrollSnapAlign = 'start';
            });
        } else if (calendarGrid) {
            calendarGrid.style.display = 'grid';
            calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
            calendarGrid.style.overflowX = 'visible';
            const days = calendarGrid.querySelectorAll('.calendar-day');
            days.forEach(day => {
                day.style.flex = '';
                day.style.scrollSnapAlign = '';
            });
        }
    },
    
    formatWeekRange() {
        const start = new Date(this.currentWeekStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const formatDate = (date) => {
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        };
        return `${formatDate(start)} — ${formatDate(end)}`;
    },
    
    renderWeekDays() {
        let daysHtml = '';
        const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(this.currentWeekStart);
            currentDate.setDate(this.currentWeekStart.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfMonth = currentDate.getDate();
            const dayOfWeek = weekDays[i];
            
            const dayEvents = this.events.filter(e => e.date === dateStr);
            let eventsHtml = '';
            for (const ev of dayEvents) {
                const statusText = ev.status === 'free' ? '🟢 Свободен' : (ev.status === 'busy' ? '🔴 Занят' : '⚪ Неизвестно');
                eventsHtml += `
                    <div class="event-item" style="background: rgba(139,92,246,0.1); border-radius: 8px; padding: 4px 8px; margin-top: 5px; font-size: 12px;">
                        <div>${ev.start_time} — ${ev.end_time}</div>
                        <div>${statusText}</div>
                        <button class="delete-event-btn" data-event-id="${ev.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 10px;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
            }
            
            daysHtml += `
                <div class="calendar-day" data-date="${dateStr}" style="background: #111118; border-radius: 12px; padding: 12px; min-height: 180px; cursor: pointer; transition: all 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>${dayOfWeek}</strong>
                        <span style="font-size: 18px; font-weight: bold;">${dayOfMonth}</span>
                    </div>
                    <div class="events-list" style="margin-top: 10px;">
                        ${eventsHtml || '<div style="color: #6b7280; font-size: 12px;">Нет событий</div>'}
                    </div>
                    <div style="margin-top: 8px; text-align: center;">
                        <button class="add-event-btn" data-date="${dateStr}" style="background: none; border: none; color: #8b5cf6; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-plus-circle"></i> Добавить
                        </button>
                    </div>
                </div>
            `;
        }
        return daysHtml;
    },
    
    async loadEvents() {
        const supabase = window.initSupabase();
        if (!supabase) return;
        
        const startDate = new Date(this.currentWeekStart);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('user_schedule')
            .select('*')
            .eq('user_id', window.currentProfile.id)
            .gte('date', startStr)
            .lte('date', endStr)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error) {
            console.error('Ошибка загрузки событий:', error);
            return;
        }
        
        this.events = data || [];
    },
    
    async refreshCalendar() {
        await this.loadEvents();
        const container = document.querySelector('.calendar-grid');
        if (container) {
            container.innerHTML = this.renderWeekDays();
            this.attachDayEvents();
            this.applyMobileScroll();
        }
        const weekRangeEl = document.querySelector('.week-navigation h3');
        if (weekRangeEl) weekRangeEl.textContent = this.formatWeekRange();
    },
    
    attachDayEvents() {
        document.querySelectorAll('.calendar-day').forEach(day => {
            const date = day.dataset.date;
            day.addEventListener('click', (e) => {
                if (e.target.closest('.add-event-btn') || e.target.closest('.delete-event-btn')) return;
                this.showEventModal(date);
            });
        });
        
        document.querySelectorAll('.add-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const date = btn.dataset.date;
                this.showEventModal(date);
            });
        });
        
        document.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
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
    
    async showEventModal(date) {
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
    
    bindProfileEvents() {
        const backBtn = document.getElementById('backToDashboardBtn');
        if (backBtn) backBtn.addEventListener('click', () => window.Groups.renderDashboard());
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => window.Auth.logout());
        
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) editProfileBtn.addEventListener('click', () => this.showEditProfileModal());
        
        const prevWeekBtn = document.getElementById('prevWeekBtn');
        if (prevWeekBtn) {
            prevWeekBtn.addEventListener('click', async () => {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
                await this.refreshCalendar();
            });
        }
        
        const nextWeekBtn = document.getElementById('nextWeekBtn');
        if (nextWeekBtn) {
            nextWeekBtn.addEventListener('click', async () => {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
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