<!-- src/components/CacheManager.vue -->
<template>
    <t-dialog
        v-model:visible="dialogVisible"
        title="缓存管理"
        width="80%"
        :footer="false"
        destroy-on-close
    >
        <div style="height: 70vh; overflow: auto;">
            <!-- 缓存统计 -->
            <t-card title="缓存统计" style="margin-bottom: 16px;">
                <t-row :gutter="16">
                    <t-col :span="3">
                        <t-statistic title="缓存数量" :value="cacheStats.count" suffix="个" />
                    </t-col>
                    <t-col :span="3">
                        <t-statistic title="占用空间" :value="cacheStats.totalSize" />
                    </t-col>
                    <t-col :span="3">
                        <t-statistic title="最大限制" :value="cacheStats.maxSize" suffix="个" />
                    </t-col>
                    <t-col :span="3">
                        <t-progress 
                            :percentage="(cacheStats.count / cacheStats.maxSize * 100).toFixed(1)"
                            :label="false"
                            size="medium"
                        />
                    </t-col>
                </t-row>
            </t-card>

            <!-- 操作按钮 -->
            <t-card title="缓存操作" style="margin-bottom: 16px;">
                <t-space>
                    <t-button @click="refreshCacheList" theme="primary">
                        刷新列表
                    </t-button>
                    <t-button @click="exportAllCache" :disabled="cacheList.length === 0">
                        导出所有
                    </t-button>
                    <t-upload
                        :auto-upload="false"
                        :show-upload-list="false"
                        accept=".json"
                        :multiple="false"
                        :max="1"
                        @change="handleImportCache"
                        @remove="() => {}"
                    >
                        <t-button>
                            导入缓存 (Upload)
                        </t-button>
                    </t-upload>
                    <t-button @click="triggerFileInput">
                        导入缓存 (Input)
                    </t-button>
                    <input 
                        ref="fileInput" 
                        type="file" 
                        accept=".json" 
                        style="display: none" 
                        @change="handleFileInput"
                    />
                    <t-button @click="createTestCache" variant="outline">
                        创建测试缓存
                    </t-button>
                    <t-popconfirm
                        content="确定要清空所有缓存吗？此操作不可恢复。"
                        @confirm="clearAllCache"
                    >
                        <t-button theme="danger" :disabled="cacheList.length === 0">
                            清空所有
                        </t-button>
                    </t-popconfirm>
                </t-space>
            </t-card>

            <!-- 缓存列表 -->
            <t-card title="缓存列表">
                <t-table 
                    :data="cacheList" 
                    :columns="cacheColumns"
                    :pagination="tablePagination"
                    @page-change="onTablePageChange"
                    row-key="id"
                    size="small"
                    v-if="cacheList.length > 0"
                />
                
                <t-empty 
                    v-else 
                    description="暂无缓存数据"
                    :image="emptyImage"
                />
            </t-card>

            <!-- 缓存详情对话框 -->
            <cache-detail-dialog 
                v-model:visible="showDetailDialog"
                :cache-data="selectedCacheData"
                @apply-result="handleApplyResult"
            />
        </div>
    </t-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';

import { CacheService } from '../services/cacheService';
import CacheDetailDialog from './CacheDetailDialog.vue';

const props = defineProps({
    visible: Boolean
});

const emit = defineEmits(['update:visible', 'load-cache-result']);

const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const cacheList = ref([]);
const cacheStats = ref({ count: 0, totalSize: '0 KB', maxSize: 50 });
const showDetailDialog = ref(false);
const selectedCacheData = ref(null);
const fileInput = ref(null);

const tablePagination = ref({
    current: 1,
    pageSize: 10,
    total: 0
});

const emptyImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCA2NCA0MSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEpIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgPGVsbGlwc2UgZmlsbD0iI0Y1RjVGNSIgY3g9IjMyIiBjeT0iMzMiIHJ4PSIzMiIgcnk9IjciLz4KICAgIDxnIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSIjRDlEOUQ5Ij4KICAgICAgPHBhdGggZD0ibTI1IDQgNS4wOTItLjAwOGMzLjMzNyAwIDYuMDUgMi43MDEgNi4wNSA2LjAzOGw2LjA5OCAxMC44NDcgMi4wNjggNi4wMzYgNS45OSA4LjM0OVY5Ljg0aCJTZmlsbC1jb2xvcj0iIzk5Q0NDQyIvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+';

