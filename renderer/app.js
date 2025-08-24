// Estado global da aplicação
let pages = [];
let selectedPages = new Set();
let currentDeleteAction = null;
let currentViewMode = 'list';

// Inicializar PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Função para receber arquivos selecionados pelo diálogo do sistema
async function handleFilePathsFromMain(filePaths) {
    if (!filePaths || filePaths.length === 0) return;

    showLoading();
    
    try {
        updateLoadingProgress(5, 'Carregando arquivos selecionados...');
        
        let totalPagesAdded = 0;
        for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            const fileProgress = (i / filePaths.length) * 80;
            
            try {
                // Criar um File object a partir do caminho
                const response = await fetch(`file://${filePath}`);
                const arrayBuffer = await response.arrayBuffer();
                
                // Determinar o tipo do arquivo pela extensão
                const extension = filePath.split('.').pop().toLowerCase();
                let mimeType;
                
                if (extension === 'pdf') {
                    mimeType = 'application/pdf';
                } else if (['jpg', 'jpeg'].includes(extension)) {
                    mimeType = 'image/jpeg';
                } else if (extension === 'png') {
                    mimeType = 'image/png';
                } else if (extension === 'bmp') {
                    mimeType = 'image/bmp';
                } else if (['tiff', 'tif'].includes(extension)) {
                    mimeType = 'image/tiff';
                } else {
                    continue; // Pular arquivo não suportado
                }
                
                // Criar um File object
                const fileName = filePath.split(/[\\/]/).pop();
                const file = new File([arrayBuffer], fileName, { type: mimeType });
                
                updateLoadingProgress(
                    fileProgress + 5, 
                    `Processando ${fileName} (${i + 1}/${filePaths.length})...`
                );
                
                if (mimeType === 'application/pdf') {
                    const pagesFromFile = await loadPDFFile(file, fileProgress);
                    totalPagesAdded += pagesFromFile;
                } else if (mimeType.startsWith('image/')) {
                    await loadImageFile(file);
                    totalPagesAdded += 1;
                }
            } catch (fileError) {
                console.error(`Erro ao processar arquivo ${filePath}:`, fileError);
                continue; // Continuar com o próximo arquivo
            }
        }
        
        updateLoadingProgress(90, 'Organizando visualização das páginas...');
        refreshView();
        
        updateLoadingProgress(95, 'Atualizando interface...');
        enableButtons();
        updateFilesList();
        
        updateLoadingProgress(100, `✓ ${totalPagesAdded} páginas carregadas com sucesso!`);
        
        setTimeout(hideLoading, 800);
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar arquivos:', error);
        showMessage('Erro ao carregar arquivos. Verifique se os arquivos são válidos.', 'error');
    }
}

// Sistema de temas
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = '☀️';
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = '🌙';
    }
}

// Sistema de visualização
function setViewMode(mode) {
    currentViewMode = mode;
    const listView = document.getElementById('pagesList');
    const gridView = document.getElementById('pagesGrid');
    
    if (mode === 'list') {
        listView.classList.add('active');
        gridView.classList.remove('active');
    } else {
        listView.classList.remove('active');
        gridView.classList.add('active');
    }
    
    refreshView();
}

// Sistema de carregamento
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function updateLoadingProgress(progress, message = null) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const messageElement = document.getElementById('loadingMessage');
    
    const clampedProgress = Math.min(100, Math.max(0, progress));
    progressFill.style.width = clampedProgress + '%';
    progressText.textContent = Math.round(clampedProgress) + '%';
    
    if (message) {
        messageElement.textContent = message;
    }
}

function hideLoading() {
    setTimeout(() => {
        document.getElementById('loadingOverlay').style.display = 'none';
    }, 300);
}

// Manipulação de arquivos
function openFiles() {
    const fileInput = document.getElementById('fileInput');
    fileInput.accept = '.pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif';
    fileInput.click();
}

