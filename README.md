# PDF Editor - Windows Desktop Application

## Descrição
Aplicação desktop completa para edição de PDFs, baseada no Electron, com funcionalidades avançadas de manipulação, organização e exportação de documentos PDF e imagens.

## Funcionalidades

### ✨ Principais Recursos
- **Carregar múltiplos arquivos**: PDFs e imagens (JPG, PNG, BMP, TIFF)
- **Visualização dual**: Modo lista e modo blocos com thumbnails
- **Manipulação de páginas**: Girar, duplicar, mover, excluir
- **Organização intuitiva**: Drag & drop, seleção múltipla
- **Exportação flexível**: PDF único ou páginas separadas (PDF/PNG)
- **Interface moderna**: Temas claro/escuro, animações suaves
- **Atalhos de teclado**: Navegação e operações rápidas

### 🎯 Recursos Técnicos
- **Performance otimizada**: Renderização em alta qualidade
- **Interface responsiva**: Adaptável a diferentes tamanhos de tela
- **Memória eficiente**: Gerenciamento inteligente de recursos
- **Segurança**: CSP e validação de arquivos

## Pré-requisitos

### Sistema Operacional
- Windows 10/11 (x64)
- 4 GB RAM mínimo (8 GB recomendado)
- 500 MB espaço em disco

### Ferramentas de Desenvolvimento
- Node.js 16.x ou superior
- npm 8.x ou superior
- Git (opcional)

## Instalação e Setup

### 1. Preparação do Ambiente

```bash
# Verificar versões
node --version  # deve ser 16+
npm --version   # deve ser 8+
```

### 2. Estrutura do Projeto

Criar a seguinte estrutura de pastas:

```
pdf-editor-windows/
├── package.json
├── main.js
├── renderer/
│   ├── index.html
│   └── app.js
├── assets/
│   ├── icon.ico
│   └── icon.png
├── dist/          (criado automaticamente)
└── README.md
```

### 3. Instalação das Dependências

```bash
# Navegar para o diretório do projeto
cd pdf-editor-windows

# Instalar dependências de produção
npm install electron-store@8.1.0

# Instalar dependências de desenvolvimento
npm install --save-dev electron@27.0.0 electron-builder@24.6.4
```

### 4. Criação dos Ícones

Criar os ícones da aplicação na pasta `assets/`:

- `icon.ico` (256x256) - para Windows
- `icon.png` (512x512) - fallback

### 5. Scripts de Desenvolvimento

```bash
# Executar em modo desenvolvimento
npm start

# Executar com ferramentas de desenvolvedor
npm run dev

# Build para Windows
npm run build-win
```

## Build e Distribuição

### Build Local
```bash
# Build completo (instalador + portável)
npm run build

# Apenas para Windows
npm run build-win
```

### Outputs Gerados
- `dist/PDF Editor Setup.exe` - Instalador NSIS
- `dist/PDF Editor Portable.exe` - Versão portátil
- `dist/win-unpacked/` - Arquivos da aplicação

### Customização do Build

No `package.json`, seção `build`:

```json
{
  "build": {
    "appId": "com.pdfeditor.app",
    "productName": "PDF Editor",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "portable", 
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

## Estrutura Técnica

### Arquitetura
- **Main Process** (`main.js`): Processo principal do Electron
- **Renderer Process** (`renderer/`): Interface de usuário
- **IPC**: Comunicação entre processos (se necessário)

### Bibliotecas Principais
- **PDF-lib**: Criação e manipulação de PDFs
- **PDF.js**: Renderização de páginas PDF  
- **JSZip**: Compactação para exportação
- **Electron Store**: Persistência de configurações

### Performance
- **Canvas Rendering**: Alta qualidade com scale 2x
- **Lazy Loading**: Carregamento sob demanda
- **Memory Management**: Limpeza automática de recursos
- **Async Processing**: Operações não-bloqueantes

## Atalhos de Teclado

| Atalho | Função |
|--------|--------|
| `Ctrl+O` | Adicionar arquivos |
| `Ctrl+N` | Limpar tela |
| `Ctrl+S` | Salvar PDF |
| `Ctrl+A` | Selecionar tudo |
| `Escape` | Limpar seleção |
| `Delete` | Excluir selecionados |
| `Ctrl+1` | Modo lista |
| `Ctrl+2` | Modo blocos |
| `Ctrl+D` | Alternar tema |
| `Ctrl+Q` | Sair |

## Solução de Problemas

### Problemas Comuns

**Erro ao carregar PDF:**
- Verificar se o arquivo não está corrompido
- Tentar com um PDF mais simples primeiro

**Performance lenta:**
- Verificar RAM disponível
- Reduzir número de páginas processadas simultaneamente

**Build falha:**
- Verificar versões do Node.js e npm
- Limpar cache: `npm cache clean --force`

### Debug

```bash
# Executar com console
npm run dev

# Ver logs detalhados
DEBUG=* npm start
```

### Logs da Aplicação
- Windows: `%APPDATA%/PDF Editor/logs/`
- Console do desenvolvedor (F12)

## Distribuição

### Para Usuários Finais
1. Download do instalador (`PDF Editor Setup.exe`)
2. Execução como administrador (recomendado)
3. Seguir wizard de instalação
4. Executar via atalho do desktop/menu iniciar

### Versão Portátil
- Download `PDF Editor Portable.exe`
- Executar diretamente sem instalação
- Ideal para uso em múltiplos computadores

## Licença e Créditos

Este projeto utiliza:
- Electron (MIT)
- PDF-lib (MIT) 
- PDF.js (Apache 2.0)
- JSZip (MIT)

## Suporte Técnico

Para problemas técnicos:
1. Verificar logs da aplicação
2. Tentar com arquivos menores
3. Reinstalar a aplicação
4. Verificar requisitos do sistema

## Roadmap de Melhorias

### Próximas Versões
- [ ] OCR para PDFs digitalizados
- [ ] Anotações e comentários
- [ ] Assinatura digital
- [ ] Compressão de PDFs
- [ ] Suporte a mais formatos de imagem
- [ ] Plugin system
- [ ] Modo colaborativo (cloud)
- [ ] Impressão avançada