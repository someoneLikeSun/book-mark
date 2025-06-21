<!-- src/components/ClassificationTester.vue -->
<template>
    <t-dialog
        v-model:visible="dialogVisible"
        title="分类效果测试"
        width="80%"
        :footer="false"
        destroy-on-close
    >
        <div style="height: 70vh; overflow: auto;">
            <!-- 测试样本 -->
            <t-card title="测试样本" style="margin-bottom: 16px;">
                <t-textarea
                    v-model="testSamples"
                    placeholder="输入测试书签，格式：标题|URL，每行一个"
                    :autosize="{ minRows: 6, maxRows: 10 }"
                />
                <template #actions>
                    <t-button @click="loadDefaultSamples" size="small">加载示例</t-button>
                    <t-button @click="clearSamples" size="small" variant="text">清空</t-button>
                </template>
            </t-card>

            <!-- 提示词配置 -->
            <t-card title="提示词配置" style="margin-bottom: 16px;">
                <t-radio-group v-model="promptType">
                    <t-radio value="fine">精细主题分类（推荐）</t-radio>
                    <t-radio value="broad">宽泛方向分类</t-radio>
                    <t-radio value="custom">自定义提示词</t-radio>
                </t-radio-group>
                
                <t-textarea
                    v-if="promptType === 'custom'"
                    v-model="customPrompt"
                    placeholder="输入自定义分类提示词..."
                    :autosize="{ minRows: 8, maxRows: 15 }"
                    style="margin-top: 12px;"
                />
            </t-card>

            <!-- 测试按钮 -->
            <div style="text-align: center; margin-bottom: 16px;">
                <t-button 
                    @click="testClassification" 
                    :loading="isTesting"
                    theme="primary"
                    size="large"
                >
                    {{ isTesting ? '测试中...' : '开始测试分类' }}
                </t-button>
            </div>

            <!-- 测试结果 -->
            <t-card v-if="testResult" title="测试结果">
                <t-alert :message="testResult.summary" theme="success" style="margin-bottom: 16px;" />
                
                <t-collapse>
                    <t-collapse-panel 
                        v-for="(category, index) in testResult.categories" 
                        :key="index"
                        :header="`${category.name} (${category.bookmarks.length}个)`"
                    >
                        <div style="margin-bottom: 12px;">
                            <p style="color: #666; margin-bottom: 8px;">{{ category.description }}</p>
                            <div v-if="category.keywords && category.keywords.length > 0" style="margin-bottom: 12px;">
                                <t-tag 
                                    v-for="keyword in category.keywords" 
                                    :key="keyword" 
                                    size="small" 
                                    theme="primary" 
                                    variant="light"
                                    style="margin-right: 4px; margin-bottom: 4px;"
                                >
                                    {{ keyword }}
                                </t-tag>
                            </div>
                        </div>
                        
                        <t-list :split="true">
                            <t-list-item v-for="(bookmark, idx) in category.bookmarks" :key="idx">
                                <div>
                                    <div style="font-weight: 500; margin-bottom: 4px;">{{ bookmark.title }}</div>
                                    <div style="color: #666; font-size: 12px;">{{ bookmark.url }}</div>
                                </div>
                            </t-list-item>
                        </t-list>
                    </t-collapse-panel>
                </t-collapse>

                <template #actions>
                    <t-button @click="applyPrompt" theme="primary">应用此配置</t-button>
                    <t-button @click="exportTest">导出测试结果</t-button>
                </template>
            </t-card>
        </div>
    </t-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';

const props = defineProps({
    visible: Boolean
});

const emit = defineEmits(['update:visible', 'apply-prompt']);

// 使用计算属性来正确处理 v-model
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const isTesting = ref(false);
const promptType = ref('fine');
const customPrompt = ref('');
const testSamples = ref('');
const testResult = ref(null);

// 监听 visible 变化，确保对话框正确显示
watch(() => props.visible, (newVal) => {
    console.log('ClassificationTester visible changed:', newVal);
});

// 默认测试样本
const defaultSamples = `见微知著，以一道游戏题目测评deepseek-r1与御三家模型，顺便科普些模型调整知识 - 文档共建 - LINUX DO|https://linux.do/t/topic/380000
Vue.js 官方文档|https://vuejs.org/guide/
React Hooks 完整指南|https://react.dev/reference/react
Python 数据分析教程|https://pandas.pydata.org/docs/
机器学习算法详解|https://scikit-learn.org/stable/
Docker 容器化部署指南|https://docs.docker.com/
Kubernetes 集群管理|https://kubernetes.io/docs/
AWS 云服务文档|https://docs.aws.amazon.com/
GitHub Actions CI/CD|https://docs.github.com/actions
Figma 设计工具|https://www.figma.com/
Adobe Photoshop 教程|https://helpx.adobe.com/photoshop/
股票分析工具|https://finance.yahoo.com/
比特币价格追踪|https://coinmarketcap.com/
淘宝购物|https://www.taobao.com/
京东商城|https://www.jd.com/`;