async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    showLoading();
    
    try {
        updateLoadingProgress(5, 'Analisando arquivos selecionados...');
        
        let totalPagesAdded = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileProgress = (i / files.length) * 80;
            
            updateLoadingProgress(
                fileProgress + 5, 
                `Processando ${file.name} (${i + 1}/${files.length})...`
            );
            
            if (file.type === 'application/pdf') {
                const pagesFromFile = await loadPDFFile(file, fileProgress);
                totalPagesAdded += pagesFromFile;
            } else if (file.type.startsWith('image/')) {
                await loadImageFile(file);
                totalPagesAdded += 1;
            }
        }
        
        updateLoadingProgress(90, 'Organizando visualização das páginas...');
        refreshView();
        
        updateLoadingProgress(95, 'Atualizando interface...');
        enableButtons();
        updateFilesList();
        
        updateLoadingProgress(100, `✓ ${totalPagesAdded} páginas carregadas com sucesso!`);
        
        setTimeout(hideLoading, 800);
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar arquivos:', error);
        showMessage('Erro ao carregar arquivos. Verifique se os arquivos são válidos.', 'error');
    }
    
    event.target.value = '';
}

async function loadPDFFile(file, baseProgress) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        updateLoadingProgress(baseProgress + 10, `Carregando estrutura do PDF ${file.name}...`);
        
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let pagesAdded = 0;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const pageProgress = baseProgress + 10 + ((pageNum / pdf.numPages) * 60);
            updateLoadingProgress(
                pageProgress, 
                `Renderizando página ${pageNum}/${pdf.numPages} de ${file.name}...`
            );
            
            const page = await pdf.getPage(pageNum);
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            const scale = 2;
            const viewport = page.getViewport({ scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const pageData = {
                canvas: canvas,
                originalPdf: arrayBuffer,
                pageNumber: pageNum,
                fileName: file.name,
                fileType: 'pdf',
                id: Date.now() + Math.random(),
                originalPosition: pages.length + 1
            };

            pages.push(pageData);
            pagesAdded++;
        }

        return pagesAdded;
    } catch (error) {
        console.error('Erro ao carregar PDF:', error);
        return 0;
    }
}

async function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        updateLoadingProgress(null, `Processando imagem ${file.name}...`);
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            
            const pageData = {
                canvas: canvas,
                originalImage: file,
                fileName: file.name,
                fileType: 'image',
                id: Date.now() + Math.random(),
                originalPosition: pages.length + 1
            };
            
            pages.push(pageData);
            URL.revokeObjectURL(img.src);
            resolve();
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Erro ao carregar imagem'));
        };
        img.src = URL.createObjectURL(file);
    });
}

// Sistema de modais
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showMessage(message, type = 'info') {
    // Removido sistema de notificações toast
    console.log(`${type.toUpperCase()}: ${message}`);
}

// Funções de visualização
function refreshView() {
    if (currentViewMode === 'list') {
        refreshList();
    } else {
        refreshGrid();
    }
}

function refreshList() {
    const listContainer = document.getElementById('pagesList');
    
    if (pages.length === 0) {
        listContainer.innerHTML = `
            <div class="drop-zone">
                <div class="file-icon">📄</div>
                <p><strong>Arraste arquivos PDF ou imagens aqui</strong></p>
                <p>ou use "Arquivo > Abrir" para começar</p>
            </div>
        `;
        setupDropZones();
        return;
    }
    
    const selectedIds = new Set();
    selectedPages.forEach(index => {
        if (pages[index]) {
            selectedIds.add(pages[index].id);
        }
    });
    
    listContainer.innerHTML = '';
    
    pages.forEach((pageData, index) => {
        const listItem = createListItem(pageData, index);
        
        if (selectedIds.has(pageData.id)) {
            listItem.classList.add('selected');
            selectedPages.add(index);
        }
        
        listContainer.appendChild(listItem);
    });
    
    const newSelectedPages = new Set();
    selectedIds.forEach(id => {
        const index = pages.findIndex(page => page.id === id);
        if (index !== -1) {
            newSelectedPages.add(index);
        }
    });
    selectedPages = newSelectedPages;
    
    updateDeleteButton();
}

function createListItem(pageData, index) {
    const listItem = document.createElement('div');
    listItem.className = 'list-item';
    listItem.dataset.index = index;
    listItem.dataset.pageId = pageData.id;

    const itemInfo = document.createElement('div');
    itemInfo.className = 'list-item-info';

    const itemNumber = document.createElement('div');
    itemNumber.className = 'list-item-number';
    itemNumber.textContent = index + 1;

    const itemName = document.createElement('div');
    itemName.className = 'list-item-name';
    itemName.textContent = `Página ${index + 1} - ${pageData.fileName}`;

    itemInfo.appendChild(itemNumber);
    itemInfo.appendChild(itemName);

    // Adicionar histórico se a página foi movida
    if (pageData.originalPosition && pageData.originalPosition !== index + 1) {
        const historyBadge = document.createElement('div');
        historyBadge.className = 'list-item-history';
        historyBadge.textContent = `Era página ${pageData.originalPosition}`;
        itemInfo.appendChild(historyBadge);
    }

    listItem.appendChild(itemInfo);

    listItem.addEventListener('click', (e) => selectListItem(e, listItem));
    listItem.addEventListener('contextmenu', (e) => showContextMenu(e, listItem));

    return listItem;
}

