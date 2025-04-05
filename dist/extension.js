"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var savedSites = [];
var savedSitesKey = "larry.savedSites";
var extensionContext;
var savedSitesProvider;
var webviewPanels = /* @__PURE__ */ new Map();
var SavedSiteItem = class extends vscode.TreeItem {
  constructor(item) {
    super(
      item.name,
      isFolder(item) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );
    this.item = item;
    this.id = item.id;
    this.contextValue = isFolder(item) ? "folder" : "site";
    if (isFolder(item)) {
      this.iconPath = new vscode.ThemeIcon("folder");
    } else {
      this.iconPath = new vscode.ThemeIcon("globe");
      this.command = {
        command: "larry.openSite",
        title: "Open Site",
        arguments: [item]
      };
      this.tooltip = item.url;
    }
  }
};
var SavedSitesProvider = class {
  _onDidChangeTreeData = new vscode.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    if (!element) return savedSites.map((item) => new SavedSiteItem(item));
    if (element instanceof SavedSiteItem && isFolder(element.item)) {
      return element.item.children.map((item) => new SavedSiteItem(item));
    }
    return [];
  }
  refresh() {
    this._onDidChangeTreeData.fire(void 0);
  }
};
var SavedSitesDragAndDropController = class {
  dropMimeTypes = ["application/vnd.larry.saved-item"];
  dragMimeTypes = ["application/vnd.larry.saved-item"];
  mimeType = "application/vnd.larry.saved-item";
  handleDrag(source, treeDataTransfer) {
    const draggedItem = source[0];
    if (draggedItem instanceof SavedSiteItem) {
      treeDataTransfer.set(
        this.mimeType,
        new vscode.DataTransferItem(draggedItem.item.id)
      );
    }
  }
  async handleDrop(target, treeDataTransfer) {
    const draggedId = treeDataTransfer.get(this.mimeType)?.value;
    if (!draggedId) return;
    const draggedItem = findItemById(savedSites, draggedId);
    if (!draggedItem) return;
    if (isFolder(draggedItem) && target instanceof SavedSiteItem && isFolder(target.item) && isDescendant(draggedItem, target.item.id)) {
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
};
function findItemById(items, id) {
  for (const item of items) {
    if (item.id === id) return item;
    if (isFolder(item)) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return void 0;
}
function isFolder(item) {
  return "children" in item && item.isFolder === true;
}
function removeItemFromStructure(items, id) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      items.splice(i, 1);
      return true;
    }
    if (isFolder(items[i])) {
      const folder = items[i];
      if (removeItemFromStructure(folder.children, id)) {
        return true;
      }
    }
  }
  return false;
}
function isDescendant(parent, targetId) {
  if (parent.id === targetId) return true;
  for (const child of parent.children) {
    if (isFolder(child) && isDescendant(child, targetId)) return true;
  }
  return false;
}
function addItemToFolder(folder, item) {
  if (isFolder(folder)) {
    folder.children.push(item);
  }
}
function activate(context) {
  extensionContext = context;
  savedSites = context.globalState.get(savedSitesKey, []);
  savedSitesProvider = new SavedSitesProvider();
  const treeView = vscode.window.createTreeView("savedSites", {
    treeDataProvider: savedSitesProvider,
    dragAndDropController: new SavedSitesDragAndDropController(),
    canSelectMany: false
  });
  context.subscriptions.push(
    vscode.commands.registerCommand("larry.openSite", (site) => {
      const existingPanel = webviewPanels.get(site.id);
      if (existingPanel) {
        existingPanel.reveal();
        return;
      }
      const panel = vscode.window.createWebviewPanel(
        "larrySiteViewer",
        site.name,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          enableFindWidget: true
        }
      );
      webviewPanels.set(site.id, panel);
      const iconPath = path.join(
        extensionContext.extensionPath,
        "icons",
        "larry.svg"
      );
      panel.iconPath = vscode.Uri.file(iconPath);
      panel.onDidDispose(() => {
        webviewPanels.delete(site.id);
      });
      panel.webview.html = getWebviewContent(site.url, site.name);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.rename",
      async (item) => {
        const newName = await vscode.window.showInputBox({
          prompt: "Enter new name",
          value: item.item.name
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
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.removeSavedSite",
      async (item) => {
        if (item.id && removeItemFromStructure(savedSites, item.id)) {
          context.globalState.update(savedSitesKey, savedSites);
          savedSitesProvider.refresh();
        }
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.addSite",
      async (folder) => {
        const name = await vscode.window.showInputBox({
          prompt: "Enter site name"
        });
        const url = await vscode.window.showInputBox({
          prompt: "Enter site URL"
        });
        if (name && url) {
          const newSite = { name, url, id: Date.now().toString() };
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
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry.addFolder",
      async (parentFolder) => {
        const nameInput = await vscode.window.showInputBox({
          prompt: "Enter folder name"
        });
        if (nameInput) {
          const name = nameInput;
          const newFolder = {
            name,
            children: [],
            isFolder: true,
            id: Date.now().toString()
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
function deactivate() {
}
function getWebviewContent(url, title) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
        }
        iframe {
          width: 100%;
          height: 100vh;
          border: none;
        }
      </style>
    </head>
    <body>
      <iframe src="${url}" sandbox="allow-scripts allow-same-origin allow-forms" allow="autoplay; encrypted-media; fullscreen"></iframe>
    </body>
    </html>
  `;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
