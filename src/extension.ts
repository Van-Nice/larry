/* eslint-disable curly */
import * as vscode from 'vscode';

interface Site {
  name: string;
  url: string;
}

interface Folder {
  name: string;
  children: SavedItem[];
  isFolder: true;
}

type SavedItem = Folder | Site;

class SavedSiteItem extends vscode.TreeItem {
  constructor(item: SavedItem) {
    super(item.name, 'children' in item ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    if ('url' in item) {
      this.tooltip = item.url;
      this.description = item.url.length > 50 ? `${item.url.slice(0, 50)}...` : item.url;
      this.command = {
        command: 'simpleBrowser.show',
        title: 'Open in Simple Browser',
        arguments: [item.url]
      };
      this.iconPath = new vscode.ThemeIcon('bookmark');
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

class SavedSitesProvider implements vscode.TreeDataProvider<SavedSiteItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SavedSiteItem | undefined> = new vscode.EventEmitter<SavedSiteItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SavedSiteItem | undefined> = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  getTreeItem(element: SavedSiteItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SavedSiteItem): Thenable<SavedSiteItem[]> {
    const savedSites: SavedItem[] = this.context.globalState.get('savedSites', []);
    if (!element) {
      // Root level: return top-level folders and sites
      return Promise.resolve(savedSites.map(item => new SavedSiteItem(item)));
    }
    // Child level: return children of a folder
    if ('children' in element) {
      const folder = element as Folder;
      return Promise.resolve(folder.children.map(item => new SavedSiteItem(item)));
    }
    return Promise.resolve([]);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const savedSitesKey = 'savedSites';
  let savedSites: SavedItem[] = context.globalState.get(savedSitesKey, []);

  const savedSitesProvider = new SavedSitesProvider(context);
  vscode.window.registerTreeDataProvider('savedSites', savedSitesProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('larry.saveSite', async () => {
      const name = await vscode.window.showInputBox({ prompt: 'Enter a name for the site' });
      if (!name) return;

      const url = await vscode.window.showInputBox({ prompt: 'Enter the URL (e.g., https://example.com)' });
      if (!url) return;

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        vscode.window.showErrorMessage('Please enter a valid URL starting with http:// or https://');
        return;
      }

      const folder = await vscode.window.showQuickPick(
        ['New Folder', ...savedSites.filter(item => 'isFolder' in item && item.isFolder).map(item => item.name)],
        { placeHolder: 'Save in a folder (or create new)' }
      );
      if (!folder) return;

      const newSite: Site = { name, url };
      if (folder === 'New Folder') {
        const folderName = await vscode.window.showInputBox({ prompt: 'Enter folder name' });
        if (!folderName) return;
        savedSites.push({ name: folderName, isFolder: true, children: [newSite] });
      } else {
        const targetFolder = savedSites.find((item): item is Folder => 'children' in item && item.name === folder);
        if (targetFolder) {
          targetFolder.children.push(newSite);
        } else {
          vscode.window.showErrorMessage('Selected folder not found.');
        }
      }

      await context.globalState.update(savedSitesKey, savedSites);
      savedSitesProvider.refresh();
      vscode.window.showInformationMessage(`Saved "${name}"`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('larry.removeSavedSite', async () => {
      let savedSites: SavedItem[] = context.globalState.get(savedSitesKey, []);
      if (savedSites.length === 0) {
        vscode.window.showInformationMessage('No saved sites to remove');
        return;
      }

      const allItems: string[] = [];
      savedSites.forEach(item => {
        if ('children' in item) {
          allItems.push(`Folder: ${item.name}`);
          item.children.forEach(child => allItems.push(`  ${child.name}`));
        } else {
          allItems.push(item.name);
        }
      });

      const pick = await vscode.window.showQuickPick(allItems, { placeHolder: 'Select a site or folder to remove' });
      if (!pick) return;

      if (pick.startsWith('Folder: ')) {
        const folderName = pick.replace('Folder: ', '');
        const updatedSites = savedSites.filter(item => {
          return ('children' in item && item.name !== folderName) || !('children' in item);
        });
      } else {
        const siteName = pick.trim();
        savedSites = savedSites.map(item => {
          if ('children' in item) {
            item.children = item.children.filter(child => child.name !== siteName);
          }
          return item;
        }).filter(item => ('children' in item && Array.isArray(item.children) && item.children.length > 0) || !('children' in item));
      }

      await context.globalState.update(savedSitesKey, savedSites);
      savedSitesProvider.refresh();
      vscode.window.showInformationMessage(`Removed "${pick}"`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('larry.helloWorld', () => {
      vscode.window.showInformationMessage('Hello World from Larry!');
    })
  );

  console.log('Congratulations, your extension "larry" is now active!');
}

export function deactivate() {}