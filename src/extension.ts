/* eslint-disable curly */
import * as vscode from "vscode";
import * as path from "path";

interface Site {
  name: string;
  url: string;
  id: string;
}

interface Folder {
  name: string;
  children: SavedItem[];
  isFolder: true;
  id: string;
}

type SavedItem = Folder | Site;

let savedSites: SavedItem[] = [];
const savedSitesKey = "larry.savedSites";
let extensionContext: vscode.ExtensionContext;
let savedSitesProvider: SavedSitesProvider;

// Track active webview panels - REMOVED
// const webviewPanels = new Map<string, vscode.WebviewPanel>();

class SavedSiteItem extends vscode.TreeItem {
  constructor(public readonly item: SavedItem) {
    super(
      item.name,
      isFolder(item)
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.id = item.id;
    this.contextValue = isFolder(item) ? "folder" : "site";

    if (isFolder(item)) {
      this.iconPath = new vscode.ThemeIcon("folder");
    } else {
      // Remove default icon but keep command for sites
      // this.iconPath = new vscode.ThemeIcon("globe");
      this.command = {
        command: "larry.openSite",
        title: "Open Site",
        arguments: [item],
      };
      this.tooltip = item.url; // Keep the tooltip
    }
  }
}

class SavedSitesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: vscode.TreeItem
  ): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!element) return savedSites.map((item) => new SavedSiteItem(item));
    if (element instanceof SavedSiteItem && isFolder(element.item)) {
      return element.item.children.map((item) => new SavedSiteItem(item));
    }
    return [];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

class SavedSitesDragAndDropController
  implements vscode.TreeDragAndDropController<vscode.TreeItem>
{
  readonly dropMimeTypes = ["application/vnd.larry.saved-item"];
  readonly dragMimeTypes = ["application/vnd.larry.saved-item"];
  private readonly mimeType = "application/vnd.larry.saved-item";

  handleDrag(
    source: readonly vscode.TreeItem[],
    treeDataTransfer: vscode.DataTransfer
  ): void {
    const draggedItem = source[0];
    if (draggedItem instanceof SavedSiteItem) {
      treeDataTransfer.set(
        this.mimeType,
        new vscode.DataTransferItem(draggedItem.item.id)
      );
    }
  }

  async handleDrop(
    target: vscode.TreeItem | undefined,
    treeDataTransfer: vscode.DataTransfer
  ): Promise<void> {
    const draggedId = treeDataTransfer.get(this.mimeType)?.value as string;
    if (!draggedId) return;

    const draggedItem = findItemById(savedSites, draggedId);
    if (!draggedItem) return;

    if (
      isFolder(draggedItem) &&
      target instanceof SavedSiteItem &&
      isFolder(target.item) &&
      isDescendant(draggedItem, target.item.id)
    ) {
      vscode.window.showErrorMessage(
        "Cannot drop a folder into itself or its subfolders."
      );
      return;
    }

    removeItemFromStructure(savedSites, draggedId);

    if (target instanceof SavedSiteItem && isFolder(target.item)) {
      target.item.children.push(draggedItem);
    } else {
      savedSites.push(draggedItem);
    }

    await extensionContext.globalState.update(savedSitesKey, savedSites);
    savedSitesProvider.refresh();
  }
}

function findItemById(items: SavedItem[], id: string): SavedItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (isFolder(item)) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function isFolder(item: SavedItem): item is Folder {
  return "children" in item && item.isFolder === true;
}

function removeItemFromStructure(items: SavedItem[], id: string): boolean {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      items.splice(i, 1);
      return true;
    }
    if (isFolder(items[i])) {
      const folder = items[i] as Folder;
      if (removeItemFromStructure(folder.children, id)) {
        return true;
      }
    }
  }
  return false;
}

function isDescendant(parent: Folder, targetId: string): boolean {
  if (parent.id === targetId) return true;
  for (const child of parent.children) {
    if (isFolder(child) && isDescendant(child, targetId)) return true;
  }
  return false;
}

