// 主应用程序 - 完整整合版
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化日期选择
    setupDateButtons();
    
    // 如果是用户界面，加载菜品和点餐记录
    if (window.location.hash !== '#admin') {
        await loadFoods();
        await loadOrders();
    }
    
    // 如果是通过管理员链接访问，显示管理员登录
    if (window.location.hash === '#admin') {
        setTimeout(() => {
            showAdminLogin();
            document.getElementById('adminPassword').value = '';
        }, 500);
    }
});

// 设置未来7天的日期按钮
function setupDateButtons() {
    const dateButtonsDiv = document.getElementById('dateButtons');
    if (!dateButtonsDiv) return;
    
    dateButtonsDiv.innerHTML = '';
    const selectedDates = [];
    
    // 生成未来7天的日期
    for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const dateStr = date.toLocaleDateString('zh-CN', { 
            month: '2-digit', 
            day: '2-digit',
            weekday: 'short'
        });
        
        const dateISO = date.toISOString().split('T')[0];
        
        const button = document.createElement('div');
        button.className = 'date-btn';
        button.textContent = dateStr;
        button.dataset.date = dateISO;
        
        button.onclick = function() {
            this.classList.toggle('selected');
            updateSelectedDates();
        };
        
        dateButtonsDiv.appendChild(button);
    }
}

// 更新已选日期显示
function updateSelectedDates() {
    const selectedButtons = document.querySelectorAll('.date-btn.selected');
    const selectedDates = Array.from(selectedButtons).map(btn => {
        const date = new Date(btn.dataset.date);
        return date.toLocaleDateString('zh-CN', { 
            month: '2-digit', 
            day: '2-digit',
            weekday: 'short'
        });
    });
    
    const selectedDatesText = document.getElementById('selectedDatesText');
    if (selectedDatesText) {
        selectedDatesText.textContent = selectedDates.length > 0 ? 
            selectedDates.join(', ') : '未选择';
    }
}

// 进入用户界面
function enterAsUser() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('userPage').style.display = 'block';
    
    // 重新加载数据
    loadFoods();
    loadOrders();
}

// 显示管理员登录
function showAdminLogin() {
    document.getElementById('adminLogin').style.display = 'block';
}

// 以管理员身份登录
async function loginAsAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    try {
        // 从数据库获取密码
        const settings = await window.supabaseService.getSettings();
        const savedPassword = settings.adminPassword || CONFIG.adminPassword;
        
        if (password === savedPassword) {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('adminPage').style.display = 'block';
            
            // 加载管理员数据
            await loadFoodsForAdmin();
            await loadAllOrders();
        } else {
            alert('密码错误！');
        }
    } catch (error) {
        console.error("登录失败:", error);
        alert('登录失败，请检查网络连接。');
    }
}

// 返回登录界面
function switchToLogin() {
    document.getElementById('userPage').style.display = 'none';
    document.getElementById('adminPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'block';
    
    // 清空用户输入
    if (document.getElementById('userName')) {
        document.getElementById('userName').value = '';
    }
    
    // 重置日期选择
    document.querySelectorAll('.date-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
    });
    updateSelectedDates();
}

// 加载菜品数据（用户界面）
async function loadFoods() {
    const foodItemsDiv = document.getElementById('foodItems');
    if (!foodItemsDiv) return;
    
    foodItemsDiv.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const foods = await window.supabaseService.getFoods();
        
        if (foods.length === 0) {
            foodItemsDiv.innerHTML = '<p>暂无菜品，请联系管理员添加。</p>';
            return;
        }
        
        foodItemsDiv.innerHTML = '';
        
        foods.forEach(food => {
            const foodCard = document.createElement('div');
            foodCard.className = 'food-card';
            foodCard.dataset.id = food.id;
            
            // 转换链接为可点击
            let recipeHtml = food.recipe || '';
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            recipeHtml = recipeHtml.replace(urlRegex, url => 
                `<a href="${url}" target="_blank">${url}</a>`
            );
            
            foodCard.innerHTML = `
                <img src="${food.image}" alt="${food.name}" class="food-image" onerror="this.src='https://images.unsplash.com/photo-1575932444877-5106bee4f58c?w=400&h=300&fit=crop'">
                <div class="food-info">
                    <div class="food-name">${food.name}</div>
                    <div class="food-recipe">${recipeHtml}</div>
                    <button class="order-btn" onclick="selectFood(${food.id})" id="foodBtn-${food.id}">
                        点这道菜
                    </button>
                </div>
            `;
            
            foodItemsDiv.appendChild(foodCard);
        });
    } catch (error) {
        console.error("加载菜品失败:", error);
        foodItemsDiv.innerHTML = '<p class="error-message">加载菜品失败，请刷新重试。</p>';
    }
}

