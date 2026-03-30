// Модуль авторизации
window.Auth = {
    async checkSession() {
        console.log('🔍 Проверяем сессию...');
        const supabase = window.initSupabase();
        
        if (!supabase) {
            console.error('❌ Supabase не инициализирован');
            return false;
        }
        
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('❌ Ошибка проверки сессии:', error);
                return false;
            }
            
            if (session) {
                console.log('✅ Сессия найдена, пользователь:', session.user.email);
                window.currentUser = session.user;
                
                // Загружаем профиль
                const profile = await this.loadUserProfile();
                console.log('📊 Профиль после загрузки:', profile);
                
                // Если профиль не загружен, но пользователь есть, создаем его
                if (!profile && window.currentUser) {
                    console.log('⚠️ Профиль не найден, создаем...');
                    await this.createUserProfile();
                }
                
                // Принудительно вызываем showMainApp
                if (window.Main && window.Main.showMainApp) {
                    console.log('🚀 Принудительно вызываем showMainApp');
                    await window.Main.showMainApp();
                }
                
                return true;
            } else {
                console.log('ℹ️ Сессия не найдена');
                return false;
            }
        } catch (err) {
            console.error('❌ Критическая ошибка при проверке сессии:', err);
            return false;
        }
    },
    
    async loadUserProfile() {
        if (!window.currentUser) {
            console.log('⚠️ Нет текущего пользователя');
            return null;
        }
        
        console.log('👤 Загружаем профиль для пользователя:', window.currentUser.id);
        const supabase = window.initSupabase();
        
        if (!supabase) return null;
        
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', window.currentUser.id)
                .maybeSingle();
            
            if (error) {
                console.error('❌ Ошибка загрузки профиля:', error);
                return null;
            }
            
            if (data) {
                console.log('✅ Профиль найден:', data);
                window.currentProfile = data;
                return data;
            } else {
                console.log('ℹ️ Профиль не найден');
                return null;
            }
        } catch (err) {
            console.error('❌ Ошибка при загрузке профиля:', err);
            return null;
        }
    },
    
    async createUserProfile() {
        console.log('🆕 Создаем профиль пользователя');
        const supabase = window.initSupabase();
        
        if (!supabase) return;
        
        const metadata = window.currentUser.user_metadata || {};
        
        // Генерируем уникальный код
        const uniqueCode = await this.getUniqueCode();
        
        const userData = {
            id: window.currentUser.id,
            email: window.currentUser.email,
            last_name: metadata.last_name || '',
            first_name: metadata.first_name || '',
            patronymic: metadata.patronymic || null,
            birth_date: metadata.birth_date || null,
            unique_code: uniqueCode,
            role: 'user'
        };
        
        console.log('📝 Данные для создания:', userData);
        
        const { error } = await supabase
            .from('users')
            .insert([userData]);
        
        if (error) {
            console.error('❌ Ошибка создания профиля:', error);
            Swal.fire('Ошибка', 'Не удалось создать профиль: ' + error.message, 'error');
            return null;
        } else {
            console.log('✅ Профиль успешно создан');
            window.currentProfile = userData;
            
            // Обновляем глобальный список пользователей
            if (window.Users && window.Users.loadUsers) {
                await window.Users.loadUsers();
            }
            
            return userData;
        }
    },
    
    generateUniqueCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    },
    
    async isCodeUnique(code) {
        const supabase = window.initSupabase();
        if (!supabase) return false;
        
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('unique_code', code);
        
        return !error && (!data || data.length === 0);
    },
    
    async getUniqueCode() {
        let attempts = 0;
        let code;
        
        do {
            code = this.generateUniqueCode();
            attempts++;
            if (attempts > 20) {
                code = code.slice(0, 4) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
            }
        } while (!(await this.isCodeUnique(code)));
        
        console.log('🔑 Сгенерирован уникальный код:', code);
        return code;
    },
    
    showAuth() {
        console.log('🔐 Показываем форму авторизации');
        const authContainer = document.getElementById('auth-container');
        const mainContainer = document.getElementById('main-container');
        
        if (!authContainer || !mainContainer) {
            console.error('❌ Контейнеры не найдены');
            return;
        }
        
        authContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        
        authContainer.innerHTML = `
            <div class="auth-wrapper">
                <h2>💃 Танцевальный менеджер</h2>
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">Вход</button>
                    <button class="auth-tab" data-tab="register">Регистрация</button>
                </div>
                
                <div id="login-form" class="auth-form active">
                    <div class="form-row">
                        <label>Email</label>
                        <input type="email" id="login-email" placeholder="example@mail.com" required>
                    </div>
                    <div class="form-row">
                        <label>Пароль</label>
                        <input type="password" id="login-password" placeholder="••••••••" required>
                    </div>
                    <button id="signin-btn">Войти</button>
                </div>
                
                <div id="register-form" class="auth-form">
                    <div class="form-row">
                        <label>Фамилия *</label>
                        <input type="text" id="reg-lastname" placeholder="Иванов" required>
                    </div>
                    <div class="form-row">
                        <label>Имя *</label>
                        <input type="text" id="reg-firstname" placeholder="Анна" required>
                    </div>
                    <div class="form-row">
                        <label>Отчество</label>
                        <input type="text" id="reg-patronymic" placeholder="Сергеевна">
                    </div>
                    <div class="form-row">
                        <label>Дата рождения *</label>
                        <input type="date" id="reg-birthdate" required>
                    </div>
                    <div class="form-row">
                        <label>Email *</label>
                        <input type="email" id="reg-email" placeholder="example@mail.com" required>
                    </div>
                    <div class="form-row">
                        <label>Пароль *</label>
                        <input type="password" id="reg-password" placeholder="минимум 6 символов" required>
                    </div>
                    <button id="signup-btn">Зарегистрироваться</button>
                </div>
            </div>
        `;
        
        this.bindAuthEvents();
    },
    
    bindAuthEvents() {
        console.log('🔗 Привязываем события авторизации');
        
        // Переключение между формами
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                tab.classList.add('active');
                const formId = `${tab.dataset.tab}-form`;
                const form = document.getElementById(formId);
                if (form) form.classList.add('active');
            });
        });
        
        // Вход
        const signinBtn = document.getElementById('signin-btn');
        if (signinBtn) {
            signinBtn.addEventListener('click', async () => {
                const supabase = window.initSupabase();
                
                if (!supabase) {
                    Swal.fire('Ошибка', 'Supabase не инициализирован. Проверьте настройки в config.js', 'error');
                    return;
                }
                
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                
                if (!email || !password) {
                    Swal.fire('Ошибка', 'Заполните все поля', 'warning');
                    return;
                }
                
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    Swal.fire('Ошибка входа', error.message, 'error');
                } else {
                    console.log('✅ Вход выполнен успешно');
                    // Перезагружаем страницу для загрузки данных
                    window.location.reload();
                }
            });
        }
        
        // Регистрация
        const signupBtn = document.getElementById('signup-btn');
        if (signupBtn) {
            signupBtn.addEventListener('click', async () => {
                const supabase = window.initSupabase();
                
                if (!supabase) {
                    Swal.fire('Ошибка', 'Supabase не инициализирован. Проверьте настройки в config.js', 'error');
                    return;
                }
                
                const lastName = document.getElementById('reg-lastname').value.trim();
                const firstName = document.getElementById('reg-firstname').value.trim();
                const patronymic = document.getElementById('reg-patronymic').value.trim();
                const birthDate = document.getElementById('reg-birthdate').value;
                const email = document.getElementById('reg-email').value.trim();
                const password = document.getElementById('reg-password').value;
                
                // Валидация
                if (!lastName || !firstName || !birthDate || !email || !password) {
                    Swal.fire('Ошибка', 'Заполните все обязательные поля (отмечены *)', 'warning');
                    return;
                }
                
                if (password.length < 6) {
                    Swal.fire('Ошибка', 'Пароль должен содержать минимум 6 символов', 'warning');
                    return;
                }
                
                // Проверка возраста
                const birthYear = new Date(birthDate).getFullYear();
                const currentYear = new Date().getFullYear();
                if (currentYear - birthYear < 5) {
                    Swal.fire('Ошибка', 'Возраст должен быть не менее 5 лет', 'warning');
                    return;
                }
                
                const fullName = `${lastName} ${firstName} ${patronymic}`.trim();
                
                const { data, error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: { 
                        data: { 
                            full_name: fullName,
                            last_name: lastName,
                            first_name: firstName,
                            patronymic: patronymic || null,
                            birth_date: birthDate
                        } 
                    }
                });
                
                if (error) {
                    Swal.fire('Ошибка регистрации', error.message, 'error');
                } else if (data.user) {
                    Swal.fire({
                        title: 'Успешная регистрация!',
                        text: 'Ваш профиль будет создан автоматически. Теперь вы можете войти в систему.',
                        icon: 'success',
                        confirmButtonText: 'Отлично'
                    }).then(() => {
                        // Переключаемся на форму входа
                        const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
                        if (loginTab) loginTab.click();
                        
                        // Очищаем форму регистрации
                        const regForm = document.getElementById('register-form');
                        if (regForm) {
                            regForm.querySelectorAll('input').forEach(input => input.value = '');
                        }
                    });
                }
            });
        }
    },
    
    async logout() {
        console.log('🚪 Выход из системы');
        const supabase = window.initSupabase();
        if (supabase) {
            await supabase.auth.signOut();
        }
        window.currentUser = null;
        window.currentProfile = null;
        window.allUsers = [];
        window.location.reload();
    },
    
    onAuthChange(callback) {
        console.log('👂 Настраиваем слушатель изменений авторизации');
        const supabase = window.initSupabase();
        
        if (!supabase) {
            console.error('❌ Supabase не инициализирован');
            return;
        }
        
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Событие авторизации:', event, session?.user?.email);
            if (session) {
                window.currentUser = session.user;
                await this.loadUserProfile();
                callback(true, session);
            } else {
                window.currentUser = null;
                window.currentProfile = null;
                window.allUsers = [];
                callback(false, null);
            }
        });
    }
};