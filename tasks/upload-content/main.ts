import type { Context } from "@oomol/types/oocana";
import { createSSHConn, Credential } from "../../utils/ssh_client";
import path from "node:path";
import fsP from "node:fs/promises";
import crypto from 'node:crypto';

type Inputs = {
    credential: Credential,
    fileContent: string;
    remoteFilepath: string;
    override: boolean;
    chmod: number;
};
type Outputs = {
    fileSize: number;
    isOverride: boolean;
};

export default async function(
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Outputs> {
    {
        const allow = [1, 2, 3, 4, 5, 6, 7];
        const [u, g, o] = params.chmod.toString().split('').map(i => Number(i));
        if (
            !allow.includes(u) ||
            !allow.includes(g) ||
            !allow.includes(o)
        ) {
            throw new Error('chmod params is Invalid');
        }
    }

    let isOverride = false;

    const conn = await createSSHConn(params.credential);

    const { code } = await conn.execCommand(`test -e ${params.remoteFilepath}`);
    if (code === 0) {
        if (params.override === false) {
            throw new Error(`File ${params.remoteFilepath} already exists`);
        }

        isOverride = true;
    }
    const tempDir = await fsP.mkdtemp(path.join(context.tmpPkgDir, 'upload-content-'));
    const localFile = path.join(tempDir, crypto.randomBytes(4).toString('hex'));
    await fsP.writeFile(localFile, params.fileContent, {
        encoding: 'utf-8',
    });

    let fileSize = 0;
    await conn.putFile(localFile, params.remoteFilepath, null, {
        step(total, _nb, fsize) {
            if (fileSize === 0 && fsize !== 0) {
                fileSize = fsize
            }

            const progress = total / fsize * 100
            context.reportProgress(Math.min(99, progress));
        },
    });

    await conn.execCommand(`chmod ${params.chmod} ${params.remoteFilepath}`);
    context.reportProgress(100);

    return {
        fileSize,
        isOverride,
    }
};
