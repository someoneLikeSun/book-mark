// src/services/cacheService.js
export class CacheService {
    static CACHE_PREFIX = 'bookmark_classification_';
    static CACHE_LIST_KEY = 'bookmark_classification_list';
    static MAX_CACHE_SIZE = 50; // 最大缓存数量

    /**
     * 保存分类结果到缓存
     * @param {string} searchQuery 搜索关键词
     * @param {Array} bookmarks 原始书签数据
     * @param {Object} classificationResult 分类结果
     * @returns {string} 缓存ID
     */
    static saveClassificationResult(searchQuery, bookmarks, classificationResult) {
        try {
            console.log('保存分类结果到缓存:', searchQuery, '书签数量:', bookmarks?.length);
            
            const cacheId = this.generateCacheId(searchQuery);
            const cacheData = {
                id: cacheId,
                searchQuery,
                bookmarks: bookmarks || [],
                classificationResult,
                createdAt: Date.now(),
                bookmarkCount: bookmarks?.length || 0,
                categoryCount: classificationResult.totalCategories || classificationResult.categories?.length || 0
            };

            // 保存分类结果
            localStorage.setItem(this.CACHE_PREFIX + cacheId, JSON.stringify(cacheData));
            console.log('缓存保存成功，ID:', cacheId);

            // 更新缓存列表
            this.updateCacheList(cacheId, {
                searchQuery,
                createdAt: cacheData.createdAt,
                bookmarkCount: cacheData.bookmarkCount,
                categoryCount: cacheData.categoryCount
            });

            // 清理过期缓存
            this.cleanupOldCache();

            return cacheId;
        } catch (error) {
            console.error('保存缓存失败:', error);
            throw new Error('保存结果失败: ' + error.message);
        }
    }

    /**
     * 从缓存加载分类结果
     * @param {string} cacheId 缓存ID
     * @returns {Object|null} 缓存的数据
     */
    static loadClassificationResult(cacheId) {
        try {
            const cacheData = localStorage.getItem(this.CACHE_PREFIX + cacheId);
            return cacheData ? JSON.parse(cacheData) : null;
        } catch (error) {
            console.error('加载缓存失败:', error);
            return null;
        }
    }

    /**
     * 获取缓存列表
     * @returns {Array} 缓存列表
     */
    static getCacheList() {
        try {
            const cacheList = localStorage.getItem(this.CACHE_LIST_KEY);
            return cacheList ? JSON.parse(cacheList) : [];
        } catch (error) {
            console.error('获取缓存列表失败:', error);
            return [];
        }
    }

    /**
     * 删除指定缓存
     * @param {string} cacheId 缓存ID
     */
    static deleteCache(cacheId) {
        try {
            localStorage.removeItem(this.CACHE_PREFIX + cacheId);
            
            // 从缓存列表中移除
            const cacheList = this.getCacheList();
            const updatedList = cacheList.filter(item => item.id !== cacheId);
            localStorage.setItem(this.CACHE_LIST_KEY, JSON.stringify(updatedList));
        } catch (error) {
            console.error('删除缓存失败:', error);
            throw new Error('删除缓存失败');
        }
    }

