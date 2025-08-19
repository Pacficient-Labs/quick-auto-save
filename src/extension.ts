import * as vscode from 'vscode';
import * as path from 'path';

interface SaveTimeout {
    timeout: NodeJS.Timeout;
    changeCount: number;
    documentUri: string;
    createdAt: number;
}

interface SaveStats {
    totalSaves: number;
    successfulSaves: number;
    failedSaves: number;
    lastSaveTime: number;
    sessionStartTime: number;
}

interface Logger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, error?: Error, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}

class QuickAutoSaveLogger implements Logger {
    private outputChannel: vscode.OutputChannel;
    private debugMode: boolean = false;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Quick Auto-Save');
        this.updateDebugMode();
    }

    updateDebugMode() {
        const config = vscode.workspace.getConfiguration('quickAutoSave');
        this.debugMode = config.get('enableDebugLogging', false);
    }

    private log(level: string, message: string, error?: Error, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (args.length > 0) {
            console.log(formattedMessage, ...args);
            this.outputChannel.appendLine(`${formattedMessage} ${JSON.stringify(args)}`);
        } else {
            console.log(formattedMessage);
            this.outputChannel.appendLine(formattedMessage);
        }

        if (error) {
            const errorMessage = `Error: ${error.message}\nStack: ${error.stack}`;
            console.error(errorMessage);
            this.outputChannel.appendLine(errorMessage);
        }
    }

    info(message: string, ...args: any[]) {
        this.log('INFO', message, undefined, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.log('WARN', message, undefined, ...args);
    }

    error(message: string, error?: Error, ...args: any[]) {
        this.log('ERROR', message, error, ...args);
    }

    debug(message: string, ...args: any[]) {
        if (this.debugMode) {
            this.log('DEBUG', message, undefined, ...args);
        }
    }

    showOutputChannel() {
        this.outputChannel.show();
    }

    dispose() {
        this.outputChannel.dispose();
    }
}

