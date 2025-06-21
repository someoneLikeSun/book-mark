<!-- src/components/BookmarkTest.vue -->
<template>
    <div style="width: 100%;height: 100vh; padding: 20px;">
        
        <!-- 搜索区域 -->
        <t-row :gutter="16" style="margin-bottom: 20px;">
            <t-col :span="6">
                <t-space direction="vertical" style="width: 100%;">
                    <t-input 
                        v-model="searchQuery" 
                        placeholder="搜索书签..." 
                        clearable 
                        @enter="searchBookmarks"
                        :loading="isSearching"
                    >
                        <template #suffixIcon>
                            <search-icon :style="{ cursor: 'pointer' }" @click="searchBookmarks" />
                        </template>
                    </t-input>
                </t-space>
            </t-col>
            <t-col :span="6">
                <t-space>
                    <t-button 
                        @click="classifyBookmarks" 
                        :loading="isClassifying"
                        :disabled="!bookmarkData || bookmarkData.length === 0"
                        theme="primary"
                    >
                        {{ isClassifying ? '分类中...' : 'AI智能分类' }}
                    </t-button>
                    <t-button @click="openTester" variant="outline" theme="primary">
                        测试分类效果
                    </t-button>
                    <t-button @click="downloadResults(bookmarkData)" :disabled="!bookmarkData">
                        下载书签
                    </t-button>
                    <t-button @click="removeBookmarks(bookmarkData)" :disabled="!bookmarkData" theme="danger">
                        删除书签
                    </t-button>
                </t-space>
            </t-col>
        </t-row>

        <!-- 分类结果区域 -->
        <div v-if="classificationResult" style="margin-bottom: 20px;">
            <t-card title="AI分类结果" :bordered="true">
                <template #actions>
                    <t-button size="small" @click="exportClassification">导出分类</t-button>
                    <t-button size="small" @click="clearClassification" variant="text">清除</t-button>
                </template>
                
                <t-alert theme="info" :message="classificationResult.summary" style="margin-bottom: 16px;" />
                
                <t-collapse>
                    <t-collapse-panel 
                        v-for="(category, index) in classificationResult.categories" 
                        :key="index"
                        :header="`${category.name} (${category.bookmarks.length}个)`"
                    >
                        <template #headerRightContent>
                            <t-space>
                                <t-button size="small" @click.stop="downloadCategory(category)">下载</t-button>
                                <t-button size="small" @click.stop="removeCategory(category)" theme="danger">删除</t-button>
                            </t-space>
                        </template>
                        
                        <div style="margin-bottom: 12px;">
                            <p style="color: #666; margin-bottom: 8px;">{{ category.description }}</p>
                            <div v-if="category.keywords && category.keywords.length > 0" style="margin-bottom: 8px;">
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
                        
                        <t-table 
                            :data="category.bookmarks" 
                            :columns="bookmarkColumn"
                            size="small"
                            :pagination="false"
                            max-height="300"
                        />
                    </t-collapse-panel>
                </t-collapse>
            </t-card>
        </div>

        <!-- 原始书签表格 -->
        <t-card title="搜索结果" v-if="bookmarkData && bookmarkData.length > 0">
            <template #subtitle>
                共找到 {{ bookmarkData.length }} 个书签
            </template>
            
            <t-table 
                :data="bookmarkTable" 
                :columns="bookmarkColumn"  
                :pagination="pagination" 
                @page-change="onPageChange"
                row-key="id"
            />
        </t-card>

        <!-- 空状态 -->
        <t-empty v-if="!bookmarkData || bookmarkData.length === 0" description="请输入关键词搜索书签" />

        <!-- 分类测试器 -->
        <classification-tester 
            v-model:visible="showTester"
            @apply-prompt="handleApplyPrompt"
        />

        <!-- 加载对话框 -->
        <t-dialog
            v-model:visible="showClassifyDialog"
            title="AI分类进行中"
            :closeBtn="false"
            :cancelBtn="false"
            :confirmBtn="false"
        >
            <div style="text-align: center; padding: 20px;">
                <t-loading size="large" />
                <p style="margin-top: 16px;">{{ classifyProgress }}</p>
            </div>
        </t-dialog>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { SearchIcon } from 'tdesign-icons-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';

import { BookmarkService } from '../services/bookmarkService';
import { DeepSeekService } from '../services/deepseekService';
import ClassificationTester from './ClassificationTester.vue';

const searchQuery = ref('');
const isSearching = ref(false);
const isClassifying = ref(false);
const showClassifyDialog = ref(false);
const showTester = ref(false);
const classifyProgress = ref('');

const bookmarkData = ref(null);
const bookmarkTable = ref([]);
const classificationResult = ref(null);

const bookmarkColumn = ref([
    {
        title: 'ID',
        colKey: 'id',
        width: 80
    }, 
    {
        title: '名称',
        colKey: 'title',
        ellipsis: true
    }, 
    {
        title: '网址',
        colKey: 'url',
        ellipsis: true,
        cell: (h, { row }) => {
            return h('a', {
                href: row.url,
                target: '_blank',
                style: 'color: #0052d9; text-decoration: none;'
            }, row.url);
        }
    }, 
    {
        title: '添加时间',
        colKey: 'dateAdded',
        width: 150,
        cell: (h, { row }) => {
            return new Date(row.dateAdded).toLocaleDateString();
        }
    }
]);

