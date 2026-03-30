// Модуль управления пользователями
window.Users = {
    async loadUsers() {
        console.log('📥 Загружаем пользователей из Supabase...');
        const supabase = window.initSupabase();
        
        if (!supabase) {
            console.error('❌ Supabase не инициализирован');
            return [];
        }
        
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Ошибка загрузки участников:', error);
                Swal.fire('Ошибка', 'Не удалось загрузить список участников: ' + error.message, 'error');
                return [];
            }
            
            window.allUsers = data || [];
            console.log(`✅ Загружено ${window.allUsers.length} пользователей`);
            return window.allUsers;
        } catch (err) {
            console.error('❌ Ошибка при загрузке:', err);
            return [];
        }
    },
    
    async addUser(userData) {
        console.log('➕ Добавляем пользователя:', userData);
        const supabase = window.initSupabase();
        
        if (!supabase) {
            Swal.fire('Ошибка', 'Supabase не инициализирован', 'error');
            return false;
        }
        
        // Генерируем уникальный код
        const uniqueCode = await this.getUniqueCode();
        
        const newUser = {
            email: userData.email,
            last_name: userData.last_name,
            first_name: userData.first_name,
            patronymic: userData.patronymic || null,
            birth_date: userData.birth_date,
            unique_code: uniqueCode,
            role: 'user'
        };
        
        const { data, error } = await supabase
            .from('users')
            .insert([newUser])
            .select();
        
        if (error) {
            console.error('❌ Ошибка добавления:', error);
            Swal.fire('Ошибка', error.message, 'error');
            return false;
        }
        
        console.log('✅ Пользователь добавлен:', data);
        await this.loadUsers();
        Swal.fire('Успех!', `Участник добавлен. Код: ${uniqueCode}`, 'success');
        return true;
    },
    
    async updateUser(userId, updatedData) {
        console.log('✏️ Обновляем пользователя:', userId);
        console.log('📝 Новые данные:', updatedData);
        
        const supabase = window.initSupabase();
        
        if (!supabase) {
            Swal.fire('Ошибка', 'Supabase не инициализирован', 'error');
            return false;
        }
        
        try {
            const { error } = await supabase
                .from('users')
                .update(updatedData)
                .eq('id', userId);
            
            if (error) {
                console.error('❌ Ошибка обновления:', error);
                Swal.fire('Ошибка', error.message, 'error');
                return false;
            }
            
            console.log('✅ Пользователь обновлен в Supabase');
            
            // Обновляем локальные данные
            const index = window.allUsers.findIndex(u => u.id === userId);
            if (index !== -1) {
                window.allUsers[index] = { ...window.allUsers[index], ...updatedData, updated_at: new Date().toISOString() };
            }
            
            // Если обновляем текущего пользователя, обновляем и профиль
            if (window.currentProfile && window.currentProfile.id === userId) {
                window.currentProfile = { ...window.currentProfile, ...updatedData };
                console.log('🔄 Обновлен текущий профиль пользователя');
            }
            
            Swal.fire('Успех!', 'Данные участника обновлены', 'success');
            return true;
        } catch (err) {
            console.error('❌ Ошибка при обновлении:', err);
            Swal.fire('Ошибка', 'Не удалось обновить данные', 'error');
            return false;
        }
    },
    
    async deleteUser(userId) {
        const user = window.allUsers.find(u => u.id === userId);
        if (!user) return false;
        
        // Нельзя удалить текущего пользователя
        if (userId === window.currentProfile?.id) {
            Swal.fire('Ошибка', 'Нельзя удалить свой профиль', 'warning');
            return false;
        }
        
        const result = await Swal.fire({
            title: `Удалить ${user.last_name} ${user.first_name}?`,
            text: 'Это действие нельзя отменить',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Да, удалить',
            cancelButtonText: 'Отмена'
        });
        
        if (!result.isConfirmed) return false;
        
        const supabase = window.initSupabase();
        
        if (!supabase) {
            Swal.fire('Ошибка', 'Supabase не инициализирован', 'error');
            return false;
        }
        
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);
            
            if (error) {
                console.error('❌ Ошибка удаления:', error);
                Swal.fire('Ошибка', error.message, 'error');
                return false;
            }
            
            console.log('✅ Пользователь удален из Supabase');
            await this.loadUsers();
            Swal.fire('Удалено', 'Участник исключен из коллектива', 'success');
            return true;
        } catch (err) {
            console.error('❌ Ошибка при удалении:', err);
            Swal.fire('Ошибка', 'Не удалось удалить участника', 'error');
            return false;
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
    
    async isCodeUnique(code, excludeId = null) {
        const supabase = window.initSupabase();
        if (!supabase) return false;
        
        let query = supabase.from('users').select('id').eq('unique_code', code);
        
        if (excludeId) {
            query = query.neq('id', excludeId);
        }
        
        const { data, error } = await query;
        return !error && (!data || data.length === 0);
    },
    
    async getUniqueCode(excludeId = null) {
        let attempts = 0;
        let code;
        
        do {
            code = this.generateUniqueCode();
            attempts++;
            if (attempts > 20) {
                code = code.slice(0, 4) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
            }
        } while (!(await this.isCodeUnique(code, excludeId)));
        
        console.log('🔑 Сгенерирован уникальный код:', code);
        return code;
    },
    
    renderUsersTable(searchTerm = '') {

        this.showBackToDashboard();
        const mainContainer = document.getElementById('main-container');
        if (!mainContainer) return;
        
        const tableContainer = mainContainer.querySelector('.table-container');
        if (!tableContainer) return;
        
        if (!window.allUsers || window.allUsers.length === 0) {
            const tbody = tableContainer.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = '<tr class="empty-row"><td colspan="8">😢 Нет участников. Добавьте первого участника!</td></tr>';
            }
            this.updateStats();
            return;
        }
        
        let filteredUsers = window.allUsers;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredUsers = window.allUsers.filter(user => 
                (user.first_name?.toLowerCase() || '').includes(term) ||
                (user.last_name?.toLowerCase() || '').includes(term) ||
                (user.unique_code?.toLowerCase() || '').includes(term) ||
                (user.email?.toLowerCase() || '').includes(term) ||
                (user.patronymic?.toLowerCase() || '').includes(term)
            );
        }
        
        const tbody = tableContainer.querySelector('tbody');
        if (!tbody) return;
        
        if (filteredUsers.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="8">😢 Нет участников, соответствующих запросу.</td></tr>';
            return;
        }
        
        let html = '';
        for (const user of filteredUsers) {
            const birthDate = user.birth_date ? new Date(user.birth_date).toLocaleDateString('ru-RU') : '—';
            const isCurrentUser = window.currentProfile && user.id === window.currentProfile.id;
            
            html += `
                <tr ${isCurrentUser ? 'style="background: #fef3c7;"' : ''}>
                    <td>${isCurrentUser ? '👤 ' : ''}${user.id}</td>
                    <td><span class="user-code">${this.escapeHtml(user.unique_code || '—')}</span></td>
                    <td>${this.escapeHtml(user.last_name || '')}</td>
                    <td>${this.escapeHtml(user.first_name || '')}</td>
                    <td>${this.escapeHtml(user.patronymic || '—')}</td>
                    <td>${birthDate}</td>
                    <td>${this.escapeHtml(user.email || '—')}</td>
                    <td class="action-icons">
                        <i class="fas fa-edit" data-id="${user.id}" title="Редактировать"></i>
                        ${!isCurrentUser ? '<i class="fas fa-trash-alt" data-id="' + user.id + '" title="Удалить"></i>' : ''}
                    </td>
                </tr>
            `;
        }
        
        tbody.innerHTML = html;
        
        // Привязываем события
        tbody.querySelectorAll('.fa-edit').forEach(icon => {
            icon.addEventListener('click', () => this.openEditModal(icon.getAttribute('data-id')));
        });
        
        tbody.querySelectorAll('.fa-trash-alt').forEach(icon => {
            icon.addEventListener('click', () => this.deleteUser(icon.getAttribute('data-id')));
        });
        
        this.updateStats();
    },
    
    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    },
    
    updateStats() {
        const totalCount = window.allUsers ? window.allUsers.length : 0;
        const statsElement = document.getElementById('totalMembers');
        if (statsElement) {
            statsElement.textContent = totalCount;
        }
    },
    
    showAddModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>➕ Добавить участника</h3>
                <div class="form-group">
                    <label>Фамилия *</label>
                    <input type="text" id="addLastName" placeholder="Иванов">
                </div>
                <div class="form-group">
                    <label>Имя *</label>
                    <input type="text" id="addFirstName" placeholder="Анна">
                </div>
                <div class="form-group">
                    <label>Отчество</label>
                    <input type="text" id="addPatronymic" placeholder="Сергеевна">
                </div>
                <div class="form-group">
                    <label>Дата рождения *</label>
                    <input type="date" id="addBirthDate">
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" id="addEmail" placeholder="example@mail.com">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancelModal">Отмена</button>
                    <button class="btn btn-primary" id="confirmAdd">Добавить</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const cancelBtn = modal.querySelector('#cancelModal');
        const confirmBtn = modal.querySelector('#confirmAdd');
        
        cancelBtn.onclick = () => modal.remove();
        confirmBtn.onclick = async () => {
            const lastName = modal.querySelector('#addLastName').value.trim();
            const firstName = modal.querySelector('#addFirstName').value.trim();
            const patronymic = modal.querySelector('#addPatronymic').value.trim();
            const birthDate = modal.querySelector('#addBirthDate').value;
            const email = modal.querySelector('#addEmail').value.trim();
            
            if (!lastName || !firstName || !birthDate || !email) {
                Swal.fire('Ошибка', 'Заполните обязательные поля', 'warning');
                return;
            }
            
            await this.addUser({ 
                last_name: lastName, 
                first_name: firstName, 
                patronymic, 
                birth_date: birthDate,
                email: email
            });
            modal.remove();
            this.renderUsersTable();
        };
    },
    
    async openEditModal(userId) {
        console.log('✏️ Открываем модальное окно для редактирования, userId:', userId);
        
        const user = window.allUsers.find(u => u.id === userId);
        if (!user) {
            console.error('❌ Пользователь не найден:', userId);
            return;
        }
        
        console.log('📝 Редактируем пользователя:', user);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>✏️ Редактировать участника</h3>
                <div class="form-group">
                    <label>Фамилия *</label>
                    <input type="text" id="editLastName" value="${this.escapeHtml(user.last_name || '')}">
                </div>
                <div class="form-group">
                    <label>Имя *</label>
                    <input type="text" id="editFirstName" value="${this.escapeHtml(user.first_name || '')}">
                </div>
                <div class="form-group">
                    <label>Отчество</label>
                    <input type="text" id="editPatronymic" value="${this.escapeHtml(user.patronymic || '')}">
                </div>
                <div class="form-group">
                    <label>Дата рождения *</label>
                    <input type="date" id="editBirthDate" value="${user.birth_date || ''}">
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" id="editEmail" value="${this.escapeHtml(user.email || '')}">
                </div>
                <div class="form-group">
                    <label>Уникальный код</label>
                    <input type="text" id="editUniqueCode" value="${user.unique_code}" readonly style="background:#f3f4f6;">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancelModal">Отмена</button>
                    <button class="btn btn-primary" id="confirmEdit">Сохранить</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const cancelBtn = modal.querySelector('#cancelModal');
        const confirmBtn = modal.querySelector('#confirmEdit');
        
        cancelBtn.onclick = () => modal.remove();
        confirmBtn.onclick = async () => {
            const lastName = modal.querySelector('#editLastName').value.trim();
            const firstName = modal.querySelector('#editFirstName').value.trim();
            const patronymic = modal.querySelector('#editPatronymic').value.trim();
            const birthDate = modal.querySelector('#editBirthDate').value;
            const email = modal.querySelector('#editEmail').value.trim();
            
            console.log('📝 Сохраняем изменения:', { lastName, firstName, patronymic, birthDate, email });
            
            if (!lastName || !firstName || !birthDate || !email) {
                Swal.fire('Ошибка', 'Заполните обязательные поля', 'warning');
                return;
            }
            
            // Сохраняем изменения
            const success = await this.updateUser(userId, {
                last_name: lastName,
                first_name: firstName,
                patronymic: patronymic || null,
                birth_date: birthDate,
                email: email
            });
            
            if (success) {
                modal.remove();
                this.renderUsersTable();
            }
        };
    },
    showBackToDashboard() {
        const actionBar = document.querySelector('.action-bar');
        if (actionBar && !document.getElementById('backToDashboardBtn')) {
            const backBtn = document.createElement('button');
            backBtn.id = 'backToDashboardBtn';
            backBtn.className = 'btn btn-secondary';
            backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Назад к коллективам';
            backBtn.onclick = () => {
                window.Groups.renderDashboard();
            };
            actionBar.insertBefore(backBtn, actionBar.firstChild);
        }
    }
};