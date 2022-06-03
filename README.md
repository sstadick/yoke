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