function selectListItem(event, listItem) {
    const index = parseInt(listItem.dataset.index);
    
    if (event.ctrlKey || event.metaKey) {
        if (selectedPages.has(index)) {
            selectedPages.delete(index);
            listItem.classList.remove('selected');
        } else {
            selectedPages.add(index);
            listItem.classList.add('selected');
        }
    } else {
        clearSelection();
        selectedPages.add(index);
        listItem.classList.add('selected');
    }

    updateDeleteButton();
}

function refreshGrid() {
    const grid = document.getElementById('pagesGrid');
    
    if (pages.length === 0) {
        grid.innerHTML = `
            <div class="drop-zone">
                <div class="file-icon">📄</div>
                <p><strong>Arraste arquivos PDF ou imagens aqui</strong></p>
                <p>ou use "Arquivo > Abrir" para começar</p>
            </div>
        `;
        setupDropZones();
        return;
    }
    
    const selectedIds = new Set();
    selectedPages.forEach(index => {
        if (pages[index]) {
            selectedIds.add(pages[index].id);
        }
    });
    
    grid.innerHTML = '';
    
    pages.forEach((pageData, index) => {
        const thumbnail = createThumbnail(pageData, index);
        
        if (selectedIds.has(pageData.id)) {
            thumbnail.classList.add('selected');
            selectedPages.add(index);
        }
        
        grid.appendChild(thumbnail);
    });
    
    const newSelectedPages = new Set();
    selectedIds.forEach(id => {
        const index = pages.findIndex(page => page.id === id);
        if (index !== -1) {
            newSelectedPages.add(index);
        }
    });
    selectedPages = newSelectedPages;
    
    updateDeleteButton();
}

function createThumbnail(pageData, index) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail';
    thumbnail.dataset.index = index;
    thumbnail.dataset.pageId = pageData.id;

    const img = document.createElement('img');
    img.src = pageData.canvas.toDataURL('image/jpeg', 0.8);
    img.alt = `Página ${index + 1}`;

    const pageNumber = document.createElement('div');
    pageNumber.className = 'page-number';
    pageNumber.textContent = index + 1;

    thumbnail.appendChild(img);
    thumbnail.appendChild(pageNumber);

    thumbnail.addEventListener('click', (e) => selectThumbnail(e, thumbnail));
    thumbnail.addEventListener('contextmenu', (e) => showContextMenu(e, thumbnail));

    return thumbnail;
}

function selectThumbnail(event, thumbnail) {
    const index = parseInt(thumbnail.dataset.index);
    
    if (event.ctrlKey || event.metaKey) {
        if (selectedPages.has(index)) {
            selectedPages.delete(index);
            thumbnail.classList.remove('selected');
        } else {
            selectedPages.add(index);
            thumbnail.classList.add('selected');
        }
    } else {
        clearSelection();
        selectedPages.add(index);
        thumbnail.classList.add('selected');
    }

    updateDeleteButton();
}

function clearSelection() {
    selectedPages.clear();
    document.querySelectorAll('.thumbnail.selected, .list-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    updateDeleteButton();
}

function setupDropZones() {
    const dropZones = document.querySelectorAll('.drop-zone');
    
    dropZones.forEach(dropZone => {
        dropZone.addEventListener('dragover', handleDropZoneDragOver);
        dropZone.addEventListener('dragleave', handleDropZoneDragLeave);
        dropZone.addEventListener('drop', handleDropZoneDrop);
    });
}

function handleDropZoneDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('active');
}

function handleDropZoneDragLeave(event) {
    event.currentTarget.classList.remove('active');
}

function handleDropZoneDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('active');
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
        const fileInput = document.getElementById('fileInput');
        fileInput.files = event.dataTransfer.files;
        handleFileSelect({ target: fileInput });
    }
}

