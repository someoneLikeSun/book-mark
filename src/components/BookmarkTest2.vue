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
                    <t-button @click="openCacheManager" variant="outline">
                        缓存管理
                    </t-button>
                    <t-button 
                        @click="saveCurrentResult" 
                        :disabled="!classificationResult"
                        theme="success"
                    >
                        保存结果
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
                    <t-dropdown :options="exportOptions" @click="handleExportClick">
                        <t-button size="small">导出分类</t-button>
                    </t-dropdown>
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

        <!-- 缓存管理器 -->
        <cache-manager 
            v-model:visible="showCacheManager"
            @load-cache-result="handleLoadCacheResult"
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
import { CacheService } from '../services/cacheService';
import { ExportHelper } from '../services/exportHelper';
import ClassificationTester from './ClassificationTester.vue';
import CacheManager from './CacheManager.vue';

const searchQuery = ref('');
const isSearching = ref(false);
const isClassifying = ref(false);
const showClassifyDialog = ref(false);
const showTester = ref(false);
const showCacheManager = ref(false);
const classifyProgress = ref('');

// 导出选项
const exportOptions = ref([
    { content: 'JSON格式 (完整数据)', value: 'json' },
    { content: 'TXT格式 (可读报告)', value: 'txt' },
    { content: 'CSV格式 (表格数据)', value: 'csv' },
    { content: 'HTML格式 (网页报告)', value: 'html' }
]);

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

    // 检查是否存在缓存
    const existingCacheId = CacheService.findExistingCache(searchQuery.value);
    if (existingCacheId) {
        try {
            const shouldLoadCache = await MessagePlugin.confirm(
                `发现关键词"${searchQuery.value}"的缓存结果，是否直接加载？`,
                {
                    confirmBtn: '加载缓存',
                    cancelBtn: '重新搜索'
                }
            );
            
            if (shouldLoadCache) {
                const cacheData = CacheService.loadClassificationResult(existingCacheId);
                if (cacheData) {
                    handleLoadCacheResult(cacheData);
                    return;
                }
            }
        } catch (error) {
            // 用户选择重新搜索，继续执行
        }
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

// 打开缓存管理器
const openCacheManager = () => {
    showCacheManager.value = true;
};

// 保存当前分类结果
const saveCurrentResult = async () => {
    if (!classificationResult.value || !searchQuery.value || !bookmarkData.value) {
        MessagePlugin.warning('没有可保存的结果');
        return;
    }

    try {
        // 检查是否已存在相同查询的缓存
        const existingCacheId = CacheService.findExistingCache(searchQuery.value);
        if (existingCacheId) {
            const confirmed = await MessagePlugin.confirm(
                `已存在关键词"${searchQuery.value}"的缓存，是否覆盖？`,
                {
                    confirmBtn: '覆盖',
                    cancelBtn: '取消'
                }
            );
            if (!confirmed) return;
        }

        const cacheId = CacheService.saveClassificationResult(
            searchQuery.value,
            bookmarkData.value,
            classificationResult.value
        );
        
        MessagePlugin.success(`结果已保存到缓存 (ID: ${cacheId.slice(-8)})`);
    } catch (error) {
        console.error('保存结果失败:', error);
        MessagePlugin.error('保存失败: ' + error.message);
    }
};

// 加载缓存结果
const handleLoadCacheResult = (cacheData) => {
    try {
        // 恢复搜索状态
        searchQuery.value = cacheData.searchQuery;
        bookmarkData.value = cacheData.bookmarks;
        classificationResult.value = cacheData.classificationResult;
        
        // 更新分页
        pagination.total = cacheData.bookmarks.length;
        pagination.current = 1;
        onPageChange(pagination);
        
        MessagePlugin.success(`已加载缓存: ${cacheData.searchQuery}`);
    } catch (error) {
        console.error('加载缓存结果失败:', error);
        MessagePlugin.error('加载缓存失败');
    }
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
        
        // 提示是否保存结果
        setTimeout(async () => {
            try {
                const shouldSave = await MessagePlugin.confirm(
                    '分类完成！是否将结果保存到缓存中？',
                    {
                        confirmBtn: '保存',
                        cancelBtn: '不保存'
                    }
                );
                if (shouldSave) {
                    await saveCurrentResult();
                }
            } catch (error) {
                // 用户取消，不处理
            }
        }, 500);
        
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

    try {
        // 构建详细的书签内容
        const header = `书签导出报告
导出时间: ${new Date().toLocaleString()}
搜索关键词: ${searchQuery.value || '全部书签'}
书签总数: ${bookmarkList.length}
=========================================

`;

        const content = header + bookmarkList
            .map((bookmark, index) => {
                return `${index + 1}. ${bookmark.title}
   网址: ${bookmark.url}
   添加时间: ${new Date(bookmark.dateAdded).toLocaleString()}
   ID: ${bookmark.id}`;
            })
            .join('\n\n');
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `书签列表_${searchQuery.value || '全部'}_${timestamp}.txt`;
        
        chrome.downloads.download({
            url: url,
            filename: fileName,
            saveAs: true,
        });
        
        MessagePlugin.success('书签列表下载成功');
        
        // 清理临时URL
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
        
    } catch (error) {
        console.error('下载书签失败:', error);
        MessagePlugin.error('下载失败: ' + error.message);
    }
};

// 下载分类
const downloadCategory = (category) => {
    try {
        const header = `分类下载报告
导出时间: ${new Date().toLocaleString()}
分类名称: ${category.name}
分类描述: ${category.description}
书签数量: ${category.bookmarks.length}
关键词: ${category.keywords ? category.keywords.join(', ') : '无'}
=========================================

`;

        const content = header + category.bookmarks
            .map((bookmark, index) => {
                return `${index + 1}. ${bookmark.title}
   网址: ${bookmark.url}
   添加时间: ${new Date(bookmark.dateAdded).toLocaleString()}`;
            })
            .join('\n\n');
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const fileName = `分类_${category.name}_${timestamp}.txt`;
        
        chrome.downloads.download({
            url: url,
            filename: fileName,
            saveAs: true,
        });
        
        MessagePlugin.success(`分类"${category.name}"下载成功`);
        
        // 清理临时URL
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
        
    } catch (error) {
        console.error('下载分类失败:', error);
        MessagePlugin.error('下载失败: ' + error.message);
    }
};

// 处理导出点击事件
const handleExportClick = (data) => {
    if (!classificationResult.value) {
        MessagePlugin.warning('没有可导出的分类结果');
        return;
    }
    
    const format = data.value;
    exportClassificationByFormat(format);
};

// 按格式导出分类结果
const exportClassificationByFormat = (format) => {
    try {
        let content, filename, mimeType;
        
        switch (format) {
            case 'json':
                content = ExportHelper.exportAsJSON(
                    classificationResult.value, 
                    bookmarkData.value, 
                    searchQuery.value
                );
                filename = ExportHelper.generateFilename('书签分类结果', 'json', searchQuery.value);
                mimeType = 'application/json';
                break;
                
            case 'txt':
                content = ExportHelper.exportAsText(classificationResult.value, searchQuery.value);
                filename = ExportHelper.generateFilename('书签分类报告', 'txt', searchQuery.value);
                mimeType = 'text/plain';
                break;
                
            case 'csv':
                content = ExportHelper.exportAsCSV(classificationResult.value);
                filename = ExportHelper.generateFilename('书签分类数据', 'csv', searchQuery.value);
                mimeType = 'text/csv';
                break;
                
            case 'html':
                content = ExportHelper.exportAsHTML(classificationResult.value, searchQuery.value);
                filename = ExportHelper.generateFilename('书签分类报告', 'html', searchQuery.value);
                mimeType = 'text/html';
                break;
                
            default:
                MessagePlugin.error('不支持的导出格式');
                return;
        }
        
        const success = ExportHelper.triggerDownload(content, filename, mimeType);
        
        if (success) {
            MessagePlugin.success(`${format.toUpperCase()}格式分类结果导出成功`);
        } else {
            MessagePlugin.error('导出失败，请重试');
        }
        
    } catch (error) {
        console.error('导出分类结果失败:', error);
        MessagePlugin.error('导出失败: ' + error.message);
    }
};

// 导出分类结果 (保留原方法作为默认JSON导出)
const exportClassification = () => {
    exportClassificationByFormat('json');
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