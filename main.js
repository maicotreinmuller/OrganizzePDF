const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize electron store for settings
const store = new Store();

let mainWindow;
const isDev = process.argv.includes('--dev');

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
            experimentalFeatures: false,
            zoomFactor: 0.8
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        titleBarStyle: 'default',
        backgroundColor: '#1c1c1e'
    });

    // Load the app
    mainWindow.loadFile('renderer/index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Restore window state
        const windowState = store.get('windowState');
        if (windowState) {
            mainWindow.setBounds(windowState);
            if (windowState.isMaximized) {
                mainWindow.maximize();
            }
        }
    });

    // Save window state on close
    mainWindow.on('close', () => {
        const bounds = mainWindow.getBounds();
        store.set('windowState', {
            ...bounds,
            isMaximized: mainWindow.isMaximized()
        });
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Prevent navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url !== mainWindow.webContents.getURL()) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Development tools
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Create application menu
    createApplicationMenu();
}

// Function to handle file dialog and opening files
async function handleOpenFiles() {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Selecionar Arquivos',
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Todos os Formatos Suportados', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif'] },
                { name: 'Arquivos PDF', extensions: ['pdf'] },
                { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif'] }
            ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            // Send file paths to renderer process
            mainWindow.webContents.executeJavaScript(`
                handleFilePathsFromMain(${JSON.stringify(result.filePaths)});
            `);
        }
    } catch (error) {
        console.error('Erro ao abrir arquivos:', error);
        dialog.showErrorBox('Erro', 'Erro ao abrir arquivos. Tente novamente.');
    }
}

// FUNÇÕES PARA OS BOTÕES EXTERNOS (AO LADO DO MENU)

// Função para mostrar opções de visualização em cascata
function externalToggleViewOptions() {
    const result = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        title: 'Opções de Visualização',
        message: 'Escolha o modo de visualização:',
        buttons: [
            'Visualizar em Lista',
            'Visualizar em Blocos',
            'Cancelar'
        ],
        defaultId: 0,
        cancelId: 2
    });

    switch (result) {
        case 0: // Lista
            mainWindow.webContents.executeJavaScript('setViewMode("list")');
            updateViewMenuChecks('list');
            break;
        case 1: // Blocos
            mainWindow.webContents.executeJavaScript('setViewMode("grid")');
            updateViewMenuChecks('grid');
            break;
        default:
            // Cancelado
            break;
    }
}

// Função para limpar tela sem confirmação
function externalClearAll() {
    mainWindow.webContents.executeJavaScript(`
        pages = [];
        selectedPages.clear();
        refreshView();
        updateFilesList();
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.style.display = 'flex';
        }
    `);
}

// Função para mostrar opções de exportação em cascata
async function externalExportOptions() {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Opções de Exportação',
        message: 'Escolha a opção de exportação desejada:',
        buttons: [
            'Salvar PDF Unificado',
            'Salvar Selecionados',
            'Exportar PDFs Separados',
            'Exportar Imagens PNG',
            'Cancelar'
        ],
        defaultId: 0,
        cancelId: 4
    });

    switch (result.response) {
        case 0: // Salvar PDF Unificado
            mainWindow.webContents.executeJavaScript('saveAsPDF()');
            break;
        case 1: // Salvar Selecionados
            mainWindow.webContents.executeJavaScript('saveSelectedAsPDF()');
            break;
        case 2: // Exportar PDFs Separados
            mainWindow.webContents.executeJavaScript('exportPagesAsPdfZip()');
            break;
        case 3: // Exportar Imagens PNG
            mainWindow.webContents.executeJavaScript('exportPagesAsPngZip()');
            break;
        default:
            // Cancelado
            break;
    }
}

// Função para excluir páginas selecionadas
function externalDeleteSelected() {
    mainWindow.webContents.executeJavaScript(`
        if (selectedPages.size > 0) {
            const sortedIndices = Array.from(selectedPages).sort((a, b) => b - a);
            sortedIndices.forEach(index => {
                pages.splice(index, 1);
            });
            selectedPages.clear();
            refreshView();
            updateFilesList();
        }
    `);
}

