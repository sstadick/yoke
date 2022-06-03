// A Proof of concept strongly typed workflow manager in TypeScript

import { promisify } from 'node:util';
import { exec as cp_exec } from 'node:child_process';
const exec = promisify(cp_exec);

// TODO: Add resources to the rules
// TODO: Add a global resource pool and wait for resources
// TODO: add special type for symlinking files
// TODO: run shell command in docker containers
// TODO: scatter / gather - is it working as expected with promises?

/**
 * The abstract class defining a Rule.
 * 
 * This will move elsewhere and be imported into a "workflow" file.
 */
abstract class Rule<I, O> {
    // Inputs 
    input: I
    // Outputs
    output: O

    // TODO: specify log file.
    // TODO: specify temp dir? How should "working dirs" work here? similar to nextflow maybe?

    // Default constructor that takes the inputs object and stores it, as well as generates the outputs based on the inputs
    constructor(input: I) {
        this.input = input
        this.output = this.createOutput(this.input)
    }

    // Default run method that runs the `command` string and then creates the outputs
    async run(): Promise<O> {
        return exec(this.command(this.input, this.output)).then(
            (result) => {
                // Write stdout and stderr to a log file?
                console.log(result.stdout);
                return new Promise(resolve => resolve(this.output));
            },
        );
    }

    // User defined method for creating the output object, this is passed `this.input` and is run on class construction
    abstract createOutput(input: I): O
    // User defined method to generate a command string, this is passed `this.input` as `input`, and the generated output as `output`
    abstract command(input: I, output: O): string
}

// Helper types for TrimFastq
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

type Refdata = { ref_fasta: string };
type AlignmentOpts = { threads: number }
type AlignmentInputs = PairedFastq & AlignmentOpts & Refdata;
type AlignedBam = { bam: string, bai: string }

class AlignFastqs extends Rule<AlignmentInputs, AlignedBam> {
    command(input: AlignmentInputs, output: AlignedBam) {
        return `
    echo aligner ${input.r1} ${input.r2} --ref-fata ${input.ref_fasta} --output ${output.bam};
    echo samtools index ${output.bam};
    `}

    createOutput(input: AlignmentInputs): AlignedBam {
        return { bam: "blah.bam", bai: "blah.bam.bai" }
    }
}

type PerChrAlignedBam = AlignedBam & { chr: string };
class SplitBams extends Rule<AlignedBam, Array<PerChrAlignedBam>> {
    command(input: AlignedBam, output: Array<PerChrAlignedBam>) {
        return `
        echo picard SplitBam ... ${input.bam};
        `
    }
    createOutput(input: AlignedBam): Array<PerChrAlignedBam> {
        // pretend there is a method that extracts the header info from a bam file to get chromosomes
        const chroms = ["chr1", "chr2", "chrM"];
        return chroms.map((chr) => {
            return {
                bam: `${chr}.${input.bam}`,
                bai: `${chr}.${input.bai}`,
                chr: chr
            }
        });

    }
}

type Vcf = { path: string }
class CallVariants extends Rule<PerChrAlignedBam, Vcf> {
    command(input: AlignedBam, output: Vcf) {
        return `
        echo vardict ${input.bam} ${output.path};
        `
    }
    createOutput(input: PerChrAlignedBam): Vcf {
        return {
            path: `${input.chr}.vardict.vcf.gz`
        };
    }
}

async function main() {
    const ref_data = {
        ref_fasta: "hg19.fa"
    };
    const input_fastq_pairs = [
        {
            r1: "set1_r1.fastq.gz",
            r2: "set1_r2.fastq.gz"
        },
        {
            r1: "set2_r1.fastq.gz",
            r2: "set2_r2.fastq.gz"
        }
    ];

    for (const input_fastq_pair of input_fastq_pairs) {
        new TrimFastq({ ...input_fastq_pair, ...{ three_prime: 5, five_prime: 5 } }).run().then(
            (trimmed_fastqs) => new AlignFastqs({ ...trimmed_fastqs, ...{ threads: 4 }, ...ref_data }).run(),
        ).then(
            (aligned_bam) => new SplitBams(aligned_bam).run()
        ).then(
            (chr_aligned_bams) => {
                return Promise.all(chr_aligned_bams.map((b) => new CallVariants(b).run()));
            }
        )
            .catch(
                (error) => console.error(`Bad stuff happened: ${JSON.stringify(error)}`)
            )
    }

}

main()