// 表格列定义
const cacheColumns = ref([
    {
        title: '搜索关键词',
        colKey: 'searchQuery',
        ellipsis: true,
        width: 200
    },
    {
        title: '书签数量',
        colKey: 'bookmarkCount',
        width: 120,
        cell: (h, { row }) => `${row.bookmarkCount} 个`
    },
    {
        title: '分类数量',
        colKey: 'categoryCount',
        width: 120,
        cell: (h, { row }) => `${row.categoryCount} 个`
    },
    {
        title: '创建时间',
        colKey: 'createdAt',
        width: 180,
        cell: (h, { row }) => new Date(row.createdAt).toLocaleString()
    },
    {
        title: '操作',
        colKey: 'actions',
        width: 200,
        cell: (h, { row }) => {
            return h('div', { style: 'display: flex; gap: 8px;' }, [
                h('t-button', {
                    size: 'small',
                    theme: 'primary',
                    variant: 'text',
                    onClick: () => viewCacheDetail(row.id)
                }, '查看'),
                h('t-button', {
                    size: 'small',
                    theme: 'success',
                    variant: 'text',
                    onClick: () => loadCacheResult(row.id)
                }, '加载'),
                h('t-button', {
                    size: 'small',
                    theme: 'default',
                    variant: 'text',
                    onClick: () => exportSingleCache(row.id)
                }, '导出'),
                h('t-popconfirm', {
                    content: '确定要删除这个缓存吗？',
                    onConfirm: () => deleteSingleCache(row.id)
                }, {
                    default: () => h('t-button', {
                        size: 'small',
                        theme: 'danger',
                        variant: 'text'
                    }, '删除')
                })
            ]);
        }
    }
]);

// 页面挂载时刷新缓存列表
onMounted(() => {
    refreshCacheList();
});

// 刷新缓存列表
const refreshCacheList = () => {
    try {
        cacheList.value = CacheService.getCacheList();
        cacheStats.value = CacheService.getCacheStats();
        tablePagination.value.total = cacheList.value.length;
        MessagePlugin.success('缓存列表已刷新');
    } catch (error) {
        console.error('刷新缓存列表失败:', error);
        MessagePlugin.error('刷新失败: ' + error.message);
    }
};

// 查看缓存详情
const viewCacheDetail = (cacheId) => {
    try {
        const cacheData = CacheService.loadClassificationResult(cacheId);
        if (cacheData) {
            selectedCacheData.value = cacheData;
            showDetailDialog.value = true;
        } else {
            MessagePlugin.error('缓存数据不存在或已损坏');
        }
    } catch (error) {
        console.error('查看缓存详情失败:', error);
        MessagePlugin.error('查看详情失败');
    }
};

// 加载缓存结果（应用到主界面）
const loadCacheResult = (cacheId) => {
    try {
        const cacheData = CacheService.loadClassificationResult(cacheId);
        if (cacheData) {
            emit('load-cache-result', cacheData);
            MessagePlugin.success(`已加载缓存结果: ${cacheData.searchQuery}`);
            dialogVisible.value = false;
        } else {
            MessagePlugin.error('缓存数据不存在或已损坏');
        }
    } catch (error) {
        console.error('加载缓存结果失败:', error);
        MessagePlugin.error('加载失败');
    }
};

// 处理从详情对话框应用结果
const handleApplyResult = (cacheData) => {
    emit('load-cache-result', cacheData);
    MessagePlugin.success(`已应用缓存结果: ${cacheData.searchQuery}`);
    dialogVisible.value = false;
    showDetailDialog.value = false;
};

// 导出单个缓存
const exportSingleCache = (cacheId) => {
    try {
        const cacheData = CacheService.loadClassificationResult(cacheId);
        if (!cacheData) {
            MessagePlugin.error('缓存数据不存在');
            return;
        }

        const content = CacheService.exportCache(cacheId);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `缓存_${cacheData.searchQuery}_${new Date().getTime()}.json`,
            saveAs: true,
        });
        
        MessagePlugin.success('导出成功');
    } catch (error) {
        console.error('导出缓存失败:', error);
        MessagePlugin.error('导出失败: ' + error.message);
    }
};

// 导出所有缓存
const exportAllCache = () => {
    try {
        const content = CacheService.exportCache();
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `所有缓存_${new Date().getTime()}.json`,
            saveAs: true,
        });
        
        MessagePlugin.success('导出成功');
    } catch (error) {
        console.error('导出所有缓存失败:', error);
        MessagePlugin.error('导出失败: ' + error.message);
    }
};

