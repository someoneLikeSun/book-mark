<!-- src/components/BookmarkTest.vue -->
<template>
    <div style="width: 100%;height: 100%;">
    
        <t-row>
            <t-col :span="6">
                <t-space direction="vertical">
                    <t-input v-model="searchQuery" placeholder="Search Input" clearable @enter="testBookmarkAccess">
                        <template #suffixIcon>
                            <search-icon :style="{ cursor: 'pointer' }" />
                        </template>
                    </t-input>
                </t-space>
            </t-col>
            <t-col :span="6">
                <t-button @click="downloadResults(bookmarkData)">下载标签</t-button>
                <t-button @click="remove(bookmarkData)">删除标签</t-button>
                <t-table :data="bookmarkTable" :columns="bookmarkColumn"  :pagination="pagination" 
                     @page-change="onPageChange"
                    </t-table>
            </t-col>

        </t-row>

    </div>
</template>

<script setup>
import { ref } from 'vue';
import { SearchIcon } from 'tdesign-icons-vue-next';

import { BookmarkService } from '../services/bookmarkService';
const searchQuery = ref('');

const bookmarkData = ref(null);
const bookmarkTable = ref([]);
const bookmarkColumn = ref([{
    title: 'ID',
    colKey: 'id'
}, {
    title: '名称',
    colKey: 'title'
}, {
    title: '网址',
    colKey: 'url'
}, {
    title: '添加时间',
    colKey: 'dateAdded'
}]
)
const pagination = ref({
    defaultPageSize: 10,
    defaultCurrent: 1,
    total: 0,
    current: 1,
    pageSize:10
})
const testBookmarkAccess = async () => {
    try {
        console.log(searchQuery.value);
        const data = await BookmarkService.searchBookmarks(searchQuery.value);
        bookmarkData.value = data;
        pagination.value.total = data.length;
        onPageChange(pagination.value)
        // downloadResults(data)
    } catch (error) {
        console.error('获取书签失败:', error);
    }
};

const onPageChange = (currentPageInfo) => {
    pagination.value.current=currentPageInfo.current;
    pagination.value.pageSize=currentPageInfo.pageSize;
    bookmarkTable.value = bookmarkData.value.slice(pagination.value.pageSize * (pagination.value.current - 1), pagination.value.pageSize * (pagination.value.current))
    
}
const remove = async (tas_list) => {
    tas_list.forEach(item=>{
        BookmarkService.removeBookmark(item.id)
    })
};

const downloadResults = (tas_list) => {
    console.log(tas_list);
    
    const content = tas_list
        .map((tab) => `Title: ${tab.title}||URL: ${tab.url}`)
        .join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const urlBlob = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: urlBlob,
        filename: 'matched_tabs.txt',
        saveAs: true,
    });
};
</script>