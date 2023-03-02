import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Environment } from './utils/environmentPath';
import { FileStat } from './models/fileStat';
import { Snippets } from './models/snippets';
import { _ } from './utils/file';
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

export class SnippetsProvider
	implements vscode.TreeDataProvider<FileStat>, vscode.FileSystemProvider
{
	static snippetPlaceHolder: string = `{
		// Example:
		// "Print to console": {
		// 	"prefix": "log",
		// 	"body": [
		// 		"console.log('$1');",
		// 		"$2"
		// 	],
		// 	"description": "Log output to console"
		// }
	}`;

	private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]> =
		new vscode.EventEmitter();
	readonly onDidChangeFile = this._onDidChangeFile.event;

	private _onDidChangeTreeData: vscode.EventEmitter<any> =
		new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(public rootUri: vscode.Uri) {
		this.watch(this.rootUri);
	}

	watch(
		uri: vscode.Uri,
		options?: {
			readonly recursive: boolean;
			readonly excludes: readonly string[];
		}
	): vscode.Disposable {
		const watcher = fs.watch(
			uri.fsPath,
			{ recursive: options?.recursive || true },
			async (event: string, filename: string | Buffer) => {
				const filepath = path.join(
					uri.fsPath,
					_.normalizeNFC(filename.toString())
				);
				this._onDidChangeTreeData.fire(null);
				this._onDidChangeFile.fire([
					{
						type:
							event === 'change'
								? vscode.FileChangeType.Changed
								: (await _.exists(filepath))
								? vscode.FileChangeType.Created
								: vscode.FileChangeType.Deleted,
						uri: uri.with({ path: filepath }),
					} as vscode.FileChangeEvent,
				]);
			}
		);

		return { dispose: () => watcher.close() };
	}

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		return new FileStat(uri.fsPath);
	}
	readDirectory(
		uri: vscode.Uri
	): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return this.readPath(uri).map(f => [f.filePath, f.type]);
	}
	writeFile(
		uri: vscode.Uri,
		content: Uint8Array | string,
		options?: { create: boolean; overwrite: boolean }
	): void | Thenable<void> {
		return this._writeFile(uri, content, options);
	}

	async _writeFile(
		uri: vscode.Uri,
		content: Uint8Array | string,
		options?: { overwrite: boolean }
	): Promise<void> {
		const exists = await _.exists(uri.fsPath);
		if (exists) {
			if (!options?.overwrite) {
				throw vscode.FileSystemError.FileExists();
			}
		}
		return _.writefile(uri.fsPath, content as Buffer);
	}
	delete(
		uri: vscode.Uri,
		options?: { readonly recursive: boolean }
	): void | Thenable<void> {
		if (options?.recursive) {
			return _.rmrf(uri.fsPath);
		}
		return _.unlink(uri.fsPath);
	}
	rename(
		oldUri: vscode.Uri,
		newUri: vscode.Uri,
		options: { readonly overwrite: boolean }
	): void | Thenable<void> {
		throw new Error('Method not implemented.');
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

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined as any);
	}

	createDirectory(uri?: vscode.Uri): void | Thenable<void> {
		return _.mkdir(uri?.fsPath || this.rootUri.fsPath).then(this.refresh);
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		return _.readfile(uri.fsPath);
	}

	private readPath(uri?: vscode.Uri): FileStat[] {
		const p = uri?.fsPath || this.rootUri.fsPath;
		if (!this.pathExists(p)) {
			return [];
		}
		return fs.readdirSync(p!).map(f => {
			const filePath = path.join(p!, f);
			return this.stat(vscode.Uri.file(filePath)) as FileStat;
		});
	}

	async getChildren(element?: FileStat): Promise<FileStat[]> {
		if (element) {
			return this.readPath(element.uri);
		}
		const children = this.readPath();
		return children || [];
	}

	getTreeItem(element: FileStat): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(
			element.uri,
			element.type === vscode.FileType.Directory
				? vscode.TreeItemCollapsibleState.Collapsed
				: vscode.TreeItemCollapsibleState.None
		);
		if (element.type === vscode.FileType.File) {
			treeItem.command = {
				command: 'snippets.openFile',
				title: 'Open File',
				arguments: [element.uri],
			};
			treeItem.contextValue = 'snippets';
		} else if (element.type === vscode.FileType.Directory) {
			treeItem.contextValue = 'snippetsDir';
		}
		return treeItem;
	}
}