// 处理导入缓存
const handleImportCache = (context) => {
    console.log('导入缓存被触发，完整context:', context);
    
    // TDesign Vue 上传组件的不同回调参数结构
    let file = null;
    
    if (context.file) {
        // 方式1: context.file直接是文件对象
        file = context.file.raw || context.file;
    } else if (context.raw) {
        // 方式2: context.raw是文件对象
        file = context.raw;
    } else if (context.length > 0) {
        // 方式3: context是文件数组
        file = context[0].raw || context[0];
    } else {
        // 方式4: context本身就是文件对象
        file = context;
    }
    
    console.log('提取的文件对象:', file);
    
    if (!file || !file.name) {
        console.error('无法获取文件对象，context结构:', Object.keys(context));
        MessagePlugin.error('请选择要导入的缓存文件');
        return;
    }

    console.log('文件信息:', {
        name: file.name,
        type: file.type,
        size: file.size
    });

    // 检查文件类型
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        MessagePlugin.error('请选择JSON格式的缓存文件');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            console.log('文件读取成功，内容长度:', e.target.result.length);
            
            const content = e.target.result;
            const importCount = CacheService.importCache(content);
            
            MessagePlugin.success(`成功导入 ${importCount} 个缓存`);
            refreshCacheList();
            
        } catch (error) {
            console.error('导入缓存失败:', error);
            MessagePlugin.error('导入失败: ' + error.message);
        }
    };
    
    reader.onerror = (e) => {
        console.error('文件读取失败:', e);
        MessagePlugin.error('文件读取失败');
    };
    
    console.log('开始读取文件...');
    reader.readAsText(file);
};

// 删除单个缓存
const deleteSingleCache = (cacheId) => {
    try {
        CacheService.deleteCache(cacheId);
        MessagePlugin.success('删除成功');
        refreshCacheList();
    } catch (error) {
        console.error('删除缓存失败:', error);
        MessagePlugin.error('删除失败: ' + error.message);
    }
};

// 清空所有缓存
const clearAllCache = () => {
    try {
        CacheService.clearAllCache();
        MessagePlugin.success('所有缓存已清空');
        refreshCacheList();
    } catch (error) {
        console.error('清空缓存失败:', error);
        MessagePlugin.error('清空失败: ' + error.message);
    }
};

// 触发原生文件输入
const triggerFileInput = () => {
    fileInput.value?.click();
};

// 处理原生文件输入
const handleFileInput = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
        MessagePlugin.error('请选择文件');
        return;
    }
    
    const file = files[0];
    console.log('原生文件输入，文件信息:', {
        name: file.name,
        type: file.type,
        size: file.size
    });
    
    // 检查文件类型
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        MessagePlugin.error('请选择JSON格式的缓存文件');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            console.log('原生文件读取成功，内容长度:', e.target.result.length);
            
            const content = e.target.result;
            const importCount = CacheService.importCache(content);
            
            MessagePlugin.success(`成功导入 ${importCount} 个缓存`);
            refreshCacheList();
            
            // 清空文件输入
            event.target.value = '';
            
        } catch (error) {
            console.error('导入缓存失败:', error);
            MessagePlugin.error('导入失败: ' + error.message);
        }
    };
    
    reader.onerror = (e) => {
        console.error('文件读取失败:', e);
        MessagePlugin.error('文件读取失败');
    };
    
    reader.readAsText(file);
};

// 创建测试缓存（用于调试）
const createTestCache = () => {
    try {
        const testData = {
            searchQuery: '测试缓存',
            bookmarks: [
                {
                    id: 'test1',
                    title: '测试书签1',
                    url: 'https://example.com/1',
                    dateAdded: Date.now()
                },
                {
                    id: 'test2', 
                    title: '测试书签2',
                    url: 'https://example.com/2',
                    dateAdded: Date.now()
                }
            ],
            classificationResult: {
                categories: [
                    {
                        name: '测试分类',
                        description: '这是一个测试分类',
                        keywords: ['测试', '示例'],
                        bookmarks: [
                            {
                                id: 'test1',
                                title: '测试书签1',
                                url: 'https://example.com/1',
                                dateAdded: Date.now()
                            }
                        ]
                    }
                ],
                summary: '测试分类完成',
                totalBookmarks: 2,
                totalCategories: 1
            }
        };
        
        const cacheId = CacheService.saveClassificationResult(
            testData.searchQuery,
            testData.bookmarks,
            testData.classificationResult
        );
        
        MessagePlugin.success(`测试缓存已创建 (ID: ${cacheId.slice(-8)})`);
        refreshCacheList();
        
    } catch (error) {
        console.error('创建测试缓存失败:', error);
        MessagePlugin.error('创建测试缓存失败: ' + error.message);
    }
};

// 表格分页处理
const onTablePageChange = (pageInfo) => {
    tablePagination.value.current = pageInfo.current;
    tablePagination.value.pageSize = pageInfo.pageSize;
};
</script>

<style scoped>
:deep(.t-statistic__content) {
    text-align: center;
}

:deep(.t-table__cell) {
    word-break: break-all;
}

:deep(.t-progress) {
    margin-top: 8px;
}
</style>