function createApplicationMenu() {
    const template = [
        // MENU PRINCIPAL (com todas as opções originais)
        {
            label: '⚙️ Menu',
            submenu: [
                // ABRIR
                {
                    label: '📁 Abrir',
                    accelerator: 'CmdOrCtrl+O',
                    click: handleOpenFiles
                },
                
                // SALVAR
                {
                    label: '💾 Salvar',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('saveAsPDF()').catch(err => {
                            console.error('Erro ao salvar:', err);
                        });
                    }
                },
                
                {
                    label: '🔥 Limpar Tudo',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('clearAll()');
                    }
                },

                // EXPORTAR (em cascata)
                {
                    label: '📤 Exportar',
                    submenu: [
                        {
                            label: '📄 PDF Unificado',
                            accelerator: 'CmdOrCtrl+S',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('saveAsPDF()').catch(err => {
                                    console.error('Erro ao salvar PDF:', err);
                                });
                            }
                        },
                        {
                            label: '📋 Selecionados como PDF',
                            click: () => {
                                mainWindow.webContents.executeJavaScript(`
                                    // Função para salvar apenas páginas selecionadas
                                    async function saveSelectedAsPDF() {
                                        if (selectedPages.size === 0) {
                                            alert('Nenhuma página selecionada. Selecione páginas primeiro.');
                                            return;
                                        }
                                        
                                        showLoading();
                                        
                                        try {
                                            const selectedArray = Array.from(selectedPages).sort((a, b) => a - b);
                                            const selectedPagesData = selectedArray.map(index => pages[index]);
                                            
                                            if (selectedPagesData.length === 0) {
                                                hideLoading();
                                                alert('Erro: páginas selecionadas não encontradas.');
                                                return;
                                            }
                                            
                                            updateLoadingProgress(5, 'Iniciando criação do PDF com páginas selecionadas...');
                                            const pdfDoc = await PDFLib.PDFDocument.create();
                                            
                                            for (let i = 0; i < selectedPagesData.length; i++) {
                                                const pageData = selectedPagesData[i];
                                                
                                                updateLoadingProgress(
                                                    10 + ((i / selectedPagesData.length) * 80),
                                                    \`Processando página selecionada \${i + 1} de \${selectedPagesData.length}...\`
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
                                            downloadFile(pdfBytes, 'paginas_selecionadas.pdf', 'application/pdf');
                                            
                                            updateLoadingProgress(100, '✓ PDF com páginas selecionadas criado com sucesso!');
                                            setTimeout(hideLoading, 800);
                                            
                                        } catch (error) {
                                            hideLoading();
                                            console.error('Erro ao salvar páginas selecionadas:', error);
                                            alert('Erro ao salvar páginas selecionadas. Tente novamente.');
                                        }
                                    }
                                    
                                    // Executar a função
                                    saveSelectedAsPDF();
                                `).catch(err => {
                                    console.error('Erro ao salvar páginas selecionadas:', err);
                                    dialog.showErrorBox('Erro', 'Erro ao salvar páginas selecionadas. Verifique se há páginas selecionadas.');
                                });
                            }
                        },
                        {
                            label: '📑 Páginas Separadas em PDF',
                            accelerator: 'CmdOrCtrl+Shift+P',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('exportPagesAsPdfZip()').catch(err => {
                                    console.error('Erro ao exportar PDFs:', err);
                                });
                            }
                        },
                        {
                            label: '🖼️ Páginas Separadas em PNG',
                            accelerator: 'CmdOrCtrl+Shift+I',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('exportPagesAsPngZip()').catch(err => {
                                    console.error('Erro ao exportar PNGs:', err);
                                });
                            }
                        }
                    ]
                },
                
                // VISUALIZAÇÃO (em cascata)
                {
                    label: '🖥 Visualização',
                    submenu: [
                        {
                            label: '📋 Modo Lista',
                            accelerator: 'CmdOrCtrl+1',
                            type: 'radio',
                            checked: true,
                            id: 'listView',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('setViewMode("list")');
                                updateViewMenuChecks('list');
                            }
                        },
                        {
                            label: '🔲 Modo Blocos',
                            accelerator: 'CmdOrCtrl+2',
                            type: 'radio',
                            id: 'gridView',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('setViewMode("grid")');
                                updateViewMenuChecks('grid');
                            }
                        },
                        { type: 'separator' },
                        {
                            label: '🔄 Alternar Visualização',
                            accelerator: 'CmdOrCtrl+Shift+V',
                            click: () => {
                                mainWindow.webContents.executeJavaScript(`
                                    const newMode = currentViewMode === 'list' ? 'grid' : 'list';
                                    setViewMode(newMode);
                                `);
                            }
                        }
                    ]
                },
                
                // SELECIONAR
                {
                    label: '✅ Selecionar',
                    submenu: [
                        {
                            label: '🗂️ Selecionar Tudo',
                            accelerator: 'CmdOrCtrl+A',
                            click: () => {
                                mainWindow.webContents.executeJavaScript(`
                                    selectedPages.clear();
                                    for (let i = 0; i < pages.length; i++) {
                                        selectedPages.add(i);
                                    }
                                    refreshView();
                                `);
                            }
                        },
                        {
                            label: '❌ Deselecionar Tudo',
                            accelerator: 'Escape',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('clearSelection()');
                            }
                        },
                        {
                            label: '🗑️ Excluir Selecionados',
                            accelerator: 'Delete',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('confirmDeleteSelected()');
                            }
                        }
                    ]
                },
                
                // MANIPULAÇÃO
                {
                    label: '🔧 Manipulação',
                    submenu: [
                        {
                            label: '📄 Duplicar',
                            accelerator: 'CmdOrCtrl+D',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('duplicatePage()');
                            }
                        },
                        {
                            label: '🔄 Rotacionar',
                            accelerator: 'CmdOrCtrl+R',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('rotatePage()');
                            }
                        },
                        {
                            label: '📍 Mover Para Posição',
                            accelerator: 'CmdOrCtrl+M',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('showMoveToModal()');
                            }
                        },
                        {
                            label: '↩️ Restaurar Ordem Original',
                            click: () => {
                                mainWindow.webContents.executeJavaScript(`
                                    pages.sort((a, b) => a.originalPosition - b.originalPosition);
                                    clearSelection();
                                    refreshView();
                                    updateFilesList();
                                `);
                            }
                        }
                    ]
                },
                
                // JANELA
                {
                    label: '🪟 Janela',
                    submenu: [
                        {
                            label: '⛶ Tela Cheia',
                            accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
                            role: 'togglefullscreen'
                        },
                        {
                            label: '🔍 Zoom+',
                            accelerator: 'CmdOrCtrl+Plus',
                            role: 'zoomin'
                        },
                        {
                            label: '🔎 Zoom-',
                            accelerator: 'CmdOrCtrl+-',
                            role: 'zoomout'
                        },
                        {
                            label: '🎯 Resetar Zoom',
                            accelerator: 'CmdOrCtrl+0',
                            role: 'resetzoom'
                        },
                        { type: 'separator' },
                        {
                            label: '📏 Maximizar',
                            click: () => {
                                if (mainWindow.isMaximized()) {
                                    mainWindow.unmaximize();
                                } else {
                                    mainWindow.maximize();
                                }
                            }
                        },
                        {
                            label: '📐 Minimizar',
                            accelerator: 'CmdOrCtrl+M',
                            role: 'minimize'
                        },
                        {
                            label: '❌ Fechar',
                            accelerator: 'CmdOrCtrl+W',
                            role: 'close'
                        },
                        {
                            label: '🔄 Recarregar Página',
                            accelerator: 'CmdOrCtrl+Shift+R',
                            role: 'reload'
                        }
                    ]
                },
                
                // TEMA
                {
                    label: '🎨 Tema',
                    submenu: [
                        {
                            label: '🌓 Alternar Tema Claro/Escuro',
                            accelerator: 'CmdOrCtrl+T',
                            click: () => {
                                mainWindow.webContents.executeJavaScript('toggleTheme()');
                            }
                        }
                    ]
                },
                { type: 'separator' },
                
                // DOCUMENTAÇÃO
                {
                    label: '📚 Documentação',
                    submenu: [
                        {
                            label: '⌨️ Atalhos',
                            accelerator: 'F1',
                            click: () => {
                                dialog.showMessageBox(mainWindow, {
                                    type: 'info',
                                    title: 'Atalhos de Teclado',
                                    message: 'Atalhos Disponíveis',
                                    detail: `MENU:
Ctrl+O - Abrir Arquivos
Ctrl+S - Salvar PDF Unificado
Ctrl+Shift+P - Exportar PDFs Separados
Ctrl+Shift+I - Exportar PNGs Separados

VISUALIZAÇÃO:
Ctrl+1 - Modo Lista
Ctrl+2 - Modo Blocos
Ctrl+Shift+V - Alternar Visualização
Ctrl+T - Alternar Tema

SELEÇÃO:
Ctrl+A - Selecionar Tudo
Escape - Deselecionar Tudo
Delete - Excluir Selecionados

MANIPULAÇÃO:
Ctrl+D - Duplicar Páginas
Ctrl+R - Rotacionar
Ctrl+M - Mover Para Posição

JANELA:
F11 - Tela Cheia
Ctrl+Plus - Zoom+
Ctrl+Minus - Zoom-
Ctrl+0 - Resetar Zoom
Ctrl+W - Fechar
Ctrl+Shift+R - Recarregar`,
                                    buttons: ['OK']
                                });
                            }
                        },
                        {
                            label: '📖 Informações de Uso',
                            click: () => {
                                dialog.showMessageBox(mainWindow, {
                                    type: 'info',
                                    title: 'Como Usar a Ferramenta',
                                    message: 'Guia de Uso',
                                    detail: `PASSO A PASSO:

1. ADICIONAR ARQUIVOS
   • Use "Menu > Abrir" (Ctrl+O)
   • Ou arraste e solte PDFs/imagens na tela
   • Formatos: PDF, JPG, PNG, BMP, TIFF

2. VISUALIZAR PÁGINAS
   • Menu > Visualização > Modo Lista/Blocos
   • Menu > Tema para alternar cores

3. SELECIONAR PÁGINAS
   • Clique simples: Seleciona uma página
   • Ctrl+Click: Seleção múltipla
   • Menu > Selecionar para opções

4. MANIPULAR PÁGINAS
   • Menu > Manipulação para todas opções
   • Duplicar, Rotacionar, Mover, Restaurar ordem

5. EXPORTAR
   • Menu > Salvar: PDF unificado
   • Menu > Exportar: Páginas separadas

DICAS:
• Use atalhos de teclado para agilizar
• Menu de contexto (botão direito) para ações rápidas
• Histórico mostra posição original das páginas`,
                                    buttons: ['OK']
                                });
                            }
                        }
                    ]
                },
                
                // SOBRE
                {
                    label: 'ℹ️ Sobre',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            title: 'Informações sobre a ferramenta',
                            detail: `Organizze - Organizador de Documentos

RECURSOS PRINCIPAIS:
• Carregar e organizar PDFs e imagens
• Visualização em lista e grade
• Reorganizar páginas por posição específica
• Rotacionar e duplicar páginas
• Exportar páginas separadas (PDF/PNG)
• Alternar entre temas escuro/claro
• Histórico de movimentação de páginas
• Seleção múltipla avançada
• Menu contextual completo
• Sistema de arrastar e soltar
• Atalhos de teclado intuitivos

TECNOLOGIAS UTILIZADAS:
• Electron para aplicação desktop
• PDF.js para renderização de PDFs
• PDF-lib para criação de PDFs
• JSZip para compactação de arquivos
• HTML5 Canvas para manipulação de imagens

FORMATOS SUPORTADOS:
• Entrada: PDF, JPG, JPEG, PNG, BMP, TIFF
• Saída: PDF, PNG (individual ou ZIP)

Desenvolvido por: Maico Trein Müller
Data de criação: 23/08/2025
Versão: 1.0.2`,
                            buttons: ['OK']
                        });
                    }
                }
            ]
        },

        // OPÇÕES EXTERNAS AO LADO DO MENU
        
        // 📁 ABRIR ARQUIVOS
        {
            label: '📁 Abrir Arquivos',
            click: handleOpenFiles
        },

        // 🖥 VISUALIZAÇÃO (com submenu em cascata)
        {
            label: '🖥 Visualização',
            submenu: [
                {
                    label: '📋 Visualizar em Lista',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('setViewMode("list")');
                        updateViewMenuChecks('list');
                    }
                },
                {
                    label: '🔲 Visualizar em Blocos',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('setViewMode("grid")');
                        updateViewMenuChecks('grid');
                    }
                }
            ]
        },

        // 🔥 LIMPAR TELA
        {
            label: '🔥 Limpar Tela',
            click: externalClearAll
        },

        // 📤 EXPORTAR (com submenu em cascata)
        {
            label: '📤 Exportar',
            submenu: [
                {
                    label: '📄 PDF Unificado',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('saveAsPDF()').catch(err => {
                            console.error('Erro ao salvar PDF:', err);
                        });
                    }
                },
                {
                    label: '📋 Selecionados como PDF',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
                            // Função para salvar apenas páginas selecionadas
                            async function saveSelectedAsPDF() {
                                if (selectedPages.size === 0) {
                                    alert('Nenhuma página selecionada. Selecione páginas primeiro.');
                                    return;
                                }
                                
                                showLoading();
                                
                                try {
                                    const selectedArray = Array.from(selectedPages).sort((a, b) => a - b);
                                    const selectedPagesData = selectedArray.map(index => pages[index]);
                                    
                                    if (selectedPagesData.length === 0) {
                                        hideLoading();
                                        alert('Erro: páginas selecionadas não encontradas.');
                                        return;
                                    }
                                    
                                    updateLoadingProgress(5, 'Iniciando criação do PDF com páginas selecionadas...');
                                    const pdfDoc = await PDFLib.PDFDocument.create();
                                    
                                    for (let i = 0; i < selectedPagesData.length; i++) {
                                        const pageData = selectedPagesData[i];
                                        
                                        updateLoadingProgress(
                                            10 + ((i / selectedPagesData.length) * 80),
                                            \`Processando página selecionada \${i + 1} de \${selectedPagesData.length}...\`
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
                                    downloadFile(pdfBytes, 'paginas_selecionadas.pdf', 'application/pdf');
                                    
                                    updateLoadingProgress(100, '✓ PDF com páginas selecionadas criado com sucesso!');
                                    setTimeout(hideLoading, 800);
                                    
                                } catch (error) {
                                    hideLoading();
                                    console.error('Erro ao salvar páginas selecionadas:', error);
                                    alert('Erro ao salvar páginas selecionadas. Tente novamente.');
                                }
                            }
                            
                            // Executar a função
                            saveSelectedAsPDF();
                        `).catch(err => {
                            console.error('Erro ao salvar páginas selecionadas:', err);
                        });
                    }
                },
                {
                    label: '📑 PDFs Separados (ZIP)',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('exportPagesAsPdfZip()').catch(err => {
                            console.error('Erro ao exportar PDFs:', err);
                        });
                    }
                },
                {
                    label: '🖼️ PNGs Separados (ZIP)',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('exportPagesAsPngZip()').catch(err => {
                            console.error('Erro ao exportar PNGs:', err);
                        });
                    }
                }
            ]
        },

        // ❌ EXCLUIR
        {
            label: '❌ Excluir',
            click: externalDeleteSelected
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Function to update view menu radio buttons
function updateViewMenuChecks(currentMode) {
    const menu = Menu.getApplicationMenu();
    if (menu) {
        const menuItem = menu.items.find(item => item.label === '⚙️ Menu');
        if (menuItem) {
            const visualizacaoMenu = menuItem.submenu.items.find(item => item.label === '👁️ Visualização');
            if (visualizacaoMenu) {
                const listViewItem = visualizacaoMenu.submenu.items.find(item => item.id === 'listView');
                const gridViewItem = visualizacaoMenu.submenu.items.find(item => item.id === 'gridView');
                
                if (listViewItem) listViewItem.checked = (currentMode === 'list');
                if (gridViewItem) gridViewItem.checked = (currentMode === 'grid');
            }
        }
    }
}

// App event handlers
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (navigationEvent, navigationURL) => {
        navigationEvent.preventDefault();
        shell.openExternal(navigationURL);
    });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

// Prevent navigation to external protocols
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (navigationEvent, navigationURL) => {
        const parsedUrl = new URL(navigationURL);
        
        if (parsedUrl.origin !== 'file://' && parsedUrl.protocol !== 'data:') {
            navigationEvent.preventDefault();
        }
    });
});

// Set app user model ID for Windows
if (process.platform === 'win32') {
    app.setAppUserModelId('com.pdfeditor.app');
}

// Expose the updateViewMenuChecks function globally for renderer process
global.updateViewMenuChecks = updateViewMenuChecks;