# Organizze PDF - Aplicativo Desktop para Windows

## Descrição
Aplicação de desktop para Windows, criada com Electron, para organizar e manipular arquivos PDF e imagens de forma simples e eficiente.

## Funcionalidades

### ✨ Recursos Principais
- **Carregar múltiplos arquivos**: PDFs e imagens (JPG, PNG, BMP, TIFF)
- **Visualização dual**: Modo lista e modo blocos com thumbnails
- **Manipulação de páginas**: Girar, duplicar, mover, excluir
- **Organização intuitiva**: Arraste e solte (Drag & drop), seleção múltipla
- **Exportação flexível**: PDF único, PDFs separados (em arquivo ZIP), ou imagens PNG separadas (em arquivo ZIP)
- **Interface moderna**: Temas claro e escuro
- **Atalhos de teclado**: Navegação e operações rápidas
- **Menu de Contexto**: Ações rápidas com o botão direito do mouse.

### 🎯 Recursos Técnicos
- **Performance otimizada**: Renderização em alta qualidade
- **Interface responsiva**: Adaptável a diferentes tamanhos de tela
- **Persistência**: Salva o estado da janela ao fechar.

## Pré-requisitos

### Sistema Operacional
- Windows 10/11 (x64)
- 4 GB RAM mínimo (8 GB recomendado)
- 500 MB espaço em disco

### Ferramentas de Desenvolvimento
- Node.js 16.x ou superior
- npm 8.x ou superior

## Instalação e Setup

### 1. Clonar o Repositório
```bash
git clone <url-do-repositorio>
cd organizze-pdf
```

### 2. Instalação das Dependências
```bash
# Instalar dependências
npm install
```

### 3. Scripts de Desenvolvimento
```bash
# Executar em modo desenvolvimento
npm start

# Executar com ferramentas de desenvolvedor
npm run dev
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
- `dist/Organizze PDF Setup 1.0.2.exe` - Instalador NSIS
- `dist/Organizze PDF 1.0.2.exe` - Versão portátil
- `dist/win-unpacked/` - Arquivos da aplicação

### Customização do Build

No `package.json`, seção `build`:

```json
{
  "build": {
    "appId": "com.organizze.pdf",
    "productName": "Organizze PDF",
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
      "createStartMenuShortcut": true,
      "shortcutName": "Organizze PDF"
    }
  }
}
```

## Tecnologias Utilizadas
- **Electron**: Framework para criar aplicações desktop com JavaScript, HTML e CSS.
- **electron-store**: Para persistência de dados simples (configurações, estado da janela).
- **pdf.js**: Biblioteca para renderização de arquivos PDF em HTML5.
- **pdf-lib**: Biblioteca para criar e modificar documentos PDF.
- **JSZip**: Biblioteca para criar, ler e editar arquivos .zip com JavaScript.

## Licença
Este projeto está licenciado sob a licença MIT.

## Autor
**Maico Trein Müller**
