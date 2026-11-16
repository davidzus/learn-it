import {mkdir, readFile, rename, writeFile} from "node:fs/promises";
import path from "node:path";
import {connection} from "next/server";
import {parseStoredData, serializeStoredData, StoredData} from "../../lib/storage";

// Lives in the project folder, so it survives dev-server restarts and port changes
// (localStorage is scoped per origin, i.e. per port).
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "learn-it.json");

async function readDataFile(): Promise<StoredData | null> {
    try {
        return parseStoredData(JSON.parse(await readFile(DATA_FILE, "utf8")));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
    }
}

async function writeDataFile(storedData: StoredData) {
    await mkdir(DATA_DIR, {recursive: true});
    // Write to a temp file first and rename, so a crash never leaves a half-written JSON behind.
    const tempFile = `${DATA_FILE}.${process.pid}.tmp`;
    await writeFile(tempFile, serializeStoredData(storedData), "utf8");
    await rename(tempFile, DATA_FILE);
}

export async function GET() {
    await connection();
    return Response.json({stored: await readDataFile()});
}

export async function PUT(request: Request) {
    let incoming: StoredData | null;
    try {
        incoming = parseStoredData(await request.json());
    } catch {
        incoming = null;
    }
    if (!incoming) return Response.json({error: "Ungültige Learn-IT-Daten"}, {status: 400});

    // Never let a stale tab (e.g. still open on an old port) overwrite newer data.
    const current = await readDataFile();
    if (current && current.updatedAt > incoming.updatedAt) {
        return Response.json({stored: current}, {status: 409});
    }

    await writeDataFile(incoming);
    return Response.json({stored: incoming});
}