function addItemToFolder(folder: SavedItem, item: SavedItem): void {
  if (isFolder(folder)) {
    folder.children.push(item);
  }
}

export function activate(context: vscode.ExtensionContext) {
  extensionContext = context;
  savedSites = context.globalState.get(savedSitesKey, []);

  savedSitesProvider = new SavedSitesProvider();
  const treeView = vscode.window.createTreeView("savedSites", {
    treeDataProvider: savedSitesProvider,
    dragAndDropController: new SavedSitesDragAndDropController(),
    canSelectMany: false,
  });

  // Register open site command
  context.subscriptions.push(
    vscode.commands.registerCommand("larry.openSite", (site: Site) => {
      // Add diagnostic message
      vscode.window.showInformationMessage(
        `Triggered larry.openSite for: ${site.name} (${site.url})`
      );
      // It directly calls the Simple Browser command with the site's URL
      vscode.commands.executeCommand("simpleBrowser.show", site.url).then(
        () => {
          // Log success (optional)
          console.log(`Simple Browser successfully called for ${site.url}`);
        },
        (error) => {
          // Log and show error message if the command fails
          console.error(
            `Error executing simpleBrowser.show for ${site.url}:`,
            error
          );
          vscode.window.showErrorMessage(
            `Failed to open Simple Browser: ${error.message || error}`
          );
        }
      );
    })
  );

  // Register open in browser command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.openInBrowser",
      (item: SavedSiteItem) => {
        if (!isFolder(item.item)) {
          openInBrowser(item.item.url);
        }
      }
    )
  );

  // Register rename command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.rename",
      async (item: SavedSiteItem) => {
        const newName = await vscode.window.showInputBox({
          prompt: "Enter new name",
          value: item.item.name,
        });

        if (newName && item.id) {
          const targetItem = findItemById(savedSites, item.id);
          if (targetItem) {
            targetItem.name = newName;
            context.globalState.update(savedSitesKey, savedSites);
            savedSitesProvider.refresh();
          }
        }
      }
    )
  );

  // Register remove command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.removeSavedSite",
      async (item: SavedSiteItem) => {
        if (item.id && removeItemFromStructure(savedSites, item.id)) {
          context.globalState.update(savedSitesKey, savedSites);
          savedSitesProvider.refresh();
        }
      }
    )
  );

  // Register add site command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.addSite",
      async (folder?: SavedSiteItem) => {
        const name = await vscode.window.showInputBox({
          prompt: "Enter site name",
        });
        const url = await vscode.window.showInputBox({
          prompt: "Enter site URL",
        });

        if (name && url) {
          const newSite: Site = { name, url, id: Date.now().toString() };

          if (folder && isFolder(folder.item)) {
            addItemToFolder(folder.item, newSite);
          } else {
            savedSites.push(newSite);
          }

          context.globalState.update(savedSitesKey, savedSites);
          savedSitesProvider.refresh();
        }
      }
    )
  );

  // Register add folder command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.addFolder",
      async (parentFolder?: SavedSiteItem) => {
        const nameInput = await vscode.window.showInputBox({
          prompt: "Enter folder name",
        });

        if (nameInput) {
          const name = nameInput; // Ensures name is definitely string, not undefined
          const newFolder: Folder = {
            name,
            children: [],
            isFolder: true,
            id: Date.now().toString(),
          };

          if (parentFolder && isFolder(parentFolder.item)) {
            addItemToFolder(parentFolder.item, newFolder);
          } else {
            savedSites.push(newFolder);
          }

          context.globalState.update(savedSitesKey, savedSites);
          savedSitesProvider.refresh();
        }
      }
    )
  );
}

export function deactivate() {}

// Helper function to open a URL in the default browser
function openInBrowser(url: string): void {
  vscode.env
    .openExternal(vscode.Uri.parse(url))
    .then((success) => {
      if (!success) {
        vscode.window.showErrorMessage(`Failed to open ${url} in browser`);
      }
    })
    .then(undefined, (error: Error) => {
      vscode.window.showErrorMessage(`Error opening URL: ${error.message}`);
    });
}
