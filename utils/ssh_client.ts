import { Config, NodeSSH } from "node-ssh";
import type {IdentityCallback, ParsedKey} from "ssh2";
import ssh2 from "ssh2";

export type Credential = {
    host: string;
    username: string;
    port: number;
    authType: "password" | "privateKey" | "publicKey";
    authValue: string;
    passphrase: string | null | undefined;
};

class CustomAgent extends ssh2.OpenSSHAgent {
    constructor(private readonly publicKey, sockerPath: string) {
        super(sockerPath);
    }

    override getIdentities(cb: IdentityCallback<ParsedKey>) {
        super.getIdentities((err, keys) => {
            if (this.publicKey) {
                const key = keys?.find((key) => {
                    if ("equals" in key) {
                        return key.equals(this.publicKey);
                    }
                    return false;
                });

                cb(err, key ? [key] : []);
                return;
            }

            cb(err, keys);
        });
    }
}

export async function createSSHConn(credential: Credential): Promise<NodeSSH> {
    const ssh = new NodeSSH();
    
    const opt: Config = {
        host: credential.host,
        port: credential.port,
        username: credential.username,
        passphrase: credential.passphrase || undefined,
        keepaliveInterval: 10000,
        keepaliveCountMax: 360,
        readyTimeout: 30000,
    };

    if (credential.authType !== "publicKey") {
        opt[credential.authType] = credential.authValue;
    } else {
        opt.agent = new CustomAgent(credential.authValue, process.env.SSH_AUTH_SOCK || "/opt/ssh_auth/oo-ssh-agent.sock");
    }

    return await ssh.connect(opt);
}