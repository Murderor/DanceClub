// Модуль управления коллективами
window.Groups = {
    allGroups: [],
    userGroups: [],
    currentGroupMembers: new Map(),
    
    // Загрузка коллективов пользователя
    async loadUserGroups() {
        console.log('📚 Загружаем коллективы пользователя...');
        const supabase = window.initSupabase();
        
        if (!supabase) return [];
        
        try {
            const { data: memberships, error: membershipError } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', window.currentProfile.id);
            
            if (membershipError) throw membershipError;
            
            if (!memberships || memberships.length === 0) {
                console.log('ℹ️ Пользователь не состоит ни в одном коллективе');
                this.userGroups = [];
                return [];
            }
            
            const groupIds = memberships.map(m => m.group_id);
            
            const { data: groups, error: groupsError } = await supabase
                .from('dance_groups')
                .select('*')
                .in('id', groupIds)
                .order('name');
            
            if (groupsError) throw groupsError;
            
            console.log(`✅ Загружено ${groups?.length || 0} коллективов пользователя`);
            this.userGroups = groups || [];
            return this.userGroups;
        } catch (err) {
            console.error('❌ Ошибка загрузки коллективов пользователя:', err);
            return [];
        }
    },
    
    // Загрузка участников коллектива
    async loadGroupMembers(groupId) {
        console.log(`👥 Загружаем участников коллектива ${groupId}`);
        const supabase = window.initSupabase();
        
        if (!supabase) return [];
        
        try {
            const { data: memberships, error: membershipError } = await supabase
                .from('group_members')
                .select('user_id, role, joined_at')
                .eq('group_id', groupId);
            
            if (membershipError) throw membershipError;
            
            if (!memberships || memberships.length === 0) {
                this.currentGroupMembers.set(groupId, []);
                return [];
            }
            
            const userIds = memberships.map(m => m.user_id);
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, last_name, first_name, patronymic, unique_code, email, nickname, birth_date, role')
                .in('id', userIds);
            
            if (usersError) throw usersError;
            
            const members = memberships.map(membership => {
                const user = users.find(u => u.id === membership.user_id);
                return {
                    ...user,
                    groupRole: membership.role,
                    joined_at: membership.joined_at
                };
            });
            
            this.currentGroupMembers.set(groupId, members);
            return members;
        } catch (err) {
            console.error('❌ Ошибка загрузки участников:', err);
            return [];
        }
    },
    
    // Создание нового коллектива
    async createGroup(groupData) {
        console.log('➕ Создаем новый коллектив:', groupData);
        const supabase = window.initSupabase();
        
        if (!supabase) return null;
        
        try {
            const leaderName = window.currentProfile.last_name + ' ' + window.currentProfile.first_name;
            
            const { data, error } = await supabase
                .from('dance_groups')
                .insert([{
                    name: groupData.name,
                    leader_id: window.currentProfile.id,
                    leader_name: leaderName,
                    description: groupData.description || null
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            await this.addMemberToGroup(data.id, window.currentProfile.id, 'leader');
            await this.loadUserGroups();
            console.log('✅ Коллектив создан:', data);
            return data;
        } catch (err) {
            console.error('❌ Ошибка создания коллектива:', err);
            throw err;
        }
    },
    
    // Обновление коллектива
    async updateGroup(groupId, updatedData) {
        console.log('✏️ Обновляем коллектив:', groupId, updatedData);
        const supabase = window.initSupabase();
        
        if (!supabase) return null;
        
        try {
            const { data, error } = await supabase
                .from('dance_groups')
                .update(updatedData)
                .eq('id', groupId)
                .select()
                .single();
            
            if (error) throw error;
            
            await this.loadUserGroups();
            console.log('✅ Коллектив обновлен:', data);
            return data;
        } catch (err) {
            console.error('❌ Ошибка обновления коллектива:', err);
            throw err;
        }
    },
    
    // Удаление коллектива
    async deleteGroup(groupId) {
        console.log('🗑️ Удаляем коллектив:', groupId);
        const supabase = window.initSupabase();
        
        if (!supabase) return false;
        
        try {
            const { error } = await supabase
                .from('dance_groups')
                .delete()
                .eq('id', groupId);
            
            if (error) throw error;
            
            await this.loadUserGroups();
            console.log('✅ Коллектив удален');
            return true;
        } catch (err) {
            console.error('❌ Ошибка удаления коллектива:', err);
            throw err;
        }
    },
    
    // Добавление участника в коллектив
    async addMemberToGroup(groupId, userId, role = 'member') {
        console.log(`➕ Добавляем участника ${userId} в коллектив ${groupId}`);
        const supabase = window.initSupabase();
        
        if (!supabase) return false;
        
        try {
            const { error } = await supabase
                .from('group_members')
                .insert([{
                    group_id: groupId,
                    user_id: userId,
                    role: role
                }]);
            
            if (error) throw error;
            
            this.currentGroupMembers.delete(groupId);
            
            if (userId === window.currentProfile.id) {
                await this.loadUserGroups();
            }
            
            console.log('✅ Участник добавлен');
            return true;
        } catch (err) {
            console.error('❌ Ошибка добавления участника:', err);
            throw err;
        }
    },
    
    // Удаление участника из коллектива
    async removeMemberFromGroup(groupId, userId) {
        console.log(`➖ Удаляем участника ${userId} из коллектива ${groupId}`);
        const supabase = window.initSupabase();
        
        if (!supabase) return false;
        
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);
            
            if (error) throw error;
            
            this.currentGroupMembers.delete(groupId);
            
            if (userId === window.currentProfile.id) {
                await this.loadUserGroups();
            }
            
            console.log('✅ Участник удален');
            return true;
        } catch (err) {
            console.error('❌ Ошибка удаления участника:', err);
            throw err;
        }
    },
    
    // Проверить, является ли пользователь лидером коллектива
    isGroupLeader(groupId) {
        const group = this.userGroups.find(g => g.id === groupId);
        return group?.leader_id === window.currentProfile?.id;
    },
    
    // ========== РЕПЕТИЦИИ ==========
    
    // Загрузить репетиции коллектива
    async loadRehearsals(groupId) {
        const supabase = window.initSupabase();
        if (!supabase) return [];
        
        const { data, error } = await supabase
            .from('rehearsals')
            .select('*')
            .eq('group_id', groupId)
            .order('scheduled_date', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error) {
            console.error('Ошибка загрузки репетиций:', error);
            return [];
        }
        return data || [];
    },
    
    // Создать репетицию
    async createRehearsal(groupId, date, startTime, endTime, location = '', notes = '') {
        const supabase = window.initSupabase();
        if (!supabase) return null;
        
        const { data, error } = await supabase
            .from('rehearsals')
            .insert([{
                group_id: groupId,
                scheduled_date: date,
                start_time: startTime,
                end_time: endTime,
                location: location || null,
                notes: notes || null,
                created_by: window.currentProfile.id
            }])
            .select()
            .single();
        
        if (error) {
            console.error('Ошибка создания репетиции:', error);
            throw error;
        }
        
        // Отправка уведомлений в Telegram через Edge Function
        if (window.Telegram && typeof window.Telegram.notifyGroupMembers === 'function') {
            window.Telegram.notifyGroupMembers(groupId, data).catch(err => {
                console.warn('⚠️ Не удалось отправить уведомления в Telegram:', err);
            });
        }
        
        return data;
    },
    
    // Удалить репетицию
    async deleteRehearsal(rehearsalId, groupId) {
        const supabase = window.initSupabase();
        if (!supabase) return false;
        
        const result = await Swal.fire({
            title: 'Удалить репетицию?',
            text: 'Это действие нельзя отменить',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Да, удалить',
            cancelButtonText: 'Отмена'
        });
        
        if (!result.isConfirmed) return false;
        
        try {
            const { error } = await supabase
                .from('rehearsals')
                .delete()
                .eq('id', rehearsalId);
            
            if (error) throw error;
            
            Swal.fire('Успех!', 'Репетиция удалена', 'success');
            this.viewGroup(groupId);
            return true;
        } catch (err) {
            console.error('Ошибка удаления репетиции:', err);
            Swal.fire('Ошибка', err.message, 'error');
            return false;
        }
    },
    
    // Получить статус занятости участника на конкретный интервал (с учётом времени)
    async getMemberStatusOnDate(userId, date, startTime, endTime) {
        const supabase = window.initSupabase();
        if (!supabase) return 'unknown';
        
        const { data, error } = await supabase
            .from('user_schedule')
            .select('status, start_time, end_time')
            .eq('user_id', userId)
            .eq('date', date);
        
        if (error) {
            console.error('Ошибка получения статуса:', error);
            return 'unknown';
        }
        
        if (!data || data.length === 0) return 'unknown';
        
        for (const event of data) {
            const eventStart = event.start_time;
            const eventEnd = event.end_time;
            
            if (eventStart < endTime && eventEnd > startTime) {
                if (event.status === 'busy') return 'busy';
                if (event.status === 'free') return 'free';
            }
        }
        
        return 'unknown';
    },
    
    // Получить сводку по участникам на конкретную дату и время
    async getMemberStatusSummary(groupId, date, startTime, endTime) {
        const members = await this.loadGroupMembers(groupId);
        const summary = [];
        
        for (const member of members) {
            const status = await this.getMemberStatusOnDate(member.id, date, startTime, endTime);
            const displayName = member.nickname || `${member.last_name} ${member.first_name}`;
            let statusText = '', statusIcon = '';
            
            switch(status) {
                case 'free': 
                    statusText = 'Свободен'; 
                    statusIcon = '🟢'; 
                    break;
                case 'busy': 
                    statusText = 'Занят'; 
                    statusIcon = '🔴'; 
                    break;
                default: 
                    statusText = 'Неизвестно'; 
                    statusIcon = '⚪';
            }
            
            summary.push({ name: displayName, statusText, statusIcon });
        }
        
        return summary;
    },
    
    // Показать список репетиций в модалке (с возможностью удаления для лидера)
    async showRehearsalsList(groupId) {
        const rehearsals = await this.loadRehearsals(groupId);
        const isLeader = this.isGroupLeader(groupId);
        
        if (!rehearsals.length) {
            Swal.fire('Репетиции', 'Пока нет запланированных репетиций', 'info');
            return;
        }
        
        const now = new Date();
        now.setHours(0,0,0,0);
        const futureRehearsals = rehearsals.filter(r => new Date(r.scheduled_date) >= now);
        
        if (futureRehearsals.length === 0) {
            Swal.fire('Репетиции', 'Нет ближайших репетиций', 'info');
            return;
        }
        
        const listHtml = futureRehearsals.map(r => `
            <div style="border-bottom:1px solid #333; padding:10px 0; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <strong>${new Date(r.scheduled_date).toLocaleDateString('ru-RU')}</strong> ${r.start_time}—${r.end_time}<br>
                    ${r.location ? `📍 ${this.escapeHtml(r.location)}<br>` : ''}
                    ${r.notes ? `📝 ${this.escapeHtml(r.notes)}` : ''}
                </div>
                ${isLeader ? `
                    <button class="delete-rehearsal-btn" data-id="${r.id}" data-group="${groupId}" style="background: #ef4444; color: white; border: none; border-radius: 8px; padding: 5px 10px; cursor: pointer; margin-left: 10px;">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                ` : ''}
            </div>
        `).join('');
        
        Swal.fire({
            title: isLeader ? 'Управление репетициями' : 'Ближайшие репетиции',
            html: `<div style="text-align:left;">${listHtml}</div>`,
            icon: 'info',
            confirmButtonText: 'Закрыть',
            didOpen: () => {
                if (isLeader) {
                    document.querySelectorAll('.delete-rehearsal-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const rehearsalId = btn.dataset.id;
                            const groupIdParam = btn.dataset.group;
                            await this.deleteRehearsal(rehearsalId, groupIdParam);
                            Swal.close();
                            this.showRehearsalsList(groupIdParam);
                        });
                    });
                }
            }
        });
    },
    
    // Показать календарь для выбора даты и времени репетиции (для лидера)
    async showScheduleRehearsalWithCalendar(groupId) {
        const members = await this.loadGroupMembers(groupId);
        if (!members.length) {
            Swal.fire('Ошибка', 'В коллективе нет участников, нельзя назначить репетицию', 'warning');
            return;
        }
        
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth();
        let selectedDate = null;
        let selectedStart = '18:00';
        let selectedEnd = '20:00';
        
        let busyDaysCache = new Set();
        
        const loadBusyDaysForMonth = async (year, month) => {
            const supabase = window.initSupabase();
            if (!supabase) return new Set();
            
            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month + 1, 0).getDate();
            const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
            
            const memberIds = members.map(m => m.id);
            
            const { data, error } = await supabase
                .from('user_schedule')
                .select('date')
                .in('user_id', memberIds)
                .eq('status', 'busy')
                .gte('date', startDate)
                .lte('date', endDate);
            
            if (error) {
                console.error('Ошибка загрузки занятых дней:', error);
                return new Set();
            }
            
            const busyDays = new Set();
            if (data) {
                data.forEach(record => {
                    const day = parseInt(record.date.split('-')[2]);
                    busyDays.add(day);
                });
            }
            
            return busyDays;
        };
        
        const renderCalendar = (busyDays) => {
            const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
            const startWeekday = firstDayOfMonth.getDay();
            let offset = (startWeekday === 0 ? 6 : startWeekday - 1);
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
            
            let calendarHtml = '<div class="calendar-weekdays" style="display:grid; grid-template-columns:repeat(7,1fr); text-align:center; margin-bottom:10px;">';
            calendarHtml += ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(d => `<div class="weekday">${d}</div>`).join('');
            calendarHtml += '</div><div class="calendar-days" style="display:grid; grid-template-columns:repeat(7,1fr); gap:5px;">';
            
            for (let i = 0; i < offset; i++) {
                calendarHtml += `<div class="calendar-day other-month" style="opacity:0.4; padding:8px; text-align:center;">${daysInPrevMonth - offset + i + 1}</div>`;
            }
            
            for (let d = 1; d <= daysInMonth; d++) {
                const isBusyDay = busyDays.has(d);
                const isToday = (currentYear === new Date().getFullYear() && currentMonth === new Date().getMonth() && d === new Date().getDate());
                calendarHtml += `
                    <div class="calendar-day current-month ${isBusyDay ? 'busy-day' : ''} ${isToday ? 'today' : ''}" data-date="${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}" style="padding:8px; text-align:center; cursor:pointer; background:#1a1a24; border-radius:8px; ${isBusyDay ? 'background:#3b1e1e;' : ''}">
                        ${d}
                        ${isBusyDay ? '<span style="display:block; font-size:10px;">🔴 есть занятые</span>' : ''}
                    </div>
                `;
            }
            
            const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
            const remaining = totalCells - (offset + daysInMonth);
            for (let i = 1; i <= remaining; i++) {
                calendarHtml += `<div class="calendar-day other-month" style="opacity:0.4; padding:8px; text-align:center;">${i}</div>`;
            }
            calendarHtml += '</div>';
            return calendarHtml;
        };
        
        const showModal = async (isMonthChange = false) => {
            if (isMonthChange) {
                Swal.fire({
                    title: 'Загрузка...',
                    html: '<div class="loading-spinner" style="margin:20px auto;"></div><p>Загружаем календарь...</p>',
                    showConfirmButton: false,
                    allowOutsideClick: false
                });
                
                busyDaysCache = await loadBusyDaysForMonth(currentYear, currentMonth);
                Swal.close();
            }
            
            const calendarHtml = renderCalendar(busyDaysCache);
            
            const result = await Swal.fire({
                title: 'Назначить репетицию',
                html: `
                    <div style="text-align:center;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <button id="prevMonthBtn" class="btn btn-secondary" style="padding:5px 10px;"><i class="fas fa-chevron-left"></i></button>
                            <h3 style="margin:0;">${new Date(currentYear, currentMonth).toLocaleString('ru', {month:'long', year:'numeric'})}</h3>
                            <button id="nextMonthBtn" class="btn btn-secondary" style="padding:5px 10px;"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        ${calendarHtml}
                        <hr style="margin:15px 0;">
                        <div class="form-group">
                            <label>Время начала</label>
                            <input type="time" id="reh-start" step="60" value="${selectedStart}" class="swal2-input">
                        </div>
                        <div class="form-group">
                            <label>Время конца</label>
                            <input type="time" id="reh-end" step="60" value="${selectedEnd}" class="swal2-input">
                        </div>
                        <div class="form-group">
                            <label>Место</label>
                            <input type="text" id="reh-location" placeholder="Зал, адрес..." class="swal2-input">
                        </div>
                        <div class="form-group">
                            <label>Заметки</label>
                            <textarea id="reh-notes" rows="2" placeholder="Что нужно подготовить..." class="swal2-textarea"></textarea>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Далее →',
                cancelButtonText: 'Отмена',
                didOpen: () => {
                    document.querySelectorAll('.calendar-day.current-month').forEach(day => {
                        day.addEventListener('click', () => {
                            selectedDate = day.dataset.date;
                            document.querySelectorAll('.calendar-day.current-month').forEach(d => d.style.border = 'none');
                            day.style.border = '2px solid #8b5cf6';
                        });
                    });
                    
                    const prevBtn = document.getElementById('prevMonthBtn');
                    const nextBtn = document.getElementById('nextMonthBtn');
                    
                    if (prevBtn) {
                        prevBtn.addEventListener('click', async () => {
                            if (currentMonth === 0) {
                                currentMonth = 11;
                                currentYear--;
                            } else {
                                currentMonth--;
                            }
                            selectedDate = null;
                            Swal.close();
                            await showModal(true);
                        });
                    }
                    
                    if (nextBtn) {
                        nextBtn.addEventListener('click', async () => {
                            if (currentMonth === 11) {
                                currentMonth = 0;
                                currentYear++;
                            } else {
                                currentMonth++;
                            }
                            selectedDate = null;
                            Swal.close();
                            await showModal(true);
                        });
                    }
                    
                    const saveTimeAndLocation = () => {
                        selectedStart = document.getElementById('reh-start')?.value || selectedStart;
                        selectedEnd = document.getElementById('reh-end')?.value || selectedEnd;
                    };
                    
                    const startInput = document.getElementById('reh-start');
                    const endInput = document.getElementById('reh-end');
                    if (startInput) startInput.addEventListener('change', saveTimeAndLocation);
                    if (endInput) endInput.addEventListener('change', saveTimeAndLocation);
                },
                preConfirm: () => {
                    const start = document.getElementById('reh-start').value;
                    const end = document.getElementById('reh-end').value;
                    if (!selectedDate) {
                        Swal.showValidationMessage('Выберите дату');
                        return false;
                    }
                    if (start >= end) {
                        Swal.showValidationMessage('Время начала должно быть раньше окончания');
                        return false;
                    }
                    return {
                        date: selectedDate,
                        startTime: start,
                        endTime: end,
                        location: document.getElementById('reh-location')?.value || '',
                        notes: document.getElementById('reh-notes')?.value || ''
                    };
                }
            });
            
            if (result.isConfirmed) {
                const { date, startTime, endTime, location, notes } = result.value;
                
                Swal.fire({
                    title: 'Загрузка...',
                    html: '<div class="loading-spinner" style="margin:20px auto;"></div><p>Проверяем статусы участников...</p>',
                    showConfirmButton: false,
                    allowOutsideClick: false
                });
                
                const summary = await this.getMemberStatusSummary(groupId, date, startTime, endTime);
                Swal.close();
                
                const tableHtml = `
                    <table style="width:100%; border-collapse: collapse; margin-top:10px;">
                        <thead><tr><th>Участник</th><th>Статус</th></tr></thead>
                        <tbody>
                            ${summary.map(s => `<tr><td style="padding:8px;">${this.escapeHtml(s.name)}</td><td style="padding:8px;">${s.statusIcon} ${s.statusText}</td>`).join('')}
                        </tbody>
                    </table>
                `;
                
                const confirmResult = await Swal.fire({
                    title: 'Подтверждение репетиции',
                    html: `
                        <p><strong>Дата:</strong> ${new Date(date).toLocaleDateString('ru-RU')}</p>
                        <p><strong>Время:</strong> ${startTime} — ${endTime}</p>
                        ${location ? `<p><strong>Место:</strong> ${this.escapeHtml(location)}</p>` : ''}
                        ${notes ? `<p><strong>Заметки:</strong> ${this.escapeHtml(notes)}</p>` : ''}
                        <p>Статус участников на выбранное время:</p>
                        ${tableHtml}
                    `,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Назначить',
                    cancelButtonText: 'Отмена'
                });
                
                if (confirmResult.isConfirmed) {
                    try {
                        await this.createRehearsal(groupId, date, startTime, endTime, location, notes);
                        Swal.fire('Успех!', 'Репетиция назначена', 'success');
                        this.viewGroup(groupId);
                    } catch (err) {
                        Swal.fire('Ошибка', err.message, 'error');
                    }
                }
            }
        };
        
        Swal.fire({
            title: 'Загрузка...',
            html: '<div class="loading-spinner" style="margin:20px auto;"></div><p>Загружаем календарь...</p>',
            showConfirmButton: false,
            allowOutsideClick: false
        });
        
        busyDaysCache = await loadBusyDaysForMonth(currentYear, currentMonth);
        Swal.close();
        await showModal(false);
    },
    
    // Отображение дашборда
    async renderDashboard() {
        console.log('🎨 Рендерим дашборд');
        const mainContainer = document.getElementById('main-container');
        
        if (!mainContainer) return;
        
        await this.loadUserGroups();
        
        const userName = window.currentProfile ? 
            (window.currentProfile.nickname ? window.currentProfile.nickname : (window.currentProfile.last_name + ' ' + window.currentProfile.first_name)) :
            window.currentUser?.email || 'Пользователь';
        
        const userCode = window.currentProfile?.unique_code || '—';
        const isAdmin = window.currentProfile?.role === 'admin';
        
        const leaderGroupsCount = this.userGroups.filter(g => this.isGroupLeader(g.id)).length;
        const totalGroupsCount = this.userGroups.length;
        
        mainContainer.innerHTML = `
            <div class="main-header">
                <div class="logo">
                    <h1>💃 Танцевальный менеджер</h1>
                    <p>Управление танцевальными коллективами</p>
                </div>
                <div class="user-info">
                    <span class="user-name">
                        <i class="fas fa-user-circle"></i> ${this.escapeHtml(userName)}
                        ${window.currentProfile?.unique_code ? '<span class="user-code" style="margin-left: 10px;">Код: ' + window.currentProfile.unique_code + '</span>' : ''}
                        ${isAdmin ? '<span class="user-code" style="margin-left: 10px; background: #ef4444;"><i class="fas fa-shield-alt"></i> Администрация</span>' : ''}
                    </span>
                    <button class="btn btn-secondary" id="profileBtn" style="background: #8b5cf6;">
                        <i class="fas fa-user"></i> Профиль
                    </button>
                    ${isAdmin ? `
                        <button class="btn btn-secondary" id="manageMembersBtn" style="background: #8b5cf6;">
                            <i class="fas fa-users"></i> Все участники
                        </button>
                    ` : ''}
                    <button class="logout-btn" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Выйти
                    </button>
                </div>
            </div>
            
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalGroupsCount}</h3>
                        <p>Мои коллективы</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${leaderGroupsCount}</h3>
                        <p>Где я лидер</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-qrcode"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.escapeHtml(userCode)}</h3>
                        <p>Ваш код</p>
                    </div>
                </div>
            </div>
            
            <div class="action-bar">
                <button class="btn btn-primary" id="createGroupBtn">
                    <i class="fas fa-plus-circle"></i> Создать коллектив
                </button>
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="searchGroupsInput" placeholder="Поиск по моим коллективам...">
                </div>
                <button class="btn btn-secondary" id="refreshGroupsBtn">
                    <i class="fas fa-sync-alt"></i> Обновить
                </button>
            </div>
            
            <div class="groups-grid" id="groupsGrid">
                ${this.renderGroupsCards()}
            </div>
        `;
        
        this.bindDashboardEvents();
    },
    
    // Рендеринг карточек коллективов
    renderGroupsCards(searchTerm = '') {
        let filteredGroups = this.userGroups;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredGroups = this.userGroups.filter(group => 
                group.name.toLowerCase().includes(term) ||
                group.leader_name.toLowerCase().includes(term) ||
                (group.description && group.description.toLowerCase().includes(term))
            );
        }
        
        if (filteredGroups.length === 0) {
            const message = searchTerm ? 'Коллективы не найдены' : 'Вы пока не состоите ни в одном коллективе';
            return `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.Groups.showCreateGroupModal()">
                        <i class="fas fa-plus-circle"></i> Создать первый коллектив
                    </button>
                </div>
            `;
        }
        
        return filteredGroups.map(group => {
            const isLeader = this.isGroupLeader(group.id);
            const badge = isLeader ? '<span class="leader-badge">👑 Лидер</span>' : '<span class="member-badge">💃 Участник</span>';
            const createdDate = new Date(group.created_at).toLocaleDateString('ru-RU');
            const descriptionHtml = group.description ? '<p><i class="fas fa-info-circle"></i> ' + this.escapeHtml(group.description) + '</p>' : '';
            
            return `
                <div class="group-card" data-group-id="${group.id}">
                    <div class="group-card-header">
                        <h3><i class="fas fa-users"></i> ${this.escapeHtml(group.name)}</h3>
                        ${badge}
                    </div>
                    <div class="group-card-body">
                        <p><i class="fas fa-user-tie"></i> Лидер: ${this.escapeHtml(group.leader_name)}</p>
                        ${descriptionHtml}
                        <p><i class="fas fa-calendar-alt"></i> Создан: ${createdDate}</p>
                    </div>
                    <div class="group-card-actions">
                        <button class="btn btn-secondary view-group-btn" data-group-id="${group.id}">
                            <i class="fas fa-eye"></i> Просмотр
                        </button>
                        ${isLeader ? `
                            <button class="btn btn-primary edit-group-btn" data-group-id="${group.id}">
                                <i class="fas fa-edit"></i> Редактировать
                            </button>
                            <button class="btn btn-danger delete-group-btn" data-group-id="${group.id}">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // Показ модального окна создания коллектива
    showCreateGroupModal() {
        Swal.fire({
            title: 'Создать коллектив',
            html: `
                <input type="text" id="group-name" class="swal2-input" placeholder="Название коллектива*">
                <textarea id="group-description" class="swal2-textarea" placeholder="Описание (необязательно)"></textarea>
            `,
            showCancelButton: true,
            confirmButtonText: 'Создать',
            cancelButtonText: 'Отмена',
            preConfirm: async () => {
                const name = document.getElementById('group-name').value.trim();
                const description = document.getElementById('group-description').value.trim();
                
                if (!name) {
                    Swal.showValidationMessage('Введите название коллектива');
                    return false;
                }
                
                try {
                    await this.createGroup({ name, description });
                    await this.renderDashboard();
                    Swal.fire('Успех!', 'Коллектив создан', 'success');
                } catch (err) {
                    Swal.showValidationMessage('Ошибка: ' + err.message);
                }
            }
        });
    },
    
    // Показ модального окна редактирования коллектива
    async showEditGroupModal(groupId) {
        const group = this.userGroups.find(g => g.id === groupId);
        if (!group) return;
        
        Swal.fire({
            title: 'Редактировать коллектив',
            html: `
                <input type="text" id="group-name" class="swal2-input" placeholder="Название коллектива*" value="${this.escapeHtml(group.name)}">
                <textarea id="group-description" class="swal2-textarea" placeholder="Описание">${this.escapeHtml(group.description || '')}</textarea>
            `,
            showCancelButton: true,
            confirmButtonText: 'Сохранить',
            cancelButtonText: 'Отмена',
            preConfirm: async () => {
                const name = document.getElementById('group-name').value.trim();
                const description = document.getElementById('group-description').value.trim();
                
                if (!name) {
                    Swal.showValidationMessage('Введите название коллектива');
                    return false;
                }
                
                try {
                    await this.updateGroup(groupId, { name, description });
                    await this.renderDashboard();
                    Swal.fire('Успех!', 'Коллектив обновлен', 'success');
                } catch (err) {
                    Swal.showValidationMessage('Ошибка: ' + err.message);
                }
            }
        });
    },
    
    // Просмотр коллектива (с репетициями и возможностью удаления)
    async viewGroup(groupId) {
        const group = this.userGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const members = await this.loadGroupMembers(groupId);
        const isLeader = this.isGroupLeader(groupId);
        const rehearsals = await this.loadRehearsals(groupId);
        
        const now = new Date();
        now.setHours(0,0,0,0);
        const futureRehearsals = rehearsals
            .filter(r => new Date(r.scheduled_date) >= now)
            .slice(0, 3);
        
        let rehearsalsHtml = '';
        if (futureRehearsals.length) {
            rehearsalsHtml = `
                <hr>
                <h3>📅 Ближайшие репетиции</h3>
                <div class="rehearsals-list">
                    ${futureRehearsals.map(r => `
                        <div style="margin-bottom:8px; padding:8px; background:#1a1a24; border-radius:8px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;">
                                <strong>${new Date(r.scheduled_date).toLocaleDateString('ru-RU')}</strong> ${r.start_time}—${r.end_time}<br>
                                ${r.location ? `📍 ${this.escapeHtml(r.location)}<br>` : ''}
                                ${r.notes ? `📝 ${this.escapeHtml(r.notes)}` : ''}
                            </div>
                            ${isLeader ? `
                                <button class="delete-rehearsal-quick-btn" data-id="${r.id}" style="background: #ef4444; color: white; border: none; border-radius: 8px; padding: 5px 10px; cursor: pointer; margin-left: 10px;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                ${rehearsals.length > 3 ? `<p style="font-size:12px;">+ ещё ${rehearsals.length-3} репетиций</p>` : ''}
            `;
        } else {
            rehearsalsHtml = `<hr><p>Нет запланированных репетиций</p>`;
        }
        
        const viewAllRehearsalsBtn = `<button id="viewAllRehearsalsBtn" class="btn btn-secondary" style="margin-top:10px; width:100%;">Все репетиции</button>`;
        
        let membersHtml = '';
        for (const m of members) {
            const displayName = m.nickname || `${m.last_name} ${m.first_name}`;
            const isAdminUser = m.role === 'admin';
            const roleText = m.groupRole === 'leader' ? '👑 Лидер' : '💃 Участник';
            
            const adminBadge = isAdminUser ? '<span class="admin-badge"><i class="fas fa-shield-alt"></i> Администрация</span>' : '';
            
            const removeButton = (isLeader && m.id !== window.currentProfile.id) ? 
                '<button class="btn btn-danger remove-member-btn" data-user-id="' + m.id + '" style="padding: 5px 10px; font-size: 12px;"><i class="fas fa-user-minus"></i></button>' : '';
            const infoButton = isLeader ? `<button class="btn btn-secondary info-member-btn" data-user-id="${m.id}" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;"><i class="fas fa-info-circle"></i></button>` : '';
            
            membersHtml += `
                <div class="member-item">
                    <div>
                        <strong>${this.escapeHtml(displayName)}</strong>
                        <span class="member-role">${roleText}</span>
                        ${adminBadge}
                        <div class="member-code">Код: ${m.unique_code}</div>
                    </div>
                    <div>
                        ${infoButton}
                        ${removeButton}
                    </div>
                </div>
            `;
        }
        
        const addMemberSection = isLeader ? `
            <hr>
            <div class="add-member-section">
                <h4>Добавить участника</h4>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="member-code" placeholder="Введите код участника" style="flex: 1;">
                    <button id="add-member-by-code" class="btn btn-primary">Добавить</button>
                </div>
            </div>
        ` : '';
        
        const scheduleRehearsalBtn = isLeader ? `
            <hr>
            <button id="scheduleRehearsalBtn" class="btn btn-primary" style="width:100%; margin-top:10px;">
                <i class="fas fa-calendar-plus"></i> Назначить репетицию
            </button>
        ` : '';
        
        Swal.fire({
            title: group.name,
            html: `
                <div style="text-align: left;">
                    <p><strong>Лидер:</strong> ${this.escapeHtml(group.leader_name)}</p>
                    ${group.description ? '<p><strong>Описание:</strong> ' + this.escapeHtml(group.description) + '</p>' : ''}
                    <p><strong>Создан:</strong> ${new Date(group.created_at).toLocaleDateString('ru-RU')}</p>
                    <hr>
                    <h3>Участники (${members.length})</h3>
                    <div class="group-members-list">
                        ${membersHtml}
                    </div>
                    ${addMemberSection}
                    ${scheduleRehearsalBtn}
                    ${rehearsalsHtml}
                    ${viewAllRehearsalsBtn}
                </div>
            `,
            width: '600px',
            showConfirmButton: true,
            confirmButtonText: 'Закрыть',
            didOpen: () => {
                if (isLeader) {
                    const addBtn = document.getElementById('add-member-by-code');
                    if (addBtn) {
                        addBtn.addEventListener('click', async () => {
                            const code = document.getElementById('member-code').value.trim();
                            if (!code) {
                                Swal.fire('Ошибка', 'Введите код участника', 'warning');
                                return;
                            }
                            const user = window.allUsers.find(u => u.unique_code === code);
                            if (!user) {
                                Swal.fire('Ошибка', 'Участник с таким кодом не найден', 'error');
                                return;
                            }
                            try {
                                await this.addMemberToGroup(groupId, user.id);
                                Swal.fire('Успех!', 'Участник добавлен', 'success');
                                this.viewGroup(groupId);
                            } catch (err) {
                                Swal.fire('Ошибка', err.message, 'error');
                            }
                        });
                    }
                }
                
                document.querySelectorAll('.remove-member-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const userId = btn.dataset.userId;
                        const result = await Swal.fire({
                            title: 'Удалить участника?',
                            text: 'Вы уверены?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Да, удалить',
                            cancelButtonText: 'Отмена'
                        });
                        if (result.isConfirmed) {
                            try {
                                await this.removeMemberFromGroup(groupId, userId);
                                Swal.fire('Успех!', 'Участник удален', 'success');
                                this.viewGroup(groupId);
                            } catch (err) {
                                Swal.fire('Ошибка', err.message, 'error');
                            }
                        }
                    });
                });
                
                document.querySelectorAll('.info-member-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const userId = btn.dataset.userId;
                        const user = members.find(m => m.id === userId);
                        if (user) {
                            this.showUserInfoModal(user);
                        }
                    });
                });
                
                const scheduleBtn = document.getElementById('scheduleRehearsalBtn');
                if (scheduleBtn) {
                    scheduleBtn.addEventListener('click', async () => {
                        await this.showScheduleRehearsalWithCalendar(groupId);
                    });
                }
                
                const viewAllBtn = document.getElementById('viewAllRehearsalsBtn');
                if (viewAllBtn) {
                    viewAllBtn.addEventListener('click', async () => {
                        await this.showRehearsalsList(groupId);
                    });
                }
                
                if (isLeader) {
                    document.querySelectorAll('.delete-rehearsal-quick-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const rehearsalId = btn.dataset.id;
                            await this.deleteRehearsal(rehearsalId, groupId);
                        });
                    });
                }
            }
        });
    },
    
    // Показать модальное окно с полной информацией об участнике
    showUserInfoModal(user) {
        const fullName = `${user.last_name} ${user.first_name}${user.patronymic ? ' ' + user.patronymic : ''}`;
        const birthDate = user.birth_date ? new Date(user.birth_date).toLocaleDateString('ru-RU') : 'Не указана';
        const isAdmin = user.role === 'admin';
        
        Swal.fire({
            title: 'Информация об участнике',
            html: `
                <div style="text-align: left;">
                    <p><strong>Фамилия:</strong> ${this.escapeHtml(user.last_name)}</p>
                    <p><strong>Имя:</strong> ${this.escapeHtml(user.first_name)}</p>
                    <p><strong>Отчество:</strong> ${this.escapeHtml(user.patronymic || '—')}</p>
                    <p><strong>Дата рождения:</strong> ${birthDate}</p>
                    ${user.nickname ? `<p><strong>Никнейм:</strong> ${this.escapeHtml(user.nickname)}</p>` : ''}
                    <p><strong>Код:</strong> ${this.escapeHtml(user.unique_code)}</p>
                    <p><strong>Email:</strong> ${this.escapeHtml(user.email)}</p>
                    <p>
                        <strong>Роль в системе:</strong> 
                        ${isAdmin ? 
                            '<span class="admin-badge"><i class="fas fa-shield-alt"></i> Администратор</span>' : 
                            '<span style="color: #9ca3af;">Пользователь</span>'}
                    </p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Закрыть'
        });
    },
    
    // Привязка событий дашборда
    bindDashboardEvents() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => window.Auth.logout());
        }
        
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                if (window.Profile && window.Profile.showProfilePage) {
                    window.Profile.showProfilePage();
                } else {
                    console.error('Profile module not loaded');
                }
            });
        }
        
        const manageMembersBtn = document.getElementById('manageMembersBtn');
        if (manageMembersBtn) {
            manageMembersBtn.addEventListener('click', () => {
                if (window.Users && window.Users.renderFullUsersTable) {
                    window.Users.renderFullUsersTable();
                }
            });
        }
        
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => this.showCreateGroupModal());
        }
        
        const refreshBtn = document.getElementById('refreshGroupsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadUserGroups();
                await this.renderDashboard();
            });
        }
        
        const searchInput = document.getElementById('searchGroupsInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const groupsGrid = document.getElementById('groupsGrid');
                if (groupsGrid) {
                    groupsGrid.innerHTML = this.renderGroupsCards(e.target.value);
                    this.bindGroupCardEvents();
                }
            });
        }
        
        this.bindGroupCardEvents();
    },
    
    // Привязка событий карточек
    bindGroupCardEvents() {
        document.querySelectorAll('.view-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                this.viewGroup(groupId);
            });
        });
        
        document.querySelectorAll('.edit-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                this.showEditGroupModal(groupId);
            });
        });
        
        document.querySelectorAll('.delete-group-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                const result = await Swal.fire({
                    title: 'Удалить коллектив?',
                    text: 'Это действие нельзя отменить. Все участники будут удалены из коллектива.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Да, удалить',
                    cancelButtonText: 'Отмена'
                });
                
                if (result.isConfirmed) {
                    try {
                        await this.deleteGroup(groupId);
                        await this.renderDashboard();
                        Swal.fire('Успех!', 'Коллектив удален', 'success');
                    } catch (err) {
                        Swal.fire('Ошибка', err.message, 'error');
                    }
                }
            });
        });
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