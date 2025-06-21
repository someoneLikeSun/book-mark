// src/config/config.js
export const CONFIG = {
    // DeepSeek API 配置
    DEEPSEEK: {
        API_URL: 'https://api.deepseek.com/v1/chat/completions',
        API_KEY: 'sk-2f0fd1594bc24f3a8de5c758578c46f9', // 请在这里填入您的 DeepSeek API 密钥
        MODEL: 'deepseek-chat',
        MAX_TOKENS: 2000,
        TEMPERATURE: 0.3,
        BATCH_SIZE: 50, // 批处理大小
        BATCH_DELAY: 1000 // 批处理间隔(ms)
    },
    
    // 书签分类配置
    CLASSIFICATION: {
        DEFAULT_CATEGORIES: [
            '开发工具',
            '学习资源', 
            '新闻资讯',
            '娱乐休闲',
            '购物商城',
            '社交媒体',
            '工作效率',
            '设计素材',
            '技术文档',
            '其他'
        ]
    }
};

// 检查配置是否完整
export function validateConfig() {
    if (!CONFIG.DEEPSEEK.API_KEY) {
        console.warn('DeepSeek API密钥未配置，请在 src/config/config.js 中设置');
        return false;
    }
    return true;
}