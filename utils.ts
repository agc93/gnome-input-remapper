import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export default class FileHelpers {
    public static getConfigPath(presetDir: boolean = false): string {
        const homeDir = GLib.get_home_dir();
        const relPath = [homeDir, '.config', 'input-remapper-2'];
        return GLib.build_filenamev( presetDir ? [...relPath, 'presets'] : relPath );
    }

    public getConfigFiles(): { [key: string]: string[] } {
        const configDirectories = this.getConfigDirectories();
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

    public getConfigDirectories(): string[] {
        const configPath = FileHelpers.getConfigPath(true);
        const configDir = Gio.File.new_for_path(configPath);
        const directories: string[] = [];

        try {
            const enumerator = configDir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
            let fileInfo: Gio.FileInfo | null;

            while ((fileInfo = enumerator.next_file(null)) !== null) {
                if (fileInfo.get_file_type() === Gio.FileType.DIRECTORY) {
                    const fileName = fileInfo.get_name();
                    log(`Found directory: ${fileName}`);
                    directories.push(GLib.build_filenamev([configPath, fileName]));
                }
            }
        } catch (error) {
            logError(error);
            return [];
        }

        return directories;
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
}