/**
 * Tiny generated media for tests, so no binaries live in git.
 * Writers create the parent directory if needed and resolve to the path they wrote.
 */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

/** Create a fresh temp directory under os.tmpdir(), e.g. `studycubby-test-abc123`. */
export function makeTempDir(prefix = 'studycubby-test-'): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export interface WavOptions {
  seconds?: number;
  sampleRate?: number;
  /** Sine frequency in Hz; a different frequency produces different bytes. */
  frequency?: number;
}

/** Write a valid PCM16 mono WAV containing a sine tone. */
export async function writeWav(filePath: string, opts: WavOptions = {}): Promise<string> {
  const { seconds = 1, sampleRate = 8000, frequency = 440 } = opts;
  const samples = Math.round(seconds * sampleRate);
  const dataLen = samples * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples; i++) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 12000), 44 + i * 2);
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buf);
  return filePath;
}

export interface PngOptions {
  width?: number;
  height?: number;
  /** Solid fill colour; different colours produce different bytes. */
  rgb?: [number, number, number];
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Write a valid 8-bit RGB PNG filled with a solid colour. */
export async function writePng(filePath: string, opts: PngOptions = {}): Promise<string> {
  const { width = 4, height = 4, rgb = [200, 40, 40] } = opts;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const row = Buffer.alloc(1 + width * 3); // filter byte 0, then pixels
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, png);
  return filePath;
}

/** Write a plain-text file, for "not media" cases. */
export async function writeTextFile(filePath: string, text = 'this is not media\n'): Promise<string> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text);
  return filePath;
}
