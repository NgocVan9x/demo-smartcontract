import Head from "next/head";
import styles from "../styles/Home.module.css";
import styled from 'styled-components'
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
// import Web3 from "web3";
import CreateAccountForm from "../src/CreateAccountForm";
import * as bip39 from "bip39";
import {ethers} from "ethers";

const RPC = "https://api.avax-test.network/ext/bc/C/rpc";
// const web3 = new Web3(RPC);

const provider = new ethers.providers.JsonRpcProvider(RPC);

export default function Home() {
    const [account, setAccount] = useState();
    const [_, setLastUpdate] = useState(new Date().getTime());
    const [createAccountClicked, setCreateAccountClicked] = useState(false)
    const logRef = useRef([]);

    const addLog = (msg) => {
        console.log("mgs", msg);
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
    }, []);

    const btnCreateAccount = useCallback(async () => {
        addLog("create Account!");
        // const account = web3.eth.accounts.wallet;
        // const password = prompt("Password");
        setCreateAccountClicked(true);
        // if (password) {
        // const randomSeed = ethers.Wallet.createRandom();
        // addLog(randomSeed.mnemonic);
        // addLog(randomSeed.address);
        const wallet = ethers.Wallet.createRandom();
        console.log(wallet.address)
        console.log(wallet.mnemonic)
        const balance = await provider.getBalance(wallet.address)
        // { BigNumber: "2337132817842795605" }

        console.log(ethers.utils.formatEther(balance))

    }, []);

    return (
        <div className={styles.container}>
            <Head>
                <title>Create Next App</title>
                <link rel="icon" href="/favicon.ico"/>
            </Head>

            <main className={styles.main}>
                <BtnLayout>
                    <h3>Address:</h3>
                    <h4>{account || "Not connected"}</h4>
                </BtnLayout>
                {!createAccountClicked ?
                    <BtnLayout>
                        <button
                            onClick={btnCreateAccount}
                            className={`${account ? "" : "disabled"}`}
                        >
                            {account ? "Disconnect" : "Create Account"}
                        </button>
                    </BtnLayout>
                    : <CreateAccountForm/>
                   }
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
  margin: 0 auto;
  flex-wrap: wrap;
  max-width: 1400px;
  justify-content: center;
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
`;