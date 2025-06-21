<template>
    <t-dialog
        v-model:visible="dialogVisible"
        title="缓存详情"
        width="90%"
        :footer="false"
        destroy-on-close
    >
        <div style="height: 80vh; overflow: auto;" v-if="cacheData">
            <!-- 基本信息 -->
            <t-card title="基本信息" style="margin-bottom: 16px;">
                <t-descriptions :items="basicInfoItems" />
            </t-card>

            <!-- 分类结果预览 -->
            <t-card title="分类结果预览" style="margin-bottom: 16px;">
                <template #actions>
                    <t-button @click="applyResult" theme="primary">
                        应用此结果
                    </t-button>
                    <t-button @click="exportResult">
                        导出结果
                    </t-button>
                </template>

                <t-alert 
                    :message="cacheData.classificationResult.summary" 
                    theme="info" 
                    style="margin-bottom: 16px;" 
                />
                
                <t-collapse>
                    <t-collapse-panel 
                        v-for="(category, index) in cacheData.classificationResult.categories" 
                        :key="index"
                        :header="`${category.name} (${category.bookmarks.length}个书签)`"
                    >
                        <!-- 分类描述和关键词 -->
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
                        
                        <!-- 书签列表 -->
                        <t-table 
                            :data="category.bookmarks" 
                            :columns="bookmarkColumns"
                            :pagination="false"
                            size="small"
                            max-height="300"
                        />
                    </t-collapse-panel>
                </t-collapse>
            </t-card>

            <!-- 原始书签数据 -->
            <t-card title="原始书签数据">
                <template #subtitle>
                    共 {{ cacheData.bookmarks.length }} 个书签
                </template>
                
                <t-table 
                    :data="displayedBookmarks" 
                    :columns="bookmarkColumns"
                    :pagination="bookmarkPagination"
                    @page-change="onBookmarkPageChange"
                    size="small"
                />
            </t-card>
        </div>
        
        <t-empty v-else description="缓存数据加载失败" />
    </t-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';

const props = defineProps({
    visible: Boolean,
    cacheData: Object
});

const emit = defineEmits(['update:visible', 'apply-result']);

const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const displayedBookmarks = ref([]);
const bookmarkPagination = ref({
    current: 1,
    pageSize: 10,
    total: 0
});

// 基本信息描述项
const basicInfoItems = computed(() => {
    if (!props.cacheData) return [];
    
    return [
        {
            label: '搜索关键词',
            content: props.cacheData.searchQuery
        },
        {
            label: '创建时间',
            content: new Date(props.cacheData.createdAt).toLocaleString()
        },
        {
            label: '书签总数',
            content: `${props.cacheData.bookmarkCount} 个`
        },
        {
            label: '分类数量',
            content: `${props.cacheData.categoryCount} 个`
        },
        {
            label: '分类方法',
            content: props.cacheData.classificationResult.classificationMethod || '智能分类'
        },
        {
            label: '缓存ID',
            content: props.cacheData.id
        }
    ];
});

// 书签表格列定义
const bookmarkColumns = ref([
    {
        title: 'ID',
        colKey: 'id',
        width: 80
    },
    {
        title: '标题',
        colKey: 'title',
        ellipsis: true,
        width: 300
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

// 监听缓存数据变化，更新显示的书签
watch(() => props.cacheData, (newData) => {
    if (newData && newData.bookmarks) {
        bookmarkPagination.value.total = newData.bookmarks.length;
        bookmarkPagination.value.current = 1;
        updateDisplayedBookmarks();
    }
}, { immediate: true });

// 更新显示的书签
const updateDisplayedBookmarks = () => {
    if (!props.cacheData || !props.cacheData.bookmarks) return;
    
    const startIndex = (bookmarkPagination.value.current - 1) * bookmarkPagination.value.pageSize;
    const endIndex = startIndex + bookmarkPagination.value.pageSize;
    displayedBookmarks.value = props.cacheData.bookmarks.slice(startIndex, endIndex);
};

// 书签分页处理
const onBookmarkPageChange = (pageInfo) => {
    bookmarkPagination.value.current = pageInfo.current;
    bookmarkPagination.value.pageSize = pageInfo.pageSize;
    updateDisplayedBookmarks();
};

// 应用缓存结果
const applyResult = () => {
    emit('apply-result', props.cacheData);
    MessagePlugin.success('结果已应用到主界面');
};

// 导出结果
const exportResult = () => {
    if (!props.cacheData) return;
    
    try {
        const content = JSON.stringify(props.cacheData, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `分类结果_${props.cacheData.searchQuery}_${new Date().getTime()}.json`,
            saveAs: true,
        });
        
        MessagePlugin.success('导出成功');
    } catch (error) {
        console.error('导出失败:', error);
        MessagePlugin.error('导出失败');
    }
};
</script>

<style scoped>
:deep(.t-descriptions__item-label) {
    font-weight: 500;
    min-width: 100px;
}

:deep(.t-table__cell) {
    word-break: break-all;
}

:deep(.t-collapse-panel__header) {
    font-weight: 500;
}

:deep(.t-alert) {
    border-radius: 6px;
}

:deep(.t-descriptions) {
    margin-bottom: 16px;
}

:deep(.t-descriptions__item) {
    margin-bottom: 8px;
}

:deep(.t-descriptions__item-content) {
    color: #333;
}
</style>
