import Gio from 'gi://Gio';
import GLib from 'gi://GLib'

// convert Uint8Array into a literal string
function convertUint8ArrayToString(contents: Uint8Array<ArrayBufferLike>) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(contents).trim();
}

// export function File(path: string) {
//     if (path.indexOf('https://') == -1)
//         this.file = Gio.File.new_for_path(path);
//     else
//         this.file = Gio.File.new_for_uri(path);
// }

export function readFile(fileHandle: Gio.File, delimiter = '', strip_header = false) {
    return new Promise((resolve, reject) => {
        try {
            fileHandle.load_contents_async(null, function(file, res) {
                try {
                    // grab contents of file or website
                    let buffer = file?.load_contents_finish(res)[1];
                    if (!buffer) throw new Error('No contents found');
                    // convert contents to string
                    let contents = convertUint8ArrayToString(buffer);
                    let result: string[] = [contents];

                    // split contents by delimiter if passed in
                    if (delimiter) { result = contents.split(delimiter);
                    if (strip_header) result.shift();}

                    // return results
                    resolve(result);
                } catch (e: any) {
                    reject(e.message);
                }
            });
        } catch (e: any) {
            reject(e.message);
        }
    });
};

export function listFileObjects(fileHandle: Gio.File) {
    return new Promise((resolve, reject) => {
        let max_items = 125, results = [];

        try {
            fileHandle.enumerate_children_async(Gio.FILE_ATTRIBUTE_STANDARD_NAME, Gio.FileQueryInfoFlags.NONE, GLib.PRIORITY_LOW, null, function(file, res) {
                try {
                    if (!file) {reject('No file found'); return;}
                    let enumerator = file.enumerate_children_finish(res);

                    let callback = function(enumerator: Gio.FileEnumerator | null, res: Gio.AsyncResult) {
                        try {
                            if (!enumerator) {reject('No enumerator found'); return;}
                            let files = enumerator.next_files_finish(res);
                            for (let i = 0; i < files.length; i++) {
                                results.push(files[i].get_attribute_as_string(Gio.FILE_ATTRIBUTE_STANDARD_NAME));
                            }

                            if (files.length == 0) {
                                enumerator.close_async(GLib.PRIORITY_LOW, null, function(){});
                                resolve(results);
                            } else {
                                enumerator.next_files_async(max_items, GLib.PRIORITY_LOW, null, callback);
                            }
                        } catch (e: any) {
                            reject(e.message);
                        }
                    };

                    enumerator.next_files_async(max_items, GLib.PRIORITY_LOW, null, callback);
                } catch (e: any) {
                    reject(e.message);
                }
            });
        } catch (e: any) {
            reject(e.message);
        }
    });
};