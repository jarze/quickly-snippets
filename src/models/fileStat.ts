import * as vscode from 'vscode';
import * as fs from 'fs';

export class FileStat implements vscode.FileStat {
	private _content?: string;
	private fsStat: fs.Stats;
	constructor(public filePath: string) {
		this.fsStat = fs.statSync(filePath);
	}
	get content() {
		if (!this._content) {
			this._content = fs.readFileSync(this.filePath, 'utf-8');
		}
		return this._content;
	}

	get type(): vscode.FileType {
		return this.fsStat.isFile()
			? vscode.FileType.File
			: this.fsStat.isDirectory()
			? vscode.FileType.Directory
			: this.fsStat.isSymbolicLink()
			? vscode.FileType.SymbolicLink
			: vscode.FileType.Unknown;
	}

	get isFile(): boolean | undefined {
		return this.fsStat.isFile();
	}
	get uri(): vscode.Uri {
		return vscode.Uri.file(this.filePath);
	}

	get isDirectory(): boolean | undefined {
		return this.fsStat.isDirectory();
	}

	get isSymbolicLink(): boolean | undefined {
		return this.fsStat.isSymbolicLink();
	}

	get size(): number {
		return this.fsStat.size;
	}

	get ctime(): number {
		return this.fsStat.ctime.getTime();
	}

	get mtime(): number {
		return this.fsStat.mtime.getTime();
	}
}