    /**
     * 清空所有缓存
     */
    static clearAllCache() {
        try {
            const cacheList = this.getCacheList();
            
            // 删除所有分类结果缓存
            cacheList.forEach(item => {
                localStorage.removeItem(this.CACHE_PREFIX + item.id);
            });
            
            // 清空缓存列表
            localStorage.removeItem(this.CACHE_LIST_KEY);
        } catch (error) {
            console.error('清空缓存失败:', error);
            throw new Error('清空缓存失败');
        }
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    static getCacheStats() {
        const cacheList = this.getCacheList();
        let totalSize = 0;
        
        // 计算总缓存大小（近似值）
        cacheList.forEach(item => {
            const cacheData = localStorage.getItem(this.CACHE_PREFIX + item.id);
            if (cacheData) {
                totalSize += cacheData.length;
            }
        });

        return {
            count: cacheList.length,
            totalSize: (totalSize / 1024).toFixed(2) + ' KB', // 转换为KB
            maxSize: this.MAX_CACHE_SIZE
        };
    }

    /**
     * 检查是否存在相同查询的缓存
     * @param {string} searchQuery 搜索关键词
     * @returns {string|null} 存在的缓存ID，不存在返回null
     */
    static findExistingCache(searchQuery) {
        const cacheList = this.getCacheList();
        const existingCache = cacheList.find(item => 
            item.searchQuery.toLowerCase() === searchQuery.toLowerCase()
        );
        return existingCache ? existingCache.id : null;
    }

    /**
     * 导出缓存数据
     * @param {string} cacheId 缓存ID，如果不指定则导出所有
     * @returns {string} JSON格式的缓存数据
     */
    static exportCache(cacheId = null) {
        try {
            if (cacheId) {
                // 导出单个缓存
                const cacheData = this.loadClassificationResult(cacheId);
                return JSON.stringify(cacheData, null, 2);
            } else {
                // 导出所有缓存
                const cacheList = this.getCacheList();
                const allCacheData = cacheList.map(item => 
                    this.loadClassificationResult(item.id)
                ).filter(Boolean);
                
                return JSON.stringify({
                    exportTime: new Date().toISOString(),
                    totalCount: allCacheData.length,
                    cacheData: allCacheData
                }, null, 2);
            }
        } catch (error) {
            console.error('导出缓存失败:', error);
            throw new Error('导出缓存失败');
        }
    }

    /**
     * 导入缓存数据
     * @param {string} jsonData JSON格式的缓存数据
     */
    static importCache(jsonData) {
        try {
            console.log('开始导入缓存，数据长度:', jsonData.length);
            
            const data = JSON.parse(jsonData);
            console.log('JSON解析成功，数据结构:', Object.keys(data));
            
            let importedCount = 0;
            
            if (data.cacheData && Array.isArray(data.cacheData)) {
                // 导入多个缓存（批量导出的格式）
                console.log('检测到批量缓存数据，数量:', data.cacheData.length);
                
                data.cacheData.forEach((cacheItem, index) => {
                    try {
                        if (cacheItem.searchQuery && cacheItem.classificationResult) {
                            this.saveClassificationResult(
                                cacheItem.searchQuery,
                                cacheItem.bookmarks || [],
                                cacheItem.classificationResult
                            );
                            importedCount++;
                            console.log(`成功导入第 ${index + 1} 个缓存:`, cacheItem.searchQuery);
                        } else {
                            console.warn(`第 ${index + 1} 个缓存数据格式不正确:`, Object.keys(cacheItem));
                        }
                    } catch (error) {
                        console.error(`导入第 ${index + 1} 个缓存失败:`, error);
                    }
                });
                
            } else if (data.searchQuery && data.classificationResult) {
                // 导入单个缓存
                console.log('检测到单个缓存数据:', data.searchQuery);
                
                this.saveClassificationResult(
                    data.searchQuery,
                    data.bookmarks || [],
                    data.classificationResult
                );
                importedCount = 1;
                
            } else if (data.exportInfo && data.originalBookmarks && data.classificationResult) {
                // 导入导出的分类结果格式
                console.log('检测到导出的分类结果格式');
                
                this.saveClassificationResult(
                    data.exportInfo.searchQuery || '导入的分类',
                    data.originalBookmarks,
                    data.classificationResult
                );
                importedCount = 1;
                
            } else {
                console.error('无法识别的数据格式，数据结构:', Object.keys(data));
                throw new Error('无效的缓存数据格式，请检查文件内容');
            }
            
            console.log(`导入完成，成功导入 ${importedCount} 个缓存`);
            return importedCount;
            
        } catch (parseError) {
            console.error('JSON解析失败:', parseError);
            console.error('原始数据前100字符:', jsonData.substring(0, 100));
            throw new Error('文件格式错误，请确认是有效的JSON文件');
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 生成缓存ID
     * @param {string} searchQuery 搜索关键词
     * @returns {string} 缓存ID
     */
    static generateCacheId(searchQuery) {
        const timestamp = Date.now();
        const queryHash = this.simpleHash(searchQuery);
        return `${queryHash}_${timestamp}`;
    }

    /**
     * 简单哈希函数
     * @param {string} str 字符串
     * @returns {string} 哈希值
     */
    static simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 更新缓存列表
     * @param {string} cacheId 缓存ID
     * @param {Object} cacheInfo 缓存信息
     */
    static updateCacheList(cacheId, cacheInfo) {
        let cacheList = this.getCacheList();
        
        // 移除已存在的相同ID缓存
        cacheList = cacheList.filter(item => item.id !== cacheId);
        
        // 添加新缓存到列表开头
        cacheList.unshift({
            id: cacheId,
            ...cacheInfo
        });

        // 限制缓存数量
        if (cacheList.length > this.MAX_CACHE_SIZE) {
            const removedItems = cacheList.splice(this.MAX_CACHE_SIZE);
            // 删除超出限制的缓存数据
            removedItems.forEach(item => {
                localStorage.removeItem(this.CACHE_PREFIX + item.id);
            });
        }

        localStorage.setItem(this.CACHE_LIST_KEY, JSON.stringify(cacheList));
    }

    /**
     * 清理过期缓存（可选：清理超过30天的缓存）
     */
    static cleanupOldCache() {
        try {
            const cacheList = this.getCacheList();
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            const validCaches = cacheList.filter(item => {
                if (item.createdAt < thirtyDaysAgo) {
                    // 删除过期缓存
                    localStorage.removeItem(this.CACHE_PREFIX + item.id);
                    return false;
                }
                return true;
            });

            if (validCaches.length !== cacheList.length) {
                localStorage.setItem(this.CACHE_LIST_KEY, JSON.stringify(validCaches));
            }
        } catch (error) {
            console.error('清理过期缓存失败:', error);
        }
    }
}