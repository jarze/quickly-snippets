'use strict';

import { normalize, resolve } from 'path';
import * as vscode from 'vscode';

export class Environment {
	public static CURRENT_VERSION: number = 343;
	public static getVersion(): string {
		return (
			Environment.CURRENT_VERSION.toString().slice(0, 1) +
			'.' +
			Environment.CURRENT_VERSION.toString().slice(1, 2) +
			'.' +
			Environment.CURRENT_VERSION.toString().slice(2, 3)
		);
	}

	// public isInsiders: boolean = false;
	// public isOss: boolean = false;
	// public isCoderCom: boolean = false;
	// public homeDir?: string;

	public isPortable: boolean = false;
	public USER_FOLDER?: string;

	public EXTENSION_FOLDER?: string;
	public PATH?: string;
	public OsType?: string;

	public FILE_SETTING?: string;
	public FILE_LAUNCH?: string;
	public FILE_KEYBINDING?: string;
	public FILE_LOCALE?: string;
	public FILE_EXTENSION?: string;
	public FILE_CLOUDSETTINGS?: string;
	public FILE_SYNC_LOCK?: string;

	public FILE_CUSTOMIZEDSETTINGS_NAME: string = 'syncLocalSettings.json';
	public FILE_CUSTOMIZEDSETTINGS?: string;

	public FILE_SETTING_NAME: string = 'settings.json';
	public FILE_LAUNCH_NAME: string = 'launch.json';
	public FILE_EXTENSION_NAME: string = 'extensions.json';
	public FILE_SYNC_LOCK_NAME: string = 'sync.lock';

	public FILE_CLOUDSETTINGS_NAME: string = 'cloudSettings';

	public FOLDER_SNIPPETS: string;

	constructor(context: vscode.ExtensionContext) {
		context.globalState.update('_', undefined); // Make sure the global state folder exists. This is needed for using this.context.globalStoragePath to access user folder

		this.isPortable = !!process.env.VSCODE_PORTABLE;

		this.OsType = process.platform;
		if (!this.isPortable) {
			this.PATH = resolve(context.globalStorageUri.path, '../../..').concat(
				normalize('/')
			);
			this.USER_FOLDER = resolve(this.PATH, 'User').concat(normalize('/'));
			this.EXTENSION_FOLDER = resolve(
				vscode.extensions.all.filter(
					extension => !extension.packageJSON.isBuiltin
				)[0].extensionPath,
				'..'
			).concat(normalize('/')); // Gets first non-builtin extension's path
		} else {
			this.PATH = process.env.VSCODE_PORTABLE;
			this.USER_FOLDER = resolve(this.PATH!, 'user-data/User').concat(
				normalize('/')
			);
			this.EXTENSION_FOLDER = resolve(this.PATH!, 'extensions').concat(
				normalize('/')
			);
		}

		this.FILE_EXTENSION = this.USER_FOLDER.concat(this.FILE_EXTENSION_NAME);
		this.FILE_SETTING = this.USER_FOLDER.concat(this.FILE_SETTING_NAME);
		this.FILE_LAUNCH = this.USER_FOLDER.concat(this.FILE_LAUNCH_NAME);
		this.FOLDER_SNIPPETS = this.USER_FOLDER.concat('snippets/');
		this.FILE_CLOUDSETTINGS = this.USER_FOLDER.concat(
			this.FILE_CLOUDSETTINGS_NAME
		);
		this.FILE_CUSTOMIZEDSETTINGS = this.USER_FOLDER.concat(
			this.FILE_CUSTOMIZEDSETTINGS_NAME
		);
		this.FILE_SYNC_LOCK = this.USER_FOLDER.concat(this.FILE_SYNC_LOCK_NAME);
	}
}
