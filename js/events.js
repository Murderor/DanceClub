// Модуль событий
window.Events = {
    async render() {
        const supabase = window.initSupabase();
        const container = document.getElementById('tab-content');
        container.innerHTML = '<p>Загрузка...</p>';
        
        try {
            // Проверяем, есть ли у пользователя группа
            if (!window.currentGroup) {
                container.innerHTML = '<p>Вы не состоите в коллективе. Вступите или создайте коллектив, чтобы видеть расписание.</p>';
                return;
            }
            
            // Пытаемся загрузить события
            let events = [];
            
            // Проверяем, существует ли поле group_id в таблице events
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .eq('group_id', window.currentGroup.id)
                .order('start_time', { ascending: true });
            
            if (eventsError) {
                console.error('Ошибка загрузки событий:', eventsError);
                
                // Если поле group_id не существует, пробуем загрузить все события
                if (eventsError.code === '42703') {
                    const { data: allEvents } = await supabase
                        .from('events')
                        .select('*')
                        .order('start_time', { ascending: true });
                    events = allEvents || [];
                } 
                // Если ошибка рекурсии, пробуем простой запрос
                else if (eventsError.code === '42P17') {
                    console.log('Обнаружена рекурсия в политиках, пробуем без фильтрации группы');
                    const { data: allEvents } = await supabase
                        .from('events')
                        .select('*')
                        .order('start_time', { ascending: true });
                    events = allEvents || [];
                }
                else {
                    container.innerHTML = '<p>Ошибка загрузки событий. Попробуйте обновить страницу позже.</p>';
                    return;
                }
            } else {
                events = eventsData || [];
            }
            
            if (events.length === 0) {
                container.innerHTML = '<p>Пока нет запланированных репетиций</p>';
                return;
            }
            
            let html = '<h3>Ближайшие репетиции</h3><div class="events-list">';
            events.forEach(ev => {
                const start = new Date(ev.start_time).toLocaleString();
                const end = new Date(ev.end_time).toLocaleString();
                html += `
                    <div class="event-card">
                        <h4>${this.escapeHtml(ev.title)}</h4>
                        <div class="event-time">${start} – ${end}</div>
                        ${ev.description ? `<div class="event-desc">${this.escapeHtml(ev.description)}</div>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (err) {
            console.error('Ошибка в renderEvents:', err);
            container.innerHTML = '<p>Произошла ошибка при загрузке расписания. Пожалуйста, обновите страницу.</p>';
        }
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};