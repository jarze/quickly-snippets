import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Environment } from './utils/environmentPath';
import { FileStat } from './models/fileStat';
// import * as mkdirp from 'mkdirp';
// import * as rimraf from 'rimraf';

// class SnippetsItem extends vscode.TreeItem {
// 	constructor(public readonly label: string) {
// 		super(label);
// 	}
// 	get icon() {
// 		return;
// 	}
// }

interface Entry {
	uri: vscode.Uri;
	type: vscode.FileType;
}

export class FileSystemProvider implements vscode.TreeDataProvider<Entry> {
	private _path?: string;
	constructor(path?: string) {
		this._path = path;
	}

	private pathExists(p?: string): boolean {
		if (!p) {
			return false;
		}
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}
		return true;
	}
	// tree data provider

	refresh(): void {
		//TODO: 刷新列表
		// this._onDidChangeTreeData.fire();
	}
	private readDirectory(uri?: vscode.Uri): [string, vscode.FileType][] {
		const p = uri?.fsPath || this._path;
		if (!this.pathExists(p)) {
			return [];
		}
		// const c = await fs.readdir(p)
		return fs.readdirSync(p!).map(f => {
			const filePath = path.join(p!, f);
			const stat = new FileStat(fs.statSync(filePath));
			return [filePath, stat.type];
		});
	}

	async getChildren(element?: Entry): Promise<Entry[]> {
		if (element) {
			const children = this.readDirectory(element.uri);
			return children?.map?.(([filePath, type]) => ({
				uri: vscode.Uri.file(filePath),
				type,
			}));
		}

		const children = this.readDirectory();
		return (
			children?.map?.(([filePath, type]) => ({
				uri: vscode.Uri.file(filePath),
				type,
			})) || []
		);
	}

	getTreeItem(element: Entry): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(
			element.uri,
			element.type === vscode.FileType.Directory
				? vscode.TreeItemCollapsibleState.Collapsed
				: vscode.TreeItemCollapsibleState.None
		);
		if (element.type === vscode.FileType.File) {
			treeItem.command = {
				command: 'fileExplorer.openFile',
				title: 'Open File',
				arguments: [element.uri],
			};
			treeItem.contextValue = 'file';
		}
		return treeItem;
	}
}

export class SnippetsExplorer {
	constructor(context: vscode.ExtensionContext) {
		const environment = new Environment(context);

		const treeDataProvider = new FileSystemProvider(
			environment.FOLDER_SNIPPETS
		);
		context.subscriptions.push(
			vscode.window.createTreeView('snippets.explorer', { treeDataProvider })
		);
		vscode.commands.registerCommand('snippets.refreshEntry', () =>
			treeDataProvider.refresh()
		);
		vscode.commands.registerCommand('fileExplorer.openFile', resource =>
			this.openResource(resource)
		);

		const compressImage = (file: vscode.Uri) => {
			console.log(file, '=====');
		};

		let disposableCompressFolder: vscode.Disposable =
			vscode.commands.registerCommand(
				'extension.compressFolder',
				function (folder: vscode.Uri) {
					vscode.workspace
						.findFiles(
							new vscode.RelativePattern(folder.path, `**/*.{png,jpg,jpeg}`)
						)
						.then((files: any) => files.forEach(compressImage));
				}
			);
	}

	private openResource(resource: vscode.Uri): void {
		vscode.window.showTextDocument(resource);
	}
}
