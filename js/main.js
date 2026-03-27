// Главный модуль приложения
window.App = {
    init() {
        // Инициализация Supabase
        window.initSupabase();
        
        // Подписка на изменения авторизации
        window.Auth.onAuthChange(async (isAuthenticated, session) => {
            if (isAuthenticated) {
                await window.Profile.loadAndRender();
            } else {
                window.Auth.showAuth();
            }
        });
        
        // Проверка сессии
        window.Auth.checkSession();
    },
    
    renderDashboard() {
        const authContainer = document.getElementById('auth-container');
        const mainContainer = document.getElementById('main-container');
        
        authContainer.style.display = 'none';
        mainContainer.style.display = 'block';
    
        mainContainer.innerHTML = `
            <div class="dashboard">
                <div class="header">
                    <div>
                        <h2>Добро пожаловать, ${this.escapeHtml(window.currentProfile.full_name || window.currentUser.email)}</h2>
                        <div class="profile-info">
                            <span class="badge">Ваш код: <strong>${window.currentProfile.unique_code}</strong></span>
                            ${window.currentGroup ? `<span class="badge">Коллектив: ${this.escapeHtml(window.currentGroup.name)}</span>` : '<span class="badge warning">Вы не в коллективе</span>'}
                        </div>
                    </div>
                    <button id="logout-btn" class="danger">Выйти</button>
                </div>
                <div class="tabs">
                    <button class="tab-btn active" data-tab="profile">Мой профиль</button>
                    <button class="tab-btn" data-tab="events">Расписание</button>
                    <button class="tab-btn" data-tab="availability">Моя доступность</button>
                    ${window.currentProfile.role === 'admin' ? '<button class="tab-btn" data-tab="admin">Админ панель</button>' : ''}
                </div>
                <div id="tab-content"></div>
            </div>
        `;
    
        document.getElementById('logout-btn').addEventListener('click', () => window.Auth.logout());
    
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                tabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                if (tab === 'profile') window.Profile.render();
                else if (tab === 'events') window.Events.render();
                else if (tab === 'availability') window.Availability.render();
                else if (tab === 'admin') window.Admin.render();
            });
        });
    
        // Показываем первую вкладку
        window.Profile.render();
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Запуск приложения после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
});