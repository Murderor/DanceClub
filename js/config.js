// Конфигурация Supabase
window.SUPABASE_CONFIG = {
    url: 'https://rxfnogpsmhuviaoaenix.supabase.co',
    anonKey: 'sb_publishable_4dGVksOWgGpWa8YE55QuUg_7hhmJ0BU'
};

// Инициализация Supabase клиента
window.initSupabase = function() {
    if (!window._supabase) {
        // Проверяем, что конфигурация заполнена
        if (!window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) {
            console.error('❌ Ошибка: Необходимо настроить Supabase в файле config.js');
            Swal.fire({
                title: 'Ошибка конфигурации',
                text: 'Необходимо указать URL и ANON KEY Supabase в файле js/config.js',
                icon: 'error',
                confirmButtonText: 'Понятно'
            });
            return null;
        }
        
        try {
            window._supabase = supabase.createClient(
                window.SUPABASE_CONFIG.url, 
                window.SUPABASE_CONFIG.anonKey
            );
            console.log('✅ Supabase клиент инициализирован');
        } catch (err) {
            console.error('❌ Ошибка инициализации Supabase:', err);
            return null;
        }
    }
    return window._supabase;
};

// Глобальные переменные
window.currentUser = null;
window.currentProfile = null;
window.allUsers = [];