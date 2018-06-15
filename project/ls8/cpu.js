/**
 * LS-8 v2.0 emulator skeleton code
 */

// For most of the bitwise stuff I looked up the code in Hacker's Delight 2nd Edition
const fs = require('fs');
// const instruction = {
//     HLT: 1,
//     MUL: 170,
//     ADD: 0b10101000,
//     DIV: 0b10101011,
//     SUB: 0b10101001,
//     PRN: 67,
//     LDI: 153,
//     PUSH: 0b001001101,
//     POP: 0b001001100,
//     JMP: 0b001010000,
//     CALL: 0b001001000,
//     RET: 0b00001001
//
// };



const FLAG_EQ = 0;
const FLAG_GT = 1;
const FLAG_LT = 2;

const IM = 0x05; // interrupt mask
const IS = 0x06; // interrupt status R6


// interrupts
// right now I only I'm doing timer
const interruptMask = [
    (0x1 << 0)
];
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

        this.reg[IM] = 0;
        this.reg[IS] = 0;
        // Special-purpose registers
        this.PC = 0; // Program Counter
        this.FL = 0;
        this.SP = this.reg[7];


        this.pcAdvance = true;
        this.interruptsEnable = true;

        this.tableSetup();
    }

    tableSetup() {
        this.instructionRunner = {
            153: this.LDI.bind(this),
            1: this.HLT.bind(this),
            67: this.PRN.bind(this),
            170: this.MUL.bind(this),
            0b10101000: this.ADD.bind(this),
            0b001001101: this.PUSH.bind(this),
            0b001001100: this.POP.bind(this),
            0b001001000: this.CALL.bind(this),
            0b001010000: this.JUMP.bind(this),
            0b00001001: this.RETURN.bind(this),
            0b10011010: this.ST.bind(this),
            0b01000010: this.PRA.bind(this),
            0b00001011: this.IRET.bind(this),
            0b10100000: this.CMP.bind(this),
            0b01010010: this.JNE.bind(this),
            0b01010001: this.JEQ.bind(this)


        };
    }

    setFlag(flag, value) {
        value += value;

        if (value) {
            this.FL |= (1 << flag); // right shift
        }
        else {

            this.FL &= ~(1 << flag); // not right shift
        }

    }

    getFlag(flag) {

        // AND and right shift
        return (this.FL & (1 << flag)) >> flag; // left shift
    }

    raiseInterrupt(number) {
        this.reg[IS] |= interruptMask[number];
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

        // interrupt clock
        this.timeInterrupt = setInterval(() => {

            this.raiseInterrupt(0);
        }, 1000);
    }

    /**
     * Stops the clock
     */
    stopClock() {
        clearInterval(this.clock);
        clearInterval(this.timeInterrupt);
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
            case 'ADD':
                return (this.reg[regA] + this.reg[regB]);
                break;
            case 'CMP':
                this.setFlag(FLAG_EQ, this.reg[regA] === this.reg[regB]);
                this.setFlag(FLAG_GT, this.reg[regA] > this.reg[regB]);
                this.setFlag(FLAG_LT, this.reg[regA] < this.reg[regB]);
                break;
        }
    }

    /**
     * Advances the CPU one cycle
     */
    tick() {

        if (this.interruptsEnable) {

            const interrupts = this.reg[IS] & this.reg[IM];

            for (let index = 0; index < 8; index++) {

                if(((interrupts >> index) & 0x01) === 1){
                    this.interruptsEnable = false;
                    this.reg[IS] &= interruptMask[index];

                    // push pc on tack
                    this._push(this.PC);

                    // push flag one stack
                    this._push(this.FL);


                    // push all regs on stack
                    for (let register = 0; register <=6; register++) {
                        this._push(this.reg[register]);
                    }

                    const vector = this.ram.read(0xF8 + index);
                    this.PC = vector;
                    break;
                }
            }
        }


        const IR = this.ram.read(this.PC);
        const operandA = this.ram.read(this.PC + 1);
        const operandB = this.ram.read(this.PC + 2);

        this.instructionRunner[IR](operandA, operandB);

        if (this.pcAdvance) {
            const insLen = (IR >> 6) + 1;
            this.PC += insLen;
        }

        this.pcAdvance = true;
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
        console.log('MUL');
       this.reg[registerA] = this.alu('MUL', registerA, registerB);
    }

    ADD(registerA, registerB) {
        this.reg[registerA] = this.alu('ADD', registerA, registerB);
    }
    PUSH(operand) {

        this.SP--;
        this.poke(this.SP, this.reg[operand])
    }

    POP(operand) {
        this.reg[operand] = this.ram.read(this.SP);
        this.SP++;
    }

    CALL(operand) {
        this._push(this.PC + 2);
        this.PC = this.reg[operand];

    }

    RETURN() {

        this.PC = this._pop();
        this.pcAdvance = false;
    }

    IRET() {
        // pop regs off stack
        for (let register = 6; register >=0; register--) {
            this.reg[register] = this._pop();
        }

        this.FL = this._pop();
        this.PC = this._pop();
        this.pcAdvance = false;
        this.interruptsEnable = true;
    }

    ST(regA, regB) {
        this.ram.write(this.reg[regA], this.reg[regB]);
    }

    JUMP(operand) {
        this.PC = this.reg[operand];
        this.pcAdvance = false;
    }

    CMP(regA, regB) {
        this.alu('CMP', regA, regB);
    }

    JEQ(reg) {
        if (this.getFlag(FLAG_EQ)) {
            this.PC = this.reg[reg];
            this.pcAdvance = false;
        }
    }

    JNE(reg) {
        if(!this.getFlag(FLAG_EQ)) {
            this.PC = this.reg[reg];
            this.pcAdvance = false;
        }
    }
    PRA(reg) {
        fs.writeSync(process.stdout.fd, String.fromCharCode(this.reg[reg]));
    }

    _push(value) {
        this.SP--;
        this.ram.write(this.reg[this.SP], value);
        this.pcAdvance = false;
    }

    _pop() {
        const value = this.ram.read(this.reg[this.SP]);
        this.SP++;
        return value;
    }
}

module.exports = CPU;
