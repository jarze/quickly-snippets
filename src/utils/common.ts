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
}