// Menu de contexto
function showContextMenu(event, element) {
    event.preventDefault();
    
    const contextMenu = document.getElementById('contextMenu');
    const index = parseInt(element.dataset.index);
    
    if (!selectedPages.has(index)) {
        clearSelection();
        selectedPages.add(index);
        element.classList.add('selected');
        updateDeleteButton();
    }
    
    contextMenu.style.display = 'block';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
}

function hideContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
}

// Funções de manipulação de páginas
function rotatePage() {
    if (selectedPages.size === 0) return;
    
    selectedPages.forEach(index => {
        const pageData = pages[index];
        if (pageData) {
            const canvas = pageData.canvas;
            const ctx = canvas.getContext('2d');
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const newWidth = canvas.height;
            const newHeight = canvas.width;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.translate(newWidth / 2, newHeight / 2);
            tempCtx.rotate(Math.PI / 2);
            tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(tempCanvas, 0, 0);
        }
    });
    
    refreshView();
    hideContextMenu();
}

function duplicatePage() {
    if (selectedPages.size === 0) return;
    
    const selectedArray = Array.from(selectedPages).sort((a, b) => b - a);
    let duplicatedCount = 0;
    
    selectedArray.forEach(index => {
        const originalPage = pages[index];
        if (originalPage) {
            const newCanvas = document.createElement('canvas');
            newCanvas.width = originalPage.canvas.width;
            newCanvas.height = originalPage.canvas.height;
            
            const ctx = newCanvas.getContext('2d');
            ctx.drawImage(originalPage.canvas, 0, 0);
            
            const duplicatedPage = {
                canvas: newCanvas,
                originalPdf: originalPage.originalPdf,
                originalImage: originalPage.originalImage,
                pageNumber: originalPage.pageNumber,
                fileName: originalPage.fileName + ' (cópia)',
                fileType: originalPage.fileType,
                id: Date.now() + Math.random(),
                originalPosition: pages.length + 1
            };
            
            pages.splice(index + 1, 0, duplicatedPage);
            duplicatedCount++;
        }
    });
    
    clearSelection();
    refreshView();
    updateFilesList();
    hideContextMenu();
}

function showMoveToModal() {
    if (selectedPages.size === 0) return;
    
    document.getElementById('maxPosition').textContent = pages.length;
    document.getElementById('movePosition').value = '';
    document.getElementById('movePosition').max = pages.length;
    
    // Preencher lista de páginas selecionadas
    const movePagesList = document.getElementById('movePagesList');
    movePagesList.innerHTML = '';
    
    const selectedArray = Array.from(selectedPages).sort((a, b) => a - b);
    selectedArray.forEach(index => {
        const pageData = pages[index];
        const pageItem = document.createElement('div');
        pageItem.className = 'move-page-item selected';
        
        const pageNumber = document.createElement('div');
        pageNumber.className = 'move-page-number';
        pageNumber.textContent = index + 1;
        
        const pageName = document.createElement('div');
        pageName.className = 'move-page-name';
        pageName.textContent = `Página ${index + 1} - ${pageData.fileName}`;
        
        pageItem.appendChild(pageNumber);
        pageItem.appendChild(pageName);
        movePagesList.appendChild(pageItem);
    });
    
    showModal('moveToModal');
    hideContextMenu();
}

function adjustPosition(delta) {
    const input = document.getElementById('movePosition');
    const currentValue = parseInt(input.value) || 1;
    const maxValue = parseInt(input.max);
    const newValue = Math.max(1, Math.min(maxValue, currentValue + delta));
    input.value = newValue;
}

function executeMove() {
    const position = parseInt(document.getElementById('movePosition').value);
    
    if (isNaN(position) || position < 1 || position > pages.length) {
        showMessage('Por favor, digite uma posição válida!', 'error');
        return;
    }
    
    const selectedArray = Array.from(selectedPages).sort((a, b) => b - a);
    const movingPages = [];
    
    selectedArray.forEach(index => {
        movingPages.unshift(pages.splice(index, 1)[0]);
    });
    
    const insertIndex = Math.min(position - 1, pages.length);
    pages.splice(insertIndex, 0, ...movingPages);
    
    clearSelection();
    refreshView();
    hideModal('moveToModal');
}

function showPreviewModal() {
    if (selectedPages.size === 0) return;
    
    const firstSelected = Math.min(...selectedPages);
    const pageData = pages[firstSelected];
    
    if (pageData) {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = pageData.canvas.toDataURL('image/jpeg', 0.9);
        showModal('previewModal');
    }
    
    hideContextMenu();
}

