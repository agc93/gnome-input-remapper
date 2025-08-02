import GLib from 'gi://GLib';
import Gio from 'gi://Gio'

export default class FileHelpers {
    public static getDefaultConfigPath(presetDir: boolean = false): string {
        const homeDir = GLib.get_home_dir();
        const relPath = [homeDir, '.config', 'input-remapper-2'];
        return GLib.build_filenamev( presetDir ? [...relPath, 'presets'] : relPath );
    }

    private getConfigDirectories(configPath: string): string[] {
        const presetsPath = GLib.build_filenamev([configPath, 'presets']);

        try {
            const configDir = Gio.File.new_for_path(presetsPath);
            const directories: string[] = [];
            const enumerator = configDir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
            let fileInfo: Gio.FileInfo | null;

            while ((fileInfo = enumerator.next_file(null)) !== null) {
                if (fileInfo.get_file_type() === Gio.FileType.DIRECTORY) {
                    const fileName = fileInfo.get_name();
                    console.log(`Found Input Remapper device directory: ${fileName}`);
                    directories.push(GLib.build_filenamev([presetsPath, fileName]));
                }
            }
            return directories;
        } catch (error) {
            logError(error);
            return [];
        }

    }

    public getConfigFiles(configPath: string): { [key: string]: string[] } {
        const configDirectories = this.getConfigDirectories(configPath);
        const result: { [key: string]: string[] } = {};

        for (const dirPath of configDirectories) {
            const dir = Gio.File.new_for_path(dirPath);
            const jsonFiles: string[] = [];

            try {
                const enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
                let fileInfo: Gio.FileInfo | null;

                while ((fileInfo = enumerator.next_file(null)) !== null) {
                    if (fileInfo.get_file_type() === Gio.FileType.REGULAR) {
                        const fileName = fileInfo.get_name();
                        if (fileName.endsWith('.json')) {
                            jsonFiles.push(GLib.build_filenamev([dirPath, fileName]));
                        }
                    }
                }

                if (jsonFiles.length > 0) {
                    result[dirPath] = jsonFiles;
                }
            } catch (error) {
                logError(error);
            }
        }

        return result;
    }

    static openDirectory(dirPath: string): boolean {
        try {
            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.NONE
            });

            // Use xdg-open which will use the default file manager
            launcher.spawnv(['xdg-open', dirPath]);
            return true;
        } catch (error) {
            logError(error as Error);
            return false;
        }
    }

    static runAfter(seconds: number, callback: () => void) {

        const timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, seconds*1000, () => {
            callback();
            if (activeTimeouts.includes(timeout)) {
                activeTimeouts = activeTimeouts.filter(t => t != timeout);
            }
            return GLib.SOURCE_REMOVE;
        }, null);
        activeTimeouts.push(timeout);
        return timeout;
    }
}

export let activeTimeouts: number[] = [];

export const runAfter = FileHelpers.runAfter;

export function openInputRemapperUi() {
    try {
        const launcher = new Gio.SubprocessLauncher({
            flags: Gio.SubprocessFlags.NONE
        });

        // Use xdg-open which will use the default file manager
        launcher.spawnv(['input-remapper-gtk']);
        return true;
    } catch (error) {
        logError(error as Error);
        return false;
    }
}



