// Модуль Telegram для отправки уведомлений через Edge Function
window.Telegram = {
    async notifyGroupMembers(groupId, rehearsal) {
        const supabase = window.initSupabase();
        if (!supabase) {
            console.warn('⚠️ Supabase не инициализирован');
            return;
        }

        try {
            // Получаем текущую сессию
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.warn('⚠️ Нет активной сессии');
                return;
            }

            // URL Edge Function
            const functionUrl = `${window.SUPABASE_CONFIG.url}/functions/v1/telegram-notify`;
            
            console.log('📤 Отправляем уведомления через Edge Function...');

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    groupId,
                    rehearsal: {
                        id: rehearsal.id,
                        scheduled_date: rehearsal.scheduled_date,
                        start_time: rehearsal.start_time,
                        end_time: rehearsal.end_time,
                        location: rehearsal.location || null,
                        notes: rehearsal.notes || null
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Ошибка от Edge Function:', errorData);
                throw new Error(errorData.error || 'Ошибка отправки уведомлений');
            }

            const result = await response.json();
            console.log('📊 Результаты отправки:', result.stats);
            
            if (result.stats?.sent > 0) {
                console.log(`✅ Уведомления отправлены: ${result.stats.sentTo.join(', ')}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Ошибка при отправке уведомлений:', error);
        }
    }
};