// 加载菜品数据（管理员界面）
async function loadFoodsForAdmin() {
    const adminFoodListDiv = document.getElementById('adminFoodList');
    if (!adminFoodListDiv) return;
    
    adminFoodListDiv.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const foods = await window.supabaseService.getFoods();
        
        if (foods.length === 0) {
            adminFoodListDiv.innerHTML = '<p>暂无菜品，请添加。</p>';
            return;
        }
        
        adminFoodListDiv.innerHTML = '';
        
        foods.forEach((food, index) => {
            const foodItem = document.createElement('div');
            foodItem.className = 'admin-food-item';
            
            // 截取长文本显示
            const imagePreview = food.image.length > 50 ? 
                food.image.substring(0, 50) + '...' : food.image;
            const recipePreview = food.recipe && food.recipe.length > 80 ? 
                food.recipe.substring(0, 80) + '...' : (food.recipe || '无做法说明');
            
            foodItem.innerHTML = `
                <strong>${food.name}</strong>
                <p>图片链接：${imagePreview}</p>
                <p>做法：${recipePreview}</p>
                <div class="food-controls">
                    <button class="edit-btn" onclick="editFood(${food.id})">编辑</button>
                    <button class="delete-btn" onclick="deleteFood(${food.id})">删除</button>
                </div>
            `;
            
            adminFoodListDiv.appendChild(foodItem);
        });
    } catch (error) {
        console.error("加载菜品失败:", error);
        adminFoodListDiv.innerHTML = '<p class="error-message">加载菜品失败，请刷新重试。</p>';
    }
}

// 加载点餐记录（用户界面）
async function loadOrders() {
    const orderListDiv = document.getElementById('orderList');
    if (!orderListDiv) return;
    
    orderListDiv.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const orders = await window.supabaseService.getOrders();
        
        if (orders.length === 0) {
            orderListDiv.innerHTML = '<p>暂无点餐记录。</p>';
            return;
        }
        
        orderListDiv.innerHTML = '';
        
        // 只显示最近10条记录
        const recentOrders = orders.slice(-10).reverse();
        
        // 先获取菜品列表，用于显示菜品名称
        const foods = await window.supabaseService.getFoods();
        
        recentOrders.forEach(order => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            
            // 格式化日期显示
            const dateDisplay = Array.isArray(order.dates) ? order.dates.map(date => {
                try {
                    const d = new Date(date);
                    return isNaN(d.getTime()) ? date : `${d.getMonth()+1}/${d.getDate()}`;
                } catch {
                    return date;
                }
            }).join(', ') : '日期错误';
            
            // 获取菜品名称
            const foodNames = Array.isArray(order.food_ids) ? order.food_ids.map(id => {
                const food = foods.find(f => f.id === id);
                return food ? food.name : '未知菜品';
            }).join(', ') : '菜品错误';
            
            orderItem.innerHTML = `
                <div class="order-user">${order.user_name || '未知用户'}</div>
                <div class="order-dates">日期：${dateDisplay}</div>
                <div class="order-foods">菜品：${foodNames}</div>
            `;
            
            orderListDiv.appendChild(orderItem);
        });
    } catch (error) {
        console.error("加载点餐记录失败:", error);
        orderListDiv.innerHTML = '<p class="error-message">加载点餐记录失败，请刷新重试。</p>';
    }
}

