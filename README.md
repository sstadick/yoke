# Yoke

A proof of concept workflow ... thing ... in typescript

## Run

```bash
npx ts-node main.ts
```

## Deps

I don't know if the way I installed things is "good" or not, so here's a list

- Node
- Typescript


## Idea

This is similar to Nextflow in that a user defines rules, then writes some code to connect each rule to the next one.
This just uses javascript promises for "concurrency" which I haven't fully worked out yet.
Bascially it will spawn background processes running docker to do each unit of work, localizing with symlinks, again similar to Nextflow.

The cool thing here is that TypeScripts type system is awesome.
Union types and "object types" allow for flexible rules that are still checked by the compiler.
Function and class decorators are nice ways of hooking into object instantiations to do "magic" that snakemake and nextflow need a DSL to do.

There is an added bonus here that TypeScript and Rust work very well together via WASM and Rust modules could easily be used and imported into a workflow.


### Example Rule

```typescript
// object types and union types combine to make the input of TrimFastqInput
type PairedFastq = { r1: string, r2: string };
type TrimFastqParams = { five_prime: number, three_prime: number };
type TrimFastqInput = TrimFastqParams & PairedFastq;

class TrimFastq extends Rule<TrimFastqInput, PairedFastq> {
    command(input: TrimFastqInput, output: PairedFastq): string {
        return `
    echo trim-fastq ${input.r1} --output ${output.r1};
    echo trim-fastq ${input.r2} --output ${output.r2};
    `}

    createOutput(): PairedFastq {
        return { r1: this.input.r1, r2: this.input.r2 };
    }
}
```

`TrimFastq` has a generic parameter `I` which we are setting to be `TrimFastqInput` here.
What is super cool about the TypeScript type system is that you can pass *any* object that _looks_ like `TrimFastqInput` to `TrimFastq`.
So all you need is an object with the intersection of attributes of `TrimFastqParams & PairedFastq`.
This is not the most exciting example, but the idea is powerful and makes re-useing rules simple AND the compiler can validate that your object types are correct!