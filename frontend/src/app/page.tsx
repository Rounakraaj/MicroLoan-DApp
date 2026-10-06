"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatEther,
  parseEther,
} from "ethers";

import { contractABI, contractAddress } from "./contract/MicroLoanABI";

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;

      on?: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;

      removeListener?: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
    };
  }
}

type Loan = {
  id: bigint;
  borrower: string;
  lender: string;
  principal: bigint;
  repayment: bigint;
  dueDate: bigint;
  status: number;
};

const SEPOLIA_CHAIN_ID = 11155111;

const statuses = [
  "Open",
  "Funded",
  "Active",
  "Repaid",
  "Defaulted",
];

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

export default function Home() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);

  const [principal, setPrincipal] = useState("");
  const [repayment, setRepayment] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);

  /*
   * ---------------------------------------------------------
   * LOAD LOANS
   * ---------------------------------------------------------
   */
  const loadLoans = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!window.ethereum) {
      setMessage("MetaMask is not installed.");
      return;
    }

    if (!contractAddress) {
      setMessage(
        "Contract address is missing. Check NEXT_PUBLIC_MICROLOAN_ADDRESS in .env.local."
      );
      return;
    }

    setLoading(true);

    try {
      const provider = new BrowserProvider(window.ethereum);

      /*
       * Get current network
       */
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      /*
       * Debug information
       * Check these in Chrome -> F12 -> Console
       */
      console.log("====================================");
      console.log("MICROLEND DEBUG");
      console.log("CONTRACT ADDRESS:", contractAddress);
      console.log("NETWORK CHAIN ID:", currentChainId);
      console.log("NETWORK NAME:", network.name);
      console.log("====================================");

      setChainId(currentChainId);

      /*
       * The contract is deployed for Sepolia.
       */
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        console.error(
          `Wrong network. Expected Sepolia (${SEPOLIA_CHAIN_ID}), got ${currentChainId}`
        );

        setLoans([]);

        setMessage(
          "Please switch MetaMask to Ethereum Sepolia, then refresh the page."
        );

        return;
      }

      /*
       * Check whether actual contract bytecode exists
       * at the configured address.
       */
      const code = await provider.getCode(contractAddress);

      console.log("CONTRACT CODE:", code);
      console.log(
        "CONTRACT EXISTS:",
        code !== "0x" && code.length > 2
      );

      /*
       * If code is 0x, there is no deployed contract
       * at this address on Sepolia.
       */
      if (code === "0x" || code.length <= 2) {
        console.error(
          "No contract bytecode found at:",
          contractAddress
        );

        setLoans([]);

        setMessage(
          `No smart contract found at ${shortAddress(
            contractAddress
          )} on Sepolia. Check your deployment address.`
        );

        return;
      }

      /*
       * Create contract instance.
       */
      const contract = new Contract(
        contractAddress,
        contractABI,
        provider
      );

      /*
       * Read loanCount()
       */
      console.log("Calling loanCount()...");

      const countRaw = await contract.loanCount();

      console.log("RAW LOAN COUNT:", countRaw);

      const count = Number(countRaw);

      console.log("LOAN COUNT:", count);

      /*
       * No loans yet.
       */
      if (count === 0) {
        setLoans([]);
        setMessage("");
        return;
      }

      /*
       * Read every loan.
       */
      const records = await Promise.all(
        Array.from(
          { length: count },
          (_, id) => contract.getLoan(id)
        )
      );

      console.log("LOAN RECORDS:", records);

      /*
       * Convert contract data into UI-friendly data.
       */
      const formattedLoans: Loan[] = records
        .map((loan, id) => ({
          id: BigInt(id),
          borrower: loan.borrower,
          lender: loan.lender,
          principal: loan.principal,
          repayment: loan.repayment,
          dueDate: loan.dueDate,
          status: Number(loan.status),
        }))
        .reverse();

      setLoans(formattedLoans);
      setMessage("");
    } catch (error) {
      console.error("LOAD LOANS ERROR:", error);

      let errorMessage =
        "Could not load loans from the smart contract.";

      if (error instanceof Error) {
        console.error("ERROR MESSAGE:", error.message);

        if (error.message.includes("BAD_DATA")) {
          errorMessage =
            "The deployed contract does not appear to match the MicroLoan ABI. Check the deployed contract address and ABI.";
        } else if (
          error.message.toLowerCase().includes("network")
        ) {
          errorMessage =
            "Network error. Make sure MetaMask is connected to Sepolia.";
        } else {
          errorMessage = error.message;
        }
      }

      setMessage(errorMessage);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * CONNECT WALLET
   * ---------------------------------------------------------
   */
  const connectWallet = async () => {
    if (!window.ethereum) {
      setMessage(
        "Install MetaMask or another injected wallet to continue."
      );
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);

      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();

      const address = await signer.getAddress();

      const network = await provider.getNetwork();

      const currentChainId = Number(network.chainId);

      setAccount(address);
      setChainId(currentChainId);

      console.log("WALLET ADDRESS:", address);
      console.log("WALLET CHAIN ID:", currentChainId);

      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        setMessage(
          "Wallet connected. Please switch MetaMask to Sepolia."
        );
        return;
      }

      setMessage("Wallet connected.");

      await loadLoans();
    } catch (error) {
      console.error("WALLET CONNECTION ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Wallet connection was not completed."
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD + WALLET EVENTS
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadLoans();
    }, 0);

    const clockStart = window.setTimeout(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 0);

    const clock = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 60_000);

    const accountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;

      setAccount(accounts?.[0] ?? "");

      /*
       * Reload loans after account changes.
       */
      void loadLoans();
    };

    const chainChanged = () => {
      /*
       * Reload page when MetaMask network changes.
       * This guarantees the provider is recreated correctly.
       */
      window.location.reload();
    };

    window.ethereum?.on?.(
      "accountsChanged",
      accountsChanged
    );

    window.ethereum?.on?.(
      "chainChanged",
      chainChanged
    );

    return () => {
      window.clearTimeout(initialLoad);
      window.clearTimeout(clockStart);
      window.clearInterval(clock);

      window.ethereum?.removeListener?.(
        "accountsChanged",
        accountsChanged
      );

      window.ethereum?.removeListener?.(
        "chainChanged",
        chainChanged
      );
    };
  }, [loadLoans]);

  /*
   * ---------------------------------------------------------
   * TRANSACTIONS
   * ---------------------------------------------------------
   */
  const transact = async (
    action: (
      contract: Contract,
      signerAddress: string
    ) => Promise<unknown>
  ) => {
    if (!window.ethereum) {
      setMessage("Install a wallet to submit transactions.");
      return;
    }

    if (!contractAddress) {
      setMessage(
        "Contract address is not configured."
      );
      return;
    }

    /*
     * Connect wallet if not connected.
     */
    if (!account) {
      await connectWallet();
      return;
    }

    /*
     * Always verify the actual provider network,
     * rather than relying only on React state.
     */
    const provider = new BrowserProvider(window.ethereum);

    const network = await provider.getNetwork();

    const currentChainId = Number(network.chainId);

    setChainId(currentChainId);

    if (currentChainId !== SEPOLIA_CHAIN_ID) {
      setMessage(
        "Switch your wallet to Ethereum Sepolia to use this application."
      );
      return;
    }

    setBusy(true);

    try {
      /*
       * Verify contract exists before transaction.
       */
      const code = await provider.getCode(contractAddress);

      if (code === "0x" || code.length <= 2) {
        setMessage(
          "No MicroLoan contract was found at the configured address on Sepolia."
        );
        return;
      }

      const signer = await provider.getSigner();

      const signerAddress = await signer.getAddress();

      const contract = new Contract(
        contractAddress,
        contractABI,
        signer
      );

      setMessage(
        "Confirm the transaction in your wallet…"
      );

      const tx = (await action(
        contract,
        signerAddress
      )) as {
        wait: () => Promise<unknown>;
      };

      await tx.wait();

      setMessage("Transaction confirmed.");

      await loadLoans();
    } catch (error) {
      console.error("TRANSACTION ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Transaction failed."
      );
    } finally {
      setBusy(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * REQUEST LOAN
   * ---------------------------------------------------------
   */
  const requestLoan = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!principal || !repayment || !dueDate) {
      setMessage("Fill in all loan details.");
      return;
    }

    if (Number(repayment) < Number(principal)) {
      setMessage(
        "Repayment must be at least the principal."
      );
      return;
    }

    const timestamp = Math.floor(
      new Date(dueDate).getTime() / 1000
    );

    if (
      !Number.isFinite(timestamp) ||
      timestamp <= Date.now() / 1000
    ) {
      setMessage(
        "Choose a due date in the future."
      );
      return;
    }

    await transact((contract) =>
      contract.requestLoan(
        parseEther(principal),
        parseEther(repayment),
        timestamp
      )
    );

    setPrincipal("");
    setRepayment("");
    setDueDate("");
  };

  /*
   * ---------------------------------------------------------
   * LOAN ACTION BUTTONS
   * ---------------------------------------------------------
   */
  const loanAction = (loan: Loan) => {
    if (!account) {
      return (
        <button
          className="button button-subtle"
          onClick={connectWallet}
        >
          Connect to act
        </button>
      );
    }

    const mine =
      account.toLowerCase() ===
      loan.borrower.toLowerCase();

    /*
     * Open loan -> lender can fund it.
     */
    if (loan.status === 0 && !mine) {
      return (
        <button
          className="button button-primary"
          disabled={
            busy || chainId !== SEPOLIA_CHAIN_ID
          }
          onClick={() =>
            void transact((contract) =>
              contract.fundLoan(loan.id, {
                value: loan.principal,
              })
            )
          }
        >
          Fund {formatEther(loan.principal)} ETH
        </button>
      );
    }

    /*
     * Funded loan -> borrower can withdraw.
     */
    if (loan.status === 1 && mine) {
      return (
        <button
          className="button button-primary"
          disabled={
            busy || chainId !== SEPOLIA_CHAIN_ID
          }
          onClick={() =>
            void transact((contract) =>
              contract.withdrawLoan(loan.id)
            )
          }
        >
          Withdraw loan
        </button>
      );
    }

    /*
     * Active loan -> borrower can repay.
     */
    if (
      loan.status === 2 &&
      mine &&
      BigInt(now) <= loan.dueDate
    ) {
      return (
        <button
          className="button button-primary"
          disabled={
            busy || chainId !== SEPOLIA_CHAIN_ID
          }
          onClick={() =>
            void transact((contract) =>
              contract.repay(loan.id, {
                value: loan.repayment,
              })
            )
          }
        >
          Repay {formatEther(loan.repayment)} ETH
        </button>
      );
    }

    /*
     * Active loan past due date -> mark default.
     */
    if (
      loan.status === 2 &&
      now > 0 &&
      BigInt(now) > loan.dueDate
    ) {
      return (
        <button
          className="button button-subtle"
          disabled={
            busy || chainId !== SEPOLIA_CHAIN_ID
          }
          onClick={() =>
            void transact((contract) =>
              contract.markDefault(loan.id)
            )
          }
        >
          Mark default
        </button>
      );
    }

    return (
      <span className="muted">
        {mine ? "Your loan" : "No action available"}
      </span>
    );
  };

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-icon">m</span>
          <span>
            micro
            <span className="brand-accent">
              lend
            </span>
          </span>
        </a>

        <nav>
          <a href="#market">Marketplace</a>
          <a href="#how-it-works">
            How it works
          </a>
        </nav>

        <button
          className="button button-connect"
          onClick={connectWallet}
        >
          {account
            ? shortAddress(account)
            : "Connect wallet"}
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> PEER TO PEER
            LENDING · SEPOLIA
          </div>

          <h1>
            Small loans.
            <br />
            <span>Real opportunity.</span>
          </h1>

          <p>
            Borrow what you need or put your ETH to work.
            Transparent terms, secured by smart contracts.
          </p>

          <a
            className="button button-primary hero-cta"
            href="#market"
          >
            Explore the marketplace <span>↘</span>
          </a>

          <div className="hero-note">
            Built on Ethereum Sepolia <span>·</span>{" "}
            Non-custodial by design
          </div>
        </div>

        <div className="hero-card">
          <div className="card-top">
            <span>ON-CHAIN MARKETPLACE</span>
            <span className="card-mark">↗</span>
          </div>

          <div className="hero-amount">
            ETH <span>↗</span>
          </div>

          <div className="hero-amount-caption">
            Your wallet is your account
          </div>

          <div className="card-divider" />

          <div className="card-stat">
            <span>Loan terms</span>
            <strong>Set by people</strong>
          </div>

          <div className="card-stat">
            <span>Custody</span>
            <strong>You stay in control</strong>
          </div>

          <div className="card-stat">
            <span>Settlement</span>
            <strong>On-chain</strong>
          </div>

          <div className="card-footer">
            <span className="live-dot" />
            CONTRACT CONNECTED
          </div>
        </div>

        <div className="hero-orb orb-one" />
        <div className="hero-orb orb-two" />
      </section>

      <section
        className="market section-wrap"
        id="market"
      >
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              OPEN MARKET
            </div>

            <h2>Loan marketplace</h2>

            <p>
              Browse requests and choose a loan to fund.
            </p>
          </div>

          <button
            className="button button-subtle refresh"
            onClick={() => void loadLoans()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        <div className="market-grid">
          <section className="panel request-panel">
            <div className="panel-label">
              FOR BORROWERS <span>01</span>
            </div>

            <h3>Request a loan</h3>

            <p className="panel-description">
              Set clear repayment terms. Your request
              becomes visible to lenders.
            </p>

            <form
              onSubmit={requestLoan}
              className="loan-form"
            >
              <label>
                How much do you need?

                <div className="input-wrap">
                  <input
                    required
                    min="0.000001"
                    step="any"
                    type="number"
                    placeholder="0.00"
                    value={principal}
                    onChange={(e) =>
                      setPrincipal(e.target.value)
                    }
                  />

                  <span>ETH</span>
                </div>
              </label>

              <label>
                Total repayment

                <div className="input-wrap">
                  <input
                    required
                    min="0.000001"
                    step="any"
                    type="number"
                    placeholder="0.00"
                    value={repayment}
                    onChange={(e) =>
                      setRepayment(e.target.value)
                    }
                  />

                  <span>ETH</span>
                </div>

                <small>
                  Must be at least the amount borrowed.
                </small>
              </label>

              <label>
                Repayment due by

                <input
                  required
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(e.target.value)
                  }
                />
              </label>

              {account ? (
                <button
                  className="button button-primary submit-button"
                  type="submit"
                  disabled={
                    busy ||
                    chainId !== SEPOLIA_CHAIN_ID
                  }
                >
                  {busy
                    ? "Transaction pending…"
                    : "Publish loan request →"}
                </button>
              ) : (
                <button
                  className="button button-primary submit-button"
                  type="button"
                  onClick={connectWallet}
                >
                  Connect wallet to request
                </button>
              )}

              {!contractAddress && (
                <small className="error">
                  Contract address is not configured for
                  this deployment.
                </small>
              )}
            </form>
          </section>

          <div className="listing-column">
            <div className="listing-title">
              <div className="panel-label">
                FOR LENDERS{" "}
                <span>
                  {String(
                    loans.filter(
                      (loan) => loan.status === 0
                    ).length
                  ).padStart(2, "0")}
                </span>
              </div>

              <h3>Find an opportunity</h3>
            </div>

            {loans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⌁</div>

                <h4>
                  {loading
                    ? "Loading requests…"
                    : "It’s quiet here"}
                </h4>

                <p>
                  {loading
                    ? "Reading the latest on-chain loan activity."
                    : "No loan requests yet. Check back soon or be the first to post one."}
                </p>
              </div>
            ) : (
              <div className="loan-list">
                {loans.map((loan) => (
                  <article
                    className="loan-card"
                    key={loan.id.toString()}
                  >
                    <div className="loan-card-head">
                      <div>
                        <span className="loan-id">
                          LOAN #
                          {loan.id
                            .toString()
                            .padStart(4, "0")}
                        </span>

                        <span
                          className={`status status-${loan.status}`}
                        >
                          {statuses[loan.status] ??
                            "Unknown"}
                        </span>
                      </div>

                      <span className="loan-date">
                        Due{" "}
                        {new Date(
                          Number(loan.dueDate) *
                            1000
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="loan-values">
                      <div>
                        <small>Borrower asks</small>

                        <strong>
                          {formatEther(
                            loan.principal
                          )}{" "}
                          <em>ETH</em>
                        </strong>
                      </div>

                      <div>
                        <small>
                          Total repayment
                        </small>

                        <strong>
                          {formatEther(
                            loan.repayment
                          )}{" "}
                          <em>ETH</em>
                        </strong>
                      </div>

                      <div>
                        <small>Borrower</small>

                        <strong className="address-value">
                          {shortAddress(
                            loan.borrower
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="loan-card-action">
                      {loanAction(loan)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {message && (
          <div
            className="toast"
            role="status"
          >
            <span className="live-dot" />

            {message}

            <button
              onClick={() => setMessage("")}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
      </section>

      <section
        className="how section-wrap"
        id="how-it-works"
      >
        <div className="eyebrow">
          SIMPLE BY DESIGN
        </div>

        <h2>From request to repayment.</h2>

        <div className="steps">
          <article>
            <span>01</span>

            <h3>Agree on terms</h3>

            <p>
              Borrowers set the amount, repayment, and
              due date up front.
            </p>
          </article>

          <article>
            <span>02</span>

            <h3>Fund directly</h3>

            <p>
              Lenders fund a request from their wallet
              when the terms work for them.
            </p>
          </article>

          <article>
            <span>03</span>

            <h3>Repay on-chain</h3>

            <p>
              Borrowers repay the lender directly
              through the contract.
            </p>
          </article>
        </div>
      </section>

      <footer className="footer">
        <a
          className="brand"
          href="#top"
        >
          <span className="brand-icon">m</span>

          <span>
            micro
            <span className="brand-accent">
              lend
            </span>
          </span>
        </a>

        <span>
          Open finance, one connection at a time.
        </span>

        <span>
          Ethereum Sepolia ·{" "}
          {contractAddress
            ? shortAddress(contractAddress)
            : "Contract not configured"}
        </span>
      </footer>
    </main>
  );
}