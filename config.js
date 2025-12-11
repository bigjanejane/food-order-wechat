// 在线部署配置文件
const CONFIG = {
    // 管理员初始密码（可以在管理界面修改）
    adminPassword: "admin123",
    
    // Supabase配置（需要你注册后填写）
    supabase: {
        url: "https://muvgrikxykfqepyuimom.supabase.co", // 替换为你的Supabase URL
        key: "sb_secret_p7qMtGrNnC9lXavCY-yslQ_DMRKJvE8" // 替换为你的Supabase anon key
    },
    
    // 数据库表名称
    tables: {
        foods: "foods",
        orders: "orders",
        settings: "settings"
    }
};

// 导出配置
window.CONFIG = CONFIG;

// 检查是否已配置Supabase
if (CONFIG.supabase.url.includes("your-project") || CONFIG.supabase.key.includes("your-anon-key")) {
    console.warn("⚠️ 请先配置Supabase信息！");
}