import type { Context } from "@oomol/types/oocana";
import { createSSHConn, Credential } from "../../utils/ssh_client";
import path from "node:path";

type Inputs = {
    credential: Credential,
    filepath: string;
    remoteFilepath: string;
    override: boolean;
    chmod: number;
};
type Outputs = {
    isOverride: boolean;
    remoteFilepath: string;
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

    let remoteFilepath = params.remoteFilepath;
    let isOverride = false;

    const conn = await createSSHConn(params.credential);

    {
        const { code } = await conn.execCommand(`test -d ${remoteFilepath}`);
        if (code === 0) {
            remoteFilepath = path.join(remoteFilepath, path.basename(params.filepath));
        }
    }
    
    const { code } = await conn.execCommand(`test -e ${remoteFilepath}`);
    if (code === 0) {
        if (params.override === false) {
            throw new Error(`File ${remoteFilepath} already exists`);
        }

        isOverride = true;
    }

    await conn.putFile(params.filepath, remoteFilepath, null, {
        step(total, _nb, fsize) {
            const progress = total / fsize * 100
            context.reportProgress(Math.min(99, progress));
        },
    });

    await conn.execCommand(`chmod ${params.chmod} ${remoteFilepath}`);
    context.reportProgress(100);

    return {
        isOverride,
        remoteFilepath,
    }
};
