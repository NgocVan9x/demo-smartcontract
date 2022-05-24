import Head from "next/head";
import styles from "../styles/Home.module.css";
import styled from 'styled-components'
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
// import Web3 from "web3";
import {ethers, utils} from "ethers";
import CryptoJS from 'crypto-js';
import axios from 'axios';
import {print} from 'graphql';
import gql from 'graphql-tag';

// const RPC = "https://bsc-dataseed.binance.org/";
const RPC = "https://data-seed-prebsc-1-s1.binance.org:8545/";
// const web3 = new Web3(RPC);

const bscProvider = new ethers.providers.JsonRpcProvider(RPC)

const STEP_WALLET = {
    STEP_NONE: 0,
    STEP_CREATE_WALLET: 1,
    STEP_IMPORT_WALLET: 2,
    STEP_CREATE_PASSWORD: 3,
    STEP_CREATE_LOAD_FROM_LOCAL: 4
}
const KEY_ENCRYPTED = "key_encrypted"
const PRIVATE_WALLET = "0x6F36Ecd27f84aB43084Ae478D0a2927f3c934225"

const API_LINK = "http://3.141.226.203:8080/graphql/"

export default function Home() {
    const [wallet, setWallet] = useState();
    const [password, setPassword] = useState();

    const [stepWallet, setStepWallet] = useState(STEP_WALLET.STEP_NONE);
    const [_, setLastUpdate] = useState(new Date().getTime());


    const logRef = useRef([]);
    const inputSeedPhraseRef = useRef();
    const inputPasswordRef = useRef();
    const inputDepositToSpendingAccountRef = useRef();
    const inputSendToExternalRef = useRef();
    const inputAmountToSendExternalRef = useRef();
    const inputWithdrawAccountWalletTokenRef = useRef();

    const addLog = (msg) => {
        // console.log("mgs", msg);
        logRef.current = [msg, ...logRef.current];
        setLastUpdate(new Date().getTime());
    };

    const log = useMemo(() => {
        return logRef.current
            .map(
                (item) => `${new Date().toLocaleTimeString()}: ${JSON.stringify(item)}`
            )
            .join("\n");
    }, [logRef.current]);

    useEffect(() => {
        logRef.current = [];

        // load key from localStorage

        const encrypted = localStorage.getItem(KEY_ENCRYPTED);
        if (encrypted) {
            setStepWallet(STEP_WALLET.STEP_CREATE_LOAD_FROM_LOCAL)
        }
    }, []);

    const btnCreateWallet = useCallback(async () => {
        addLog("============ Create Account Wallet Clicked! ============");
        setStepWallet(STEP_WALLET.STEP_CREATE_WALLET);
    }, []);

    const btnImportWallet = useCallback(() => {
            addLog("============ Import Account Wallet Clicked! ============");
            const mnemonic = inputSeedPhraseRef.current.value;
            // addLog(`seed phrase input ${mnemonic}`)
            if (utils.isValidMnemonic(mnemonic)) {
                setStepWallet(STEP_WALLET.STEP_IMPORT_WALLET)
            } else {
                addLog(" Seed phrase Wrong!")
            }
        }
        ,
        []
    )

    const btnCreatePasswordAPP = useCallback(async () => {
        addLog("============ Import Create Password Clicked! ============");
        const passwordInput = inputPasswordRef.current.value;
        if ((passwordInput && passwordInput.length < 7) || !passwordInput) {
            addLog("Please input password with 7 character");
        } else {
            if (stepWallet === STEP_WALLET.STEP_CREATE_WALLET) {
                const wallet = ethers.Wallet.createRandom();
                if (wallet) {
                    // encode seed phrase with password
                    const encrypted = CryptoJS.AES.encrypt(wallet.mnemonic.phrase, passwordInput);

                    // save encrypted to localStorage
                    localStorage.setItem(KEY_ENCRYPTED, encrypted);

                    addLog(wallet.mnemonic);
                    addLog("wallet.address: " + wallet.address);

                    // wallet connect with provider
                    const finalWallet = wallet.connect(bscProvider);
                    setWallet(finalWallet);

                    setStepWallet(STEP_WALLET.STEP_CREATE_PASSWORD);
                    inputPasswordRef.current.value = "";
                }
            } else if (stepWallet === STEP_WALLET.STEP_IMPORT_WALLET) {
                const mnemonic = inputSeedPhraseRef.current.value;
                const wallet = ethers.Wallet.fromMnemonic(mnemonic);
                if (wallet) {

                    // wallet connect with provider
                    const finalWallet = wallet.connect(bscProvider);
                    setWallet(finalWallet);

                    // encode seed phrase with password
                    const encrypted = CryptoJS.AES.encrypt(mnemonic, passwordInput);

                    // save encrypted to localStorage
                    localStorage.setItem(KEY_ENCRYPTED, encrypted);

                    setStepWallet(STEP_WALLET.STEP_CREATE_PASSWORD);
                    inputPasswordRef.current.value = "";
                }
            } else if (stepWallet === STEP_WALLET.STEP_CREATE_LOAD_FROM_LOCAL) {

                // decode seed phrase with password
                const encrypted = localStorage.getItem(KEY_ENCRYPTED);
                if (encrypted) {
                    try {
                        const decrypted = CryptoJS.AES.decrypt(encrypted, passwordInput);
                        const mnemonic = decrypted.toString(CryptoJS.enc.Utf8);

                        if (utils.isValidMnemonic(mnemonic)) {
                            const wallet = ethers.Wallet.fromMnemonic(mnemonic);
                            if (wallet) {

                                // wallet connect with provider
                                const finalWallet = wallet.connect(bscProvider);
                                setWallet(finalWallet);
                                setStepWallet(STEP_WALLET.STEP_CREATE_PASSWORD)
                                inputPasswordRef.current.value = "";
                            } else {
                                addLog("fails wallet decode!")
                                localStorage.removeItem(KEY_ENCRYPTED);
                                setStepWallet(STEP_WALLET.STEP_NONE)
                            }
                        } else {
                            addLog(" Wrong Password")
                            // setStepWallet(STEP_WALLET.STEP_CREATE_LOAD_FROM_LOCAL)
                        }
                    } catch (e) {
                        addLog(" Wrong Password")
                    }
                }
            }
        }
    }, [stepWallet])

    const btnLogOut = useCallback(() => {
        setWallet(null);
        localStorage.removeItem(KEY_ENCRYPTED);
        setStepWallet(STEP_WALLET.STEP_NONE);
    }, [])

    const btnGetBalanceOfAccount = useCallback(async () => {
        if (wallet) {
            const balance = await bscProvider.getBalance(wallet.address);
            addLog("balance of wallet: " + ethers.utils.formatEther(balance));
        }
    }, [wallet])

    const btnDepositToAccount = useCallback(async () => {
        const amountInEther = inputDepositToSpendingAccountRef.current.value;
        if (amountInEther) {
            // Create a transaction object
            let tx = {
                to: PRIVATE_WALLET,
                // Convert currency unit from ether to wei
                value: ethers.utils.parseEther(amountInEther)
            }
            // Send a transaction
            const txObj = await wallet.sendTransaction(tx);

            addLog('txHash: ' + txObj.hash)

            // need wait time for confirm and retry when finished
            // The status of a transaction is 1 is successful or 0 if it was reverted.

            const receipt = await bscProvider.getTransactionReceipt(txObj.hash);
            addLog(receipt)
        }
    }, [wallet])

    const btnSendToExternal = useCallback(async () => {
        const addressExtenal = inputSendToExternalRef.current.value;
        const amountInEther = inputAmountToSendExternalRef.current.value;

        if (addressExtenal && utils.isAddress(addressExtenal) && amountInEther) {
            // Create a transaction object
            let tx = {
                to: addressExtenal,
                // Convert currency unit from ether to wei
                value: ethers.utils.parseEther(amountInEther)
            }
            // Send a transaction
            const txObj = await wallet.sendTransaction(tx);

            addLog('txHash: ' + txObj.hash)

            // need wait time for confirm and retry when finished
            // The status of a transaction is 1 is successful or 0 if it was reverted.

            const receipt = await bscProvider.getTransactionReceipt(txObj.hash);
            addLog(receipt)
        }
    }, [wallet])

    const btnWithdrawAccountWalletToken = useCallback(async () => {
        const amountInEther = inputWithdrawAccountWalletTokenRef.current.value;
        if (wallet && amountInEther && parseFloat(amountInEther) > 0) {
            const withdrawTokenByOwner = gql`
                mutation withdrawTokenByOwner($address:String!, $amount:Float!) {
                    withdrawTokenByOwner(address:$address, amount:$amount) {
                        success
                        errorMsg
                        detail
                    }
                }
            `
            const headers = {
                'Content-Type': 'application/json'
            };
            const response = await axios.post(API_LINK, {
                query: print(withdrawTokenByOwner),
                variables: {
                    address: wallet.address,
                    amount: parseFloat(amountInEther),
                },
                headers: headers,
            })
            console.log(response)
            if (response.data && response.data.data.withdrawTokenByOwner.success) {
                inputWithdrawAccountWalletTokenRef.current.value = "";
                addLog("withdraw success! txthash: " + response.data.data.withdrawTokenByOwner.detail.transaction)
            } else {
                inputWithdrawAccountWalletTokenRef.current.value = "";
                addLog("withdraw fails!")
            }

        }
    }, [wallet])
    return (
        <div className={styles.container}>
            <Head>
                <title>Create Next App</title>
                <link rel="icon" href="/favicon.ico"/>
            </Head>

            <main className={styles.main}>
                <BtnLayout>
                    <h3>Address:</h3>
                    <h4>{wallet && wallet.address || "Not connected"}</h4>
                </BtnLayout>
                <BtnLayout>
                    {!wallet &&
                    <>
                        <button
                            onClick={btnCreateWallet}
                            className={`success ${stepWallet === STEP_WALLET.STEP_NONE ? "" : "disabled"}`}
                        >
                            Create account wallet
                        </button>

                        <button
                            onClick={btnImportWallet}
                            className={`success ${stepWallet === STEP_WALLET.STEP_NONE ? "" : "disabled"}`}
                        >
                            Import account wallet
                        </button>
                        <input ref={inputSeedPhraseRef}
                               disabled={`${stepWallet === STEP_WALLET.STEP_NONE ? "" : "disabled"}`}
                               placeholder={"input seed phrase"}/>
                    </>
                    }
                    {wallet &&
                    <button
                        onClick={btnLogOut}
                        className={`success ${wallet ? "" : "disabled"}`}
                    >
                        Log out Account
                    </button>
                    }
                </BtnLayout>
                <BtnLayout>
                    <input
                        ref={inputPasswordRef}
                        disabled={`${stepWallet === STEP_WALLET.STEP_CREATE_WALLET || stepWallet === STEP_WALLET.STEP_IMPORT_WALLET || stepWallet === STEP_WALLET.STEP_CREATE_LOAD_FROM_LOCAL ? "" : "disabled"}`}
                        placeholder={"input password"}/>
                    <button
                        onClick={btnCreatePasswordAPP}
                        className={`success ${stepWallet === STEP_WALLET.STEP_CREATE_WALLET || stepWallet === STEP_WALLET.STEP_IMPORT_WALLET || stepWallet === STEP_WALLET.STEP_CREATE_LOAD_FROM_LOCAL ? "" : "disabled"}`}
                    >
                        {stepWallet === STEP_WALLET.STEP_CREATE_LOAD_FROM_LOCAL ? `Please Input Password` : `Create account password`}
                    </button>
                </BtnLayout>
                <BtnLayout>
                    {/*<button*/}
                    {/*    onClick={btnImportWallet}*/}
                    {/*    className={"success"}*/}
                    {/*>*/}
                    {/*    Decode seed phrase from LocalStorage*/}
                    {/*</button>*/}
                    <button className={"success"} onClick={btnGetBalanceOfAccount}>Get balance of Account wallet BNB
                    </button>
                    <button>Get balance of Spending wallet BNB</button>
                </BtnLayout>

                <BtnLayout>
                    {/*<button*/}
                    {/*    onClick={btnImportWallet}*/}
                    {/*    className={"success"}*/}
                    {/*>*/}
                    {/*    Decode seed phrase from LocalStorage*/}
                    {/*</button>*/}
                    <button>Get balance of Account wallet Token
                        LBRD
                    </button>
                    <button>Get balance of Spending wallet Token LBRD</button>
                </BtnLayout>

                <BtnLayout>
                    <button className={"success"} onClick={btnDepositToAccount}>Deposit to Spending account BNB</button>
                    <input ref={inputDepositToSpendingAccountRef} placeholder={"input number deposit"}/>

                    <button>Deposit to Spending account Token LBRD</button>
                    <input placeholder={"input number deposit"}/>
                </BtnLayout>
                <BtnLayout>
                    <button>+- balance</button>
                    <input placeholder={"input number update balance"}/>

                </BtnLayout>
                <BtnLayout>
                    <button>Withdraw to Account wallet BNB</button>
                    <input placeholder={"input number Withdraw"}/>
                    <button className={"success"} onClick={btnWithdrawAccountWalletToken}>Withdraw to Account wallet
                        Token LBRD
                    </button>
                    <input ref={inputWithdrawAccountWalletTokenRef} placeholder={"input number Withdraw"}/>
                </BtnLayout>
                <BtnLayout>
                    <button className={"success"} onClick={btnSendToExternal}>Withdraw to external BNB</button>
                    <input ref={inputSendToExternalRef} placeholder={"input address withdraw"}/>
                    <input ref={inputAmountToSendExternalRef} placeholder={"input amount withdraw"}/>
                </BtnLayout>

                <BtnLayout>
                    <button>Withdraw to external Token LBRD</button>
                    <button>Approve to external Token</button>
                    <input placeholder={"input address withdraw"}/>
                    <input placeholder={"input amount withdraw"}/>
                </BtnLayout>
                <BtnLayout>

                    <button>Trading</button>
                </BtnLayout>
                <Log>{log}</Log>
            </main>
        </div>
    );
}
const Log = styled.pre`
  flex: 1;
  margin: 20px;
  width: auto;
  padding: 16px;
  background: black;
  color: lightgreen;
  font-size: 14px;
  font-weight: normal;
  line-height: 18px;
  white-space: pre-wrap;
  word-break: break-all;
`;

const BtnLayout = styled.div`
  display: flex;
  flex-direction: row;
  margin: 10px auto;
  flex-wrap: wrap;
  max-width: 1400px;
  justify-content: flex-start;
  align-items: center;

  button {
    outline: none;
    background: orange;
    color: black;
    font-size: 12px;
    font-weight: 600;
    margin: 4px 8px;
    padding: 8px;

    &.error {
      background: red;
    }

    &.success {
      background: lightgreen;
    }

    &.disabled {
      background: lightgrey;
    }
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 4px 8px;
    padding: 8px;
  }

  h4 {
    font-size: 13px;
    line-height: 16px;
    font-weight: 600;
    margin: 4px 0;
    padding: 8px 0;
    text-decoration: underline;
  }

  input {
    font-size: 16px;
    font-weight: 600;
    margin: 4px 8px;
    padding: 8px;
  }
`;