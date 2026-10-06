export const contractAddress = process.env.NEXT_PUBLIC_MICROLOAN_ADDRESS ?? "";

export const contractABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "principal",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "repayment",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "dueDate",
        "type": "uint64"
      }
    ],
    "name": "requestLoan",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "fundLoan",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "withdrawLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "repay",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "markDefault",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getLoan",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "borrower",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "lender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "principal",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "repayment",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "dueDate",
            "type": "uint64"
          },
          {
            "internalType": "uint8",
            "name": "status",
            "type": "uint8"
          }
        ],
        "internalType": "struct MicroLoan.Loan",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "loanCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
