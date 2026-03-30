// Модуль управления коллективами
window.Groups = {
    allGroups: [],
    userGroups: [],
    currentGroupMembers: new Map(),
    
    // Загрузка коллективов пользователя
    async loadUserGroups() {
        console.log('📚 Загружаем коллективы пользователя...');
        const supabase = window.initSupabase();
        
        if (!supabase) return [];
        
        try {
            const { data: memberships, error: membershipError } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', window.currentProfile.id);
            
            if (membershipError) throw membershipError;
            
            if (!memberships || memberships.length === 0) {
                console.log('ℹ️ Пользователь не состоит ни в одном коллективе');
                this.userGroups = [];
                return [];
            }
            
            const groupIds = memberships.map(m => m.group_id);
            
            const { data: groups, error: groupsError } = await supabase
                .from('dance_groups')
                .select('*')
                .in('id', groupIds)
                .order('name');
            
            if (groupsError) throw groupsError;
            
            console.log(`✅ Загружено ${groups?.length || 0} коллективов пользователя`);
            this.userGroups = groups || [];
            return this.userGroups;
        } catch (err) {
            console.error('❌ Ошибка загрузки коллективов пользователя:', err);
            return [];
        }
    },
    
    // Загрузка участников коллектива
    async loadGroupMembers(groupId) {
        console.log(`👥 Загружаем участников коллектива ${groupId}`);
        const supabase = window.initSupabase();
        
        if (!supabase) return [];
        
        try {
            const { data: memberships, error: membershipError } = await supabase
                .from('group_members')
                .select('user_id, role, joined_at')
                .eq('group_id', groupId);
            
            if (membershipError) throw membershipError;
            
            if (!memberships || memberships.length === 0) {
                this.currentGroupMembers.set(groupId, []);
                return [];
            }
            
            const userIds = memberships.map(m => m.user_id);
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, last_name, first_name, patronymic, unique_code, email, nickname, birth_date')
                .in('id', userIds);
            
            if (usersError) throw usersError;
            
            const members = memberships.map(membership => {
                const user = users.find(u => u.id === membership.user_id);
                return {
                    ...user,
                    role: membership.role,
                    joined_at: membership.joined_at
                };
            });
            
            this.currentGroupMembers.set(groupId, members);
            return members;
        } catch (err) {
            console.error('❌ Ошибка загрузки участников:', err);
            return [];
        }
    },
    
    // Создание нового коллектива
    async createGroup(groupData) {
        console.log('➕ Создаем новый коллектив:', groupData);
        const supabase = window.initSupabase();
        
        if (!supabase) return null;
        
        try {
            const leaderName = window.currentProfile.last_name + ' ' + window.currentProfile.first_name;
            
            const { data, error } = await supabase
                .from('dance_groups')
                .insert([{
                    name: groupData.name,
                    leader_id: window.currentProfile.id,
                    leader_name: leaderName,
                    description: groupData.description || null
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            await this.addMemberToGroup(data.id, window.currentProfile.id, 'leader');
            await this.loadUserGroups();
            console.log('✅ Коллектив создан:', data);
            return data;
        } catch (err) {
            console.error('❌ Ошибка создания коллектива:', err);
            throw err;
        }
    },
    
    // Обновление коллектива
    async updateGroup(groupId, updatedData) {
        console.log('✏️ Обновляем коллектив:', groupId, updatedData);
        const supabase = window.initSupabase();
        
        if (!supabase) return null;
        
        try {
            const { data, error } = await supabase
                .from('dance_groups')
                .update(updatedData)
                .eq('id', groupId)
                .select()
                .single();
            
            if (error) throw error;
            
            await this.loadUserGroups();
            console.log('✅ Коллектив обновлен:', data);
            return data;
        } catch (err) {
            console.error('❌ Ошибка обновления коллектива:', err);
            throw err;
        }
    },
    
    // Удаление коллектива
    async deleteGroup(groupId) {
        console.log('🗑️ Удаляем коллектив:', groupId);
        const supabase = window.initSupabase();
        
        if (!supabase) return false;
        
        try {
            const { error } = await supabase
                .from('dance_groups')
                .delete()
                .eq('id', groupId);
            
            if (error) throw error;
            
            await this.loadUserGroups();
            console.log('✅ Коллектив удален');
            return true;
        } catch (err) {
            console.error('❌ Ошибка удаления коллектива:', err);
            throw err;
        }
    },
    
    // Добавление участника в коллектив
    async addMemberToGroup(groupId, userId, role = 'member') {
        console.log(`➕ Добавляем участника ${userId} в коллектив ${groupId}`);
        const supabase = window.initSupabase();
        
        if (!supabase) return false;
        
        try {
            const { error } = await supabase
                .from('group_members')
                .insert([{
                    group_id: groupId,
                    user_id: userId,
                    role: role
                }]);
            
            if (error) throw error;
            
            this.currentGroupMembers.delete(groupId);
            
            if (userId === window.currentProfile.id) {
                await this.loadUserGroups();
            }
            
            console.log('✅ Участник добавлен');
            return true;
        } catch (err) {
            console.error('❌ Ошибка добавления участника:', err);
            throw err;
        }
    },
    
    // Удаление участника из коллектива
    async removeMemberFromGroup(groupId, userId) {
        console.log(`➖ Удаляем участника ${userId} из коллектива ${groupId}`);
        const supabase = window.initSupabase();
        
        if (!supabase) return false;
        
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);
            
            if (error) throw error;
            
            this.currentGroupMembers.delete(groupId);
            
            if (userId === window.currentProfile.id) {
                await this.loadUserGroups();
            }
            
            console.log('✅ Участник удален');
            return true;
        } catch (err) {
            console.error('❌ Ошибка удаления участника:', err);
            throw err;
        }
    },
    
    // Проверить, является ли пользователь лидером коллектива
    isGroupLeader(groupId) {
        const group = this.userGroups.find(g => g.id === groupId);
        return group?.leader_id === window.currentProfile?.id;
    },
    
    // Отображение дашборда
    async renderDashboard() {
        console.log('🎨 Рендерим дашборд');
        const mainContainer = document.getElementById('main-container');
        
        if (!mainContainer) return;
        
        await this.loadUserGroups();
        
        const userName = window.currentProfile ? 
            (window.currentProfile.nickname ? window.currentProfile.nickname : (window.currentProfile.last_name + ' ' + window.currentProfile.first_name)) :
            window.currentUser?.email || 'Пользователь';
        
        const userCode = window.currentProfile?.unique_code || '—';
        const isAdmin = window.currentProfile?.role === 'admin';
        
        const leaderGroupsCount = this.userGroups.filter(g => this.isGroupLeader(g.id)).length;
        const totalGroupsCount = this.userGroups.length;
        
        mainContainer.innerHTML = `
            <div class="main-header">
                <div class="logo">
                    <h1>💃 Танцевальный менеджер</h1>
                    <p>Управление танцевальными коллективами</p>
                </div>
                <div class="user-info">
                    <span class="user-name">
                        <i class="fas fa-user-circle"></i> ${this.escapeHtml(userName)}
                        ${window.currentProfile?.unique_code ? '<span class="user-code" style="margin-left: 10px;">Код: ' + window.currentProfile.unique_code + '</span>' : ''}
                        ${isAdmin ? '<span class="user-code" style="margin-left: 10px; background: #ef4444;">👑 Админ</span>' : ''}
                    </span>
                    <button class="btn btn-secondary" id="profileBtn" style="background: #8b5cf6;">
                        <i class="fas fa-user"></i> Профиль
                    </button>
                    ${isAdmin ? `
                        <button class="btn btn-secondary" id="manageMembersBtn" style="background: #8b5cf6;">
                            <i class="fas fa-users"></i> Все участники
                        </button>
                    ` : ''}
                    <button class="logout-btn" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Выйти
                    </button>
                </div>
            </div>
            
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalGroupsCount}</h3>
                        <p>Мои коллективы</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${leaderGroupsCount}</h3>
                        <p>Где я лидер</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-qrcode"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.escapeHtml(userCode)}</h3>
                        <p>Ваш код</p>
                    </div>
                </div>
            </div>
            
            <div class="action-bar">
                <button class="btn btn-primary" id="createGroupBtn">
                    <i class="fas fa-plus-circle"></i> Создать коллектив
                </button>
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="searchGroupsInput" placeholder="Поиск по моим коллективам...">
                </div>
                <button class="btn btn-secondary" id="refreshGroupsBtn">
                    <i class="fas fa-sync-alt"></i> Обновить
                </button>
            </div>
            
            <div class="groups-grid" id="groupsGrid">
                ${this.renderGroupsCards()}
            </div>
        `;
        
        this.bindDashboardEvents();
    },
    
    // Рендеринг карточек коллективов
    renderGroupsCards(searchTerm = '') {
        let filteredGroups = this.userGroups;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredGroups = this.userGroups.filter(group => 
                group.name.toLowerCase().includes(term) ||
                group.leader_name.toLowerCase().includes(term) ||
                (group.description && group.description.toLowerCase().includes(term))
            );
        }
        
        if (filteredGroups.length === 0) {
            const message = searchTerm ? 'Коллективы не найдены' : 'Вы пока не состоите ни в одном коллективе';
            return `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.Groups.showCreateGroupModal()">
                        <i class="fas fa-plus-circle"></i> Создать первый коллектив
                    </button>
                </div>
            `;
        }
        
        return filteredGroups.map(group => {
            const isLeader = this.isGroupLeader(group.id);
            const badge = isLeader ? '<span class="leader-badge">👑 Лидер</span>' : '<span class="member-badge">💃 Участник</span>';
            const createdDate = new Date(group.created_at).toLocaleDateString('ru-RU');
            const descriptionHtml = group.description ? '<p><i class="fas fa-info-circle"></i> ' + this.escapeHtml(group.description) + '</p>' : '';
            
            return `
                <div class="group-card" data-group-id="${group.id}">
                    <div class="group-card-header">
                        <h3><i class="fas fa-users"></i> ${this.escapeHtml(group.name)}</h3>
                        ${badge}
                    </div>
                    <div class="group-card-body">
                        <p><i class="fas fa-user-tie"></i> Лидер: ${this.escapeHtml(group.leader_name)}</p>
                        ${descriptionHtml}
                        <p><i class="fas fa-calendar-alt"></i> Создан: ${createdDate}</p>
                    </div>
                    <div class="group-card-actions">
                        <button class="btn btn-secondary view-group-btn" data-group-id="${group.id}">
                            <i class="fas fa-eye"></i> Просмотр
                        </button>
                        ${isLeader ? `
                            <button class="btn btn-primary edit-group-btn" data-group-id="${group.id}">
                                <i class="fas fa-edit"></i> Редактировать
                            </button>
                            <button class="btn btn-danger delete-group-btn" data-group-id="${group.id}">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // Показ модального окна создания коллектива
    showCreateGroupModal() {
        Swal.fire({
            title: 'Создать коллектив',
            html: `
                <input type="text" id="group-name" class="swal2-input" placeholder="Название коллектива*">
                <textarea id="group-description" class="swal2-textarea" placeholder="Описание (необязательно)"></textarea>
            `,
            showCancelButton: true,
            confirmButtonText: 'Создать',
            cancelButtonText: 'Отмена',
            preConfirm: async () => {
                const name = document.getElementById('group-name').value.trim();
                const description = document.getElementById('group-description').value.trim();
                
                if (!name) {
                    Swal.showValidationMessage('Введите название коллектива');
                    return false;
                }
                
                try {
                    await this.createGroup({ name, description });
                    await this.renderDashboard();
                    Swal.fire('Успех!', 'Коллектив создан', 'success');
                } catch (err) {
                    Swal.showValidationMessage('Ошибка: ' + err.message);
                }
            }
        });
    },
    
    // Показ модального окна редактирования коллектива
    async showEditGroupModal(groupId) {
        const group = this.userGroups.find(g => g.id === groupId);
        if (!group) return;
        
        Swal.fire({
            title: 'Редактировать коллектив',
            html: `
                <input type="text" id="group-name" class="swal2-input" placeholder="Название коллектива*" value="${this.escapeHtml(group.name)}">
                <textarea id="group-description" class="swal2-textarea" placeholder="Описание">${this.escapeHtml(group.description || '')}</textarea>
            `,
            showCancelButton: true,
            confirmButtonText: 'Сохранить',
            cancelButtonText: 'Отмена',
            preConfirm: async () => {
                const name = document.getElementById('group-name').value.trim();
                const description = document.getElementById('group-description').value.trim();
                
                if (!name) {
                    Swal.showValidationMessage('Введите название коллектива');
                    return false;
                }
                
                try {
                    await this.updateGroup(groupId, { name, description });
                    await this.renderDashboard();
                    Swal.fire('Успех!', 'Коллектив обновлен', 'success');
                } catch (err) {
                    Swal.showValidationMessage('Ошибка: ' + err.message);
                }
            }
        });
    },
    
    // Просмотр коллектива
    async viewGroup(groupId) {
        const group = this.userGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const members = await this.loadGroupMembers(groupId);
        const isLeader = this.isGroupLeader(groupId);
        
        let membersHtml = '';
        for (const m of members) {
            const displayName = m.nickname ? m.nickname : `${m.last_name} ${m.first_name}`;
            const roleText = m.role === 'leader' ? '👑 Лидер' : '💃 Участник';
            const removeButton = (isLeader && m.id !== window.currentProfile.id) ? 
                '<button class="btn btn-danger remove-member-btn" data-user-id="' + m.id + '" style="padding: 5px 10px; font-size: 12px;"><i class="fas fa-user-minus"></i></button>' : '';
            
            // Кнопка просмотра информации доступна только лидеру
            const infoButton = isLeader ? `<button class="btn btn-secondary info-member-btn" data-user-id="${m.id}" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">
                <i class="fas fa-info-circle"></i>
            </button>` : '';
            
            membersHtml += `
                <div class="member-item">
                    <div>
                        <strong>${this.escapeHtml(displayName)}</strong>
                        <span class="member-role">${roleText}</span>
                        <div class="member-code">Код: ${m.unique_code}</div>
                    </div>
                    <div>
                        ${infoButton}
                        ${removeButton}
                    </div>
                </div>
            `;
        }
        
        const addMemberSection = isLeader ? `
            <hr>
            <div class="add-member-section">
                <h4>Добавить участника</h4>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="member-code" placeholder="Введите код участника" style="flex: 1;">
                    <button id="add-member-by-code" class="btn btn-primary">Добавить</button>
                </div>
            </div>
        ` : '';
        
        Swal.fire({
            title: group.name,
            html: `
                <div style="text-align: left;">
                    <p><strong>Лидер:</strong> ${this.escapeHtml(group.leader_name)}</p>
                    ${group.description ? '<p><strong>Описание:</strong> ' + this.escapeHtml(group.description) + '</p>' : ''}
                    <p><strong>Создан:</strong> ${new Date(group.created_at).toLocaleDateString('ru-RU')}</p>
                    <hr>
                    <h3>Участники (${members.length})</h3>
                    <div class="group-members-list">
                        ${membersHtml}
                    </div>
                    ${addMemberSection}
                </div>
            `,
            width: '600px',
            showConfirmButton: true,
            confirmButtonText: 'Закрыть',
            didOpen: () => {
                // Обработчик добавления участника
                if (isLeader) {
                    const addBtn = document.getElementById('add-member-by-code');
                    if (addBtn) {
                        addBtn.addEventListener('click', async () => {
                            const code = document.getElementById('member-code').value.trim();
                            if (!code) {
                                Swal.fire('Ошибка', 'Введите код участника', 'warning');
                                return;
                            }
                            
                            const user = window.allUsers.find(u => u.unique_code === code);
                            if (!user) {
                                Swal.fire('Ошибка', 'Участник с таким кодом не найден', 'error');
                                return;
                            }
                            
                            try {
                                await this.addMemberToGroup(groupId, user.id);
                                Swal.fire('Успех!', 'Участник добавлен', 'success');
                                this.viewGroup(groupId);
                            } catch (err) {
                                Swal.fire('Ошибка', err.message, 'error');
                            }
                        });
                    }
                }
                
                // Обработчик удаления участника
                document.querySelectorAll('.remove-member-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const userId = btn.dataset.userId;
                        const result = await Swal.fire({
                            title: 'Удалить участника?',
                            text: 'Вы уверены?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Да, удалить',
                            cancelButtonText: 'Отмена'
                        });
                        
                        if (result.isConfirmed) {
                            try {
                                await this.removeMemberFromGroup(groupId, userId);
                                Swal.fire('Успех!', 'Участник удален', 'success');
                                this.viewGroup(groupId);
                            } catch (err) {
                                Swal.fire('Ошибка', err.message, 'error');
                            }
                        }
                    });
                });
                
                // Обработчик просмотра информации об участнике (только если есть такие кнопки)
                document.querySelectorAll('.info-member-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const userId = btn.dataset.userId;
                        const user = members.find(m => m.id === userId);
                        if (user) {
                            this.showUserInfoModal(user);
                        }
                    });
                });
            }
        });
    },
    
    // Показать модальное окно с полной информацией об участнике
    showUserInfoModal(user) {
        const fullName = `${user.last_name} ${user.first_name}${user.patronymic ? ' ' + user.patronymic : ''}`;
        const birthDate = user.birth_date ? new Date(user.birth_date).toLocaleDateString('ru-RU') : 'Не указана';
        
        Swal.fire({
            title: 'Информация об участнике',
            html: `
                <div style="text-align: left;">
                    <p><strong>Фамилия:</strong> ${this.escapeHtml(user.last_name)}</p>
                    <p><strong>Имя:</strong> ${this.escapeHtml(user.first_name)}</p>
                    <p><strong>Отчество:</strong> ${this.escapeHtml(user.patronymic || '—')}</p>
                    <p><strong>Дата рождения:</strong> ${birthDate}</p>
                    ${user.nickname ? `<p><strong>Никнейм:</strong> ${this.escapeHtml(user.nickname)}</p>` : ''}
                    <p><strong>Код:</strong> ${this.escapeHtml(user.unique_code)}</p>
                    <p><strong>Email:</strong> ${this.escapeHtml(user.email)}</p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Закрыть'
        });
    },
    
    // Привязка событий дашборда
    bindDashboardEvents() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => window.Auth.logout());
        }
        
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                if (window.Profile && window.Profile.showProfilePage) {
                    window.Profile.showProfilePage();
                } else {
                    console.error('Profile module not loaded');
                }
            });
        }
        
        const manageMembersBtn = document.getElementById('manageMembersBtn');
        if (manageMembersBtn) {
            manageMembersBtn.addEventListener('click', () => {
                if (window.Users && window.Users.renderFullUsersTable) {
                    window.Users.renderFullUsersTable();
                }
            });
        }
        
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => this.showCreateGroupModal());
        }
        
        const refreshBtn = document.getElementById('refreshGroupsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadUserGroups();
                await this.renderDashboard();
            });
        }
        
        const searchInput = document.getElementById('searchGroupsInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const groupsGrid = document.getElementById('groupsGrid');
                if (groupsGrid) {
                    groupsGrid.innerHTML = this.renderGroupsCards(e.target.value);
                    this.bindGroupCardEvents();
                }
            });
        }
        
        this.bindGroupCardEvents();
    },
    
    // Привязка событий карточек
    bindGroupCardEvents() {
        document.querySelectorAll('.view-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                this.viewGroup(groupId);
            });
        });
        
        document.querySelectorAll('.edit-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                this.showEditGroupModal(groupId);
            });
        });
        
        document.querySelectorAll('.delete-group-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                const result = await Swal.fire({
                    title: 'Удалить коллектив?',
                    text: 'Это действие нельзя отменить. Все участники будут удалены из коллектива.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Да, удалить',
                    cancelButtonText: 'Отмена'
                });
                
                if (result.isConfirmed) {
                    try {
                        await this.deleteGroup(groupId);
                        await this.renderDashboard();
                        Swal.fire('Успех!', 'Коллектив удален', 'success');
                    } catch (err) {
                        Swal.fire('Ошибка', err.message, 'error');
                    }
                }
            });
        });
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