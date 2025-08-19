# Quick Auto-Save

Ultra-fast auto-save extension for Visual Studio Code with highly configurable intervals and bulletproof error handling.

## 🚀 Features

- **Lightning Fast**: Save files with delays as low as 50ms (20x faster than VS Code's built-in auto-save)
- **Bulletproof**: Comprehensive error handling and recovery mechanisms
- **Smart Filtering**: Include/exclude specific file types and sizes
- **Rich Monitoring**: Detailed statistics, logging, and health monitoring
- **Zero Memory Leaks**: Proper cleanup and resource management
- **Production Ready**: Enterprise-level reliability and error handling

## ⚡ Quick Start

1. Install the extension
2. Start typing - files auto-save automatically!
3. Configure your preferred save delay in settings
4. Use `Ctrl+Shift+Alt+S` to toggle on/off

## 🛠️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `quickAutoSave.enabled` | `true` | Enable/disable the extension |
| `quickAutoSave.saveDelay` | `200` | Delay in milliseconds (50-10000ms) |
| `quickAutoSave.saveOnEveryChange` | `false` | Save immediately on every keystroke |
| `quickAutoSave.saveUntitled` | `false` | Enable auto-save for untitled documents |
| `quickAutoSave.enabledFileTypes` | `[]` | File extensions to include (empty = all files) |
| `quickAutoSave.excludedFileTypes` | `[".log", ".tmp"]` | File extensions to exclude |
| `quickAutoSave.maxFileSizeKB` | `1024` | Maximum file size for auto-save (1-10240KB) |
| `quickAutoSave.showStatusBar` | `true` | Show status bar indicator |
| `quickAutoSave.showNotifications` | `false` | Show save notifications |
| `quickAutoSave.enableDebugLogging` | `false` | Enable detailed debug logging |

## 📋 Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| **Toggle Quick Auto-Save** | `Ctrl+Shift+Alt+S` | Enable/disable extension |
| **Save All Files Now** | - | Immediately save all dirty files |
| **Show Statistics** | - | Display detailed save statistics |
| **Show Logs** | - | Open the log output channel |
| **Clear Statistics** | - | Reset all statistics |

## 📊 Status Bar

The status bar shows:
- Extension status (active/disabled)
- Number of pending saves in parentheses
- Success rate and save count in tooltip
- Click to toggle extension on/off

## 🔧 Advanced Features

### File Type Filtering
```json
{
  "quickAutoSave.enabledFileTypes": [".js", ".ts", ".py", ".html"],
  "quickAutoSave.excludedFileTypes": [".log", ".tmp", ".cache"]
}
```

### Performance Tuning
- **Ultra-fast**: 50-100ms for immediate feedback
- **Balanced**: 200-500ms for normal use
- **Conservative**: 1000ms+ for large files

### File Size Limits
Automatically skips files larger than the configured limit to prevent performance issues.

### Health Monitoring
- Automatic cleanup of stale timeouts
- Memory leak prevention
- Error recovery mechanisms
- Comprehensive logging

## 📈 Statistics

View detailed statistics including:
- Session duration and save counts
- Success/failure rates
- Average saves per minute
- Active timeouts
- Last save time

## 🐛 Troubleshooting

### Enable Debug Logging
1. Set `quickAutoSave.enableDebugLogging`: `true`
2. Run command: **Quick Auto-Save: Show Logs**
3. Reproduce the issue
4. Check the log output

### Common Issues

**Files not saving:**
- Check if file type is excluded
- Verify file size is under the limit
- Ensure extension is enabled in status bar

**Performance issues:**
- Increase save delay (500ms+)
- Reduce max file size limit
- Exclude large file types

**Too many notifications:**
- Disable `showNotifications` setting
- Files still save silently in background

## 🚦 Error Handling

The extension includes bulletproof error handling:
- **Save timeouts**: 30-second limit prevents hanging
- **Rate limiting**: Error notifications are throttled
- **Graceful degradation**: Continues working even if components fail
- **Memory protection**: Automatic cleanup prevents leaks
- **Health monitoring**: Self-healing mechanisms

## 📝 Logs

Access detailed logs via:
- Command: **Quick Auto-Save: Show Logs**
- Or: `View` → `Output` → Select "Quick Auto-Save"

Log levels:
- **ERROR**: Critical issues requiring attention
- **WARN**: Potential problems or invalid configurations
- **INFO**: General operation information
- **DEBUG**: Detailed troubleshooting information

## 🔒 Privacy & Security

- No data is sent to external services
- All operations are local to VS Code
- Logs contain only file paths and operation details
- No file contents are logged or transmitted

## 🤝 Contributing

Found a bug or have a feature request? Please open an issue on the GitHub repository.

## 📄 License

MIT License - see LICENSE file for details.

---

**Performance Note**: For optimal performance on large codebases, consider:
- Setting `saveDelay` to 300-500ms
- Excluding log files and temporary directories
- Setting appropriate file size limits