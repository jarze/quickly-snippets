import * as vscode from 'vscode';
import { jsonc } from 'jsonc';
import { Environment } from './utils/environmentPath';
import Commons from './utils/common';

interface SnippetsProps {
	/** languageIds */
	scope?: string;
	title?: string;
	description?: string;
	prefix?: string[] | string;
	body?: string;
	key?: string;
}

export class SnippetsExplorer {
	private _environment: Environment;

	private custom_suffix: string = '.code-snippets';
	// private default_suffix: string = '.json';

	constructor(context: vscode.ExtensionContext) {
		this._environment = new Environment(context);

		// ------------------
		let disposableCompressFolder: vscode.Disposable =
			vscode.commands.registerCommand(
				'snippets.generateFile',
				this.generateFile.bind(this)
			);
		context.subscriptions.push(disposableCompressFolder);
	}

	async generateFile(file: vscode.Uri, targets?: Array<vscode.Uri>) {
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
					throw new Error('File type mismatch');
				}
				await Commons.openFile(target.fsPath);
			}
			const editor = vscode.window.activeTextEditor;
			const document = editor?.document;
			if (document) {
				// Get the word within the selection
				const word = document.getText(editor.selection);
				const params = {
					scope: document.languageId,
					body: word,
				};
				result = await this.saveDocumentWord(params);
			}

			if (result) {
				vscode.window.showInformationMessage(
					`generate successfully, try it in "${result.scope}" through "${
						Array.isArray(result?.prefix)
							? result?.prefix?.join?.(',')
							: result?.prefix
					}"`
				);
			}
			statusBarItem.hide();
		} catch (e: any) {
			statusBarItem.hide();
			if (e.message) {
				vscode.window.showErrorMessage(`generate filed, ${e.message}`);
			}
		}
	}

	async saveDocumentWord(
		params: SnippetsProps
	): Promise<SnippetsProps | null | undefined> {
		await vscode.commands.executeCommand('workbench.action.openSnippets');

		const snippetEditor = vscode.window.activeTextEditor;
		const snippetDocument = snippetEditor?.document;
		if (!snippetDocument) {
			return;
		}
		const filePath = snippetDocument.uri.fsPath;

		if (
			!(
				filePath?.startsWith?.(this._environment.FOLDER_SNIPPETS) ||
				filePath?.endsWith?.(this.custom_suffix)
			)
		) {
			return;
		}
		if (filePath.endsWith(this.custom_suffix)) {
			params.scope =
				(
					await vscode.window.showQuickPick(Commons.getLanguages(), {
						canPickMany: true,
						placeHolder: 'Select the snippet scope',
					})
				)
					?.map(i => i.label)
					?.join?.(',') || params.scope;
		} else {
			delete params.scope;
		}

		const key = await vscode.window.showInputBox({
			placeHolder: 'key',
			prompt: `The same key will be overwritten.`,
		});
		if (!key) {
			return;
		}

		params.prefix = (
			await vscode.window.showInputBox({
				placeHolder: 'prefix',
				prompt: '【 Use , to separate 】',
			})
		)
			?.replace?.(' ', '')
			?.split?.(',');

		if (!params.prefix) {
			throw new Error('prefix is empty');
		} else {
			params.prefix =
				params.prefix?.length > 1 ? params.prefix : params.prefix[0];
		}

		params.description = await vscode.window.showInputBox({
			placeHolder: 'The snippet description.',
		});

		const text = snippetDocument.getText();
		const current = jsonc.parse(text);
		current[key] = params;
		const t = jsonc.stringify(current, undefined, 2);

		await snippetEditor.edit(async editBuilder => {
			editBuilder.replace(
				new vscode.Range(
					snippetDocument.lineAt(0).range.start,
					snippetDocument.lineAt(snippetDocument.lineCount - 1).range.end
				),
				t
			);
			await snippetDocument.save();
		});

		await vscode.commands.executeCommand('workbench.action.files.save');
		return params;
	}
}
