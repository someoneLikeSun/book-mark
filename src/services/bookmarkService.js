const dev = 'development'
if (dev === process.env.NODE_ENV) {
    chrome = {
        bookmarks: {
            getTree: function (callback) {
                callback([{
                    id: '1',
                    title: '书签栏',
                    children: [
                        {
                            id: '2',
                            title: '百度',
                            url: 'https://www.baidu.com'
                        },
                        {
                            id: '3',
                            title: '谷歌',
                            url: 'https://www.google.com'
                        }
                    ]
                }])
            },
            search: function (a, callback) {
                callback([{
                    "dateAdded": 1701963225419,
                    "id": "29",
                    "index": 10,
                    "parentId": "18",
                    "title": "FCCloud",
                    "url": "https://www.fccloud.vip/#/dashboard"
                }])
            },
            remove:function(id,callback){
                console.log('删除成功');
                
            }
        },
        downloads: {
            download: function (blob, filename) {
                console.log('下载成功');

            }
        }
    }
}

export class BookmarkService {
    // 获取完整的书签树
    static async getBookmarkTree() {
        return new Promise((resolve) => {
            chrome.bookmarks.getTree((bookmarkTreeNodes) => {
                resolve(this.processBookmarkNodes(bookmarkTreeNodes));
            });
        });
    }

    // 处理书签节点数据
    static processBookmarkNodes(nodes) {
        return nodes.map(node => {
            const processed = {
                id: node.id,
                title: node.title || '未命名',
                url: node.url,
                dateAdded: node.dateAdded,
                type: node.url ? 'bookmark' : 'folder'
            };

            if (node.children) {
                processed.children = this.processBookmarkNodes(node.children);
            }

            return processed;
        });
    }

    // 搜索书签
    static async searchBookmarks(query) {
        return new Promise((resolve) => {
            chrome.bookmarks.search(query, (results) => {
                resolve(results);
            });
        });
    }
    static async download(blob, filename) {
        const urlBlob = URL.createObjectURL(blob);
        chrome.downloads.download({
            url: urlBlob,
            filename: filename,
            saveAs: true,
        });
    }
    static async removeBookmark(id) {
        return new Promise((resolve) => {
            chrome.bookmarks.remove(id, () => {
                resolve();
            });
        });
    }
}