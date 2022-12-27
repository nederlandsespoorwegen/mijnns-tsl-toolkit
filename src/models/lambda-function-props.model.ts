export interface LambdaFunctionProps {
    name: string;
    entry: string;
    memoryMb: number;
    timeoutMs: number;
    misc?: { [key: string]: any };
}
