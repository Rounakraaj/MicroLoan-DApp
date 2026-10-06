import { expect } from "chai";
import { network } from "hardhat";

describe("MicroLoan", function () {

    async function deployContract() {
        const { ethers } = await network.create();

        const [borrower, lender] = await ethers.getSigners();

        const microLoan =
            await ethers.deployContract("MicroLoan");

        await microLoan.waitForDeployment();

        return {
            ethers,
            microLoan,
            borrower,
            lender
        };
    }


    // ============================================================
    // TEST 1: LOAN REQUEST
    // ============================================================

    it("should allow a borrower to request a loan", async function () {

        const {
            ethers,
            microLoan,
            borrower
        } = await deployContract();

        const principal =
            ethers.parseEther("0.1");

        const repayment =
            ethers.parseEther("0.11");

        const currentTime =
            Math.floor(Date.now() / 1000);

        const dueDate =
            currentTime + 86400;

        await microLoan.connect(borrower).requestLoan(
            principal,
            repayment,
            dueDate
        );

        const loan =
            await microLoan.getLoan(0);

        expect(loan.borrower)
            .to.equal(borrower.address);

        expect(loan.principal)
            .to.equal(principal);

        expect(loan.repayment)
            .to.equal(repayment);

        expect(loan.status)
            .to.equal(0n);
    });


    // ============================================================
    // TEST 2: LENDER FUNDS LOAN
    // ============================================================

    it("should allow a lender to fund the loan", async function () {

        const {
            ethers,
            microLoan,
            borrower,
            lender
        } = await deployContract();

        const principal =
            ethers.parseEther("0.1");

        const repayment =
            ethers.parseEther("0.11");

        const dueDate =
            Math.floor(Date.now() / 1000) + 86400;

        await microLoan.connect(borrower).requestLoan(
            principal,
            repayment,
            dueDate
        );

        await microLoan.connect(lender).fundLoan(
            0,
            {
                value: principal
            }
        );

        const loan =
            await microLoan.getLoan(0);

        expect(loan.lender)
            .to.equal(lender.address);

        expect(loan.status)
            .to.equal(1n);
    });


    // ============================================================
    // TEST 3: BORROWER WITHDRAWS
    // ============================================================

    it("should allow borrower to withdraw the funded loan", async function () {

        const {
            ethers,
            microLoan,
            borrower,
            lender
        } = await deployContract();

        const principal =
            ethers.parseEther("0.1");

        const repayment =
            ethers.parseEther("0.11");

        const dueDate =
            Math.floor(Date.now() / 1000) + 86400;

        await microLoan.connect(borrower).requestLoan(
            principal,
            repayment,
            dueDate
        );

        await microLoan.connect(lender).fundLoan(
            0,
            {
                value: principal
            }
        );

        await microLoan.connect(borrower).withdrawLoan(0);

        const loan =
            await microLoan.getLoan(0);

        expect(loan.status)
            .to.equal(2n);
    });


    // ============================================================
    // TEST 4: BORROWER REPAYS
    // ============================================================

    it("should allow borrower to repay the loan", async function () {

        const {
            ethers,
            microLoan,
            borrower,
            lender
        } = await deployContract();

        const principal =
            ethers.parseEther("0.1");

        const repayment =
            ethers.parseEther("0.11");

        const dueDate =
            Math.floor(Date.now() / 1000) + 86400;

        await microLoan.connect(borrower).requestLoan(
            principal,
            repayment,
            dueDate
        );

        await microLoan.connect(lender).fundLoan(
            0,
            {
                value: principal
            }
        );

        await microLoan.connect(borrower).withdrawLoan(0);

        await microLoan.connect(borrower).repay(
            0,
            {
                value: repayment
            }
        );

        const loan =
            await microLoan.getLoan(0);

        expect(loan.status)
            .to.equal(3n);
    });

});