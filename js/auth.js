// Модуль авторизации
window.Auth = {
    async checkSession() {
        const supabase = window.initSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            window.currentUser = session.user;
            await window.Profile.loadAndRender();
            return true;
        }
        this.showAuth();
        return false;
    },
    
    showAuth() {
        const authContainer = document.getElementById('auth-container');
        const mainContainer = document.getElementById('main-container');
        
        authContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        
        authContainer.innerHTML = `
            <div class="auth-wrapper">
                <h2>Добро пожаловать в Dance Club Manager</h2>
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">Вход</button>
                    <button class="auth-tab" data-tab="register">Регистрация</button>
                </div>
                
                <div id="login-form" class="auth-form active">
                    <input type="email" id="login-email" placeholder="Email" required>
                    <input type="password" id="login-password" placeholder="Пароль" required>
                    <button id="signin-btn">Войти</button>
                </div>
                
                <div id="register-form" class="auth-form">
                    <input type="text" id="reg-name" placeholder="Ваше имя" required>
                    <input type="email" id="reg-email" placeholder="Email" required>
                    <input type="password" id="reg-password" placeholder="Пароль" required>
                    <button id="signup-btn">Зарегистрироваться</button>
                </div>
            </div>
        `;
        
        // Переключение между формами
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
            });
        });
        
        // Вход
        document.getElementById('signin-btn').addEventListener('click', async () => {
            const supabase = window.initSupabase();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) alert('Ошибка входа: ' + error.message);
        });
        
        // Регистрация
        document.getElementById('signup-btn').addEventListener('click', async () => {
            const supabase = window.initSupabase();
            const fullName = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            
            if (!fullName || !email || !password) {
                alert('Заполните все поля');
                return;
            }
            
            const { error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { full_name: fullName } }
            });
            
            if (error) {
                alert('Ошибка регистрации: ' + error.message);
            } else {
                alert('Регистрация успешна! Проверьте почту для подтверждения.');
            }
        });
    },
    
    logout() {
        const supabase = window.initSupabase();
        supabase.auth.signOut();
    },
    
    onAuthChange(callback) {
        const supabase = window.initSupabase();
        supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                window.currentUser = session.user;
                callback(true, session);
            } else {
                window.currentUser = null;
                window.currentProfile = null;
                window.currentGroup = null;
                callback(false, null);
            }
        });
    }
};