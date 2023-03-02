import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileStat } from './fileStat';

interface SnippetsProps {
	/** languageIds */
	scope?: string;
	title?: string;
	description?: string;
	prefix?: string[];
	body?: string;
	key?: string;
}

export class Snippets {
	private custom_suffix: string = '.code-snippets';
	private default_suffix: string = '.json';

	constructor(private _path: string) {
		// const file = fs.readFileSync(path, 'utf-8');
		// snippetCompletion.insertText = new vscode.SnippetString(file);
		// vscode.
	}

	get globalSnippets() {
		return fs
			.readdirSync(this._path)
			.map(f => {
				const filePath = path.join(this._path!, f);
				return new FileStat(filePath);
			})
			.filter(f => f.type === vscode.FileType.File);
	}

	async inputFileName() {
		const options = await vscode.languages.getLanguages();
		const items = [
			{ label: '新代码片段', kind: -1 },
			{ label: '新建代码片段文件', alwaysShow: true },
			...options.map(label => ({ label })),
		];
		const a = await vscode.window.showQuickPick(items, {
			placeHolder: '选择代码片段文件或创建代码片段',
		});

		let name = a?.label;
		if (name === items[0].label) {
			name = await vscode.window.showInputBox({
				placeHolder: '输入代码段文件名',
			});
			if (name) {
				name += this.custom_suffix;
			}
		} else if (name) {
			name += this.default_suffix;
		}
		if (!name) {
			throw new Error('fileName is empty');
		}
		return name;
	}

	async saveDocumentWord(
		params: SnippetsProps
	): Promise<SnippetsProps | null | undefined> {
		const openSnippets = await vscode.commands.executeCommand(
			'workbench.action.openSnippets'
		);

		const snippetDocument = vscode.window.activeTextEditor?.document;
		if (!snippetDocument) {
			return;
		}
		const filePath = snippetDocument.uri.fsPath;
		if (!filePath?.startsWith?.(this._path)) {
			return;
		}
		// 自定义代码片段
		if (filePath.endsWith(this.custom_suffix)) {
			params.scope =
				params.scope ||
				(
					await vscode.window.showQuickPick(vscode.languages.getLanguages(), {
						canPickMany: true,
						// TODO: 选项配置
						placeHolder: '选择代码片段范围',
					})
				)?.join?.(',');
		} else {
			delete params.scope;
		}

		const key = await vscode.window.showInputBox({
			placeHolder: 'key',
			prompt: `【相同 key 将会覆盖】`,
		});
		if (!key) {
			return;
		}


		const text = snippetDocument.getText()

		//TODO: json 文件里的注释问题
		const current = snippetDocument.getText()
			(exit && JSON.parse(fs.readFileSync(filePath, 'utf-8'))) || {};
		params.prefix = (
			await vscode.window.showInputBox({
				placeHolder: 'prefix',
				prompt: '可用 , 进行分割',
			})
		)
			?.replace?.(' ', '')
			?.split?.(',');

		if (!params.prefix) {
			throw new Error('prefix is empty');
		}

		params.description = await vscode.window.showInputBox({
			placeHolder: 'description',
		});

		current[key] = params;
		console.log(params, '11111111111111');
		const data = JSON.stringify(current, null, 2);
		fs.writeFileSync(filePath, data);

		//TODO: 打开文件
		// vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));

		return params;
	}

	async saveToSnippets(path?: string, name?: string, file?) {}

	async saveDocumentWord1(
		params: SnippetsProps
	): Promise<SnippetsProps | null | undefined> {
		// if()

		// const fileName = await this.inputFileName();
		// const filePath = this._path + fileName;

		const openSnippets = await vscode.commands.executeCommand(
			'workbench.action.openSnippets'
		);

		const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
		if (!filePath?.startsWith?.(this._path)) {
			return;
		}

		// 自定义代码片段
		if (filePath.endsWith(this.custom_suffix)) {
			params.scope =
				params.scope ||
				(
					await vscode.window.showQuickPick(vscode.languages.getLanguages(), {
						canPickMany: true,
						placeHolder: '选择代码片段范围',
					})
				)?.join?.(',');
		} else {
			delete params.scope;
		}

		// 写入

		const exit = fs.existsSync(filePath);
		//TODO: json 文件里的注释问题
		const current =
			(exit && JSON.parse(fs.readFileSync(filePath, 'utf-8'))) || {};

		const key = await vscode.window.showInputBox({
			placeHolder: 'key',
			prompt: exit
				? `当前已存在： ${Object.keys(current).join(
						'、'
				  )} （相同 key 将会覆盖）`
				: undefined,
		});
		if (!key) {
			return;
		}

		params.prefix = (
			await vscode.window.showInputBox({
				placeHolder: 'prefix',
				prompt: '可用 , 进行分割',
			})
		)
			?.replace?.(' ', '')
			?.split?.(',');

		if (!params.prefix) {
			throw new Error('prefix is empty');
		}

		params.description = await vscode.window.showInputBox({
			placeHolder: 'description',
		});

		current[key] = params;
		console.log(params, '11111111111111');
		const data = JSON.stringify(current, null, 2);
		fs.writeFileSync(filePath, data);

		//TODO: 打开文件
		vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));

		return params;
	}
}
