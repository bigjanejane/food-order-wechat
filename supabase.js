// Supabase数据库操作
class SupabaseService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.init();
    }
    
    init() {
        // 检查Supabase配置
        if (!CONFIG.supabase.url || !CONFIG.supabase.key || 
            CONFIG.supabase.url.includes("your-project")) {
            console.log("使用本地存储模式（未配置Supabase）");
            return;
        }
        
        // 动态加载Supabase客户端
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
            this.supabase = window.supabase.createClient(
                CONFIG.supabase.url,
                CONFIG.supabase.key
            );
            this.initialized = true;
            console.log("Supabase初始化成功");
        };
        document.head.appendChild(script);
    }
    
    // 检查是否可用
    isAvailable() {
        return this.initialized && this.supabase !== null;
    }
    
    // 获取菜品列表
    async getFoods() {
        if (!this.isAvailable()) {
            return JSON.parse(localStorage.getItem('foods')) || [];
        }
        
        try {
            const { data, error } = await this.supabase
                .from(CONFIG.tables.foods)
                .select('*')
                .order('id', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("获取菜品失败:", error);
            return JSON.parse(localStorage.getItem('foods')) || [];
        }
    }
    
    // 添加菜品
    async addFood(food) {
        // 本地备份
        const localFoods = JSON.parse(localStorage.getItem('foods')) || [];
        food.id = localFoods.length > 0 ? Math.max(...localFoods.map(f => f.id)) + 1 : 1;
        localFoods.push(food);
        localStorage.setItem('foods', JSON.stringify(localFoods));
        
        if (!this.isAvailable()) return food.id;
        
        try {
            const { data, error } = await this.supabase
                .from(CONFIG.tables.foods)
                .insert([food])
                .select();
            
            if (error) throw error;
            return data[0]?.id || food.id;
        } catch (error) {
            console.error("添加菜品失败:", error);
            return food.id;
        }
    }
    
    // 更新菜品
    async updateFood(id, updates) {
        // 本地更新
        const localFoods = JSON.parse(localStorage.getItem('foods')) || [];
        const index = localFoods.findIndex(f => f.id === id);
        if (index !== -1) {
            localFoods[index] = { ...localFoods[index], ...updates };
            localStorage.setItem('foods', JSON.stringify(localFoods));
        }
        
        if (!this.isAvailable()) return true;
        
        try {
            const { error } = await this.supabase
                .from(CONFIG.tables.foods)
                .update(updates)
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error("更新菜品失败:", error);
            return false;
        }
    }
    
    // 删除菜品
    async deleteFood(id) {
        // 本地删除
        let localFoods = JSON.parse(localStorage.getItem('foods')) || [];
        localFoods = localFoods.filter(f => f.id !== id);
        localStorage.setItem('foods', JSON.stringify(localFoods));
        
        if (!this.isAvailable()) return true;
        
        try {
            const { error } = await this.supabase
                .from(CONFIG.tables.foods)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error("删除菜品失败:", error);
            return false;
        }
    }
    
    // 获取点餐记录
    async getOrders() {
        if (!this.isAvailable()) {
            return JSON.parse(localStorage.getItem('orders')) || [];
        }
        
        try {
            const { data, error } = await this.supabase
                .from(CONFIG.tables.orders)
                .select('*')
                .order('timestamp', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("获取点餐记录失败:", error);
            return JSON.parse(localStorage.getItem('orders')) || [];
        }
    }
    
    // 添加点餐记录
    async addOrder(order) {
        // 本地备份
        const localOrders = JSON.parse(localStorage.getItem('orders')) || [];
        order.id = Date.now();
        order.timestamp = new Date().toISOString();
        localOrders.push(order);
        localStorage.setItem('orders', JSON.stringify(localOrders));
        
        if (!this.isAvailable()) return order.id;
        
        try {
            const { data, error } = await this.supabase
                .from(CONFIG.tables.orders)
                .insert([order])
                .select();
            
            if (error) throw error;
            return data[0]?.id || order.id;
        } catch (error) {
            console.error("添加点餐记录失败:", error);
            return order.id;
        }
    }
    
    // 获取设置
    async getSettings() {
        if (!this.isAvailable()) {
            const password = localStorage.getItem('adminPassword');
            return { adminPassword: password || CONFIG.adminPassword };
        }
        
        try {
            const { data, error } = await this.supabase
                .from(CONFIG.tables.settings)
                .select('*')
                .eq('key', 'adminPassword')
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116是"没有数据"的错误
            
            return {
                adminPassword: data?.value || CONFIG.adminPassword
            };
        } catch (error) {
            console.error("获取设置失败:", error);
            const password = localStorage.getItem('adminPassword');
            return { adminPassword: password || CONFIG.adminPassword };
        }
    }
    
    // 更新设置
    async updateSettings(key, value) {
        // 本地保存
        if (key === 'adminPassword') {
            localStorage.setItem('adminPassword', value);
        }
        
        if (!this.isAvailable()) return true;
        
        try {
            // 先尝试更新
            const { error: updateError } = await this.supabase
                .from(CONFIG.tables.settings)
                .update({ value })
                .eq('key', key);
            
            // 如果不存在则插入
            if (updateError) {
                const { error: insertError } = await this.supabase
                    .from(CONFIG.tables.settings)
                    .insert([{ key, value }]);
                
                if (insertError) throw insertError;
            }
            
            return true;
        } catch (error) {
            console.error("更新设置失败:", error);
            return false;
        }
    }
}

// 创建全局实例
window.supabaseService = new SupabaseService();