export class SnippetsExplorer {
	private _environment: Environment;
	private _treeDataProvider: SnippetsProvider;
	private _snippets: Snippets;
	constructor(context: vscode.ExtensionContext) {
		this._environment = new Environment(context);
		this._snippets = new Snippets(this._environment.FOLDER_SNIPPETS!);

		this._treeDataProvider = new SnippetsProvider(
			vscode.Uri.file(this._environment.FOLDER_SNIPPETS)
		);

		context.subscriptions.push(
			vscode.window.createTreeView('snippets.explorer', {
				treeDataProvider: this._treeDataProvider,
			})
		);
		vscode.commands.registerCommand('snippets.refreshEntry', () =>
			this._treeDataProvider.refresh()
		);
		vscode.commands.registerCommand('snippets.openFile', resource =>
			this.openResource(resource)
		);

		vscode.commands.registerCommand(
			'snippets.addFile',
			async (node?: FileStat) => {
				const key = await vscode.window.showInputBox({
					placeHolder: 'File Name',
				});
				if (key) {
					this._treeDataProvider.writeFile(
						vscode.Uri.joinPath(
							node?.uri || this._treeDataProvider.rootUri,
							`${key}.code-snippets`
						),
						SnippetsProvider.snippetPlaceHolder
					);
				}
			}
		);
		// vscode.commands.registerCommand(
		// 	'snippets.addFolder',
		// 	async (node?: FileStat) => {
		// 		const key = await vscode.window.showInputBox({
		// 			placeHolder: 'Folder Name',
		// 		});
		// 		if (key) {
		// 			this._treeDataProvider.createDirectory(
		// 				vscode.Uri.joinPath(
		// 					node?.uri || this._treeDataProvider.rootUri,
		// 					key
		// 				)
		// 			);
		// 		}
		// 	}
		// );

		vscode.commands.registerCommand(
			'snippets.deleteEntry',
			(node: FileStat) => {
				this._treeDataProvider.delete(node?.uri);
			}
		);

		//TODO: rename ===>
		vscode.commands.registerCommand('snippets.editEntry', node => {
			vscode.window.showInformationMessage(
				`Successfully called edit entry on ${JSON.stringify(node)}.`
			);
			vscode.commands.executeCommand('vscode.prepareRename', node);
		});

		// ------------------
		let disposableCompressFolder: vscode.Disposable =
			vscode.commands.registerCommand(
				'snippets.generateFile',
				this.generateFile.bind(this)
			);
		context.subscriptions.push(disposableCompressFolder);
	}

	private openResource(resource: vscode.Uri): void {
		vscode.window.showTextDocument(resource);
	}

	async generateFile(file: vscode.Uri, targets?: Array<vscode.Uri>) {
		// vscode.commands.executeCommand('workbench.action.openSnippets');
		// return;
		const statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left
		);
		statusBarItem.color = statusBarItem.text = `Generating snippet...`;
		statusBarItem.show();

		let result;
		try {
			const target = targets?.[0];
			if (target) {
				if (target?.scheme !== 'file') {
					throw new Error('文件类型不匹配');
				}
				//TODO: scope 识别
				const word = await (await _.readfile(target.fsPath)).toString('utf-8');
				result = await this._snippets.saveDocumentWord({ body: word });
			} else {
				const editor = vscode.window.activeTextEditor;
				const document = editor?.document;
				if (document) {
					const selection = editor.selection;
					// Get the word within the selection
					const word = document.getText(selection);
					const params = {
						scope: document.languageId,
						body: word,
					};
					result = await this._snippets.saveDocumentWord({ ...params });
				}
			}
			if (result) {
				vscode.window.showInformationMessage(
					`生成代码片段成功，可通过 ${result?.prefix?.join?.(',')} 在 ${
						result.scope
					} 中进行尝试`
				);
			}
			statusBarItem.hide();
		} catch (e: any) {
			statusBarItem.hide();
			if (e.message) {
				vscode.window.showErrorMessage(`生成代码片段失败：${e.message}`);
			}
		}
	}
}