// 不同类型的提示词模板
const promptTemplates = {
    fine: `请将以下书签按照具体的功能主题进行精细分类。重点是要识别书签的具体内容主题，而不是宽泛的大方向分类。

分类要求：
1. **精细主题分类**：要按照具体的功能主题分类
2. **具体场景识别**：仔细分析标题中的关键词，识别具体的技术栈、产品名称、应用场景
3. **分类粒度**：避免使用过于宽泛的分类名称
4. 示例：❌ 宽泛分类：技术讨论、开发工具 ✅ 精细分类：AI模型评测、React组件库`,
    
    broad: `请将以下书签按照大的方向分类，如：技术开发、学习教育、生活购物、娱乐休闲等。

分类要求：
1. 使用宽泛的大类别进行分类
2. 每个分类可以包含多种不同但相关的内容
3. 分类数量控制在5-10个左右`
};

// 加载默认样本
const loadDefaultSamples = () => {
    testSamples.value = defaultSamples;
    MessagePlugin.success('已加载示例书签');
};

// 清空样本
const clearSamples = () => {
    testSamples.value = '';
    testResult.value = null;
};

// 解析测试样本
const parseTestSamples = () => {
    if (!testSamples.value.trim()) {
        throw new Error('请输入测试样本');
    }
    
    return testSamples.value.split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
            const parts = line.split('|');
            if (parts.length < 2) {
                throw new Error(`第${index + 1}行格式错误，请使用：标题|URL`);
            }
            return {
                id: `test_${index}`,
                title: parts[0].trim(),
                url: parts[1].trim(),
                dateAdded: Date.now()
            };
        });
};

// 构建测试提示词
const buildTestPrompt = (bookmarks) => {
    const bookmarkList = bookmarks.map((bookmark, index) => 
        `${index + 1}. 标题: "${bookmark.title}" | URL: ${bookmark.url}`
    ).join('\n');

    let basePrompt = '';
    if (promptType.value === 'custom') {
        basePrompt = customPrompt.value;
    } else {
        basePrompt = promptTemplates[promptType.value];
    }

    return `${basePrompt}

书签列表：
${bookmarkList}

请按照以下JSON格式返回分类结果：
{
  "categories": [
    {
      "name": "分类名称",
      "description": "分类描述",
      "keywords": ["关键词1", "关键词2"],
      "bookmarks": [书签在原列表中的序号]
    }
  ],
  "summary": "分类总结说明"
}`;
};

// 测试分类
const testClassification = async () => {
    try {
        isTesting.value = true;
        
        // 解析测试样本
        const bookmarks = parseTestSamples();
        
        // 构建提示词
        const prompt = buildTestPrompt(bookmarks);
        
        // 这里应该调用DeepSeek API，为了演示简化处理
        console.log('测试提示词:', prompt);
        
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 模拟分类结果
        const mockResult = {
            categories: [
                {
                    name: "AI模型评测",
                    description: "关于AI模型性能测试、对比分析的内容",
                    keywords: ["AI模型", "性能评测", "deepseek", "模型对比"],
                    bookmarks: [bookmarks[0]]
                },
                {
                    name: "前端框架文档",
                    description: "Vue.js、React等前端框架的官方文档和指南",
                    keywords: ["Vue.js", "React", "前端框架", "文档"],
                    bookmarks: bookmarks.slice(1, 3)
                },
                {
                    name: "数据科学工具",
                    description: "Python数据分析、机器学习相关的工具和教程",
                    keywords: ["Python", "数据分析", "机器学习", "pandas"],
                    bookmarks: bookmarks.slice(3, 5)
                },
                {
                    name: "云服务与容器化",
                    description: "Docker、Kubernetes、AWS等云服务和容器化技术",
                    keywords: ["Docker", "Kubernetes", "AWS", "云服务"],
                    bookmarks: bookmarks.slice(5, 8)
                },
                {
                    name: "设计工具",
                    description: "Figma、Photoshop等设计软件和工具",
                    keywords: ["设计", "Figma", "Photoshop", "工具"],
                    bookmarks: bookmarks.slice(8, 10)
                },
                {
                    name: "金融投资",
                    description: "股票分析、加密货币等金融投资工具",
                    keywords: ["股票", "比特币", "投资", "金融"],
                    bookmarks: bookmarks.slice(10, 12)
                },
                {
                    name: "电商购物",
                    description: "淘宝、京东等购物平台",
                    keywords: ["购物", "电商", "淘宝", "京东"],
                    bookmarks: bookmarks.slice(12)
                }
            ],
            summary: `成功分类 ${bookmarks.length} 个书签到 7 个精细主题类别`,
            totalBookmarks: bookmarks.length,
            totalCategories: 7
        };
        
        testResult.value = mockResult;
        MessagePlugin.success('测试完成！');
        
    } catch (error) {
        console.error('测试失败:', error);
        MessagePlugin.error('测试失败: ' + error.message);
    } finally {
        isTesting.value = false;
    }
};

// 应用提示词配置
const applyPrompt = () => {
    emit('apply-prompt', {
        type: promptType.value,
        customPrompt: promptType.value === 'custom' ? customPrompt.value : null
    });
    MessagePlugin.success('已应用提示词配置');
    dialogVisible.value = false;
};

// 导出测试结果
const exportTest = () => {
    if (!testResult.value) return;
    
    const content = JSON.stringify({
        promptType: promptType.value,
        customPrompt: promptType.value === 'custom' ? customPrompt.value : null,
        testSamples: testSamples.value,
        result: testResult.value
    }, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `分类测试结果_${new Date().getTime()}.json`;
    a.click();
    
    MessagePlugin.success('测试结果已导出');
};
</script>