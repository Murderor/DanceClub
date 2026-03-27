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
        await this.renderAvailabilityTable(members);
        
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
        
        // Загружаем все данные о доступности
        const { data: allAvailability } = await supabase
            .from('availability')
            .select('*')
            .in('user_id', members.map(m => m.id));
        
        // Группируем доступность по пользователям
        const availabilityMap = {};
        allAvailability?.forEach(a => {
            if (!availabilityMap[a.user_id]) availabilityMap[a.user_id] = [];
            availabilityMap[a.user_id].push(a);
        });
        
        // Дни недели
        const daysOfWeek = [
            'Понедельник', 'Вторник', 'Среда', 
            'Четверг', 'Пятница', 'Суббота', 'Воскресенье'
        ];
        
        // Создаем HTML таблицы
        let html = `
            <div style="overflow-x: auto;">
                <table class="availability-schedule">
                    <thead>
                        <tr>
                            <th>Участник</th>
                            ${daysOfWeek.map(day => `<th>${day}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const member of members) {
            const slots = availabilityMap[member.id] || [];
            html += `<tr>`;
            html += `<td><strong>${this.escapeHtml(member.full_name || member.email)}</strong><br><small>код: ${member.unique_code}</small></td>`;
            
            for (let i = 0; i < daysOfWeek.length; i++) {
                const daySlots = slots.filter(slot => slot.day_of_week === i);
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
        const jsDay = dateTime.getDay();
        const ourDay = jsDay === 0 ? 6 : jsDay - 1;
        const timeMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();
    
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
            if (isFree) freeUsers.push(user.full_name || user.name || user.unique_code);
            else busyUsers.push(user.full_name || user.name || user.unique_code);
        }
    
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h4>Доступность на ${start.toLocaleString()}</h4>
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
                <ul>${freeUsers.map(n => `<li>${this.escapeHtml(n)}</li>`).join('') || '<li>Нет</li>'}</ul>
                <h5>Заняты / не указали (${busyUsers.length})</h5>
                <ul>${busyUsers.map(n => `<li>${this.escapeHtml(n)}</li>`).join('') || '<li>Нет</li>'}</ul>
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
            
            if (!title) {
                alert('Введите название репетиции');
                return;
            }
            
            const eventData = {
                title: title,
                description: desc,
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
            } else {
                alert('Репетиция создана!');
                modal.remove();
                await this.render();
            }
        });
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};