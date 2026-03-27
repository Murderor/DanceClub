// Конфигурация приложения
const CONFIG = {
    supabaseUrl: 'https://hjeknoxsqtytylhzogwm.supabase.co',
    supabaseKey: 'sb_publishable_op0u5_yEH_nC8wzEBMo5yw_m_-sdGjf'
};

// Глобальные переменные (будем использовать window)
window.supabaseClient = null;
window.currentUser = null;
window.currentProfile = null;
window.currentGroup = null;

// Функция инициализации Supabase
window.initSupabase = function() {
    if (!window.supabaseClient && window.supabase) {
        window.supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    }
    return window.supabaseClient;
};