const pagination = reactive({
    defaultPageSize: 10,
    defaultCurrent: 1,
    total: 0,
    current: 1,
    pageSize: 10
});

// 搜索书签
const searchBookmarks = async () => {
    if (!searchQuery.value.trim()) {
        MessagePlugin.warning('请输入搜索关键词');
        return;
    }

    try {
        isSearching.value = true;
        const data = await BookmarkService.searchBookmarks(searchQuery.value);
        bookmarkData.value = data;
        pagination.total = data.length;
        pagination.current = 1;
        onPageChange(pagination);
        
        // 清除之前的分类结果
        classificationResult.value = null;
        
        MessagePlugin.success(`找到 ${data.length} 个相关书签`);
    } catch (error) {
        console.error('获取书签失败:', error);
        MessagePlugin.error('搜索失败，请重试');
    } finally {
        isSearching.value = false;
    }
};

// 分页处理
const onPageChange = (currentPageInfo) => {
    pagination.current = currentPageInfo.current;
    pagination.pageSize = currentPageInfo.pageSize;
    const startIndex = pagination.pageSize * (pagination.current - 1);
    const endIndex = pagination.pageSize * pagination.current;
    bookmarkTable.value = bookmarkData.value.slice(startIndex, endIndex);
};

// 打开测试器
const openTester = () => {
    console.log('打开测试器，当前状态:', showTester.value);
    showTester.value = true;
    console.log('设置后状态:', showTester.value);
};

// AI分类书签
const classifyBookmarks = async () => {
    if (!bookmarkData.value || bookmarkData.value.length === 0) {
        MessagePlugin.warning('没有可分类的书签');
        return;
    }

    try {
        isClassifying.value = true;
        showClassifyDialog.value = true;
        classifyProgress.value = '正在分析书签内容...';

        // 根据书签数量选择处理方式
        let result;
        if (bookmarkData.value.length > 50) {
            classifyProgress.value = '书签较多，正在分批处理...';
            result = await DeepSeekService.classifyBookmarksBatch(bookmarkData.value, 50);
        } else {
            result = await DeepSeekService.classifyBookmarks(bookmarkData.value);
        }

        classificationResult.value = result;
        MessagePlugin.success(`分类完成！共分为 ${result.totalCategories} 个类别`);
        
    } catch (error) {
        console.error('分类失败:', error);
        MessagePlugin.error('AI分类失败: ' + error.message);
    } finally {
        isClassifying.value = false;
        showClassifyDialog.value = false;
    }
};

// 删除书签
const removeBookmarks = async (bookmarkList) => {
    if (!bookmarkList || bookmarkList.length === 0) return;
    
    try {
        const confirmResult = await MessagePlugin.confirm(`确定要删除这 ${bookmarkList.length} 个书签吗？`);
        if (confirmResult) {
            for (const item of bookmarkList) {
                await BookmarkService.removeBookmark(item.id);
            }
            MessagePlugin.success('删除成功');
            // 重新搜索
            searchBookmarks();
        }
    } catch (error) {
        console.error('删除失败:', error);
        MessagePlugin.error('删除失败');
    }
};

// 删除分类中的书签
const removeCategory = async (category) => {
    await removeBookmarks(category.bookmarks);
    // 更新分类结果
    if (classificationResult.value) {
        classificationResult.value.categories = classificationResult.value.categories.filter(c => c !== category);
    }
};

// 下载书签
const downloadResults = (bookmarkList) => {
    if (!bookmarkList || bookmarkList.length === 0) {
        MessagePlugin.warning('没有可下载的书签');
        return;
    }

    const content = bookmarkList
        .map((bookmark) => `标题: ${bookmark.title}\n网址: ${bookmark.url}\n添加时间: ${new Date(bookmark.dateAdded).toLocaleString()}\n`)
        .join('\n---\n\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: `书签_${new Date().getTime()}.txt`,
        saveAs: true,
    });
    
    MessagePlugin.success('下载开始');
};

// 下载分类
const downloadCategory = (category) => {
    const content = `分类: ${category.name}\n描述: ${category.description}\n\n` +
        category.bookmarks
            .map((bookmark) => `标题: ${bookmark.title}\n网址: ${bookmark.url}`)
            .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: `${category.name}_书签.txt`,
        saveAs: true,
    });
};

// 导出分类结果
const exportClassification = () => {
    if (!classificationResult.value) return;
    
    const content = JSON.stringify(classificationResult.value, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: `书签分类结果_${new Date().getTime()}.json`,
        saveAs: true,
    });
};

// 清除分类结果
const clearClassification = () => {
    classificationResult.value = null;
    MessagePlugin.success('已清除分类结果');
};

// 处理应用提示词配置
const handleApplyPrompt = (config) => {
    console.log('应用提示词配置:', config);
    // 这里可以保存配置，在实际分类时使用
    MessagePlugin.success(`已应用${config.type === 'fine' ? '精细' : config.type === 'broad' ? '宽泛' : '自定义'}分类配置`);
};
</script>

<style scoped>
.bookmark-manager {
    padding: 20px;
    min-height: 100vh;
    background-color: #f5f5f5;
}

:deep(.t-table__cell) {
    max-width: 200px;
    word-break: break-all;
}

:deep(.t-collapse-panel__header) {
    font-weight: 500;
}

:deep(.t-alert) {
    border-radius: 6px;
}
</style>