// 加载所有点餐记录（管理员界面）
async function loadAllOrders() {
    const adminOrderListDiv = document.getElementById('adminOrderList');
    if (!adminOrderListDiv) return;
    
    adminOrderListDiv.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const orders = await window.supabaseService.getOrders();
        
        if (orders.length === 0) {
            adminOrderListDiv.innerHTML = '<p>暂无点餐记录。</p>';
            return;
        }
        
        adminOrderListDiv.innerHTML = '';
        
        // 获取菜品列表，用于显示菜品名称
        const foods = await window.supabaseService.getFoods();
        
        orders.forEach(order => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            
            // 格式化日期显示
            const dateDisplay = Array.isArray(order.dates) ? order.dates.map(date => {
                try {
                    const d = new Date(date);
                    return isNaN(d.getTime()) ? date : `${d.getMonth()+1}/${d.getDate()}`;
                } catch {
                    return date;
                }
            }).join(', ') : '日期错误';
            
            // 获取菜品名称
            const foodNames = Array.isArray(order.food_ids) ? order.food_ids.map(id => {
                const food = foods.find(f => f.id === id);
                return food ? food.name : '未知菜品';
            }).join(', ') : '菜品错误';
            
            // 格式化时间显示
            const time = order.timestamp ? 
                new Date(order.timestamp).toLocaleString('zh-CN') : '未知时间';
            
            orderItem.innerHTML = `
                <div class="order-user">${order.user_name || '未知用户'} <small>(${time})</small></div>
                <div class="order-dates">日期：${dateDisplay}</div>
                <div class="order-foods">菜品：${foodNames}</div>
            `;
            
            adminOrderListDiv.appendChild(orderItem);
        });
    } catch (error) {
        console.error("加载点餐记录失败:", error);
        adminOrderListDiv.innerHTML = '<p class="error-message">加载点餐记录失败，请刷新重试。</p>';
    }
}

// 选择菜品
function selectFood(foodId) {
    const button = document.getElementById(`foodBtn-${foodId}`);
    if (!button) return;
    
    const isSelected = button.classList.contains('selected');
    
    if (isSelected) {
        button.classList.remove('selected');
        button.textContent = '点这道菜';
    } else {
        button.classList.add('selected');
        button.textContent = '已选择 ✓';
    }
}

// 提交点餐
async function submitOrder() {
    const userName = document.getElementById('userName').value.trim();
    if (!userName) {
        alert('请输入你的昵称！');
        return;
    }
    
    // 获取选择的日期
    const selectedDateButtons = document.querySelectorAll('.date-btn.selected');
    if (selectedDateButtons.length === 0) {
        alert('请至少选择一个日期！');
        return;
    }
    
    const selectedDates = Array.from(selectedDateButtons).map(btn => btn.dataset.date);
    
    // 获取选择的菜品
    const selectedFoodButtons = document.querySelectorAll('.order-btn.selected');
    if (selectedFoodButtons.length === 0) {
        alert('请至少选择一道菜！');
        return;
    }
    
    const selectedFoodIds = Array.from(selectedFoodButtons).map(btn => {
        const foodCard = btn.closest('.food-card');
        return parseInt(foodCard.dataset.id);
    });
    
    // 创建点餐记录对象
    const order = {
        user_name: userName,
        dates: selectedDates,
        food_ids: selectedFoodIds
    };
    
    try {
        // 保存点餐记录
        const orderId = await window.supabaseService.addOrder(order);
        
        if (orderId) {
            // 显示成功消息
            alert('点餐成功！感谢参与！');
            
            // 重置选择
            document.getElementById('userName').value = '';
            selectedDateButtons.forEach(btn => btn.classList.remove('selected'));
            selectedFoodButtons.forEach(btn => {
                btn.classList.remove('selected');
                btn.textContent = '点这道菜';
            });
            updateSelectedDates();
            
            // 重新加载点餐记录
            await loadOrders();
        } else {
            alert('点餐保存失败，请重试。');
        }
    } catch (error) {
        console.error("提交点餐失败:", error);
        alert('提交点餐时出错，请检查网络连接。');
    }
}

