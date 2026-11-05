import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ChatImageFiles } from '../chatService';
import { IMAGE_MAX_EDGE, IMAGE_QUALITY, type PendingImage } from '../types';

// Outbox images live in Documents and are stored by name only: the container path changes across app updates, so an
// absolute URI saved before an update would point nowhere after it.
const outboxDir = () => new Directory(Paths.document, 'chat-outbox');
const cacheDir = () => new Directory(Paths.cache, 'chat-images');

const cacheName = (path: string) => path.replaceAll('/', '_');

function ensure(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export const outboxUri = (file: string) => new File(outboxDir(), file).uri;

export function fitEdge(width: number, height: number, max = IMAGE_MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function prepareImage(source: { uri: string }): Promise<PendingImage> {
  const original = await ImageManipulator.manipulate(source.uri).renderAsync();
  const fitted = fitEdge(original.width, original.height);
  const rendered =
    fitted.width === original.width && fitted.height === original.height
      ? original
      : await ImageManipulator.manipulate(original).resize(fitted).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: IMAGE_QUALITY });
  if (rendered !== original) rendered.release();
  original.release();
  const name = `${randomUUID()}.jpg`;
  new File(saved.uri).moveSync(new File(ensure(outboxDir()), name));
  return { file: name, width: saved.width, height: saved.height };
}

function remove(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {}
}

export function dropOutboxImage(file: string) {
  remove(new File(outboxDir(), file));
}

export function keepSentImage(file: string, path: string) {
  const source = new File(outboxDir(), file);
  try {
    const target = new File(ensure(cacheDir()), cacheName(path));
    if (!source.exists) return;
    if (target.exists) source.delete();
    else source.moveSync(target);
  } catch {
    remove(source);
  }
}

export const deviceImageFiles: ChatImageFiles = {
  read: (file) => new File(outboxDir(), file).arrayBuffer(),
  cached(path) {
    const file = new File(cacheDir(), cacheName(path));
    return file.exists ? file.uri : null;
  },
  async download(url, path) {
    const target = new File(ensure(cacheDir()), cacheName(path));
    const file = await File.downloadFileAsync(url, target, { idempotent: true });
    return file.uri;
  },
};

export function clearImageCache() {
  try {
    const dir = cacheDir();
    if (dir.exists) dir.delete();
  } catch {}
}

export async function cacheImageFile(path: string, write: (target: File) => Promise<void>) {
  const target = new File(ensure(cacheDir()), cacheName(path));
  if (!target.exists) await write(target);
  return target.uri;
}

export async function copyImageFile(uri: string) {
  return new File(uri).base64();
}

export async function previewImage(uri: string, title: string) {
  const file = new File(uri);
  if (!file.exists || !(await File.canPreview(file))) return false;
  await File.preview(file, { title });
  return true;
}
