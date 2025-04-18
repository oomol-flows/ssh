import type { Context } from "@oomol/types/oocana";

type Inputs = Credential;
type Outputs = {
    credential: Inputs;
};

export default async function(
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Outputs> {
    return {
        credential: params,
    };
};
