// Модуль доступности
window.Availability = {
    async render() {
        const supabase = window.initSupabase();
        const container = document.getElementById('tab-content');
        container.innerHTML = '<p>Загрузка вашего расписания...</p>';
        
        // Получаем начало и конец текущей недели
        const { startOfWeek, endOfWeek } = this.getCurrentWeekRange();
        
        // Загружаем доступность на текущую неделю
        const { data: slots, error } = await supabase
            .from('availability')
            .select('*')
            .eq('user_id', window.currentUser.id)
            .gte('date', startOfWeek.toISOString())
            .lte('date', endOfWeek.toISOString())
            .order('date', { ascending: true });
    
        if (error) {
            container.innerHTML = '<p>Ошибка загрузки: ' + error.message + '</p>';
            return;
        }
    
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const daysShort = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
        
        // Получаем даты для каждого дня недели
        const weekDates = this.getWeekDates(startOfWeek);
        
        let html = `
            <div class="availability-header">
                <h3>📅 Моё свободное время</h3>
                <div class="week-info">
                    <button class="prev-week" id="prev-week">← Предыдущая неделя</button>
                    <span class="week-range">${this.formatDateRange(startOfWeek, endOfWeek)}</span>
                    <button class="next-week" id="next-week">Следующая неделя →</button>
                </div>
                <p class="subtitle">Укажите время, когда вы будете свободны для репетиций</p>
            </div>
            <div class="days-grid">
        `;
    
        for (let i = 0; i < days.length; i++) {
            const date = weekDates[i];
            const daySlots = slots?.filter(slot => {
                const slotDate = new Date(slot.date);
                return slotDate.toDateString() === date.toDateString();
            }) || [];
            
            html += `
                <div class="day-card" data-day="${i}" data-date="${date.toISOString()}">
                    <div class="day-title">
                        <span class="day-name">${days[i]}</span>
                        <span class="day-date">${this.formatDate(date)}</span>
                        <span class="day-short">${daysShort[i]}</span>
                    </div>
                    <div class="time-slots" id="day-${i}-slots">
                        ${daySlots.length === 0 ? '<div class="empty-slots">Нет интервалов</div>' : ''}
                    </div>
                    <div class="add-slot">
                        <button class="add-slot-btn" data-day="${i}" data-date="${date.toISOString()}">
                            <span>+</span> Добавить интервал
                        </button>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
        container.innerHTML = html;
    
        // Заполняем слоты для каждого дня
        for (let i = 0; i < days.length; i++) {
            const date = weekDates[i];
            const daySlots = slots?.filter(slot => {
                const slotDate = new Date(slot.date);
                return slotDate.toDateString() === date.toDateString();
            }) || [];
            
            const slotsContainer = document.getElementById(`day-${i}-slots`);
            if (slotsContainer && daySlots.length > 0) {
                slotsContainer.innerHTML = '';
                daySlots.forEach(slot => {
                    const slotDiv = document.createElement('div');
                    slotDiv.className = 'time-slot';
                    slotDiv.innerHTML = `
                        <span class="time-text">${slot.start_time.substring(0,5)} — ${slot.end_time.substring(0,5)}</span>
                        <button class="remove-slot" data-id="${slot.id}" title="Удалить интервал">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    `;
                    slotsContainer.appendChild(slotDiv);
                });
            }
        }
    
        // Добавляем обработчики
        document.querySelectorAll('.add-slot-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleAddSlot);
            btn.addEventListener('click', this.handleAddSlot.bind(this));
        });
        
        document.querySelectorAll('.remove-slot').forEach(btn => {
            btn.removeEventListener('click', this.handleRemoveSlot);
            btn.addEventListener('click', this.handleRemoveSlot.bind(this));
        });
        
        // Обработчики навигации по неделям
        document.getElementById('prev-week')?.addEventListener('click', () => this.changeWeek(-1));
        document.getElementById('next-week')?.addEventListener('click', () => this.changeWeek(1));
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
    
    async changeWeek(direction) {
        const weekRange = document.querySelector('.week-range');
        if (!weekRange) return;
        
        // Сохраняем текущую дату для навигации
        const currentDate = new Date();
        const currentWeekStart = this.getCurrentWeekRange().startOfWeek;
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
        
        // Обновляем дату для отображения
        const newEnd = new Date(newWeekStart);
        newEnd.setDate(newWeekStart.getDate() + 6);
        
        // Перерисовываем с новой неделей
        await this.renderWithWeek(newWeekStart);
    },
    
    async renderWithWeek(startOfWeek) {
        const supabase = window.initSupabase();
        const container = document.getElementById('tab-content');
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        // Загружаем доступность на выбранную неделю
        const { data: slots, error } = await supabase
            .from('availability')
            .select('*')
            .eq('user_id', window.currentUser.id)
            .gte('date', startOfWeek.toISOString())
            .lte('date', endOfWeek.toISOString())
            .order('date', { ascending: true });
    
        if (error) {
            container.innerHTML = '<p>Ошибка загрузки: ' + error.message + '</p>';
            return;
        }
    
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const daysShort = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
        const weekDates = this.getWeekDates(startOfWeek);
        
        let html = `
            <div class="availability-header">
                <h3>📅 Моё свободное время</h3>
                <div class="week-info">
                    <button class="prev-week" id="prev-week">← Предыдущая неделя</button>
                    <span class="week-range">${this.formatDateRange(startOfWeek, endOfWeek)}</span>
                    <button class="next-week" id="next-week">Следующая неделя →</button>
                </div>
                <p class="subtitle">Укажите время, когда вы будете свободны для репетиций</p>
            </div>
            <div class="days-grid">
        `;
    
        for (let i = 0; i < days.length; i++) {
            const date = weekDates[i];
            const daySlots = slots?.filter(slot => {
                const slotDate = new Date(slot.date);
                return slotDate.toDateString() === date.toDateString();
            }) || [];
            
            html += `
                <div class="day-card" data-day="${i}" data-date="${date.toISOString()}">
                    <div class="day-title">
                        <span class="day-name">${days[i]}</span>
                        <span class="day-date">${this.formatDate(date)}</span>
                        <span class="day-short">${daysShort[i]}</span>
                    </div>
                    <div class="time-slots" id="day-${i}-slots">
                        ${daySlots.length === 0 ? '<div class="empty-slots">Нет интервалов</div>' : ''}
                    </div>
                    <div class="add-slot">
                        <button class="add-slot-btn" data-day="${i}" data-date="${date.toISOString()}">
                            <span>+</span> Добавить интервал
                        </button>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
        container.innerHTML = html;
    
        // Заполняем слоты для каждого дня
        for (let i = 0; i < days.length; i++) {
            const date = weekDates[i];
            const daySlots = slots?.filter(slot => {
                const slotDate = new Date(slot.date);
                return slotDate.toDateString() === date.toDateString();
            }) || [];
            
            const slotsContainer = document.getElementById(`day-${i}-slots`);
            if (slotsContainer && daySlots.length > 0) {
                slotsContainer.innerHTML = '';
                daySlots.forEach(slot => {
                    const slotDiv = document.createElement('div');
                    slotDiv.className = 'time-slot';
                    slotDiv.innerHTML = `
                        <span class="time-text">${slot.start_time.substring(0,5)} — ${slot.end_time.substring(0,5)}</span>
                        <button class="remove-slot" data-id="${slot.id}" title="Удалить интервал">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    `;
                    slotsContainer.appendChild(slotDiv);
                });
            }
        }
    
        // Добавляем обработчики
        document.querySelectorAll('.add-slot-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleAddSlot);
            btn.addEventListener('click', this.handleAddSlot.bind(this));
        });
        
        document.querySelectorAll('.remove-slot').forEach(btn => {
            btn.removeEventListener('click', this.handleRemoveSlot);
            btn.addEventListener('click', this.handleRemoveSlot.bind(this));
        });
        
        // Обработчики навигации по неделям
        document.getElementById('prev-week')?.addEventListener('click', () => this.changeWeek(-1));
        document.getElementById('next-week')?.addEventListener('click', () => this.changeWeek(1));
    },
    
    handleAddSlot(event) {
        const btn = event.currentTarget;
        const day = parseInt(btn.dataset.day);
        const dateStr = btn.dataset.date;
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const date = new Date(dateStr);
        
        this.showAddSlotModal(day, days[day], date);
    },
    
    showAddSlotModal(day, dayName, date) {
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content availability-modal">
                <div class="modal-header">
                    <h4>➕ Добавить интервал</h4>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="day-indicator">
                        <span class="day-badge">${dayName}, ${this.formatDate(date)}</span>
                    </div>
                    
                    <div class="time-input-group">
                        <label>
                            <span class="label-icon">⏰</span>
                            Время начала
                        </label>
                        <input type="time" id="start-time" class="time-input" value="18:00" step="60">
                    </div>
                    
                    <div class="time-input-group">
                        <label>
                            <span class="label-icon">⏰</span>
                            Время окончания
                        </label>
                        <input type="time" id="end-time" class="time-input" value="20:00" step="60">
                    </div>
                    
                    <div class="time-note">
                        <small>💡 Этот интервал будет действовать только на ${this.formatDate(date)}</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel">Отмена</button>
                    <button class="btn-save">Сохранить интервал</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Анимация появления
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Получаем элементы
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.btn-cancel');
        const saveBtn = modal.querySelector('.btn-save');
        const startInput = modal.querySelector('#start-time');
        const endInput = modal.querySelector('#end-time');
        
        // Функция закрытия
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };
        
        // Валидация времени
        const validateTime = () => {
            const start = startInput.value;
            const end = endInput.value;
            
            if (start && end && start >= end) {
                endInput.setCustomValidity('Время окончания должно быть позже времени начала');
                return false;
            } else {
                endInput.setCustomValidity('');
                return true;
            }
        };
        
        startInput.addEventListener('change', validateTime);
        endInput.addEventListener('change', validateTime);
        
        // Сохранение
        const saveSlot = async () => {
            if (!validateTime()) {
                alert('Пожалуйста, укажите корректное время (начало раньше окончания)');
                return;
            }
            
            const start = startInput.value;
            const end = endInput.value;
            
            if (!start || !end) {
                alert('Пожалуйста, заполните оба поля');
                return;
            }
            
            saveBtn.disabled = true;
            saveBtn.textContent = 'Сохранение...';
            
            const supabase = window.initSupabase();
            const { error } = await supabase.from('availability').insert({
                user_id: window.currentUser.id,
                date: date.toISOString(),
                start_time: start,
                end_time: end
            });
            
            if (error) {
                alert('Ошибка: ' + error.message);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Сохранить интервал';
            } else {
                closeModal();
                await this.render();
            }
        };
        
        // Обработчики событий
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        saveBtn.addEventListener('click', saveSlot);
        
        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Закрытие по Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Фокус на поле ввода
        startInput.focus();
    },
    
    async handleRemoveSlot(event) {
        const supabase = window.initSupabase();
        const btn = event.currentTarget;
        const id = btn.dataset.id;
        
        // Показываем подтверждение удаления
        const confirmed = await this.showConfirmModal();
        
        if (confirmed) {
            const { error } = await supabase.from('availability').delete().eq('id', id);
            if (error) {
                alert('Ошибка удаления');
            } else {
                await this.render();
            }
        }
    },
    
    showConfirmModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content confirm-modal">
                    <div class="modal-header">
                        <h4>⚠️ Подтверждение</h4>
                    </div>
                    <div class="modal-body">
                        <p>Вы уверены, что хотите удалить этот интервал?</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel">Отмена</button>
                        <button class="btn-danger">Удалить</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('show'), 10);
            
            const closeModal = (result) => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
                resolve(result);
            };
            
            modal.querySelector('.btn-cancel').addEventListener('click', () => closeModal(false));
            modal.querySelector('.btn-danger').addEventListener('click', () => closeModal(true));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(false);
            });
            
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};