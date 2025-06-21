// src/services/deepseekService.js
import { CONFIG, validateConfig } from '../config/config.js';

export class DeepSeekService {

    /**
     * 调用 DeepSeek API 对书签进行分类
     * @param {Array} bookmarks 书签数组
     * @returns {Promise<Object>} 分类结果
     */
    static async classifyBookmarks(bookmarks) {
        // 检查配置
        if (!validateConfig()) {
            throw new Error('DeepSeek API配置不完整，请检查配置文件');
        }

        try {
            // 构建提示词
            const prompt = this.buildClassificationPrompt(bookmarks);
            
            const response = await fetch(CONFIG.DEEPSEEK.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK.API_KEY}`
                },
                body: JSON.stringify({
                    model: CONFIG.DEEPSEEK.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个专业的书签分类助手。请根据书签的标题和URL，将它们按照用途和主题进行智能分类。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: CONFIG.DEEPSEEK.TEMPERATURE,
                    max_tokens: CONFIG.DEEPSEEK.MAX_TOKENS
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const result = data.choices[0].message.content;
            
            // 解析分类结果
            return this.parseClassificationResult(result, bookmarks);
        } catch (error) {
            console.error('DeepSeek API调用失败:', error);
            throw error;
        }
    }

    /**
     * 构建分类提示词
     * @param {Array} bookmarks 书签数组
     * @returns {string} 提示词
     */
    static buildClassificationPrompt(bookmarks) {
        const bookmarkList = bookmarks.map((bookmark, index) => 
            `${index + 1}. 标题: "${bookmark.title}" | URL: ${bookmark.url}`
        ).join('\n');

        return `请将以下书签按照具体的功能主题进行精细分类。重点是要识别书签的具体内容主题，而不是宽泛的大方向分类。

书签列表：
${bookmarkList}

分类要求：
1. **精细主题分类**：要按照具体的功能主题分类，例如：
   - "AI模型" 而不是 "技术讨论"
   - "Vue.js开发" 而不是 "前端开发"
   - "机器学习教程" 而不是 "学习资源"
   - "股票分析" 而不是 "财经资讯"
   - "摄影技巧" 而不是 "兴趣爱好"

2. **具体场景识别**：
   - 仔细分析标题中的关键词，识别具体的技术栈、产品名称、应用场景
   - 从URL域名判断网站性质和专业领域
   - 优先按照专业领域和具体用途分类

3. **分类粒度**：
   - 避免使用过于宽泛的分类名称
   - 每个分类应该代表一个明确的主题或用途
   - 相似的具体主题才归为一类

4. **示例对比**：
   ❌ 宽泛分类：技术讨论、开发工具、学习资源
   ✅ 精细分类：AI模型评测、React组件库、Python数据分析

请按照以下JSON格式返回分类结果：
{
  "categories": [
    {
      "name": "具体主题名称",
      "description": "该主题的详细描述，说明包含什么类型的内容",
      "bookmarks": [书签在原列表中的序号],
      "keywords": ["相关关键词1", "关键词2"]
    }
  ],
  "summary": "分类总结说明"
}

特别注意：
- 分类名称要体现具体的主题内容，不要使用模糊的大类名称
- 每个书签都必须被分配到最匹配的具体主题分类中
- 如果某个书签主题很独特，可以单独成为一个类别
- 优先按照内容的专业性和具体用途进行分类`;
    }

    /**
     * 解析分类结果
     * @param {string} result DeepSeek返回的结果
     * @param {Array} originalBookmarks 原始书签数组
     * @returns {Object} 解析后的分类结果
     */
    static parseClassificationResult(result, originalBookmarks) {
        try {
            // 尝试从结果中提取JSON
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('无法解析分类结果');
            }

            const classificationData = JSON.parse(jsonMatch[0]);
            
            // 将序号转换为实际的书签对象
            const processedCategories = classificationData.categories.map(category => ({
                name: category.name,
                description: category.description,
                keywords: category.keywords || [], // 新增关键词字段
                bookmarks: category.bookmarks.map(index => 
                    originalBookmarks[index - 1] // 转换为0索引
                ).filter(Boolean) // 过滤掉undefined
            }));

            return {
                categories: processedCategories,
                summary: classificationData.summary || '书签分类完成',
                totalBookmarks: originalBookmarks.length,
                totalCategories: processedCategories.length,
                classificationMethod: '精细主题分类' // 标记分类方法
            };
        } catch (error) {
            console.error('解析分类结果失败:', error);
            // 返回默认分类
            return {
                categories: [{
                    name: '未分类',
                    description: '无法自动分类的书签',
                    keywords: [],
                    bookmarks: originalBookmarks
                }],
                summary: '分类解析失败，所有书签归为未分类',
                totalBookmarks: originalBookmarks.length,
                totalCategories: 1,
                classificationMethod: '默认分类'
            };
        }
    }

    /**
     * 批量处理大量书签（分批发送给API）
     * @param {Array} bookmarks 书签数组
     * @param {number} batchSize 每批处理的数量
     * @returns {Promise<Object>} 合并后的分类结果
     */
    static async classifyBookmarksBatch(bookmarks, batchSize = CONFIG.DEEPSEEK.BATCH_SIZE) {
        if (bookmarks.length <= batchSize) {
            return await this.classifyBookmarks(bookmarks);
        }

        const batches = [];
        for (let i = 0; i < bookmarks.length; i += batchSize) {
            batches.push(bookmarks.slice(i, i + batchSize));
        }

        const results = [];
        for (let i = 0; i < batches.length; i++) {
            console.log(`处理第 ${i + 1}/${batches.length} 批书签...`);
            const result = await this.classifyBookmarks(batches[i]);
            results.push(result);
            
            // 避免API限制，添加延迟
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.DEEPSEEK.BATCH_DELAY));
            }
        }

        // 合并结果
        return this.mergeClassificationResults(results);
    }

    /**
     * 合并多个分类结果
     * @param {Array} results 分类结果数组
     * @returns {Object} 合并后的结果
     */
    static mergeClassificationResults(results) {
        const mergedCategories = [];
        let totalBookmarks = 0;

        results.forEach(result => {
            totalBookmarks += result.totalBookmarks;
            result.categories.forEach(category => {
                // 查找是否已存在相同名称的分类
                const existingCategory = mergedCategories.find(c => 
                    c.name.toLowerCase() === category.name.toLowerCase()
                );
                
                if (existingCategory) {
                    existingCategory.bookmarks.push(...category.bookmarks);
                } else {
                    mergedCategories.push({...category});
                }
            });
        });

        return {
            categories: mergedCategories,
            summary: `成功合并 ${results.length} 批次的分类结果`,
            totalBookmarks,
            totalCategories: mergedCategories.length
        };
    }
}