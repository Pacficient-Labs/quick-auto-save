# Quick Auto-Save Extension - Setup Instructions

## 📁 File Structure

Create the following folder structure:

```
quick-auto-save/
├── package.json
├── tsconfig.json
├── .gitignore
├── .vscodeignore
├── README.md
├── src/
│   └── extension.ts
└── .vscode/
    ├── launch.json
    └── tasks.json
```

## 🚀 Quick Setup

### Step 1: Create Project Directory
```bash
mkdir quick-auto-save
cd quick-auto-save
```

### Step 2: Copy Files
Copy each file from the artifacts above into the corresponding location in your project directory.

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Install Development Dependencies
```bash
npm install --save-dev @types/vscode @types/node @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint typescript vsce
```

### Step 5: Compile TypeScript
```bash
npm run compile
```

### Step 6: Test the Extension
1. Open VS Code in the project directory
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new VS Code window

## 🛠️ Development Workflow

### During Development:
```bash
# Watch mode for auto-compilation
npm run watch
```

### Build for Production:
```bash
# Compile the extension
npm run compile

# Package into .vsix file
npm run package
```

### Testing:
- Press `F5` in VS Code to launch Extension Development Host
- Test all commands and configurations
- Check the logs in Output → Quick Auto-Save

## 📦 Package Structure After Setup

```
quick-auto-save/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration  
├── .gitignore               # Git ignore rules
├── .vscodeignore            # VS Code packaging ignore
├── README.md                # Documentation
├── node_modules/            # Dependencies (after npm install)
├── out/                     # Compiled JavaScript (after compile)
│   └── extension.js
├── src/                     # Source code
│   └── extension.ts         # Main extension file
└── .vscode/                 # VS Code configuration
    ├── launch.json          # Debug configuration
    └── tasks.json           # Build tasks
```

## 🔧 Configuration Notes

### Before Publishing:
1. Update `publisher` in package.json
2. Update repository URL in package.json  
3. Add an icon.png file (128x128px)
4. Test thoroughly in different scenarios

### Optional Files to Add:
- `CHANGELOG.md` - Version history
- `LICENSE` - License file
- `icon.png` - Extension icon
- `.eslintrc.json` - ESLint configuration

## 🚨 Troubleshooting

### Common Issues:

**TypeScript compilation errors:**
```bash
# Clean and rebuild
rm -rf out/
npm run compile
```

**Extension not loading:**
- Check console for errors (`Help` → `Toggle Developer Tools`)
- Verify package.json syntax
- Ensure all dependencies are installed

**Debug not working:**
- Verify .vscode/launch.json is correct
- Make sure TypeScript is compiled (`npm run compile`)

## 🎯 Next Steps

1. **Customize the extension**: Modify settings, add features
2. **Test thoroughly**: Try different file types and scenarios  
3. **Package for distribution**: `npm run package` creates .vsix
4. **Publish to marketplace**: Use `vsce publish` (requires setup)

## 📝 Development Tips

- Use `console.log()` statements for debugging during development
- Enable debug logging in settings for detailed information
- Test with different file types and sizes
- Monitor memory usage with large numbers of files
- Test error scenarios (read-only files, network drives, etc.)

Happy coding! 🎉