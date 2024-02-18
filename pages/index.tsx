import React, { useState } from "react";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { abi } from "../contract-abi";
import FlipCard, { BackCard, FrontCard } from "../components/FlipCard";
import { hexToNumber } from "viem";

const contractConfig = {
  address: "0x9100B9735294C9AA156390a6e47D0d275B053977",
  abi,
} as const;

const Home: NextPage = () => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [totalMinted, setTotalMinted] = React.useState(0);
  const { isConnected, address } = useAccount();

  const {
    data: hash,
    writeContract: mint,
    isPending: isMintLoading,
    isSuccess: isMintStarted,
    error: mintError,
  } = useWriteContract();

  const { data: totalSupplyData } = useReadContract({
    ...contractConfig,
    functionName: "totalSupply",
  });

  const {
    data: txData,
    isSuccess: txSuccess,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  });

  React.useEffect(() => {
    if (totalSupplyData) {
      setTotalMinted(Number(totalSupplyData));
    }
  }, [totalSupplyData]);

  const isMinted = txSuccess;

  const mintFunction = (tokenURI: string) =>
    mint?.({
      ...contractConfig,
      functionName: "safeMint",
      args: [address, tokenURI],
      value: 10000000000000000n,
    });

  const [newMintImageUrl, setNewMintImageUrl] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="page">
      <div className="container">
        <div style={{ flex: "1 1 auto" }}>
          <div style={{ padding: "24px 24px 24px 0" }}>
            <h1>Mint a BOY</h1>
            <h4 style={{ margin: "8px 0 6px" }}>0.01 ETH</h4>
            <p style={{ margin: "12px 0 24px" }}>
              {Number(totalMinted)} minted so far!
            </p>
            <ConnectButton />
            {mintError && (
              <p style={{ marginTop: 24, color: "#FF6257" }}>
                Error: {mintError.message}
              </p>
            )}
            {txError && (
              <p style={{ marginTop: 24, color: "#FF6257" }}>
                Error: {txError.message}
              </p>
            )}
            {mounted && isConnected && !isMinted && (
              <button
                style={{ marginTop: 24 }}
                disabled={
                  !mint || isMintLoading || isMintStarted || isGenerating
                }
                className="button"
                data-mint-loading={isMintLoading}
                data-mint-started={isMintStarted}
                data-generated-started={isGenerating}
                onClick={() => {
                  setIsGenerating(true);
                  fetch("/api/generate").then((res) => {
                    res.json().then((data) => {
                      setIsGenerating(false);
                      mintFunction(data.url);
                      setNewMintImageUrl(data.image);
                    });
                  });
                }}
              >
                {isGenerating && "Generating your BOY"}
                {isMintLoading && "Waiting for approval"}
                {isMintStarted && "Minting..."}
                {!isGenerating && !isMintLoading && !isMintStarted && "Mint"}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <FlipCard>
            <FrontCard isCardFlipped={isMinted}>
              <Image
                layout="responsive"
                src="/nft.gif"
                width="500"
                height="500"
                alt="RainbowKit Demo NFT"
                style={{ border: "3px solid black", borderRadius: "16px" }}
              />
              <h1 style={{ marginTop: 24 }}>Rainbow NFT</h1>
              <ConnectButton />
            </FrontCard>
            <BackCard isCardFlipped={isMinted}>
              <div style={{ padding: 24 }}>
                <Image
                  src={newMintImageUrl}
                  width="80"
                  height="80"
                  alt="Your BOY"
                  unoptimized={true}
                />
                <h2 style={{ marginTop: 24, marginBottom: 6 }}>
                  #{hexToNumber(txData?.logs[0]?.topics[3] ?? `0x0`)} BOY
                  Minted!
                </h2>
                <p style={{ marginBottom: 24 }}>
                  Your BOY will show up in your wallet in the next few minutes.
                </p>
                <p style={{ marginBottom: 6 }}>
                  View on{" "}
                  <a
                    target="_blank"
                    href={`https://sepolia.etherscan.io/tx/${hash}`}
                  >
                    Etherscan
                  </a>
                </p>
                <p>
                  View on{" "}
                  <a
                    target="_blank"
                    href={`https://testnets.opensea.io/assets/sepolia/${
                      txData?.to
                    }/${hexToNumber(txData?.logs[0]?.topics[3] ?? `0x0`)}`}
                  >
                    Opensea
                  </a>
                </p>
              </div>
            </BackCard>
          </FlipCard>
        </div>
      </div>
    </div>
  );
};

export default Home;
