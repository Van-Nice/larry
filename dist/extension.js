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
var SavedSiteItem = class extends vscode.TreeItem {
  constructor(item) {
    super(item.name, "children" in item ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    if ("url" in item) {
      this.tooltip = item.url;
      this.description = item.url.length > 50 ? `${item.url.slice(0, 50)}...` : item.url;
      this.command = {
        command: "simpleBrowser.show",
        title: "Open in Simple Browser",
        arguments: [item.url]
      };
      this.iconPath = new vscode.ThemeIcon("bookmark");
    } else {
      this.iconPath = new vscode.ThemeIcon("folder");
    }
  }
};
var SavedSitesProvider = class {
  constructor(context) {
    this.context = context;
  }
  _onDidChangeTreeData = new vscode.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    const savedSites = this.context.globalState.get("savedSites", []);
    if (!element) {
      return Promise.resolve(savedSites.map((item) => new SavedSiteItem(item)));
    }
    if ("children" in element) {
      const folder = element;
      return Promise.resolve(folder.children.map((item) => new SavedSiteItem(item)));
    }
    return Promise.resolve([]);
  }
  refresh() {
    this._onDidChangeTreeData.fire(void 0);
  }
};
function activate(context) {
  const savedSitesKey = "savedSites";
  let savedSites = context.globalState.get(savedSitesKey, []);
  const savedSitesProvider = new SavedSitesProvider(context);
  vscode.window.registerTreeDataProvider("savedSites", savedSitesProvider);
  context.subscriptions.push(
    vscode.commands.registerCommand("larry.saveSite", async () => {
      const name = await vscode.window.showInputBox({ prompt: "Enter a name for the site" });
      if (!name) return;
      const url = await vscode.window.showInputBox({ prompt: "Enter the URL (e.g., https://example.com)" });
      if (!url) return;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        vscode.window.showErrorMessage("Please enter a valid URL starting with http:// or https://");
        return;
      }
      const folder = await vscode.window.showQuickPick(
        ["New Folder", ...savedSites.filter((item) => "isFolder" in item && item.isFolder).map((item) => item.name)],
        { placeHolder: "Save in a folder (or create new)" }
      );
      if (!folder) return;
      const newSite = { name, url };
      if (folder === "New Folder") {
        const folderName = await vscode.window.showInputBox({ prompt: "Enter folder name" });
        if (!folderName) return;
        savedSites.push({ name: folderName, isFolder: true, children: [newSite] });
      } else {
        const targetFolder = savedSites.find((item) => "children" in item && item.name === folder);
        if (targetFolder) {
          targetFolder.children.push(newSite);
        } else {
          vscode.window.showErrorMessage("Selected folder not found.");
        }
      }
      await context.globalState.update(savedSitesKey, savedSites);
      savedSitesProvider.refresh();
      vscode.window.showInformationMessage(`Saved "${name}"`);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("larry.removeSavedSite", async () => {
      let savedSites2 = context.globalState.get(savedSitesKey, []);
      if (savedSites2.length === 0) {
        vscode.window.showInformationMessage("No saved sites to remove");
        return;
      }
      const allItems = [];
      savedSites2.forEach((item) => {
        if ("children" in item) {
          allItems.push(`Folder: ${item.name}`);
          item.children.forEach((child) => allItems.push(`  ${child.name}`));
        } else {
          allItems.push(item.name);
        }
      });
      const pick = await vscode.window.showQuickPick(allItems, { placeHolder: "Select a site or folder to remove" });
      if (!pick) return;
      if (pick.startsWith("Folder: ")) {
        const folderName = pick.replace("Folder: ", "");
        const updatedSites = savedSites2.filter((item) => {
          return "children" in item && item.name !== folderName || !("children" in item);
        });
      } else {
        const siteName = pick.trim();
        savedSites2 = savedSites2.map((item) => {
          if ("children" in item) {
            item.children = item.children.filter((child) => child.name !== siteName);
          }
          return item;
        }).filter((item) => "children" in item && Array.isArray(item.children) && item.children.length > 0 || !("children" in item));
      }
      await context.globalState.update(savedSitesKey, savedSites2);
      savedSitesProvider.refresh();
      vscode.window.showInformationMessage(`Removed "${pick}"`);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("larry.helloWorld", () => {
      vscode.window.showInformationMessage("Hello World from Larry!");
    })
  );
  console.log('Congratulations, your extension "larry" is now active!');
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
