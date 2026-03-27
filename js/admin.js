// Модуль администрирования
window.Admin = {
    async render() {
        const container = document.getElementById('tab-content');
        container.innerHTML = `
            <div class="admin-panel">
                <h3>Управление коллективом</h3>
                ${!window.currentGroup ? this.renderCreateGroup() : this.renderGroupManagement()}
            </div>
        `;
        
        if (!window.currentGroup) {
            this.initCreateGroup();
        } else {
            await this.initGroupManagement();
        }
    },
    
    renderCreateGroup() {
        return `
            <div class="create-group">
                <h4>Создать коллектив</h4>
                <p>Вы можете создать свой коллектив, чтобы управлять расписанием и участниками.</p>
                <input type="text" id="group-name" placeholder="Название коллектива">
                <button id="create-group">Создать коллектив</button>
            </div>
        `;
    },
    
    renderGroupManagement() {
        return `
            <div class="group-management">
                <h4>Коллектив: ${this.escapeHtml(window.currentGroup.name)}</h4>
                <div class="invite-section">
                    <strong>Код приглашения:</strong>
                    <div class="code-display">${window.currentGroup.invite_code}</div>
                    <button id="copy-invite">Скопировать</button>
                    <button id="generate-new-code" class="small">Сгенерировать новый код</button>
                </div>
                
                <h4>Участники коллектива</h4>
                <div id="members-list">Загрузка...</div>
                
                <h4>Добавить участника по коду</h4>
                <input type="text" id="add-member-code" placeholder="Введите уникальный код участника">
                <button id="add-member">Добавить</button>
                
                <h4>📊 Свободное время участников</h4>
                <div id="availability-table">Загрузка...</div>
                
                <h4>📅 Календарь репетиций</h4>
                <div id="calendar"></div>
            </div>
        `;
    },
    
    initCreateGroup() {
        const createBtn = document.getElementById('create-group');
        if (createBtn) {
            createBtn.addEventListener('click', async () => {
                const supabase = window.initSupabase();
                const groupName = document.getElementById('group-name').value;
                if (!groupName) {
                    alert('Введите название коллектива');
                    return;
                }
                
                const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                
                const { data: group, error } = await supabase
                    .from('groups')
                    .insert({
                        name: groupName,
                        invite_code: inviteCode,
                        created_by: window.currentUser.id
                    })
                    .select()
                    .single();
                
                if (error) {
                    alert('Ошибка создания группы: ' + error.message);
                    return;
                }
                
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ group_id: group.id })
                    .eq('id', window.currentUser.id);
                
                if (updateError) {
                    alert('Группа создана, но не удалось добавить вас в неё');
                } else {
                    alert('Коллектив успешно создан!');
                    await window.Profile.loadAndRender();
                }
            });
        }
    },
    
    async initGroupManagement() {
        const supabase = window.initSupabase();
        
        // Загружаем участников
        const { data: members } = await supabase
            .from('profiles')
            .select('id, full_name, unique_code, email')
            .eq('group_id', window.currentGroup.id);
        
        const membersList = document.getElementById('members-list');
        if (members && members.length > 0) {
            membersList.innerHTML = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%;">
                        <thead>
                            <tr>
                                <th>Имя</th>
                                <th>Код</th>
                                <th>Email</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${members.map(m => `
                                <tr>
                                    <td>${this.escapeHtml(m.full_name || m.email)}</td>
                                    <td><code>${m.unique_code}</code></td>
                                    <td>${this.escapeHtml(m.email)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            membersList.innerHTML = '<p>Пока нет участников</p>';
        }
        
        // Загружаем и отображаем таблицу свободного времени
         if (members && members.length > 0) {
        await this.renderAvailabilityTable(members);
    } else {
        document.getElementById('availability-table').innerHTML = '<p>Нет участников для отображения</p>';
    }
        
        // Копирование кода
        document.getElementById('copy-invite')?.addEventListener('click', () => {
            navigator.clipboard.writeText(window.currentGroup.invite_code);
            alert('Код приглашения скопирован!');
        });
        
        // Генерация нового кода
        document.getElementById('generate-new-code')?.addEventListener('click', async () => {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error } = await supabase
                .from('groups')
                .update({ invite_code: newCode })
                .eq('id', window.currentGroup.id);
            
            if (error) {
                alert('Ошибка: ' + error.message);
            } else {
                alert('Новый код создан!');
                await window.Profile.loadAndRender();
            }
        });
        
        // Добавление участника
        document.getElementById('add-member')?.addEventListener('click', async () => {
            const memberCode = document.getElementById('add-member-code').value.toUpperCase();
            if (!memberCode) {
                alert('Введите код участника');
                return;
            }
            
            const { data: user, error } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('unique_code', memberCode)
                .single();
            
            if (error || !user) {
                alert('Пользователь с таким кодом не найден');
                return;
            }
            
            if (user.id === window.currentUser.id) {
                alert('Это вы сами!');
                return;
            }
            
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ group_id: window.currentGroup.id })
                .eq('id', user.id);
            
            if (updateError) {
                alert('Ошибка: ' + updateError.message);
            } else {
                alert(`Участник добавлен в коллектив!`);
                await this.render();
            }
        });
        
        // Календарь
        this.initCalendar();
    },
    
    async renderAvailabilityTable(members) {
    const supabase = window.initSupabase();
    const container = document.getElementById('availability-table');
    
    if (!members || members.length === 0) {
        container.innerHTML = '<p>Нет участников для отображения</p>';
        return;
    }
    
    // Получаем текущую неделю
    const { startOfWeek, endOfWeek } = this.getCurrentWeekRange();
    const weekDates = this.getWeekDates(startOfWeek);
    
    // Загружаем доступность на текущую неделю для всех участников
    const { data: allAvailability } = await supabase
        .from('availability')
        .select('*')
        .in('user_id', members.map(m => m.id))
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0]);
    
    // Группируем доступность по пользователям и датам
    const availabilityMap = {};
    allAvailability?.forEach(a => {
        if (!availabilityMap[a.user_id]) availabilityMap[a.user_id] = {};
        const dateStr = a.date;
        if (!availabilityMap[a.user_id][dateStr]) availabilityMap[a.user_id][dateStr] = [];
        availabilityMap[a.user_id][dateStr].push(a);
    });
    
    // Дни недели с датами
    const daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    
    // Создаем HTML таблицы
    let html = `
        <div class="week-selector">
            <button class="prev-week-table" id="prev-week-table">← Предыдущая неделя</button>
            <span class="week-range-table">${this.formatDateRange(startOfWeek, endOfWeek)}</span>
            <button class="next-week-table" id="next-week-table">Следующая неделя →</button>
        </div>
        <div style="overflow-x: auto;">
            <table class="availability-schedule">
                <thead>
                    <tr>
                        <th>Участник</th>
                        ${daysOfWeek.map((day, index) => `<th>${day}<br><small>${this.formatDate(weekDates[index])}</small></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const member of members) {
        const userAvailability = availabilityMap[member.id] || {};
        html += `<tr>`;
        html += `<td class="user-info-cell">
                    <strong>${this.escapeHtml(member.full_name || member.email)}</strong>
                    <br><small>код: ${member.unique_code}</small>
                </td>`;
        
        for (let i = 0; i < daysOfWeek.length; i++) {
            const dateStr = weekDates[i].toISOString().split('T')[0];
            const daySlots = userAvailability[dateStr] || [];
            
            if (daySlots.length > 0) {
                const timesHtml = daySlots.map(slot => 
                    `<div class="time-badge">${slot.start_time.slice(0,5)} - ${slot.end_time.slice(0,5)}</div>`
                ).join('');
                html += `<td class="availability-cell">${timesHtml}</td>`;
            } else {
                html += `<td class="availability-cell empty">—</td>`;
            }
        }
        html += `</tr>`;
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Добавляем обработчики для навигации по неделям
    const prevBtn = document.getElementById('prev-week-table');
    const nextBtn = document.getElementById('next-week-table');
    
    if (prevBtn) {
        prevBtn.removeEventListener('click', this.handleWeekChange);
        prevBtn.addEventListener('click', () => this.handleWeekChange(-1, members));
    }
    
    if (nextBtn) {
        nextBtn.removeEventListener('click', this.handleWeekChange);
        nextBtn.addEventListener('click', () => this.handleWeekChange(1, members));
    }
},

getCurrentWeekRange() {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { startOfWeek, endOfWeek };
},

getWeekDates(startOfWeek) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
    }
    return dates;
},

formatDate(date) {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
},

formatDateRange(start, end) {
    const startStr = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `${startStr} — ${endStr}`;
},

async handleWeekChange(direction, members) {
    // Получаем текущую отображаемую неделю
    const weekRangeElem = document.querySelector('.week-range-table');
    if (!weekRangeElem) return;
    
    // Парсим текущую дату из отображаемого диапазона
    const currentRange = weekRangeElem.textContent;
    const dates = currentRange.split(' — ');
    const currentStartDate = new Date(dates[0].split(' ').reverse().join(' ') + ' 2024');
    
    // Вычисляем новую неделю
    const newStartDate = new Date(currentStartDate);
    newStartDate.setDate(currentStartDate.getDate() + (direction * 7));
    
    // Обновляем таблицу с новой неделей
    await this.renderAvailabilityTableWithWeek(members, newStartDate);
},

async renderAvailabilityTableWithWeek(members, startOfWeek) {
    const supabase = window.initSupabase();
    const container = document.getElementById('availability-table');
    
    if (!members || members.length === 0) {
        container.innerHTML = '<p>Нет участников для отображения</p>';
        return;
    }
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const weekDates = this.getWeekDates(startOfWeek);
    
    // Загружаем доступность на выбранную неделю
    const { data: allAvailability } = await supabase
        .from('availability')
        .select('*')
        .in('user_id', members.map(m => m.id))
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0]);
    
    // Группируем доступность
    const availabilityMap = {};
    allAvailability?.forEach(a => {
        if (!availabilityMap[a.user_id]) availabilityMap[a.user_id] = {};
        const dateStr = a.date;
        if (!availabilityMap[a.user_id][dateStr]) availabilityMap[a.user_id][dateStr] = [];
        availabilityMap[a.user_id][dateStr].push(a);
    });
    
    const daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    
    let html = `
        <div class="week-selector">
            <button class="prev-week-table" id="prev-week-table">← Предыдущая неделя</button>
            <span class="week-range-table">${this.formatDateRange(startOfWeek, endOfWeek)}</span>
            <button class="next-week-table" id="next-week-table">Следующая неделя →</button>
        </div>
        <div style="overflow-x: auto;">
            <table class="availability-schedule">
                <thead>
                    <tr>
                        <th>Участник</th>
                        ${daysOfWeek.map((day, index) => `<th>${day}<br><small>${this.formatDate(weekDates[index])}</small></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const member of members) {
        const userAvailability = availabilityMap[member.id] || {};
        html += `<tr>`;
        html += `<td class="user-info-cell">
                    <strong>${this.escapeHtml(member.full_name || member.email)}</strong>
                    <br><small>код: ${member.unique_code}</small>
                </td>`;
        
        for (let i = 0; i < daysOfWeek.length; i++) {
            const dateStr = weekDates[i].toISOString().split('T')[0];
            const daySlots = userAvailability[dateStr] || [];
            
            if (daySlots.length > 0) {
                const timesHtml = daySlots.map(slot => 
                    `<div class="time-badge">${slot.start_time.slice(0,5)} - ${slot.end_time.slice(0,5)}</div>`
                ).join('');
                html += `<td class="availability-cell">${timesHtml}</td>`;
            } else {
                html += `<td class="availability-cell empty">—</td>`;
            }
        }
        html += `</tr>`;
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Добавляем обработчики для навигации
    const prevBtn = document.getElementById('prev-week-table');
    const nextBtn = document.getElementById('next-week-table');
    
    if (prevBtn) {
        prevBtn.removeEventListener('click', () => {});
        prevBtn.addEventListener('click', () => this.handleWeekChange(-1, members));
    }
    
    if (nextBtn) {
        nextBtn.removeEventListener('click', () => {});
        nextBtn.addEventListener('click', () => this.handleWeekChange(1, members));
    }
},
    
    async initCalendar() {
        const supabase = window.initSupabase();
        
        if (!window.currentGroup) {
            console.log('Нет текущей группы');
            return;
        }
        
        let events = [];
        
        try {
            // Пробуем загрузить события
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('group_id', window.currentGroup.id);
            
            if (error) {
                console.error('Ошибка загрузки событий для календаря:', error);
                
                // Если ошибка рекурсии, пробуем без фильтра
                if (error.code === '42P17') {
                    console.log('Обнаружена рекурсия, загружаем все события');
                    const { data: allEvents } = await supabase
                        .from('events')
                        .select('*');
                    events = allEvents || [];
                } else {
                    events = [];
                }
            } else {
                events = data || [];
            }
        } catch (err) {
            console.error('Ошибка в initCalendar:', err);
            events = [];
        }
        
        const calendarEl = document.getElementById('calendar');
        if (calendarEl && typeof FullCalendar !== 'undefined') {
            // Очищаем календарь, если он уже был создан
            if (calendarEl._calendar) {
                calendarEl._calendar.destroy();
            }
            
            const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'timeGridWeek',
                locale: 'ru',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'timeGridWeek,timeGridDay'
                },
                selectable: true,
                select: async (info) => {
                    await this.showAvailabilityModal(info.start, info.end);
                },
                events: events.map(ev => ({
                    id: ev.id,
                    title: ev.title,
                    start: ev.start_time,
                    end: ev.end_time
                })),
                eventClick: async (info) => {
                    if (confirm('Удалить событие?')) {
                        const { error } = await supabase
                            .from('events')
                            .delete()
                            .eq('id', info.event.id);
                        
                        if (error) {
                            alert('Ошибка удаления: ' + error.message);
                        } else {
                            info.event.remove();
                            alert('Событие удалено');
                        }
                    }
                }
            });
            
            calendar.render();
            calendarEl._calendar = calendar;
        }
    },
    
    async showAvailabilityModal(start, end) {
    const supabase = window.initSupabase();
    
    if (!window.currentGroup) {
        alert('Вы не состоите в коллективе');
        return;
    }
    
    // Блокируем возможность повторного открытия
    if (this.isModalOpen) {
        return;
    }
    this.isModalOpen = true;
    
    try {
        const { data: users } = await supabase
            .from('profiles')
            .select('id, full_name, name, unique_code')
            .eq('group_id', window.currentGroup.id);
            
        const { data: allAvailability } = await supabase
            .from('availability')
            .select('*')
            .in('user_id', users.map(u => u.id));
    
        const availabilityMap = {};
        allAvailability?.forEach(a => {
            if (!availabilityMap[a.user_id]) availabilityMap[a.user_id] = [];
            availabilityMap[a.user_id].push(a);
        });
    
        const dateTime = start;
        const dateStr = dateTime.toISOString().split('T')[0];
        const timeMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    
        const freeUsers = [];
        const busyUsers = [];
    
        for (const user of users) {
            const slots = availabilityMap[user.id] || [];
            // Фильтруем слоты по конкретной дате
            const daySlots = slots.filter(slot => slot.date === dateStr);
            let isFree = false;
            
            for (const slot of daySlots) {
                const startMinutes = parseInt(slot.start_time.split(':')[0]) * 60 + parseInt(slot.start_time.split(':')[1]);
                const endMinutes = parseInt(slot.end_time.split(':')[0]) * 60 + parseInt(slot.end_time.split(':')[1]);
                if (timeMinutes >= startMinutes && timeMinutes <= endMinutes) {
                    isFree = true;
                    break;
                }
            }
            if (isFree) freeUsers.push(user.full_name || user.name || user.unique_code);
            else busyUsers.push(user.full_name || user.name || user.unique_code);
        }
    
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('id', 'availability-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h4>Доступность на ${start.toLocaleString()}</h4>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="availability-stats">
                        <div class="stat-free">
                            <span class="stat-label">✅ Свободны</span>
                            <span class="stat-count">${freeUsers.length}</span>
                        </div>
                        <div class="stat-busy">
                            <span class="stat-label">❌ Заняты / не указали</span>
                            <span class="stat-count">${busyUsers.length}</span>
                        </div>
                    </div>
                    <h5>Свободны (${freeUsers.length})</h5>
                    <ul class="free-users-list">${freeUsers.map(n => `<li>${this.escapeHtml(n)}</li>`).join('') || '<li>Нет</li>'}</ul>
                    <h5>Заняты / не указали (${busyUsers.length})</h5>
                    <ul class="busy-users-list">${busyUsers.map(n => `<li>${this.escapeHtml(n)}</li>`).join('') || '<li>Нет</li>'}</ul>
                    <form id="create-event-form">
                        <input type="text" id="event-title" placeholder="Название репетиции" required autocomplete="off">
                        <textarea id="event-desc" placeholder="Описание (необязательно)" rows="3"></textarea>
                        <div class="modal-buttons">
                            <button type="button" class="btn-cancel-event">Отмена</button>
                            <button type="submit" class="btn-create-event">Создать репетицию</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
        
        // Добавляем класс для анимации
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Функция закрытия
        const closeModal = () => {
            if (!modal) return;
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal && modal.remove) {
                    modal.remove();
                }
                this.isModalOpen = false;
            }, 300);
        };
        
        // Обработчики закрытия
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = modal.querySelector('.btn-cancel-event');
        
        if (closeBtn) closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
        
        if (cancelBtn) cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
        
        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            }
        });
        
        // Закрытие по Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Обработка формы
        const form = modal.querySelector('#create-event-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const title = document.getElementById('event-title')?.value;
                const desc = document.getElementById('event-desc')?.value;
                
                if (!title) {
                    alert('Введите название репетиции');
                    return;
                }
                
                const createBtn = modal.querySelector('.btn-create-event');
                if (createBtn) {
                    createBtn.disabled = true;
                    createBtn.textContent = 'Создание...';
                }
                
                const eventData = {
                    title: title,
                    description: desc || '',
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    created_by: window.currentUser.id,
                    group_id: window.currentGroup.id
                };
                
                console.log('Создание события:', eventData);
                
                const { error } = await supabase.from('events').insert(eventData);
                
                if (error) {
                    console.error('Ошибка создания события:', error);
                    alert('Ошибка создания репетиции: ' + error.message);
                    if (createBtn) {
                        createBtn.disabled = false;
                        createBtn.textContent = 'Создать репетицию';
                    }
                } else {
                    alert('Репетиция создана!');
                    closeModal();
                    // Обновляем календарь
                    if (window.Admin && window.Admin.initCalendar) {
                        await window.Admin.initCalendar();
                    }
                    // Обновляем страницу событий
                    if (window.Events && window.Events.render) {
                        await window.Events.render();
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Ошибка в showAvailabilityModal:', error);
        alert('Произошла ошибка при загрузке данных');
        this.isModalOpen = false;
    }
},
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};