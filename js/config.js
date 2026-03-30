// Конфигурация Supabase - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
const SUPABASE_CONFIG = {
    url: 'https://rxfnogpsmhuviaoaenix.supabase.co', // Замените на ваш URL из Supabase
    anonKey: 'sb_publishable_4dGVksOWgGpWa8YE55QuUg_7hhmJ0BU' // Замените на ваш anon public key
};

// Инициализация Supabase клиента
window.initSupabase = function() {
    if (!window._supabase) {
        // Проверяем, что конфигурация заполнена
        if (SUPABASE_CONFIG.url.includes('ваш_проект') || SUPABASE_CONFIG.anonKey.includes('ваш_anon_ключ')) {
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
            window._supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
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