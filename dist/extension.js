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
  constructor(name, url) {
    super(name, vscode.TreeItemCollapsibleState.None);
    this.tooltip = url;
    this.description = url.length > 50 ? `${url.slice(0, 50)}...` : url;
    this.command = {
      command: "simpleBrowser.show",
      title: "Open in simple browser",
      arguments: [url]
    };
    this.iconPath = new vscode.ThemeIcon("bookmark");
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
    if (element) {
      return Promise.resolve([]);
    }
    return Promise.resolve(savedSites.map((site) => new SavedSiteItem(site.name, site.url)));
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
      if (!name) {
        return;
      }
      const url = await vscode.window.showInputBox({ prompt: "Enter the URL (e.g, https://example.com)" });
      if (!url) {
        return;
      }
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        vscode.window.showErrorMessage("Please enter a valid URL starting with http:// or https://");
        return;
      }
      savedSites.push({ name, url });
      await context.globalState.update(savedSitesKey, savedSites);
      savedSitesProvider.refresh();
      vscode.window.showInformationMessage(`Saved "${name}"`);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("larry.removeSavedSite", async () => {
      if (savedSites.length === 0) {
        vscode.window.showInformationMessage("No saved sites to remove");
        return;
      }
      const pick = await vscode.window.showQuickPick(
        savedSites.map((site) => site.name),
        { placeHolder: "Select a site to remove" }
      );
      if (!pick) {
        return;
      }
      savedSites = savedSites.filter((site) => site.name !== pick);
      await context.globalState.update(savedSitesKey, savedSites);
      savedSitesProvider.refresh();
      vscode.window.showInformationMessage(`Removed "${pick}"`);
    })
  );
  console.log('Congratulations, your extension "larry" is now active!');
  const disposable = vscode.commands.registerCommand("larry.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from Larry!");
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
