import type { Context } from "@oomol/types/oocana";
import { NodeSSH } from "node-ssh";
import { createSSHConn, Credential } from "../../utils/ssh_client";

type Inputs = {
    credential: Credential,
    command: string;
};
type Outputs = {
    stdout: string;
    stderr: string;
};

export default async function(
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Outputs> {
    const conn = await createSSHConn(params.credential);

    let stderr = '';
    let stdout = '';
    const { code } = await conn.execCommand(params.command, {
        onStdout(chunk) {
            const data = chunk.toString("utf-8");
            stdout += data;
        },
        onStderr(chunk) {
            const data = chunk.toString("utf-8");
            stderr += data;
        },
        
    });

    if (code !== 0) {
        throw new Error(`Command failed with code ${code}: ${stderr}`);
    }

    return {
        stdout,
        stderr
    };
};