// Global state
let saveTimeouts: Map<string, SaveTimeout> = new Map();
let statusBarItem: vscode.StatusBarItem;
let logger: QuickAutoSaveLogger;
let saveStats: SaveStats;
let isDisposing = false;
let healthCheckInterval: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    try {
        // Initialize logger first
        logger = new QuickAutoSaveLogger();
        logger.info('Quick Auto-Save extension activation started');

        // Initialize stats
        initializeStats();

        // Initialize status bar
        initializeStatusBar(context);

        // Register commands
        registerCommands(context);

        // Set up event listeners
        setupEventListeners(context);

        // Start health monitoring
        startHealthMonitoring();

        // Update status bar initially
        updateStatusBar();

        // Register cleanup
        context.subscriptions.push(new vscode.Disposable(() => {
            cleanup();
        }));

        logger.info('Quick Auto-Save extension activated successfully');
    } catch (error) {
        const errorMessage = 'Failed to activate Quick Auto-Save extension';
        console.error(errorMessage, error);
        vscode.window.showErrorMessage(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}

function initializeStats() {
    saveStats = {
        totalSaves: 0,
        successfulSaves: 0,
        failedSaves: 0,
        lastSaveTime: 0,
        sessionStartTime: Date.now()
    };
    logger.debug('Save statistics initialized');
}

function initializeStatusBar(context: vscode.ExtensionContext) {
    try {
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        statusBarItem.command = 'quickAutoSave.toggle';
        statusBarItem.show();
        
        context.subscriptions.push(statusBarItem);
        logger.debug('Status bar initialized');
    } catch (error) {
        logger.error('Failed to initialize status bar', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    try {
        // Toggle command
        const toggleCommand = vscode.commands.registerCommand('quickAutoSave.toggle', async () => {
            try {
                const config = getConfig();
                const currentState = config.get('enabled', true);
                await config.update('enabled', !currentState, vscode.ConfigurationTarget.Global);
                
                const status = !currentState ? 'enabled' : 'disabled';
                logger.info(`Extension ${status} by user`);
                vscode.window.showInformationMessage(`Quick Auto-Save ${status}`);
                
                // Clear any pending saves when disabling
                if (currentState) { // Was enabled, now disabling
                    clearAllTimeouts('Extension disabled by user');
                }
                
                updateStatusBar();
            } catch (error) {
                logger.error('Failed to toggle extension state', error instanceof Error ? error : new Error(String(error)));
                vscode.window.showErrorMessage('Failed to toggle Quick Auto-Save');
            }
        });

        // Save now command
        const saveNowCommand = vscode.commands.registerCommand('quickAutoSave.saveNow', async () => {
            try {
                const savedCount = await saveAllDirtyDocuments();
                logger.info(`Manual save all completed: ${savedCount} files saved`);
                vscode.window.showInformationMessage(`Saved ${savedCount} files`);
            } catch (error) {
                logger.error('Failed to save all files', error instanceof Error ? error : new Error(String(error)));
                vscode.window.showErrorMessage('Failed to save all files');
            }
        });

        // Show stats command
        const showStatsCommand = vscode.commands.registerCommand('quickAutoSave.showStats', () => {
            try {
                showSaveStatistics();
            } catch (error) {
                logger.error('Failed to show statistics', error instanceof Error ? error : new Error(String(error)));
                vscode.window.showErrorMessage('Failed to show statistics');
            }
        });

        // Show logs command
        const showLogsCommand = vscode.commands.registerCommand('quickAutoSave.showLogs', () => {
            try {
                logger.showOutputChannel();
            } catch (error) {
                logger.error('Failed to show logs', error instanceof Error ? error : new Error(String(error)));
            }
        });

        // Clear stats command
        const clearStatsCommand = vscode.commands.registerCommand('quickAutoSave.clearStats', () => {
            try {
                initializeStats();
                logger.info('Statistics cleared by user');
                vscode.window.showInformationMessage('Quick Auto-Save statistics cleared');
                updateStatusBar();
            } catch (error) {
                logger.error('Failed to clear statistics', error instanceof Error ? error : new Error(String(error)));
                vscode.window.showErrorMessage('Failed to clear statistics');
            }
        });

        context.subscriptions.push(
            toggleCommand, 
            saveNowCommand, 
            showStatsCommand, 
            showLogsCommand, 
            clearStatsCommand
        );
        
        logger.debug('Commands registered successfully');
    } catch (error) {
        logger.error('Failed to register commands', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

function setupEventListeners(context: vscode.ExtensionContext) {
    try {
        // Listen for document changes
        const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
            try {
                handleDocumentChange(event);
            } catch (error) {
                logger.error('Error handling document change', error instanceof Error ? error : new Error(String(error)), {
                    documentUri: event.document.uri.toString(),
                    changeCount: event.contentChanges.length
                });
            }
        });

        // Clean up timeouts when documents are closed
        const onDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument((document) => {
            try {
                const uri = document.uri.toString();
                clearTimeoutForDocument(uri, 'Document closed');
                logger.debug('Document closed, timeout cleared', { uri });
            } catch (error) {
                logger.error('Error handling document close', error instanceof Error ? error : new Error(String(error)), {
                    documentUri: document.uri.toString()
                });
            }
        });

        // Handle document save events
        const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument((document) => {
            try {
                const uri = document.uri.toString();
                // Clear timeout since document was manually saved
                if (saveTimeouts.has(uri)) {
                    clearTimeoutForDocument(uri, 'Document manually saved');
                }
                logger.debug('Document manually saved', { uri: document.uri.toString() });
            } catch (error) {
                logger.error('Error handling document save event', error instanceof Error ? error : new Error(String(error)));
            }
        });

        // Listen for configuration changes
        const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration((event) => {
            try {
                if (event.affectsConfiguration('quickAutoSave')) {
                    logger.debug('Configuration changed');
                    logger.updateDebugMode();
                    updateStatusBar();
                    
                    // If disabled, clear all timeouts
                    if (!isEnabled()) {
                        clearAllTimeouts('Extension disabled via configuration');
                    }
                    
                    // Validate configuration
                    validateConfiguration();
                }
            } catch (error) {
                logger.error('Error handling configuration change', error instanceof Error ? error : new Error(String(error)));
            }
        });

        // Handle workspace changes
        const onDidChangeWorkspaceFolders = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            try {
                logger.info('Workspace folders changed', {
                    added: event.added.length,
                    removed: event.removed.length
                });
            } catch (error) {
                logger.error('Error handling workspace change', error instanceof Error ? error : new Error(String(error)));
            }
        });

        context.subscriptions.push(
            onDidChangeTextDocument,
            onDidCloseTextDocument,
            onDidSaveTextDocument,
            onDidChangeConfiguration,
            onDidChangeWorkspaceFolders
        );
        
        logger.debug('Event listeners setup completed');
    } catch (error) {
        logger.error('Failed to setup event listeners', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

function handleDocumentChange(event: vscode.TextDocumentChangeEvent) {
    if (!isEnabled() || isDisposing) return;
    
    const document = event.document;
    const uri = document.uri.toString();
    
    try {
        // Skip if document doesn't meet criteria
        if (!shouldAutoSave(document)) {
            logger.debug('Document skipped for auto-save', {
                uri,
                isDirty: document.isDirty,
                isUntitled: document.isUntitled,
                languageId: document.languageId
            });
            return;
        }
        
        const config = getConfig();
        const saveDelay = Math.max(50, Math.min(10000, config.get('saveDelay', 200))); // Clamp between 50ms and 10s
        const saveOnEveryChange = config.get('saveOnEveryChange', false);

        // Clear existing timeout for this document
        clearTimeoutForDocument(uri, 'New change detected');

        // Save immediately if configured to do so
        if (saveOnEveryChange) {
            logger.debug('Saving immediately due to saveOnEveryChange setting', { uri });
            saveDocument(document).catch(error => {
                logger.error('Failed immediate save', error instanceof Error ? error : new Error(String(error)), { uri });
            });
            return;
        }

        // Set up debounced save with error handling
        const timeoutId = setTimeout(() => {
            try {
                if (!isDisposing && saveTimeouts.has(uri)) {
                    saveDocument(document).catch(error => {
                        logger.error('Failed debounced save', error instanceof Error ? error : new Error(String(error)), { uri });
                    }).finally(() => {
                        saveTimeouts.delete(uri);
                    });
                }
            } catch (error) {
                logger.error('Error in save timeout callback', error instanceof Error ? error : new Error(String(error)), { uri });
                saveTimeouts.delete(uri);
            }
        }, saveDelay);

        const currentTimeout = saveTimeouts.get(uri);
        saveTimeouts.set(uri, {
            timeout: timeoutId,
            changeCount: (currentTimeout?.changeCount || 0) + 1,
            documentUri: uri,
            createdAt: Date.now()
        });

        logger.debug('Save timeout scheduled', { 
            uri, 
            delay: saveDelay,
            changeCount: saveTimeouts.get(uri)?.changeCount
        });

    } catch (error) {
        logger.error('Error in handleDocumentChange', error instanceof Error ? error : new Error(String(error)), { uri });
    }
}

function shouldAutoSave(document: vscode.TextDocument): boolean {
    try {
        // Skip if document is not dirty
        if (!document.isDirty) {
            return false;
        }

        // Skip if document is being saved by another process
        if (document.isClosed) {
            return false;
        }

        const config = getConfig();
        
        // Handle untitled documents
        if (document.isUntitled && !config.get('saveUntitled', false)) {
            return false;
        }

        // Check file type filters
        const fileName = document.fileName || document.uri.path;
        const extension = path.extname(fileName).toLowerCase();

        // Check excluded file types
        const excludedTypes: string[] = config.get('excludedFileTypes', []);
        if (excludedTypes.some(ext => ext.toLowerCase() === extension)) {
            return false;
        }

        // Check enabled file types (if specified)
        const enabledTypes: string[] = config.get('enabledFileTypes', []);
        if (enabledTypes.length > 0 && !enabledTypes.some(ext => ext.toLowerCase() === extension)) {
            return false;
        }

        // Check file size limits
        const maxFileSize = config.get('maxFileSizeKB', 1024); // Default 1MB
        const text = document.getText();
        const fileSizeKB = Buffer.byteLength(text, 'utf8') / 1024;
        
        if (fileSizeKB > maxFileSize) {
            logger.warn('File too large for auto-save', { 
                uri: document.uri.toString(), 
                sizeKB: fileSizeKB, 
                maxSizeKB: maxFileSize 
            });
            return false;
        }

        return true;
    } catch (error) {
        logger.error('Error in shouldAutoSave check', error instanceof Error ? error : new Error(String(error)), {
            uri: document.uri.toString()
        });
        return false;
    }
}

async function saveDocument(document: vscode.TextDocument): Promise<boolean> {
    const uri = document.uri.toString();
    const startTime = Date.now();
    
    try {
        if (!document.isDirty) {
            logger.debug('Document not dirty, skipping save', { uri });
            return true;
        }

        if (document.isClosed) {
            logger.debug('Document closed, skipping save', { uri });
            return false;
        }

        saveStats.totalSaves++;
        
        // Add timeout to prevent hanging saves
        const savePromise = document.save();
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Save operation timed out')), 30000); // 30 second timeout
        });

        await Promise.race([savePromise, timeoutPromise]);
        
        const saveTime = Date.now() - startTime;
        saveStats.successfulSaves++;
        saveStats.lastSaveTime = Date.now();
        
        updateStatusBar();
        
        const config = getConfig();
        if (config.get('showNotifications', false)) {
            const fileName = path.basename(document.fileName || 'Untitled');
            vscode.window.showInformationMessage(`Auto-saved: ${fileName}`, { modal: false });
        }
        
        logger.info('Document auto-saved successfully', { 
            uri, 
            saveTimeMs: saveTime,
            fileName: path.basename(document.fileName || 'Untitled')
        });
        
        return true;
        
    } catch (error) {
        const saveTime = Date.now() - startTime;
        saveStats.failedSaves++;
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to save document', error instanceof Error ? error : new Error(errorMessage), { 
            uri, 
            saveTimeMs: saveTime,
            fileName: path.basename(document.fileName || 'Untitled')
        });
        
        // Show user-friendly error message
        const fileName = path.basename(document.fileName || 'Untitled');
        
        // Don't spam the user with error messages
        const lastErrorTime = (saveDocument as any).lastErrorTime || 0;
        const now = Date.now();
        if (now - lastErrorTime > 5000) { // Only show error every 5 seconds max
            vscode.window.showErrorMessage(`Failed to auto-save ${fileName}: ${errorMessage}`);
            (saveDocument as any).lastErrorTime = now;
        }
        
        updateStatusBar();
        return false;
    }
}

async function saveAllDirtyDocuments(): Promise<number> {
    const dirtyDocuments = vscode.workspace.textDocuments.filter(doc => doc.isDirty);
    let savedCount = 0;
    
    logger.info('Starting save all operation', { dirtyDocumentCount: dirtyDocuments.length });
    
    const savePromises = dirtyDocuments.map(async (document) => {
        if (shouldAutoSave(document)) {
            const success = await saveDocument(document);
            if (success) {
                savedCount++;
            }
        }
    });

    try {
        await Promise.allSettled(savePromises);
        logger.info('Save all operation completed', { savedCount, totalDirty: dirtyDocuments.length });
        return savedCount;
    } catch (error) {
        logger.error('Error during save all operation', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

function clearTimeoutForDocument(uri: string, reason: string = 'Unknown') {
    try {
        const saveTimeout = saveTimeouts.get(uri);
        if (saveTimeout) {
            clearTimeout(saveTimeout.timeout);
            saveTimeouts.delete(uri);
            logger.debug('Timeout cleared for document', { uri, reason, changeCount: saveTimeout.changeCount });
        }
    } catch (error) {
        logger.error('Error clearing timeout for document', error instanceof Error ? error : new Error(String(error)), { uri, reason });
    }
}

function clearAllTimeouts(reason: string = 'Unknown') {
    try {
        const timeoutCount = saveTimeouts.size;
        saveTimeouts.forEach((saveTimeout, uri) => {
            try {
                clearTimeout(saveTimeout.timeout);
            } catch (error) {
                logger.error('Error clearing individual timeout', error instanceof Error ? error : new Error(String(error)), { uri });
            }
        });
        saveTimeouts.clear();
        logger.info('All timeouts cleared', { count: timeoutCount, reason });
    } catch (error) {
        logger.error('Error clearing all timeouts', error instanceof Error ? error : new Error(String(error)), { reason });
    }
}

function validateConfiguration() {
    try {
        const config = getConfig();
        
        // Validate save delay
        const saveDelay = config.get('saveDelay', 200);
        if (saveDelay < 50 || saveDelay > 10000) {
            logger.warn('Invalid save delay configuration', { saveDelay, validRange: '50-10000ms' });
            vscode.window.showWarningMessage('Quick Auto-Save: Invalid save delay. Should be between 50-10000ms.');
        }

        // Validate file size limit
        const maxFileSize = config.get('maxFileSizeKB', 1024);
        if (maxFileSize < 1 || maxFileSize > 10240) {
            logger.warn('Invalid max file size configuration', { maxFileSize, validRange: '1-10240KB' });
            vscode.window.showWarningMessage('Quick Auto-Save: Invalid max file size. Should be between 1-10240KB.');
        }

        // Validate file type arrays
        const enabledTypes = config.get('enabledFileTypes', []);
        const excludedTypes = config.get('excludedFileTypes', []);
        
        if (!Array.isArray(enabledTypes) || !Array.isArray(excludedTypes)) {
            logger.warn('Invalid file type configuration', { enabledTypes, excludedTypes });
            vscode.window.showWarningMessage('Quick Auto-Save: File type filters must be arrays.');
        }

        logger.debug('Configuration validation completed');
    } catch (error) {
        logger.error('Error validating configuration', error instanceof Error ? error : new Error(String(error)));
    }
}

function startHealthMonitoring() {
    try {
        // Check for stale timeouts every 30 seconds
        healthCheckInterval = setInterval(() => {
            if (isDisposing) return;
            
            try {
                const now = Date.now();
                const staleTimeouts: string[] = [];
                
                saveTimeouts.forEach((saveTimeout, uri) => {
                    // Consider timeout stale if it's older than 5 minutes
                    if (now - saveTimeout.createdAt > 300000) {
                        staleTimeouts.push(uri);
                    }
                });
                
                if (staleTimeouts.length > 0) {
                    logger.warn('Found stale timeouts, cleaning up', { count: staleTimeouts.length });
                    staleTimeouts.forEach(uri => clearTimeoutForDocument(uri, 'Stale timeout cleanup'));
                }
                
                // Log health statistics
                logger.debug('Health check completed', {
                    activeTimeouts: saveTimeouts.size,
                    staleTimeoutsCleared: staleTimeouts.length,
                    totalSaves: saveStats.totalSaves,
                    successRate: saveStats.totalSaves > 0 ? (saveStats.successfulSaves / saveStats.totalSaves * 100).toFixed(1) + '%' : 'N/A'
                });
                
            } catch (error) {
                logger.error('Error during health check', error instanceof Error ? error : new Error(String(error)));
            }
        }, 30000);
        
        logger.debug('Health monitoring started');
    } catch (error) {
        logger.error('Failed to start health monitoring', error instanceof Error ? error : new Error(String(error)));
    }
}

function showSaveStatistics() {
    try {
        const sessionDuration = Math.round((Date.now() - saveStats.sessionStartTime) / 1000 / 60); // minutes
        const successRate = saveStats.totalSaves > 0 ? (saveStats.successfulSaves / saveStats.totalSaves * 100).toFixed(1) : '0';
        const avgSavesPerMinute = sessionDuration > 0 ? (saveStats.totalSaves / sessionDuration).toFixed(1) : '0';
        
        const message = `Quick Auto-Save Statistics:
• Session Duration: ${sessionDuration} minutes
• Total Saves: ${saveStats.totalSaves}
• Successful: ${saveStats.successfulSaves}
• Failed: ${saveStats.failedSaves}
• Success Rate: ${successRate}%
• Average Saves/Minute: ${avgSavesPerMinute}
• Active Timeouts: ${saveTimeouts.size}
• Last Save: ${saveStats.lastSaveTime > 0 ? new Date(saveStats.lastSaveTime).toLocaleTimeString() : 'Never'}`;

        vscode.window.showInformationMessage(message, { modal: true });
        logger.info('Statistics displayed to user', {
            sessionDuration,
            totalSaves: saveStats.totalSaves,
            successRate: parseFloat(successRate),
            activeTimeouts: saveTimeouts.size
        });
    } catch (error) {
        logger.error('Error showing statistics', error instanceof Error ? error : new Error(String(error)));
        vscode.window.showErrorMessage('Failed to display statistics');
    }
}

function getConfig() {
    try {
        return vscode.workspace.getConfiguration('quickAutoSave');
    } catch (error) {
        logger.error('Error getting configuration', error instanceof Error ? error : new Error(String(error)));
        // Return a mock config object to prevent crashes
        return {
            get: (key: string, defaultValue: any) => defaultValue,
            update: () => Promise.resolve(),
            has: () => false,
            inspect: () => undefined
        } as any;
    }
}

function isEnabled(): boolean {
    try {
        return getConfig().get('enabled', true);
    } catch (error) {
        logger.error('Error checking if extension is enabled', error instanceof Error ? error : new Error(String(error)));
        return false;
    }
}

function updateStatusBar() {
    try {
        if (!statusBarItem) {
            logger.warn('Status bar item not initialized');
            return;
        }

        if (!getConfig().get('showStatusBar', true)) {
            statusBarItem.hide();
            return;
        }

        const enabled = isEnabled();
        const pendingSaves = saveTimeouts.size;
        const successRate = saveStats.totalSaves > 0 ? Math.round((saveStats.successfulSaves / saveStats.totalSaves) * 100) : 100;
        
        if (enabled) {
            statusBarItem.text = `$(save) Quick Save${pendingSaves > 0 ? ` (${pendingSaves})` : ''}`;
            statusBarItem.tooltip = `Quick Auto-Save: Active
Files saved: ${saveStats.successfulSaves}
Success rate: ${successRate}%
Pending saves: ${pendingSaves}
Click to toggle`;
            statusBarItem.color = undefined;
            statusBarItem.backgroundColor = undefined;
        } else {
            statusBarItem.text = "$(save) Quick Save (Off)";
            statusBarItem.tooltip = "Quick Auto-Save: Disabled\nClick to enable";
            statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
        
        statusBarItem.show();
        
    } catch (error) {
        logger.error('Error updating status bar', error instanceof Error ? error : new Error(String(error)));
    }
}

function cleanup() {
    try {
        isDisposing = true;
        logger.info('Starting extension cleanup');
        
        // Clear all timeouts
        clearAllTimeouts('Extension deactivation');
        
        // Stop health monitoring
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = undefined;
        }
        
        // Dispose status bar
        if (statusBarItem) {
            statusBarItem.dispose();
        }
        
        // Dispose logger
        if (logger) {
            logger.dispose();
        }
        
        logger.info('Extension cleanup completed');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

export function deactivate() {
    cleanup();
}