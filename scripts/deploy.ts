import { network } from "hardhat";

const { ethers } = await network.create();

const microLoan = await ethers.deployContract("MicroLoan");

await microLoan.waitForDeployment();

console.log("MicroLoan deployed to:", await microLoan.getAddress());