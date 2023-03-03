'use strict';
import * as vscode from 'vscode';
// import { Environment } from './environmentPath';

export default class Commons {
	public key: string = 'snippets';
	public config: vscode.WorkspaceConfiguration =
		vscode.workspace.getConfiguration(this.key);

	public GetSettings(key: string) {
		return this.config.get(key);
	}

	static languageMap: Record<string, string>;

	static getLanguageMap(): Record<string, string> {
		if (!Commons.languageMap) {
			Commons.languageMap = vscode.extensions.all
				.flatMap(i =>
					i.packageJSON?.contributes?.languages?.map?.((j: any) => ({
						[j.id]: j.aliases?.[0],
					}))
				)
				.filter(k => {
					return !!k && !!Object.values(k)?.[0];
				})
				.reduce((p, i) => Object.assign(p, i), {});
		}
		return Commons.languageMap;
	}
	static getLanguageName(languageId: string): string {
		return Commons.getLanguageMap()[languageId] || languageId;
	}

	static async getLanguages(): Promise<
		Array<{ label: string; description: string }>
	> {
		return vscode.languages.getLanguages().then(items =>
			items.map(label => ({
				label,
				description: ` (${Commons.getLanguageName(label)}) `,
			}))
		);
	}
	public getExtensionById(id: string, ignoreCase = true) {
		if (id != null) {
			if (ignoreCase) {
				const targetId = id.toLocaleLowerCase();
				return vscode.extensions.all.find(
					ext => ext.id.toLocaleLowerCase() === targetId
				);
			}
			return vscode.extensions.getExtension(id);
		}
		return;
	}
	public getVSCodeLocale(): string | undefined {
		try {
			return JSON.parse(process.env.VSCODE_NLS_CONFIG ?? '{}').locale;
		} catch {
			return;
		}
	}
	static openFile(filepath: string) {
		return vscode.commands.executeCommand(
			'vscode.open',
			vscode.Uri.file(filepath)
		);
	}
	public reloadWindow() {
		return vscode.commands.executeCommand('workbench.action.reloadWindow');
	}
}
