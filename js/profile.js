// Модуль профиля
window.Profile = {
    async loadAndRender() {
        const supabase = window.initSupabase();
        
        // Загружаем профиль
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .single();
        
        if (error || !profile) {
            await this.createProfile();
            return;
        }
        
        window.currentProfile = profile;
        
        // Загружаем группу
        if (profile.group_id) {
            const { data: group } = await supabase
                .from('groups')
                .select('*')
                .eq('id', profile.group_id)
                .single();
            window.currentGroup = group;
        }
        
        window.App.renderDashboard();
    },
    
    async createProfile() {
        const supabase = window.initSupabase();
        const code = await this.generateUniqueCode();
        
        const { error } = await supabase
            .from('profiles')
            .insert({
                id: window.currentUser.id,
                name: window.currentUser.user_metadata?.full_name || window.currentUser.email,
                full_name: window.currentUser.user_metadata?.full_name || window.currentUser.email,
                unique_code: code,
                role: 'member',
                email: window.currentUser.email
            });
        
        if (error) {
            console.error('Ошибка создания профиля', error);
        } else {
            await this.loadAndRender();
        }
    },
    
    async generateUniqueCode() {
        const supabase = window.initSupabase();
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        let isUnique = false;
        
        while (!isUnique) {
            code = '';
            for (let i = 0; i < 5; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            const { data } = await supabase
                .from('profiles')
                .select('unique_code')
                .eq('unique_code', code);
            
            if (!data || data.length === 0) {
                isUnique = true;
            }
        }
        
        return code;
    },
    
    async updateName(newName) {
        const supabase = window.initSupabase();
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: newName, name: newName })
            .eq('id', window.currentUser.id);
        
        if (error) {
            alert('Ошибка: ' + error.message);
            return false;
        }
        
        window.currentProfile.full_name = newName;
        alert('Имя обновлено!');
        return true;
    },
    
    async joinGroup(inviteCode) {
        const supabase = window.initSupabase();
        const { data: group, error } = await supabase
            .from('groups')
            .select('id')
            .eq('invite_code', inviteCode)
            .single();
        
        if (error || !group) {
            alert('Неверный код приглашения');
            return false;
        }
        
        const { error: joinError } = await supabase
            .from('profiles')
            .update({ group_id: group.id })
            .eq('id', window.currentUser.id);
        
        if (joinError) {
            alert('Ошибка: ' + joinError.message);
            return false;
        }
        
        alert('Вы вступили в коллектив!');
        await this.loadAndRender();
        return true;
    },
    
    render() {
        const container = document.getElementById('tab-content');
        container.innerHTML = `
            <div class="profile-card">
                <h3>Информация о профиле</h3>
                <div class="info-row">
                    <strong>Ваш уникальный код:</strong>
                    <div class="code-display">${window.currentProfile.unique_code}</div>
                    <button id="copy-code" class="small">Скопировать</button>
                </div>
                <div class="info-row">
                    <strong>Имя:</strong>
                    <input type="text" id="edit-name" value="${this.escapeHtml(window.currentProfile.full_name || '')}">
                    <button id="update-name" class="small">Обновить</button>
                </div>
                <div class="info-row">
                    <strong>Email:</strong>
                    <span>${this.escapeHtml(window.currentUser.email)}</span>
                </div>
                <div class="info-row">
                    <strong>Коллектив:</strong>
                    ${window.currentGroup ? `<span>${this.escapeHtml(window.currentGroup.name)}</span>` : '<span class="warning">Вы не состоите в коллективе</span>'}
                </div>
                ${!window.currentGroup ? `
                    <div class="join-group">
                        <h4>Вступить в коллектив</h4>
                        <input type="text" id="invite-code" placeholder="Введите код приглашения" maxlength="10">
                        <button id="join-group">Вступить</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('copy-code')?.addEventListener('click', () => {
            navigator.clipboard.writeText(window.currentProfile.unique_code);
            alert('Код скопирован!');
        });
        
        document.getElementById('update-name')?.addEventListener('click', async () => {
            const newName = document.getElementById('edit-name').value;
            if (newName) {
                await this.updateName(newName);
                this.render();
            }
        });
        
        document.getElementById('join-group')?.addEventListener('click', async () => {
            const inviteCode = document.getElementById('invite-code').value;
            await this.joinGroup(inviteCode);
        });
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};