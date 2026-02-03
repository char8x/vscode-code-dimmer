import { Uri, workspace } from 'vscode';

/**
 * Get the last modified time of a file
 * @param uri File URI
 * @returns Last modified time in milliseconds, or undefined if file doesn't exist
 */
export async function getFileStat(uri: Uri): Promise<number | undefined> {
  try {
    const stat = await workspace.fs.stat(uri);
    return stat.mtime;
  } catch (error) {
    return undefined;
  }
}