// Funções de exclusão
function confirmDeleteSelected() {
    if (selectedPages.size === 0) return;
    
    const count = selectedPages.size;
    const message = `Tem certeza que deseja excluir ${count} página${count > 1 ? 's' : ''} selecionada${count > 1 ? 's' : ''}?`;
    
    document.getElementById('deleteMessage').textContent = message;
    currentDeleteAction = 'selected';
    showModal('deleteModal');
}

function confirmDeletePage() {
    if (selectedPages.size === 0) return;
    
    const count = selectedPages.size;
    const message = `Tem certeza que deseja excluir ${count} página${count > 1 ? 's' : ''} selecionada${count > 1 ? 's' : ''}?`;
    
    document.getElementById('deleteMessage').textContent = message;
    currentDeleteAction = 'page';
    showModal('deleteModal');
    hideContextMenu();
}

function executeDelete() {
    if (selectedPages.size === 0) return;
    
    const selectedArray = Array.from(selectedPages).sort((a, b) => b - a);
    
    selectedArray.forEach(index => {
        pages.splice(index, 1);
    });
    
    clearSelection();
    refreshView();
    updateFilesList();
    
    if (pages.length === 0) {
        disableButtons();
    }
    
    hideModal('deleteModal');
}

// Funções de exportação
async function exportPagesAsPdfZip() {
    if (pages.length === 0) return;
    
    showLoading();
    
    try {
        updateLoadingProgress(5, 'Iniciando exportação de PDFs separados...');
        const zip = new JSZip();
        
        for (let i = 0; i < pages.length; i++) {
            const pageData = pages[i];
            const fileName = `pagina_${String(i + 1).padStart(3, '0')}.pdf`;
            
            updateLoadingProgress(
                10 + ((i / pages.length) * 80),
                `Preparando página ${i + 1} de ${pages.length} para exportação como PDF...`
            );
            
            const pdfDoc = await PDFLib.PDFDocument.create();
            const imgData = pageData.canvas.toDataURL('image/jpeg', 0.9);
            const jpegImage = await pdfDoc.embedJpg(imgData);
            
            const page = pdfDoc.addPage([pageData.canvas.width, pageData.canvas.height]);
            page.drawImage(jpegImage, {
                x: 0,
                y: 0,
                width: pageData.canvas.width,
                height: pageData.canvas.height,
            });
            const pdfBytes = await pdfDoc.save();
            zip.file(fileName, pdfBytes);
        }
        
        updateLoadingProgress(90, 'Compactando arquivo ZIP...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        updateLoadingProgress(95, 'Preparando download...');
        downloadFile(zipBlob, 'paginas_separadas_pdf.zip', 'application/zip');
        
        updateLoadingProgress(100, '✓ Exportação de PDFs separados concluída com sucesso!');
        setTimeout(hideLoading, 800);
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao exportar PDFs separados:', error);
        showMessage('Erro ao exportar PDFs separados. Tente novamente.', 'error');
    }
}

async function exportPagesAsPngZip() {
    if (pages.length === 0) return;
    
    showLoading();
    
    try {
        updateLoadingProgress(5, 'Iniciando exportação de PNGs separados...');
        const zip = new JSZip();
        
        for (let i = 0; i < pages.length; i++) {
            const pageData = pages[i];
            const fileName = `pagina_${String(i + 1).padStart(3, '0')}.png`;
            
            updateLoadingProgress(
                10 + ((i / pages.length) * 80),
                `Preparando página ${i + 1} de ${pages.length} para exportação como PNG...`
            );
            
            const imgData = pageData.canvas.toDataURL('image/png').split(',')[1];
            zip.file(fileName, imgData, { base64: true });
        }
        
        updateLoadingProgress(90, 'Compactando arquivo ZIP...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        updateLoadingProgress(95, 'Preparando download...');
        downloadFile(zipBlob, 'paginas_separadas_png.zip', 'application/zip');
        
        updateLoadingProgress(100, '✓ Exportação de PNGs separados concluída com sucesso!');
        setTimeout(hideLoading, 800);
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao exportar PNGs separados:', error);
        showMessage('Erro ao exportar PNGs separados. Tente novamente.', 'error');
    }
}

async function saveAsPDF() {
    if (pages.length === 0) return;
    
    showLoading();
    
    try {
        updateLoadingProgress(5, 'Iniciando criação do PDF...');
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        for (let i = 0; i < pages.length; i++) {
            const pageData = pages[i];
            
            updateLoadingProgress(
                10 + ((i / pages.length) * 80),
                `Processando página ${i + 1} de ${pages.length}...`
            );
            
            const imgData = pageData.canvas.toDataURL('image/jpeg', 0.9);
            const jpegImage = await pdfDoc.embedJpg(imgData);
            
            const page = pdfDoc.addPage([pageData.canvas.width, pageData.canvas.height]);
            page.drawImage(jpegImage, {
                x: 0,
                y: 0,
                width: pageData.canvas.width,
                height: pageData.canvas.height,
            });
        }
        
        updateLoadingProgress(90, 'Finalizando documento PDF...');
        const pdfBytes = await pdfDoc.save();
        
        updateLoadingProgress(95, 'Preparando download...');
        downloadFile(pdfBytes, 'documento_organizado.pdf', 'application/pdf');
        
        updateLoadingProgress(100, '✓ PDF criado com sucesso!');
        setTimeout(hideLoading, 800);
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar PDF:', error);
        showMessage('Erro ao salvar PDF. Tente novamente.', 'error');
    }
}

function downloadFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearAll() {
    pages = [];
    clearSelection();
    refreshView();
    updateFilesList();
    disableButtons();
}

// Funções utilitárias
function enableButtons() {
    document.getElementById('saveBtn').disabled = false;
}

function disableButtons() {
    document.getElementById('saveBtn').disabled = true;
}

function updateDeleteButton() {
    // Removido botão de delete da interface
}

function updateFilesList() {
    const filesList = document.getElementById('filesList');
    
    if (pages.length === 0) {
        filesList.innerHTML = `
            <div class="sidebar-item">
                Nenhum arquivo carregado
            </div>
        `;
        return;
    }
    
    const uniqueFiles = [...new Set(pages.map(page => page.fileName))];
    filesList.innerHTML = `
        <div class="sidebar-item">
            <strong>${pages.length} páginas</strong><br><br>
            ${uniqueFiles.map(name => `• ${name}`).join('<br>')}
        </div>
    `;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    body.setAttribute('data-theme', savedTheme);
    
    if (savedTheme === 'light') {
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
    
    setupDropZones();
    setViewMode(currentViewMode);
});

document.addEventListener('click', hideContextMenu);

// Atalhos de teclado
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 'o':
                event.preventDefault();
                openFiles();
                break;
            case 'n':
                event.preventDefault();
                clearAll();
                break;
            case 's':
                event.preventDefault();
                saveAsPDF();
                break;
            case 'a':
                event.preventDefault();
                // Selecionar todas as páginas
                selectedPages.clear();
                for (let i = 0; i < pages.length; i++) {
                    selectedPages.add(i);
                }
                refreshView();
                break;
            case '1':
                event.preventDefault();
                setViewMode('list');
                break;
            case '2':
                event.preventDefault();
                setViewMode('grid');
                break;
            case 't':
                event.preventDefault();
                toggleTheme();
                break;
            case 'd':
                event.preventDefault();
                duplicatePage();
                break;
            case 'r':
                event.preventDefault();
                rotatePage();
                break;
            case 'm':
                event.preventDefault();
                showMoveToModal();
                break;
            case 'p':
                event.preventDefault();
                showPreviewModal();
                break;
            case 'e':
                event.preventDefault();
                saveAsPDF();
                break;
        }
        
        // Atalhos com Shift
        if (event.shiftKey) {
            switch (event.key) {
                case 'P':
                    event.preventDefault();
                    exportPagesAsPdfZip();
                    break;
                case 'I':
                    event.preventDefault();
                    exportPagesAsPngZip();
                    break;
                case 'V':
                    event.preventDefault();
                    const newMode = currentViewMode === 'list' ? 'grid' : 'list';
                    setViewMode(newMode);
                    break;
                case 'N':
                    event.preventDefault();
                    clearAll();
                    break;
            }
        }
    } else if (event.key === 'Escape') {
        clearSelection();
        hideContextMenu();
        // Fechar modais abertos
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    } else if (event.key === 'Delete') {
        if (selectedPages.size > 0) {
            confirmDeleteSelected();
        }
    } else if (event.key === 'F5') {
        event.preventDefault();
        refreshView();
    }
});

window.updateViewMenuChecks = function(mode) {
    console.log('View mode updated to:', mode);
};