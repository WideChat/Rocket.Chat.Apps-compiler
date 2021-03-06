import * as path from 'path';
// import * as process from 'process';

import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import chalk from 'chalk';
import * as figures from 'figures';
import * as fs from 'fs-extra';
import * as tv4 from 'tv4';

import { appJsonSchema } from './appJsonSchema';

export class FolderDetails {
    public folder: string;

    public toZip: string;

    public infoFile: string;

    public mainFile: string;

    public info: IAppInfo;

    constructor(folder: string) {
        this.folder = folder;
        this.toZip = path.join(this.folder, '{,!(node_modules|test)/**/}*.*');
        this.infoFile = path.join(this.folder, 'app.json');
        this.mainFile = '';
        this.info = {} as IAppInfo;
    }

    public async doesFileExist(file: string): Promise<boolean> {
        return await fs.pathExists(file) && fs.statSync(file).isFile();
    }

    public mergeWithFolder(item: string): string {
        return path.join(this.folder, item);
    }

    public setAppInfo(appInfo: IAppInfo): void {
        this.info = appInfo;
    }

    /**
     * Validates the "app.json" file, loads it, and then retrieves the classFile property from it.
     * Throws an error when something isn't right.
     */
    public async readInfoFile(): Promise<void> {
        if (!await this.doesFileExist(this.infoFile)) {
            throw new Error('No App found to package. Missing an "app.json" file.');
        }

        try {
            this.info = JSON.parse(fs.readFileSync(this.infoFile, { encoding: 'utf-8' }));
        } catch (e) {
            throw new Error('The "app.json" file is invalid.');
        }

        // This errors out if it fails
        this.validateAppManifest();

        if (!this.info.classFile) {
            throw new Error('Invalid "app.json" file. The "classFile" is required.');
        }

        this.mainFile = path.join(this.folder, this.info.classFile);

        if (!await this.doesFileExist(this.mainFile)) {
            throw new Error(`The specified classFile (${ this.mainFile }) does not exist.`);
        }
    }

    private validateAppManifest(): void {
        const result = tv4.validateMultiple(this.info, appJsonSchema);

        // We only care if the result is invalid, as it should pass successfully
        if (!this.isValidResult(result)) {
            this.reportFailed(result.errors.length, result.missing.length);

            result.errors.forEach((e: tv4.ValidationError) => this.reportError(e));
            result.missing.forEach((v: string) => this.reportMissing(v));

            throw new Error('Invalid "app.json" file, please ensure it matches the schema. (TODO: insert link here)');
        }
    }

    private isValidResult(result: tv4.MultiResult): boolean {
        return result.valid && result.missing.length === 0;
    }

    private reportFailed(errorCount: number, missingCount: number): void {
        const results = [];
        if (errorCount > 0) {
            results.push(chalk.red(`${ errorCount } validation error(s)`));
        }

        if (missingCount > 0) {
            results.push(chalk.red(`${ missingCount } missing schema(s)`));
        }

        console.log(
            chalk.red(figures.cross),
            chalk.cyan(this.infoFile),
            results.length > 0 ? `has ${ results.join(' and ') }` : '',
        );
    }

    private reportError(error: tv4.ValidationError, indent = '  ') {
        console.log(
            indent,
            chalk.red(`${ figures.pointerSmall } Error:`),
            error.message || 'No error message provided by validation module',
        );

        console.log(
            indent,
            '  at',
            chalk.blue(error.dataPath || '/'),
            'against schema',
            chalk.blue(error.schemaPath || '/'),
        );

        if (error.subErrors) {
            error.subErrors.forEach((err) => this.reportError(err, `${ indent }  `));
        }
    }

    private reportMissing(uri: string, indent = '  ') {
        console.log(
            indent,
            chalk.red(`${ figures.pointerSmall } Missing:`),
            uri,
        );
    }
}
