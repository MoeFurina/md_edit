class MarkdownEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.uploadedImages = [];

        // 博客框架元数据存储
        this.metadata = {
            title: '',
            published: '',
            description: '',
            imageOriginal: '', // 原始上传路径，用于显示
            imageFinal: '',     // 最终导出路径，用于Markdown
            tags: [],
            category: 'astro',
            draft: false,
            lang: 'zh-CN'
        };

        this.init();
    }

    init() {
        console.log('Initializing MarkdownEditor...');
        this.loadTheme();
        this.setupToolbarEvents();
        this.setupKeyboardEvents();
        this.setupPasteEvents();
        this.setupDialogEvents();
        this.setupStatusBarUpdates();
        this.initializeSidebar();
        console.log('MarkdownEditor initialization completed');
    }

    setupToolbarEvents() {
        // 博客框架选择
        const blogFramework = document.getElementById('blogFramework');
        if (blogFramework) {
            const self = this; // 保存this的引用
            blogFramework.addEventListener('change', function(e) {
                const selectedFramework = e.target.value;
                console.log('Blog framework changed to:', selectedFramework);
                if (selectedFramework === 'astro') {
                    console.log('Showing metadata form');
                    self.showMetadataForm();
                } else {
                    console.log('Hiding metadata form');
                    self.hideMetadataForm();
                }
            });
            console.log('Blog framework event listener attached');
        } else {
            console.error('Blog framework element not found');
        }

        // 标题选择
        document.getElementById('headingSelect').addEventListener('change', (e) => {
            const value = e.target.value;
            if (value) {
                this.formatHeading(value);
                e.target.value = '';
            }
        });

        // 字体大小
        document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
            this.formatFontSize(e.target.value);
        });

        // 文字颜色
        document.getElementById('textColor').addEventListener('change', (e) => {
            this.formatTextColor(e.target.value);
        });

        // 格式化按钮
        document.getElementById('boldBtn').addEventListener('click', () => this.formatBold());
        document.getElementById('italicBtn').addEventListener('click', () => this.formatItalic());
        document.getElementById('underlineBtn').addEventListener('click', () => this.formatUnderline());
        document.getElementById('strikethroughBtn').addEventListener('click', () => this.formatStrikethrough());

        // 对齐按钮
        document.getElementById('alignLeftBtn').addEventListener('click', () => this.formatAlign('left'));
        document.getElementById('alignCenterBtn').addEventListener('click', () => this.formatAlign('center'));
        document.getElementById('alignRightBtn').addEventListener('click', () => this.formatAlign('right'));

        // 列表按钮
        document.getElementById('orderedListBtn').addEventListener('click', () => this.insertList('ordered'));
        document.getElementById('unorderedListBtn').addEventListener('click', () => this.insertList('unordered'));

        // 其他格式
        document.getElementById('quoteBtn').addEventListener('click', () => this.insertQuote());
        document.getElementById('hrBtn').addEventListener('click', () => this.insertHorizontalRule());

        // 代码块
        document.getElementById('codeSelect').addEventListener('change', (e) => {
            const language = e.target.value;
            if (language) {
                this.insertCodeBlock(language);
                e.target.value = '';
            }
        });

        document.getElementById('inlineCodeBtn').addEventListener('click', () => this.insertInlineCode());

        // 缩进按钮
        document.getElementById('indentBtn').addEventListener('click', () => this.insertIndent());

        // 图片按钮
        document.getElementById('imageBtn').addEventListener('click', () => this.triggerImageUpload());

        // 导出和登出按钮
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportDialog());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }

    setupKeyboardEvents() {
        // Tab键缩进
        this.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertIndent();
            }
        });
    }

    setupPasteEvents() {
        // 粘贴图片事件
        this.editor.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    this.uploadImage(file);
                }
            }
        });
    }

    setupDialogEvents() {
        // 导出对话框事件
        document.getElementById('cancelExport').addEventListener('click', () => {
            document.getElementById('exportDialog').classList.remove('show');
        });

        document.getElementById('confirmExport').addEventListener('click', () => {
            this.exportMarkdown();
        });

        // 点击对话框外部关闭
        document.getElementById('exportDialog').addEventListener('click', (e) => {
            if (e.target.id === 'exportDialog') {
                document.getElementById('exportDialog').classList.remove('show');
            }
        });

        // 链接对话框事件
        document.getElementById('cancelLink').addEventListener('click', () => {
            document.getElementById('linkDialog').classList.remove('show');
        });

        document.getElementById('confirmLink').addEventListener('click', () => {
            this.insertLink();
        });

        document.getElementById('fetchTitle').addEventListener('click', () => {
            this.fetchPageTitle();
        });

        // 点击对话框外部关闭
        document.getElementById('linkDialog').addEventListener('click', (e) => {
            if (e.target.id === 'linkDialog') {
                document.getElementById('linkDialog').classList.remove('show');
            }
        });

        // 主题切换和侧边栏切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('sidebarClose').addEventListener('click', () => {
            this.closeSidebar();
        });

        // 链接按钮
        document.getElementById('linkBtn').addEventListener('click', () => {
            this.showLinkDialog();
        });
    }

    // 格式化方法
    formatHeading(level) {
        document.execCommand('formatBlock', false, level);
        this.editor.focus();
    }

    formatFontSize(size) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            if (selectedText) {
                const span = document.createElement('span');
                span.style.fontSize = size;
                span.style.lineHeight = '1.4';

                // 清除选中内容并插入新的span
                range.deleteContents();
                range.insertNode(span);

                // 将文本放入span中
                span.textContent = selectedText;
            }
        }
        this.editor.focus();
    }

    formatTextColor(color) {
        document.execCommand('foreColor', false, color);
        this.editor.focus();
    }

    formatBold() {
        document.execCommand('bold', false, null);
        this.editor.focus();
    }

    formatItalic() {
        document.execCommand('italic', false, null);
        this.editor.focus();
    }

    formatUnderline() {
        document.execCommand('underline', false, null);
        this.editor.focus();
    }

    formatStrikethrough() {
        document.execCommand('strikethrough', false, null);
        this.editor.focus();
    }

    formatAlign(align) {
        const alignMap = {
            'left': 'left',
            'center': 'center',
            'right': 'right'
        };
        document.execCommand('justify' + alignMap[align].charAt(0).toUpperCase() + alignMap[align].slice(1), false, null);
        this.editor.focus();
    }

    insertList(type) {
        const command = type === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList';
        document.execCommand(command, false, null);
        this.editor.focus();
    }

    insertQuote() {
        document.execCommand('formatBlock', false, 'blockquote');
        this.editor.focus();
    }

    insertHorizontalRule() {
        document.execCommand('insertHorizontalRule', false, null);
        this.editor.focus();
    }

    insertCodeBlock(language) {
        const selection = window.getSelection();
        const selectedText = selection.toString() || '// 在这里输入代码';

        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.className = `language-${language}`;
        code.textContent = selectedText;
        pre.appendChild(code);

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(pre);
        } else {
            this.editor.appendChild(pre);
        }

        // 重新高亮代码
        if (window.Prism) {
            Prism.highlightElement(code);
        }

        this.editor.focus();
    }

    insertInlineCode() {
        const selection = window.getSelection();
        const selectedText = selection.toString();

        if (selectedText) {
            const code = document.createElement('code');
            code.textContent = selectedText;

            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(code);
            }
        }

        this.editor.focus();
    }

    insertIndent() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            if (selectedText) {
                // 为选中的文本添加缩进（两个汉字字符的空格）
                const indentedText = selectedText.replace(/^/gm, '　　');
                range.deleteContents();
                range.insertNode(document.createTextNode(indentedText));
            } else {
                // 在当前位置插入缩进
                const indentText = document.createTextNode('　　');
                range.insertNode(indentText);
            }
        }

        this.editor.focus();
    }

    triggerImageUpload() {
        // 创建文件输入元素
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.uploadImage(e.target.files[0]);
            }
        });
        fileInput.click();
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/upload_image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // 在编辑器中插入图片
                this.insertImage(result.url, result.filename);
                this.uploadedImages.push({
                    url: result.url,
                    filename: result.filename
                });
            } else {
                alert('图片上传失败: ' + result.error);
            }
        } catch (error) {
            alert('图片上传失败: ' + error.message);
        }
    }

    insertImage(url, filename) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = filename;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px 0';

        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(img);
        } else {
            this.editor.appendChild(img);
        }

        this.editor.focus();
    }

    showExportDialog() {
        document.getElementById('exportDialog').classList.add('show');
    }

    showMetadataForm() {
        const metadataForm = document.getElementById('metadataForm');
        if (metadataForm) {
            metadataForm.style.display = 'block';
        }
    }

    hideMetadataForm() {
        const metadataForm = document.getElementById('metadataForm');
        const imageSelectionArea = document.getElementById('imageSelectionArea');
        if (metadataForm) {
            metadataForm.style.display = 'none';
        }
        if (imageSelectionArea) {
            imageSelectionArea.style.display = 'none';
        }
    }

    async exportMarkdown() {
        const imagePath = document.getElementById('imagePath').value || '/image';
        const sidebarImagePath = document.getElementById('sidebarImagePath').value || '/image';
        const editorContent = this.editor.innerHTML;

        // 验证图片路径格式
        if (!imagePath.startsWith('/')) {
            alert('图片路径必须以 / 开头');
            return;
        }

        // 在导出前，确保封面图片的最终路径是最新的
        if (this.metadata.imageOriginal) {
            console.log('导出前更新封面图片路径:');
            console.log('- 侧边栏路径设置:', sidebarImagePath);
            this.metadata.imageFinal = this.generateFinalImagePath(this.metadata.imageOriginal, sidebarImagePath);
            console.log('- 更新后最终路径:', this.metadata.imageFinal);
        }

        try {
            // 构建完整的内容，包含元数据和正文
            let fullContent = editorContent;

            // 如果选择了博客框架，添加YAML Front Matter
            if (document.getElementById('blogFramework').value === 'astro') {
                // 构建YAML Front Matter
                const yamlFrontMatter = this.buildYamlFrontMatter();
                fullContent = yamlFrontMatter + '\n' + editorContent;
            }

            const response = await fetch('/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: fullContent,
                    images: this.uploadedImages,
                    image_path: imagePath
                })
            });

            if (response.ok) {
                // 下载文件
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `markdown_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                // 关闭对话框
                document.getElementById('exportDialog').classList.remove('show');
            } else {
                const error = await response.json();
                alert('导出失败: ' + error.error);
            }
        } catch (error) {
            alert('导出失败: ' + error.message);
        }
    }

    logout() {
        if (confirm('确定要退出登录吗？')) {
            window.location.href = '/logout';
        }
    }

    // 深色模式切换
    toggleTheme() {
        const body = document.body;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // 更新工具栏图标
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = newTheme === 'dark' ? '🌞' : '🌓';

        // 更新编辑器焦点样式
        this.updateEditorTheme();
    }

    updateEditorTheme() {
        const editor = document.getElementById('editor');
        const isDark = document.body.getAttribute('data-theme') === 'dark';

        if (isDark) {
            editor.style.backgroundColor = 'var(--bg-secondary)';
        } else {
            editor.style.backgroundColor = 'transparent';
        }
    }

    // 侧边栏功能
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');

        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('sidebar-open');

        // 更新按钮图标
        const sidebarToggle = document.getElementById('sidebarToggle');
        const isCollapsed = sidebar.classList.contains('collapsed');
        sidebarToggle.textContent = isCollapsed ? '☰' : '✕';
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');

        sidebar.classList.add('collapsed');
        mainContent.classList.remove('sidebar-open');

        document.getElementById('sidebarToggle').textContent = '☰';
    }

    // 链接功能
    showLinkDialog() {
        const selection = window.getSelection();
        const selectedText = selection.toString();

        // 如果有选中的文本，自动填入标题
        if (selectedText) {
            document.getElementById('linkTitle').value = selectedText;
        }

        document.getElementById('linkDialog').classList.add('show');
        document.getElementById('linkUrl').focus();
    }

    insertLink() {
        const url = document.getElementById('linkUrl').value.trim();
        const title = document.getElementById('linkTitle').value.trim();

        if (!url) {
            alert('请输入链接地址');
            return;
        }

        if (!title) {
            alert('请输入显示标题');
            return;
        }

        // 确保编辑器有焦点
        this.editor.focus();

        const selection = window.getSelection();

        // 创建链接元素
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.textContent = title;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';

        // 使用 insertHTML 方法插入链接，这样更可靠
        const linkHTML = `<a href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${title}</a>`;

        if (selection.rangeCount > 0) {
            // 有光标位置
            const range = selection.getRangeAt(0);

            if (!selection.isCollapsed) {
                // 有选中文本，替换选中的内容
                range.deleteContents();
            }

            // 使用 insertHTML 而不是 insertNode
            range.insertNode(document.createTextNode('temp')); // 占位符
            const tempNode = range.startContainer;

            // 插入链接 HTML
            const fragment = range.createContextualFragment(linkHTML);
            range.deleteContents();
            range.insertNode(fragment);

        } else {
            // 没有光标位置，在编辑器末尾插入
            this.editor.insertAdjacentHTML('beforeend', linkHTML);
        }

        // 清空表单并关闭对话框
        document.getElementById('linkUrl').value = '';
        document.getElementById('linkTitle').value = '';
        document.getElementById('linkDialog').classList.remove('show');

        // 重新聚焦编辑器
        this.editor.focus();

        // 验证链接是否插入成功
        setTimeout(() => {
            const insertedLinks = this.editor.querySelectorAll('a');
            console.log('插入链接后，编辑器中的链接数量:', insertedLinks.length);
            console.log('编辑器HTML:', this.editor.innerHTML);
        }, 50);
    }

    async fetchUrlTitle(url) {
        // 验证URL格式
        if (!this.isUrl(url)) {
            throw new Error('URL格式不正确');
        }

        try {
            const response = await fetch('/get_title', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const result = await response.json();

            if (response.ok && result.title) {
                return result.title;
            } else {
                throw new Error(result.error || '无法获取网页标题');
            }
        } catch (error) {
            console.error('标题获取错误:', error);
            throw error;
        }
    }

    async fetchPageTitle() {
        const url = document.getElementById('linkUrl').value.trim();

        if (!url) {
            alert('请先输入URL地址');
            return;
        }

        // 验证URL格式
        if (!this.isUrl(url)) {
            alert('请输入有效的URL地址，必须以 http:// 或 https:// 开头');
            return;
        }

        const fetchButton = document.getElementById('fetchTitle');
        const originalText = fetchButton.textContent;
        fetchButton.textContent = '📥 获取中...';
        fetchButton.disabled = true;

        try {
            const response = await fetch('/get_title', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const result = await response.json();

            if (response.ok && result.title) {
                document.getElementById('linkTitle').value = result.title;
            } else {
                // 显示更友好的错误信息
                if (response.status === 401) {
                    alert('获取标题失败：请先登录');
                } else if (response.status === 400) {
                    alert('获取标题失败：' + (result.error || 'URL格式不正确或网页无标题'));
                } else {
                    alert('获取标题失败：服务器错误');
                }
            }
        } catch (error) {
            console.error('标题获取错误:', error);
            alert('获取标题失败：网络连接错误，请检查URL是否正确');
        } finally {
            fetchButton.textContent = originalText;
            fetchButton.disabled = false;
        }
    }

    // URL粘贴检测
    setupPasteEvents() {
        this.editor.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            let hasImage = false;

            // 检查是否有图片
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    hasImage = true;
                    e.preventDefault();
                    const file = item.getAsFile();
                    this.uploadImage(file);
                    break;
                }
            }

            // 如果没有图片，检查是否有URL
            if (!hasImage) {
                const text = e.clipboardData.getData('text');
                this.handleUrlPaste(text, e);
            }
        });
    }

    async handleUrlPaste(text, event) {
        // 检查是否是纯URL
        if (this.isUrl(text)) {
            event.preventDefault();
            await this.insertUrlLink(text);
            return;
        }

        // 检查文本中是否包含URL
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlRegex);

        if (urls) {
            event.preventDefault();

            // 异步处理所有URL，获取它们的标题
            const processedText = await this.processUrlsInText(text, urls);

            // 插入处理后的文本
            this.insertHtmlAtCursor(processedText);
        }
    }

    async processUrlsInText(text, urls) {
        let processedText = text;

        // 并发处理所有URL，获取标题
        const urlPromises = urls.map(async (url) => {
            try {
                const title = await this.fetchUrlTitle(url);
                return { url, title, success: true };
            } catch (error) {
                console.warn(`获取URL标题失败: ${url}`, error);
                return { url, title: url, success: false };
            }
        });

        const urlResults = await Promise.all(urlPromises);

        // 按URL长度倒序替换，避免短URL影响长URL
        urlResults
            .sort((a, b) => b.url.length - a.url.length)
            .forEach(({ url, title }) => {
                const linkHTML = `<a href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${title}</a>`;
                processedText = processedText.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), linkHTML);
            });

        return processedText;
    }

    showLoadingState(text) {
        // 在状态栏显示加载状态
        const statusFormat = document.getElementById('currentFormat');
        if (statusFormat) {
            this.originalFormat = statusFormat.textContent;
            statusFormat.textContent = '获取标题中...';
            statusFormat.style.color = '#ff9800';
        }

        // 也可以在编辑器中显示临时状态
        this.loadingNode = document.createElement('span');
        this.loadingNode.textContent = text;
        this.loadingNode.style.color = '#999';
        this.loadingNode.style.fontStyle = 'italic';
        this.loadingNode.id = 'loading-indicator';

        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(this.loadingNode);
        }
    }

    hideLoadingState() {
        // 恢复状态栏
        const statusFormat = document.getElementById('currentFormat');
        if (statusFormat && this.originalFormat) {
            statusFormat.textContent = this.originalFormat;
            statusFormat.style.color = '';
        }

        // 移除编辑器中的临时状态
        if (this.loadingNode && this.loadingNode.parentNode) {
            this.loadingNode.parentNode.removeChild(this.loadingNode);
            this.loadingNode = null;
        }
    }

    createLinkElement(url, text) {
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.textContent = text;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        linkElement.style.color = '#667eea';
        linkElement.style.textDecoration = 'none';
        return linkElement;
    }

    insertHtmlAtCursor(html) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }

            range.deleteContents();
            range.insertNode(fragment);
        }
    }

    isUrl(text) {
        // 检查是否以 http:// 或 https:// 开头
        if (typeof text === 'string') {
            text = text.trim();
            return text.startsWith('http://') || text.startsWith('https://');
        }
        return false;
    }

    async insertUrlLink(url) {
        const selection = window.getSelection();
        const selectedText = selection.toString();

        // 显示加载状态
        const loadingText = selectedText || '正在获取标题...';
        this.showLoadingState(loadingText);

        // 尝试获取网页标题
        let linkText = selectedText; // 默认使用选中的文本

        // 如果没有选中文本，尝试获取网页标题
        if (!selectedText) {
            try {
                const title = await this.fetchUrlTitle(url);
                linkText = title || url; // 获取成功用标题，失败用URL
            } catch (error) {
                console.warn('获取网页标题失败，使用URL:', error);
                linkText = url;
            }
        }

        // 移除加载状态
        this.hideLoadingState();

        // 创建链接HTML字符串
        const linkHTML = `<a href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;

        // 确保编辑器有焦点
        this.editor.focus();

        if (selection.rangeCount > 0) {
            // 有光标位置或选中内容
            const range = selection.getRangeAt(0);

            if (!selection.isCollapsed) {
                // 有选中文本，替换选中的内容
                range.deleteContents();
            }

            // 插入链接
            const fragment = range.createContextualFragment(linkHTML);
            range.insertNode(fragment);

            // 将光标移动到链接后面
            range.setStartAfter(fragment.firstChild);
            range.setEndAfter(fragment.firstChild);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // 没有光标位置，在编辑器末尾插入
            this.editor.insertAdjacentHTML('beforeend', linkHTML);
        }

        this.editor.focus();
    }

    // 状态栏更新
    setupStatusBarUpdates() {
        this.editor.addEventListener('mouseup', () => this.updateStatusBar());
        this.editor.addEventListener('keyup', () => this.updateStatusBar());
        this.editor.addEventListener('focus', () => this.updateStatusBar());
        this.editor.addEventListener('input', () => this.updateStatusBar());
    }

    updateStatusBar() {
        this.updateCurrentFormat();
        this.updateCursorPosition();
        this.updateSelectedText();
        this.updateStats();
    }

    updateCurrentFormat() {
        const selection = window.getSelection();
        let format = '无';

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
                ? range.commonAncestorContainer.parentElement
                : range.commonAncestorContainer;

            if (element) {
                const tagName = element.tagName.toLowerCase();
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    format = tagName.toUpperCase();
                } else if (tagName === 'strong' || element.style.fontWeight === 'bold') {
                    format = '加粗';
                } else if (tagName === 'em' || element.style.fontStyle === 'italic') {
                    format = '倾斜';
                } else if (tagName === 'u' || element.style.textDecoration === 'underline') {
                    format = '下划线';
                } else if (tagName === 's' || element.style.textDecoration === 'line-through') {
                    format = '删除线';
                } else if (tagName === 'code') {
                    format = '代码';
                } else if (tagName === 'a') {
                    format = '链接';
                } else if (element.style.textAlign) {
                    const alignMap = {
                        'left': '左对齐',
                        'center': '居中',
                        'right': '右对齐'
                    };
                    format = alignMap[element.style.textAlign] || format;
                }
            }
        }

        document.getElementById('currentFormat').textContent = format;
    }

    updateCursorPosition() {
        const selection = window.getSelection();
        let position = '0, 0';

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(this.editor);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            const caretOffset = preCaretRange.toString().length;

            const lineBreaks = (this.editor.textContent.substring(0, caretOffset).match(/\n/g) || []).length;
            const column = caretOffset - (this.editor.textContent.substring(0, caretOffset).lastIndexOf('\n') + 1);

            position = `${lineBreaks + 1}, ${column}`;
        }

        document.getElementById('cursorPosition').textContent = position;
    }

    updateSelectedText() {
        const selection = window.getSelection();
        const selectedText = selection.toString();

        let display = '未选择';
        if (selectedText) {
            display = `${selectedText.length} 字符`;
            if (selectedText.length > 20) {
                display = `${selectedText.substring(0, 20)}...`;
            }
        }

        document.getElementById('selectedText').textContent = display;
    }

    updateStats() {
        const text = this.editor.textContent || '';
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

        document.getElementById('charCount').textContent = charCount;
        document.getElementById('wordCount').textContent = wordCount;

        // 同步侧边栏的图片路径
        const sidebarImagePathSync = document.getElementById('sidebarImagePath');
        const exportImagePathSync = document.getElementById('imagePath');
        if (sidebarImagePathSync && exportImagePathSync) {
            sidebarImagePathSync.value = exportImagePathSync.value;
        }
    }

    // 加载保存的主题
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);

        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = savedTheme === 'dark' ? '🌞' : '🌓';

        this.updateEditorTheme();
    }

    // 初始化侧边栏
    initializeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');

        // 默认情况下侧边栏是收起的
        sidebar.classList.add('collapsed');
        mainContent.classList.remove('sidebar-open');

        // 设置图片路径同步
        const sidebarImagePath = document.getElementById('sidebarImagePath');
        const exportImagePath = document.getElementById('imagePath');

        if (sidebarImagePath && exportImagePath) {
            // 导出对话框改变时同步到侧边栏
            exportImagePath.addEventListener('input', () => {
                sidebarImagePath.value = exportImagePath.value;
            });

            // 侧边栏改变时同步到导出对话框
            sidebarImagePath.addEventListener('input', () => {
                exportImagePath.value = sidebarImagePath.value;
            });
        }

        // 绑定标签添加按钮事件
        const addTagBtn = document.getElementById('addTagBtn');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', function() {
                self.addTagInput();
            });
        }

        // 绑定元数据输入框事件
        const self = this; // 保存this的引用
        const metaTitle = document.getElementById('metaTitle');
        const metaPublished = document.getElementById('metaPublished');
        const metaDescription = document.getElementById('metaDescription');
        const metaImage = document.getElementById('metaImage');

        if (metaTitle) {
            metaTitle.addEventListener('input', function(e) {
                self.metadata.title = e.target.value;
            });
        }

        if (metaPublished) {
            metaPublished.addEventListener('change', function(e) {
                self.metadata.published = e.target.value;
            });
        }

        if (metaDescription) {
            metaDescription.addEventListener('input', function(e) {
                self.metadata.description = e.target.value;
            });
        }

        if (metaImage) {
            metaImage.addEventListener('click', function() {
                self.showImageSelectionArea();
            });
        }

        // 监听图片路径设置变化，更新已选图片的最终路径
        const sidebarPathListener = document.getElementById('sidebarImagePath');
        if (sidebarPathListener) {
            sidebarPathListener.addEventListener('input', function() {
                if (self.metadata.imageOriginal) {
                    const imagePathSetting = sidebarPathListener.value || '/image';
                    self.metadata.imageFinal = self.generateFinalImagePath(self.metadata.imageOriginal, imagePathSetting);
                    console.log('图片路径变化更新:');
                    console.log('- 新路径设置:', imagePathSetting);
                    console.log('- 更新后最终路径:', self.metadata.imageFinal);
                }
            });
        }
    }

    // 生成最终图片路径
    generateFinalImagePath(originalUrl, imagePathSetting) {
        console.log('generateFinalImagePath被调用:');
        console.log('- originalUrl:', originalUrl);
        console.log('- imagePathSetting:', imagePathSetting);

        // 从原始URL中提取文件名
        const urlParts = originalUrl.split('/');
        const filename = urlParts[urlParts.length - 1];

        // 确保路径设置以/开头，但不以/结尾
        const normalizedPath = imagePathSetting.startsWith('/') ? imagePathSetting : '/' + imagePathSetting;
        const finalPath = normalizedPath.endsWith('/') ? normalizedPath.slice(0, -1) : normalizedPath;
        const result = finalPath + '/' + filename;

        console.log('- filename:', filename);
        console.log('- normalizedPath:', normalizedPath);
        console.log('- finalPath:', finalPath);
        console.log('- result:', result);

        return result;
    }

    // 元数据表单相关方法
    showImageSelectionArea() {
        document.getElementById('imageSelectionArea').style.display = 'block';
        this.loadUserImages();
    }

    loadUserImages() {
        const self = this; // 保存this的引用
        const userImagesList = document.getElementById('userImagesList');
        userImagesList.innerHTML = '';

        if (this.uploadedImages.length === 0) {
            userImagesList.innerHTML = '<p style="color: #999; font-size: 13px;">暂无上传的图片</p>';
            return;
        }

        this.uploadedImages.forEach((image, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            if (self.metadata.imageOriginal === image.url) {
                imageItem.classList.add('selected');
            }

            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.filename;
            img.title = image.filename;

            imageItem.appendChild(img);
            imageItem.addEventListener('click', function() {
                // 移除之前的选中状态
                document.querySelectorAll('.image-item').forEach(item => {
                    item.classList.remove('selected');
                });

                // 添加选中状态
                imageItem.classList.add('selected');

                // 获取图片路径设置
                const imagePathSetting = document.getElementById('sidebarImagePath').value || '/image';

                // 更新元数据 - 使用self引用正确的MarkdownEditor实例
                self.metadata.imageOriginal = image.url; // 原始路径，用于显示
                self.metadata.imageFinal = self.generateFinalImagePath(image.url, imagePathSetting); // 最终路径，用于导出
                document.getElementById('metaImage').value = image.url; // 显示原始路径

                // 调试信息
                console.log('图片选择完成:');
                console.log('- 原始路径:', image.url);
                console.log('- 路径设置:', imagePathSetting);
                console.log('- 最终路径:', self.metadata.imageFinal);

                // 隐藏图片选择区域
                document.getElementById('imageSelectionArea').style.display = 'none';
            });

            userImagesList.appendChild(imageItem);
        });
    }

    addTagInput() {
        const tagsContainer = document.getElementById('tagsContainer');
        const tagInputGroup = document.createElement('div');
        tagInputGroup.className = 'tag-input-group';

        const tagInput = document.createElement('input');
        tagInput.type = 'text';
        tagInput.placeholder = '输入标签';
        tagInput.addEventListener('input', (e) => {
            this.updateTagsFromInputs();
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'tag-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
            tagsContainer.removeChild(tagInputGroup);
            this.updateTagsFromInputs();
        });

        tagInputGroup.appendChild(tagInput);
        tagInputGroup.appendChild(removeBtn);
        tagsContainer.appendChild(tagInputGroup);

        // 聚焦到新输入框
        tagInput.focus();
    }

    updateTagsFromInputs() {
        const tagInputs = document.querySelectorAll('#tagsContainer input[type="text"]');
        this.metadata.tags = Array.from(tagInputs)
            .map(input => input.value.trim())
            .filter(value => value !== '');
    }

    buildYamlFrontMatter() {
        console.log('构建YAML Front Matter...');
        console.log('当前metadata:', this.metadata);

        // 转义特殊字符
        const escapeYamlString = (str) => {
            if (!str) return '';
            return str.replace(/["{}]/g, '\\"');
        };

        let yaml = '---\n';

        // 添加标题
        if (this.metadata.title) {
            yaml += `title: ${escapeYamlString(this.metadata.title)}\n`;
        }

        // 添加发布日期
        if (this.metadata.published) {
            yaml += `published: ${this.metadata.published}\n`;
        }

        // 添加简介
        if (this.metadata.description) {
            // 如果包含特殊字符，用引号包裹
            const desc = this.metadata.description;
            if (desc.includes(':') || desc.includes('#') || desc.includes('"')) {
                yaml += `description: '${escapeYamlString(desc)}'\n`;
            } else {
                yaml += `description: ${escapeYamlString(desc)}\n`;
            }
        }

        // 添加封面图片
        if (this.metadata.imageFinal) {
            yaml += `image: '${escapeYamlString(this.metadata.imageFinal)}'\n`;
        }

        // 添加标签
        if (this.metadata.tags.length > 0) {
            const tagsArray = this.metadata.tags.map(tag => escapeYamlString(tag));
            yaml += `tags: [${tagsArray.join(',')}]\n`;
        }

        // 添加分类
        if (this.metadata.category) {
            yaml += `category: '${escapeYamlString(this.metadata.category)}'\n`;
        }

        // 添加固定值
        yaml += `draft: ${this.metadata.draft}\n`;
        yaml += `lang: '${this.metadata.lang}'\n`;

        yaml += '---';

        console.log('生成的YAML Front Matter:', yaml);

        return yaml;
    }
}

// 初始化编辑器
document.addEventListener('DOMContentLoaded', () => {
    new MarkdownEditor();
});

// 防止页面意外刷新丢失数据
window.addEventListener('beforeunload', (e) => {
    const editor = document.getElementById('editor');
    if (editor && editor.innerHTML.trim() !== '') {
        e.preventDefault();
        e.returnValue = '';
    }
});