// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract MicroLoan {

    // Possible states of a loan
    enum Status {
        Requested,
        Funded,
        Withdrawn,
        Repaid,
        Defaulted
    }

    // Loan information
    struct Loan {
        address borrower;
        address lender;
        uint256 principal;
        uint256 repayment;
        uint64 dueDate;
        Status status;
    }

    // Total number of loans created
    uint256 public loanCount;

    // Loan ID => Loan information
    mapping(uint256 => Loan) public loans;

    // Events
    event Requested(
        uint256 indexed id,
        address indexed borrower,
        uint256 principal,
        uint256 repayment,
        uint64 dueDate
    );

    event Funded(
        uint256 indexed id,
        address indexed lender,
        uint256 amount
    );

    event Withdrawn(
        uint256 indexed id,
        address indexed borrower,
        uint256 amount
    );

    event Repaid(
        uint256 indexed id,
        address indexed borrower,
        uint256 amount
    );

    event Defaulted(
        uint256 indexed id
    );


    // ============================================================
    // 1. BORROWER REQUESTS A LOAN
    // ============================================================

    function requestLoan(
        uint256 principal,
        uint256 repayment,
        uint64 dueDate
    ) external returns (uint256) {

        require(
            principal > 0,
            "Principal must be greater than zero"
        );

        require(
            repayment >= principal,
            "Repayment must be at least principal"
        );

        require(
            dueDate > block.timestamp,
            "Due date must be in the future"
        );

        uint256 id = loanCount;

        loanCount++;

        loans[id] = Loan({
            borrower: msg.sender,
            lender: address(0),
            principal: principal,
            repayment: repayment,
            dueDate: dueDate,
            status: Status.Requested
        });

        emit Requested(
            id,
            msg.sender,
            principal,
            repayment,
            dueDate
        );

        return id;
    }


    // ============================================================
    // 2. LENDER FUNDS THE LOAN
    // ============================================================

    function fundLoan(
        uint256 id
    ) external payable {

        Loan storage loan = loans[id];

        require(
            id < loanCount,
            "Loan does not exist"
        );

        require(
            loan.status == Status.Requested,
            "Loan is not available"
        );

        require(
            msg.value == loan.principal,
            "Incorrect funding amount"
        );

        loan.lender = msg.sender;

        loan.status = Status.Funded;

        emit Funded(
            id,
            msg.sender,
            msg.value
        );
    }


    // ============================================================
    // 3. BORROWER WITHDRAWS THE FUNDED LOAN
    // ============================================================

    function withdrawLoan(
        uint256 id
    ) external {

        Loan storage loan = loans[id];

        require(
            id < loanCount,
            "Loan does not exist"
        );

        require(
            msg.sender == loan.borrower,
            "Only borrower can withdraw"
        );

        require(
            loan.status == Status.Funded,
            "Loan is not funded"
        );

        loan.status = Status.Withdrawn;

        // Send principal to borrower
        (bool success, ) = payable(loan.borrower).call{
            value: loan.principal
        }("");

        require(
            success,
            "Loan transfer failed"
        );

        emit Withdrawn(
            id,
            loan.borrower,
            loan.principal
        );
    }


    // ============================================================
    // 4. BORROWER REPAYS THE LOAN
    // ============================================================

    function repay(
        uint256 id
    ) external payable {

        Loan storage loan = loans[id];

        require(
            id < loanCount,
            "Loan does not exist"
        );

        require(
            msg.sender == loan.borrower,
            "Only borrower can repay"
        );

        require(
            loan.status == Status.Withdrawn,
            "Loan is not active"
        );

        require(
            block.timestamp <= loan.dueDate,
            "Loan is overdue"
        );

        require(
            msg.value == loan.repayment,
            "Incorrect repayment amount"
        );

        loan.status = Status.Repaid;

        // Send repayment to lender
        (bool success, ) = payable(loan.lender).call{
            value: msg.value
        }("");

        require(
            success,
            "Repayment transfer failed"
        );

        emit Repaid(
            id,
            loan.borrower,
            msg.value
        );
    }


    // ============================================================
    // 5. MARK LOAN AS DEFAULTED
    // ============================================================

    function markDefault(
        uint256 id
    ) external {

        Loan storage loan = loans[id];

        require(
            id < loanCount,
            "Loan does not exist"
        );

        require(
            loan.status == Status.Withdrawn,
            "Loan is not active"
        );

        require(
            block.timestamp > loan.dueDate,
            "Loan is not overdue"
        );

        loan.status = Status.Defaulted;

        emit Defaulted(id);
    }


    // ============================================================
    // 6. GET LOAN INFORMATION
    // ============================================================

    function getLoan(
        uint256 id
    ) external view returns (Loan memory) {

        require(
            id < loanCount,
            "Loan does not exist"
        );

        return loans[id];
    }
}