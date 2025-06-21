// src/services/exportHelper.js
export class ExportHelper {
    /**
     * 导出分类结果为JSON格式
     * @param {Object} classificationResult 分类结果
     * @param {Array} originalBookmarks 原始书签
     * @param {string} searchQuery 搜索关键词
     */
    static exportAsJSON(classificationResult, originalBookmarks, searchQuery) {
        const exportData = {
            exportInfo: {
                exportTime: new Date().toISOString(),
                searchQuery: searchQuery,
                exportType: 'classification_result',
                version: '1.0'
            },
            originalBookmarks: originalBookmarks,
            classificationResult: classificationResult,
            statistics: {
                totalBookmarks: originalBookmarks.length,
                totalCategories: classificationResult.totalCategories,
                averageBookmarksPerCategory: Math.round(originalBookmarks.length / classificationResult.totalCategories),
                createdAt: new Date().toISOString()
            }
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 导出分类结果为可读文本格式
     * @param {Object} classificationResult 分类结果
     * @param {string} searchQuery 搜索关键词
     */
    static exportAsText(classificationResult, searchQuery) {
        const timestamp = new Date().toLocaleString();
        
        let content = `书签分类报告
=========================================
导出时间: ${timestamp}
搜索关键词: ${searchQuery || '全部书签'}
分类方法: ${classificationResult.classificationMethod || 'AI智能分类'}
书签总数: ${classificationResult.totalBookmarks}
分类总数: ${classificationResult.totalCategories}

分类总结:
${classificationResult.summary}

=========================================

详细分类结果:

`;

        classificationResult.categories.forEach((category, index) => {
            content += `${index + 1}. ${category.name} (${category.bookmarks.length}个书签)
描述: ${category.description}`;
            
            if (category.keywords && category.keywords.length > 0) {
                content += `\n关键词: ${category.keywords.join(', ')}`;
            }
            
            content += '\n书签列表:\n';
            
            category.bookmarks.forEach((bookmark, bookmarkIndex) => {
                content += `   ${bookmarkIndex + 1}. ${bookmark.title}
      网址: ${bookmark.url}
      添加时间: ${new Date(bookmark.dateAdded).toLocaleString()}
`;
            });
            
            content += '\n' + '-'.repeat(50) + '\n\n';
        });

        return content;
    }

    /**
     * 导出分类结果为CSV格式
     * @param {Object} classificationResult 分类结果
     */
    static exportAsCSV(classificationResult) {
        let csvContent = 'Category,Description,Keywords,BookmarkTitle,BookmarkURL,DateAdded\n';
        
        classificationResult.categories.forEach(category => {
            const keywords = category.keywords ? category.keywords.join(';') : '';
            
            category.bookmarks.forEach(bookmark => {
                const row = [
                    `"${category.name}"`,
                    `"${category.description}"`,
                    `"${keywords}"`,
                    `"${bookmark.title}"`,
                    `"${bookmark.url}"`,
                    `"${new Date(bookmark.dateAdded).toISOString()}"`
                ].join(',');
                
                csvContent += row + '\n';
            });
        });

        return csvContent;
    }

    /**
     * 导出分类结果为HTML格式
     * @param {Object} classificationResult 分类结果
     * @param {string} searchQuery 搜索关键词
     */
    static exportAsHTML(classificationResult, searchQuery) {
        const timestamp = new Date().toLocaleString();
        
        let htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>书签分类报告 - ${searchQuery || '全部书签'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .category { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .category-header { background: #e3f2fd; padding: 15px; border-bottom: 1px solid #ddd; }
        .category-title { font-size: 1.2em; font-weight: bold; margin: 0; color: #1976d2; }
        .category-description { margin: 5px 0; color: #666; }
        .keywords { margin: 10px 0; }
        .keyword { background: #e1f5fe; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-right: 5px; }
        .bookmarks { padding: 0; }
        .bookmark { padding: 10px 15px; border-bottom: 1px solid #eee; }
        .bookmark:last-child { border-bottom: none; }
        .bookmark-title { font-weight: bold; color: #333; margin-bottom: 5px; }
        .bookmark-url { color: #1976d2; text-decoration: none; font-size: 0.9em; }
        .bookmark-date { color: #666; font-size: 0.8em; margin-top: 5px; }
        .stats { display: flex; gap: 20px; }
        .stat-item { text-align: center; }
        .stat-number { font-size: 1.5em; font-weight: bold; color: #1976d2; }
        .stat-label { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>书签分类报告</h1>
        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">${classificationResult.totalBookmarks}</div>
                <div class="stat-label">书签总数</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${classificationResult.totalCategories}</div>
                <div class="stat-label">分类数量</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${Math.round(classificationResult.totalBookmarks / classificationResult.totalCategories)}</div>
                <div class="stat-label">平均每类</div>
            </div>
        </div>
        <p><strong>搜索关键词:</strong> ${searchQuery || '全部书签'}</p>
        <p><strong>导出时间:</strong> ${timestamp}</p>
        <p><strong>分类总结:</strong> ${classificationResult.summary}</p>
    </div>
`;

        classificationResult.categories.forEach((category, index) => {
            htmlContent += `
    <div class="category">
        <div class="category-header">
            <h2 class="category-title">${index + 1}. ${category.name} (${category.bookmarks.length}个书签)</h2>
            <p class="category-description">${category.description}</p>`;
            
            if (category.keywords && category.keywords.length > 0) {
                htmlContent += '<div class="keywords">';
                category.keywords.forEach(keyword => {
                    htmlContent += `<span class="keyword">${keyword}</span>`;
                });
                htmlContent += '</div>';
            }
            
            htmlContent += `
        </div>
        <div class="bookmarks">`;
            
            category.bookmarks.forEach(bookmark => {
                htmlContent += `
            <div class="bookmark">
                <div class="bookmark-title">${bookmark.title}</div>
                <a href="${bookmark.url}" class="bookmark-url" target="_blank">${bookmark.url}</a>
                <div class="bookmark-date">添加时间: ${new Date(bookmark.dateAdded).toLocaleString()}</div>
            </div>`;
            });
            
            htmlContent += `
        </div>
    </div>`;
        });

        htmlContent += `
</body>
</html>`;

        return htmlContent;
    }

    /**
     * 触发浏览器下载
     * @param {string} content 文件内容
     * @param {string} filename 文件名
     * @param {string} mimeType 文件类型
     */
    static triggerDownload(content, filename, mimeType = 'text/plain') {
        try {
            const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
            const url = URL.createObjectURL(blob);
            
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true,
            });
            
            // 清理临时URL
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('下载失败:', error);
            return false;
        }
    }

    /**
     * 生成带时间戳的文件名
     * @param {string} baseName 基础文件名
     * @param {string} extension 文件扩展名
     * @param {string} searchQuery 搜索关键词
     */
    static generateFilename(baseName, extension, searchQuery = '') {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const queryPart = searchQuery ? `_${searchQuery.replace(/[^\w\u4e00-\u9fa5]/g, '_')}` : '';
        return `${baseName}${queryPart}_${timestamp}.${extension}`;
    }
}