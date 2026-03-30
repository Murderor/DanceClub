// Главный модуль приложения
window.Main = {
    isInitialized: false,
    loadingTimeout: null,
    currentView: 'dashboard', // 'dashboard' или 'members'
    
    async init() {
        console.log('🔧 Main.init() запущен');
        
        // Показываем индикатор загрузки
        this.showLoading();
        
        // Устанавливаем таймаут на случай зависания
        this.loadingTimeout = setTimeout(() => {
            console.error('❌ Таймаут загрузки!');
            this.hideLoading();
            Swal.fire({
                title: 'Ошибка загрузки',
                text: 'Приложение не может загрузиться. Попробуйте обновить страницу.',
                icon: 'error',
                confirmButtonText: 'Обновить'
            }).then(() => {
                window.location.reload();
            });
        }, 10000);
        
        // Проверяем текущую сессию
        const hasSession = await window.Auth.checkSession();
        console.log('📋 Has session:', hasSession);
        
        if (!hasSession) {
            console.log('❌ Нет сессии, показываем форму авторизации');
            this.hideLoading();
            if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
            window.Auth.showAuth();
        }
    },
    
    showLoading() {
        console.log('⏳ Показываем загрузку');
        const authContainer = document.getElementById('auth-container');
        const mainContainer = document.getElementById('main-container');
        
        if (!authContainer || !mainContainer) return;
        
        authContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        
        authContainer.innerHTML = `
            <div class="auth-wrapper">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-pulse fa-3x" style="color: #8b5cf6;"></i>
                    <p style="margin-top: 20px; color: #6b7280;">Загрузка приложения...</p>
                </div>
            </div>
        `;
    },
    
    hideLoading() {
        console.log('✅ Скрываем загрузку');
        const authContainer = document.getElementById('auth-container');
        if (authContainer && authContainer.innerHTML.includes('Загрузка приложения')) {
            authContainer.innerHTML = '';
        }
    },
    
    async showMainApp() {
        console.log('🚀 Показываем основное приложение');
        
        // Очищаем таймаут
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
        }
        
        const authContainer = document.getElementById('auth-container');
        const mainContainer = document.getElementById('main-container');
        
        if (!authContainer || !mainContainer) {
            console.error('❌ Контейнеры не найдены');
            return;
        }
        
        // Проверяем, загружен ли профиль
        if (!window.currentProfile) {
            console.log('⏳ Профиль еще не загружен, ждем...');
            let waitCount = 0;
            while (!window.currentProfile && waitCount < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }
        }
        
        if (!window.currentProfile) {
            console.error('❌ Профиль не загружен');
            Swal.fire({
                title: 'Ошибка загрузки профиля',
                text: 'Не удалось загрузить данные пользователя. Попробуйте выйти и войти снова.',
                icon: 'error',
                confirmButtonText: 'Понятно'
            }).then(() => {
                window.Auth.logout();
            });
            return;
        }
        
        console.log('✅ Профиль загружен:', window.currentProfile);
        
        try {
            // Скрываем контейнер авторизации и показываем основной
            authContainer.style.display = 'none';
            mainContainer.style.display = 'block';
            
            // Загружаем список всех участников для использования в коллективах
            await window.Users.loadUsers();
            console.log('✅ Пользователи загружены');
            
            // Показываем дашборд с коллективами
            await window.Groups.renderDashboard();
            console.log('✅ Дашборд отрендерен');
            
            this.bindGlobalEvents();
            console.log('✅ События привязаны');
            
            this.hideLoading();
            console.log('🎉 Приложение полностью загружено');
            
        } catch (err) {
            console.error('❌ Ошибка при загрузке приложения:', err);
            this.hideLoading();
            Swal.fire({
                title: 'Ошибка',
                text: 'Произошла ошибка при загрузке приложения: ' + err.message,
                icon: 'error',
                confirmButtonText: 'Обновить'
            }).then(() => {
                window.location.reload();
            });
        }
    },
    
    hideMainApp() {
        console.log('👋 Скрываем основное приложение');
        const authContainer = document.getElementById('auth-container');
        const mainContainer = document.getElementById('main-container');
        
        if (authContainer) authContainer.style.display = 'block';
        if (mainContainer) mainContainer.style.display = 'none';
        
        if (mainContainer) mainContainer.innerHTML = '';
        
        this.isInitialized = false;
    },
    
    bindGlobalEvents() {
        // Слушаем возврат на дашборд из управления участниками
        const manageGroupsBtn = document.createElement('button');
        // Эта кнопка будет добавлена в интерфейс управления участниками позже
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

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM загружен, запускаем Main.init()');
        window.Main.init();
    });
} else {
    console.log('📄 DOM уже загружен, запускаем Main.init()');
    window.Main.init();
}