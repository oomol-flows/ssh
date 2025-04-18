import type { Context } from "@oomol/types/oocana";
import { createSSHConn, Credential } from "../../utils/ssh_client";
import fsP from "node:fs/promises";
import path from "node:path";

type Inputs = {
    credential: Credential,
    remoteFilepath: string;
    saveFilepath: string;
    override: boolean;
};
type Outputs = {
    isOverride: boolean;
    saveFilepath: string;
};

export default async function(
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Outputs> {
    let isOverride = false;
    let saveFilepath = params.saveFilepath;

    {
        const stat = await fsP.stat(saveFilepath).catch(() => null);
        if (stat?.isDirectory()) {
            saveFilepath = path.join(saveFilepath, path.basename(params.remoteFilepath));
        }
    }

    const conn = await createSSHConn(params.credential);

    {
        const { code } = await conn.execCommand(`test -e ${params.remoteFilepath}`);
        if (code === 0) {
            if (params.override === false) {
                throw new Error(`File ${params.remoteFilepath} already exists`);
            }

            isOverride = true;
        }
    }

    {
        const { code } = await conn.execCommand(`test -d ${params.remoteFilepath}`);
        if (code === 0) {
            throw new Error(`File ${params.remoteFilepath} is Directory`);
        }
    }

    await conn.getFile(saveFilepath, params.remoteFilepath, null, {
        step(total, _nb, fsize) {
            const progress = total / fsize * 100
            context.reportProgress(progress);
        },
    });

    return {
        isOverride,
        saveFilepath,
    };
};
