/**
 * LS-8 v2.0 emulator skeleton code
 */


const instruction = {
    HLT: 1,
    MUL: 170,
    PRN: 67,
    LDI: 153,
    PUSH: 0b001001101,
    POP: 0b001001100

};
/**
 * Class for simulating a simple Computer (CPU & memory)
 */
class CPU {

    /**
     * Initialize the CPU
     */
    constructor(ram) {
        this.ram = ram;

        this.reg = new Array(8).fill(0); // General-purpose registers R0-R7
        this.reg[7] = 0xf4;
        
        // Special-purpose registers
        this.PC = 0; // Program Counter
        this.SP = this.reg[7];
        this.tableSetup();
    }

    tableSetup() {
        this.instructionRunner = {
            153: this.LDI.bind(this),
            1: this.HLT.bind(this),
            67: this.PRN.bind(this),
            170: this.MUL.bind(this),
            0b001001101: this.PUSH.bind(this),
            0b001001100: this.POP.bind(this)

        };
    }

    /**
     * Store value in memory address, useful for program loading
     */
    poke(address, value) {
        this.ram.write(address, value);
    }

    /**
     * Starts the clock ticking on the CPU
     */
    startClock() {
        this.clock = setInterval(() => {
            this.tick();
        }, 1); // 1 ms delay == 1 KHz clock == 0.000001 GHz
    }

    /**
     * Stops the clock
     */
    stopClock() {
        clearInterval(this.clock);
    }

    /**
     * ALU functionality
     *
     * The ALU is responsible for math and comparisons.
     *
     * If you have an instruction that does math, i.e. MUL, the CPU would hand
     * it off to it's internal ALU component to do the actual work.
     *
     * op can be: ADD SUB MUL DIV INC DEC CMP
     */
    alu(op, regA, regB) {
        switch (op) {
            case 'MUL':
                return (this.reg[regA] * this.reg[regB]);
                break;
        }
    }

    /**
     * Advances the CPU one cycle
     */
    tick() {

        const IR = this.ram.read(this.PC);
        const operandA = this.ram.read(this.PC + 1);
        const operandB = this.ram.read(this.PC + 2);

        this.instructionRunner[IR](operandA, operandB);

        const insLen = (IR >> 6) + 1;
        this.PC += insLen;
    }

    LDI(register, value) {
        this.reg[register] = value;
    }

    PRN(register) {
        console.log(this.reg[register]);
    }

    HLT() {
        this.stopClock();
    }

    MUL(registerA, registerB) {
       this.reg[registerA] = this.alu('MUL', registerA, registerB);
    }

    PUSH(operand) {

        this.SP--;
        this.poke(this.SP, this.reg[operand])
    }

    POP(operand) {
        this.reg[operand] = this.ram.read(this.SP);
        this.SP++;
    }
}

module.exports = CPU;
