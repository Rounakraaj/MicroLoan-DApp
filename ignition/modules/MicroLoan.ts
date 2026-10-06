import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MicroLoanModule", (m) => {
  const microLoan = m.contract("MicroLoan");
  return { microLoan };
});