// 添加菜品（管理员）
async function addFood() {
    const name = document.getElementById('foodName').value.trim();
    const image = document.getElementById('foodImage').value.trim();
    const recipe = document.getElementById('foodRecipe').value.trim();
    
    if (!name || !image || !recipe) {
        alert('请填写完整的菜品信息！');
        return;
    }
    
    // 验证图片链接
    if (!image.startsWith('http')) {
        alert('图片链接格式不正确，请使用完整的http或https链接');
        return;
    }
    
    // 创建菜品对象
    const newFood = {
        name: name,
        image: image,
        recipe: recipe
    };
    
    try {
        // 添加菜品到数据库
        const foodId = await window.supabaseService.addFood(newFood);
        
        if (foodId) {
            // 清空表单
            document.getElementById('foodName').value = '';
            document.getElementById('foodImage').value = '';
            document.getElementById('foodRecipe').value = '';
            
            // 重新加载菜品列表
            await loadFoodsForAdmin();
            
            alert('菜品添加成功！');
        } else {
            alert('菜品添加失败，请重试。');
        }
    } catch (error) {
        console.error("添加菜品失败:", error);
        alert('添加菜品时出错，请检查网络连接。');
    }
}

// 编辑菜品（管理员）
async function editFood(foodId) {
    try {
        const foods = await window.supabaseService.getFoods();
        const food = foods.find(f => f.id === foodId);
        
        if (!food) {
            alert('菜品不存在！');
            return;
        }
        
        const newName = prompt('请输入新的菜品名称：', food.name);
        if (newName === null) return;
        
        const newImage = prompt('请输入新的图片链接：', food.image);
        if (newImage === null) return;
        
        const newRecipe = prompt('请输入新的做法说明：', food.recipe);
        if (newRecipe === null) return;
        
        // 验证图片链接
        if (newImage && !newImage.startsWith('http')) {
            alert('图片链接格式不正确，请使用完整的http或https链接');
            return;
        }
        
        // 更新菜品
        const success = await window.supabaseService.updateFood(foodId, {
            name: newName.trim(),
            image: newImage.trim(),
            recipe: newRecipe.trim()
        });
        
        if (success) {
            // 重新加载菜品列表
            await loadFoodsForAdmin();
            alert('菜品更新成功！');
        } else {
            alert('菜品更新失败，请重试。');
        }
    } catch (error) {
        console.error("编辑菜品失败:", error);
        alert('编辑菜品时出错，请检查网络连接。');
    }
}

// 删除菜品（管理员）
async function deleteFood(foodId) {
    if (!confirm('确定要删除这个菜品吗？')) return;
    
    try {
        const success = await window.supabaseService.deleteFood(foodId);
        
        if (success) {
            // 重新加载菜品列表
            await loadFoodsForAdmin();
            alert('菜品删除成功！');
        } else {
            alert('菜品删除失败，请重试。');
        }
    } catch (error) {
        console.error("删除菜品失败:", error);
        alert('删除菜品时出错，请检查网络连接。');
    }
}

// 修改管理员密码
async function changePassword() {
    const newPassword = document.getElementById('newPassword').value.trim();
    
    if (!newPassword) {
        alert('请输入新密码！');
        return;
    }
    
    if (newPassword.length < 4) {
        alert('密码至少需要4个字符！');
        return;
    }
    
    try {
        // 保存新密码到数据库
        const success = await window.supabaseService.updateSettings('adminPassword', newPassword);
        
        if (success) {
            document.getElementById('newPassword').value = '';
            alert('密码修改成功！下次登录请使用新密码。');
        } else {
            alert('密码修改失败，请重试。');
        }
    } catch (error) {
        console.error("修改密码失败:", error);
        alert('修改密码时出错，请检查网络连接。');
    }
}

// 全局函数导出
window.enterAsUser = enterAsUser;
window.showAdminLogin = showAdminLogin;
window.loginAsAdmin = loginAsAdmin;
window.switchToLogin = switchToLogin;
window.selectFood = selectFood;
window.submitOrder = submitOrder;
window.addFood = addFood;
window.editFood = editFood;
window.deleteFood = deleteFood;
window.changePassword = changePassword;