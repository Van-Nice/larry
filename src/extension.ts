// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Tree item class for saved sites
class SavedSiteItem extends vscode.TreeItem {
	constructor(name: string, url: string) {
		super(name, vscode.TreeItemCollapsibleState.None);
		this.tooltip = url;
		this.description = url.length > 50 ? `${url.slice(0, 50)}...` : url;
		this.command = {
			command: 'simpleBrowser.show',
			title: 'Open in simple browser',
			arguments: [url]
		};
		this.iconPath = new vscode.ThemeIcon('bookmark'); // Built-in bookmark icon
	}
}

// Tree data provider for the saved sites view
class SavedSitesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

	constructor(private context: vscode.ExtensionContext) {}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    const savedSites: { name: string; url: string }[] = this.context.globalState.get('savedSites', []);
    if (element) {
      return Promise.resolve([]); // No children for items
    }
    return Promise.resolve(savedSites.map(site => new SavedSiteItem(site.name, site.url)));
  }

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Initialize saved sites from global state
	const savedSitesKey = 'savedSites';
	let savedSites: { name: string; url: string}[] = context.globalState.get(savedSitesKey, []);

	// Register the tree data provider for the Saved Sites view
	const savedSitesProvider:SavedSitesProvider = new SavedSitesProvider(context);
	vscode.window.registerTreeDataProvider('savedSites', savedSitesProvider);

	// Command to save a site
	context.subscriptions.push(
		vscode.commands.registerCommand('larry.saveSite', async () => {
			const name = await vscode.window.showInputBox({ prompt: 'Enter a name for the site' });
			if (!name) { return; }

			const url = await vscode.window.showInputBox({ prompt: 'Enter the URL (e.g, https://example.com)' });
			if (!url) { return; }

			// Basic URL validation
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        vscode.window.showErrorMessage('Please enter a valid URL starting with http:// or https://');
        return;
      }

			savedSites.push({ name, url });
			await context.globalState.update(savedSitesKey, savedSites);
			savedSitesProvider.refresh();
			vscode.window.showInformationMessage(`Saved "${name}"`);
		})
	);

	// Command to remove a saved site
	context.subscriptions.push(
		vscode.commands.registerCommand('larry.removeSavedSite', async () => {
			if (savedSites.length === 0) {
				vscode.window.showInformationMessage('No saved sites to remove');
				return;
			}

			const pick = await vscode.window.showQuickPick(
				savedSites.map(site => site.name),
				{ placeHolder: 'Select a site to remove' }
			);
			if (!pick) { return; }

			savedSites = savedSites.filter(site => site.name !== pick);
			await context.globalState.update(savedSitesKey, savedSites);
			savedSitesProvider.refresh();
			vscode.window.showInformationMessage(`Removed "${pick}"`);
		})
	);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "larry" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('larry.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Larry!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
