#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ERC20_ABI } from './ERC20_ABI.js';
import { UNISWAP_ROUTER_ABI } from './UNISWAP_ROUTER_ABI.js';
import { UNISWAP_FACTORY_ABI } from './UNISWAP_FACTORY_ABI.js';
import { QUOTER_V2_ABI } from './QUOTER_V2_ABI.js';
import {WETH_ABI} from "./WETH_ABI.js";

dotenv.config();
path.dirname(fileURLToPath(import.meta.url));

type SupportedNetwork = 'mainnet' | 'sepolia' | 'base';

interface NetworkConfig {
    rpc: string;
    usdcAddress: string;
    name: string;
    uniswapRouter: string;
    uniswapFactory: string;
    quoterV2: string;
    wethAddress: string;
}

const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        console.error(`❌ Missing env var: ${key}`);
        process.exit(1);
    }
    return value;
};

const network = requireEnv('NETWORK').toLowerCase() as SupportedNetwork;

const loadNetworkConfig = (network: SupportedNetwork): NetworkConfig => {
    switch (network) {
        case 'mainnet':
            return {
                rpc: requireEnv('MAINNET_RPC_URL'),
                usdcAddress: requireEnv('MAINNET_USDC_ADDRESS'),
                name: 'Ethereum Mainnet',
                uniswapRouter: requireEnv('MAINNET_UNISWAP_ROUTER'),
                uniswapFactory: requireEnv('MAINNET_UNISWAP_FACTORY'),
                quoterV2: requireEnv('MAINNET_QUOTER_V2'),
                wethAddress: requireEnv('MAINNET_WETH_ADDRESS'),
            };
        case 'sepolia':
            return {
                rpc: requireEnv('SEPOLIA_RPC_URL'),
                usdcAddress: requireEnv('SEPOLIA_USDC_ADDRESS'),
                name: 'Sepolia Testnet',
                uniswapRouter: requireEnv('SEPOLIA_UNISWAP_ROUTER'),
                uniswapFactory: requireEnv('SEPOLIA_UNISWAP_FACTORY'),
                quoterV2: requireEnv('SEPOLIA_QUOTER_V2'),
                wethAddress: requireEnv('SEPOLIA_WETH_ADDRESS'),
            };
        case 'base':
            return {
                rpc: requireEnv('BASE_RPC_URL'),
                usdcAddress: requireEnv('BASE_USDC_ADDRESS'),
                name: 'Base Network',
                uniswapRouter: requireEnv('BASE_UNISWAP_ROUTER'),
                uniswapFactory: requireEnv('BASE_UNISWAP_FACTORY'),
                quoterV2: requireEnv('BASE_QUOTER_V2'),
                wethAddress: requireEnv('BASE_WETH_ADDRESS'),
            };
    }
};

const config = loadNetworkConfig(network);
const provider = new ethers.JsonRpcProvider(config.rpc);
const USDC_ADDRESS = ethers.getAddress(config.usdcAddress);
const FEE_TIER = 3000;

const formatNumber = (num: string | number): string =>
    Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

// =============================
// Classes
// =============================

class ERC20Client {
    private readonly address: string;
    private readonly contract: ethers.Contract;

    constructor(tokenAddress: string, runner: ethers.Provider | ethers.Signer) {
        this.address = ethers.getAddress(tokenAddress);
        this.contract = new ethers.Contract(this.address, ERC20_ABI, runner);
    }

    balanceOf(owner: string): Promise<bigint> {
        return this.contract.balanceOf(owner);
    }

    decimals(): Promise<number> {
        return this.contract.decimals();
    }

    transfer(to: string, amount: bigint) {
        return this.contract.transfer(ethers.getAddress(to), amount);
    }

    approve(spender: string, amount: bigint) {
        return this.contract.approve(ethers.getAddress(spender), amount);
    }

    symbol(): Promise<string> {
        return this.contract.symbol();
    }

    totalSupply(): Promise<bigint> {
        return this.contract.totalSupply();
    }
}

class UniswapFactoryClient {
    private readonly contract: ethers.Contract;

    constructor(factoryAddress: string, runner: ethers.Provider | ethers.Signer) {
        this.contract = new ethers.Contract(
            ethers.getAddress(factoryAddress),
            UNISWAP_FACTORY_ABI,
            runner,
        );
    }

    getPool(tokenA: string, tokenB: string, fee: number): Promise<string> {
        return this.contract.getPool(
            ethers.getAddress(tokenA),
            ethers.getAddress(tokenB),
            fee,
        );
    }

    async verifyPoolExists(tokenA: string, tokenB: string, fee: number): Promise<boolean> {
        try {
            const pool = await this.getPool(tokenA, tokenB, fee);
            if (pool === ethers.ZeroAddress) {
                console.error(
                    `❌ Pool does not exist for ${tokenA.slice(0, 6)}.../${tokenB.slice(
                        0,
                        6,
                    )}... (fee: ${fee})`,
                );
                return false;
            }
            console.log(`✅ Pool found: ${pool}`);
            return true;
        } catch (e) {
            if (e instanceof Error) console.error('❌ Error verifying pool:', e.message);
            return false;
        }
    }
}

class UniswapQuoterClient {
    private readonly contract: ethers.Contract;

    constructor(quoterAddress: string, runner: ethers.Provider | ethers.Signer) {
        this.contract = new ethers.Contract(
            ethers.getAddress(quoterAddress),
            QUOTER_V2_ABI,
            runner,
        );
    }

    async quoteExactInputSingle(
        tokenIn: string,
        tokenOut: string,
        amountIn: bigint,
        fee: number,
    ): Promise<bigint | null> {
        try {
            const params = {
                tokenIn: ethers.getAddress(tokenIn),
                tokenOut: ethers.getAddress(tokenOut),
                amountIn,
                fee,
                sqrtPriceLimitX96: 0n,
            };

            const result = await this.contract.quoteExactInputSingle.staticCall(params);
            const amountOut = result.amountOut as bigint;
            return amountOut;
        } catch (e) {
            if (e instanceof Error) console.error('⚠️  Could not get quote from QuoterV2:', e.message);
            return null;
        }
    }
}

class UniswapRouterClient {
    private readonly contract: ethers.Contract;

    constructor(routerAddress: string, signer: ethers.Signer) {
        this.contract = new ethers.Contract(
            ethers.getAddress(routerAddress),
            UNISWAP_ROUTER_ABI,
            signer,
        );
    }

    exactInputSingle(params: any, overrides?: any) {
        return this.contract.exactInputSingle(params, overrides ?? {});
    }

    exactInputSingleStatic(params: any, overrides?: any) {
        return this.contract.exactInputSingle.staticCall(params, overrides ?? {});
    }
}

class WalletService {
    constructor(private readonly provider: ethers.JsonRpcProvider) {}

    async getETHBalance(address: string): Promise<void> {
        try {
            console.log(`\n📍 Fetching ETH balance for: ${address}`);
            const balance = await this.provider.getBalance(address);
            const formatted = ethers.formatEther(balance);
            console.log(`✅ Balance: ${balance} (${formatted} ETH)\n`);
        } catch (error) {
            if (error instanceof Error) console.error('❌ Error:', error.message);
            else console.error('❌ Unknown error occurred');
        }
    }

    async getTokenBalance(tokenAddress: string, address: string, symbol: string): Promise<void> {
        try {
            console.log(`\n📍 Fetching ${symbol} balance for: ${address}`);
            const erc20 = new ERC20Client(tokenAddress, this.provider);
            const [bal, dec] = await Promise.all([erc20.balanceOf(address), erc20.decimals()]);
            const formatted = ethers.formatUnits(bal, dec);
            console.log(`✅ Balance: ${bal} (${formatted} ${symbol})\n`);
        } catch (error) {
            if (error instanceof Error) console.error('❌ Error:', error.message);
            else console.error('❌ Unknown error occurred');
        }
    }
}

class SwapService {
    private readonly weth: string;
    private readonly factory: UniswapFactoryClient;
    private readonly quoter: UniswapQuoterClient;

    constructor(
        private readonly provider: ethers.JsonRpcProvider,
        private readonly routerAddress: string,
        factoryAddress: string,
        quoterAddress: string,
        wethAddress: string,
    ) {
        this.weth = ethers.getAddress(wethAddress);
        this.factory = new UniswapFactoryClient(factoryAddress, provider);
        this.quoter = new UniswapQuoterClient(quoterAddress, provider);
    }

    private getWallet(): ethers.Wallet | null {
        const pk = process.env.PRIVATE_KEY;
        if (!pk) {
            console.error('❌ PRIVATE_KEY not set in environment');
            return null;
        }
        return new ethers.Wallet(pk, this.provider);
    }

    private validatePair(fromToken: string, toToken: string): { from: string; to: string } | null {
        const from = fromToken.toLowerCase();
        const to = toToken.toLowerCase();

        const supported = ['eth', 'usdc', 'weth'] as const;

        if (!supported.includes(from as any) || !supported.includes(to as any)) {
            console.error('❌ Unsupported token. Use "eth" or "usdc"');
            return null;
        }

        if (from === to) {
            console.error('❌ Cannot swap token to itself');
            return null;
        }

        return { from, to };
    }

    async swap(amount: string, fromToken: string, toToken: string, options?: { dry?: boolean }): Promise<void> {
        try {
            if (!USDC_ADDRESS) {
                console.error('❌ USDC_ADDRESS not set in environment');
                return;
            }

            const pair = this.validatePair(fromToken, toToken);
            if (!pair) return;

            const wallet = this.getWallet();
            if (!wallet) return;

            const router = new UniswapRouterClient(this.routerAddress, wallet);
            const usdc = USDC_ADDRESS;

            console.log(`\n🔄 Swapping ${fromToken.toUpperCase()} for ${toToken.toUpperCase()} via Uniswap...`);
            console.log(`📤 From: ${wallet.address}`);
            console.log(`💰 Amount: ${amount} ${fromToken.toUpperCase()}`);
            console.log(`🔗 Network: ${config.name}\n`);

            let tx;

// ETH -> USDC (NO approval, router wraps ETH to WETH automatically)
// WETH -> USDC (WITH approval, pure ERC-20 path)

            if (pair.from === "eth" && pair.to === "usdc") {
                //
                // 🔵 ETH → USDC
                //
                const amountInWei = ethers.parseEther(amount);

                console.log(`📍 Verifying pool exists...`);
                const poolExists = await this.factory.verifyPoolExists(this.weth, usdc, FEE_TIER);
                if (!poolExists) return;

                console.log(`📍 Getting quote from QuoterV2...`);
                const quotedOut = await this.quoter.quoteExactInputSingle(
                    this.weth,
                    usdc,
                    amountInWei,
                    FEE_TIER,
                );

                if (quotedOut === null) {
                    console.error("❌ Failed to get quote, aborting swap");
                    return;
                }

                const slippage = (quotedOut * 1n) / 100n;
                const amountOutMinimum = quotedOut - slippage;

                console.log(`💱 Quoted output: ${ethers.formatUnits(quotedOut, 6)} USDC`);
                console.log(`📉 Minimum received: ${ethers.formatUnits(amountOutMinimum, 6)} USDC\n`);

                //
                // 🔑 NO approval here!
                //
                const params = {
                    tokenIn: this.weth,
                    tokenOut: usdc,
                    fee: FEE_TIER,
                    recipient: wallet.address,
                    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
                    amountIn: amountInWei,
                    amountOutMinimum,
                    sqrtPriceLimitX96: 0n,
                };

                const overrides = { value: amountInWei }; // Router wraps ETH→WETH internally

                if (options?.dry) {
                    console.log("🧪 Dry-run ETH→USDC...");
                    const out = await router.exactInputSingleStatic(params, overrides);
                    console.log(`🔬 Preview: ${ethers.formatUnits(out, 6)} USDC`);
                    return;
                }

                tx = await router.exactInputSingle(params, overrides);
            }


// --------------------------------------------------------------
// WETH → USDC (approval required, NO native ETH sent)
// --------------------------------------------------------------

            if (pair.from === "weth" && pair.to === "usdc") {
                //
                // 🔵 WETH → USDC
                //
                const amountInWei = ethers.parseEther(amount);

                console.log(`📍 Verifying pool exists...`);
                const poolExists = await this.factory.verifyPoolExists(this.weth, usdc, FEE_TIER);
                if (!poolExists) return;

                console.log(`📍 Approving router to spend WETH...`);
                const wethContract = new ERC20Client(this.weth, wallet);
                const approvalTx = await wethContract.approve(this.routerAddress, amountInWei);
                await approvalTx.wait();
                console.log(`✔️ Approval confirmed\n`);

                console.log(`📍 Getting quote...`);
                const quotedOut = await this.quoter.quoteExactInputSingle(
                    this.weth,
                    usdc,
                    amountInWei,
                    FEE_TIER,
                );

                const slippage = (quotedOut * 1n) / 100n;
                const amountOutMinimum = quotedOut - slippage;

                console.log(`💱 Quoted output: ${ethers.formatUnits(quotedOut, 6)} USDC`);

                const params = {
                    tokenIn: this.weth,
                    tokenOut: usdc,
                    fee: FEE_TIER,
                    recipient: wallet.address,
                    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
                    amountIn: amountInWei,
                    amountOutMinimum,
                    sqrtPriceLimitX96: 0n,
                };

                if (options?.dry) {
                    console.log("🧪 Dry-run WETH→USDC...");
                    const out = await router.exactInputSingleStatic(params);
                    console.log(`🔬 Preview: ${ethers.formatUnits(out, 6)} USDC`);
                    return;
                }

                tx = await router.exactInputSingle(params);
            }

            if (!tx) {
                console.error('❌ No transaction created (check from/to tokens)');
                return;
            }

            console.log(`⏳ Transaction sent: ${tx.hash}`);
            console.log(`⏳ Waiting for confirmation...`);

            const receipt = await tx.wait();
            if (receipt) {
                console.log(`✅ Swap confirmed!`);
                console.log(`✅ Block: ${receipt.blockNumber}`);
                console.log(`✅ Gas Used: ${receipt.gasUsed}`);
                console.log(`✅ Status: ${receipt.status === 1 ? 'Success' : 'Failed'}\n`);
            }
        } catch (error) {
            if (error instanceof Error) console.error('❌ Error:', error.message);
            else console.error('❌ Unknown error occurred');
        }
    }
}

// =============================
// Helpers
// =============================

async function queryWETH(): Promise<void> {
    try {
        const wethClient = new ERC20Client(config.wethAddress, provider);

        console.log(`\n💰 Querying WETH (${config.name}): ${config.wethAddress}`);
        const [symbol, decimals, totalSupply] = await Promise.all([
            wethClient.symbol(),
            wethClient.decimals(),
            wethClient.totalSupply(),
        ]);

        const formattedSupply = ethers.formatUnits(totalSupply, decimals);

        console.log(`✅ Symbol: ${symbol}`);
        console.log(`✅ Decimals: ${decimals}`);
        console.log(`✅ Total Supply: ${formatNumber(formattedSupply)} ${symbol}\n`);
    } catch (error) {
        if (error instanceof Error) console.error('❌ Error:', error.message);
        else console.error('❌ Unknown error occurred');
    }
}

async function queryUSDC(): Promise<void> {
    try {
        console.log(`\n💰 Querying USDC (${config.name}): ${USDC_ADDRESS}`);
        const usdcClient = new ERC20Client(USDC_ADDRESS, provider);

        const [symbol, decimals, totalSupply] = await Promise.all([
            usdcClient.symbol(),
            usdcClient.decimals(),
            usdcClient.totalSupply(),
        ]);

        const formattedSupply = ethers.formatUnits(totalSupply, decimals);

        console.log(`✅ Symbol: ${symbol}`);
        console.log(`✅ Decimals: ${decimals}`);
        console.log(`✅ Total Supply: ${formatNumber(formattedSupply)} ${symbol}\n`);
    } catch (error) {
        if (error instanceof Error) console.error('❌ Error:', error.message);
        else console.error('❌ Unknown error occurred');
    }
}

async function queryETH(): Promise<void> {
    try {
        console.log(`\n💰 Querying ETH (${config.name})`);
        console.log(`✅ Symbol: ETH`);
        console.log(`✅ Decimals: 18`);
        console.log(`✅ Type: Native blockchain token (not an ERC20 contract)`);
        const feeData = await provider.getFeeData();
        if (feeData?.gasPrice) {
            console.log(`✅ Current Gas Price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} Gwei\n`);
        }
    } catch (error) {
        if (error instanceof Error) console.error('❌ Error:', error.message);
        else console.error('❌ Unknown error occurred');
    }
}

async function getLatestBlock(): Promise<void> {
    try {
        console.log(`\n📦 Fetching latest block...`);
        const block = await provider.getBlock('latest');

        if (!block) {
            console.error('❌ No block data returned');
            return;
        }

        console.log(`✅ Block Number: ${block.number}`);
        console.log(`✅ Timestamp: ${new Date((block.timestamp || 0) * 1000).toISOString()}`);
        console.log(`✅ Gas Used: ${block.gasUsed}`);
        console.log(`✅ Miner: ${block.miner}\n`);
    } catch (error) {
        if (error instanceof Error) console.error('❌ Error:', error.message);
        else console.error('❌ Unknown error occurred');
    }
}

function createWallet(): void {
    try {
        const wallet = ethers.Wallet.createRandom();
        const envPath = path.join(process.cwd(), '.env');

        const address = wallet.address;
        const privateKey = wallet.privateKey;

        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }

        // Remove old lines and append new ones
        envContent = envContent
            .split('\n')
            .filter(line => !line.startsWith('WALLET_ADDRESS=') && !line.startsWith('PRIVATE_KEY='))
            .join('\n');

        envContent += `\nWALLET_ADDRESS=${address}\nPRIVATE_KEY=${privateKey}\n`;

        fs.writeFileSync(envPath, envContent.trim() + '\n');

        console.log(`\n🔐 Wallet Created & Saved to .env`);
        console.log(`✅ Address:     ${address}`);
        console.log(`✅ Private Key: ${privateKey}`);
        console.log(`⚠️  Keep PRIVATE_KEY safe! Never share it.\n`);
    } catch (error) {
        if (error instanceof Error) console.error('❌ Error:', error.message);
        else console.error('❌ Unknown error occurred');
    }
}

async function sendETH(toAddress: string, amount: string): Promise<void> {
    try {
        const pk = process.env.PRIVATE_KEY;
        if (!pk) {
            console.error('❌ PRIVATE_KEY not set in environment');
            return;
        }

        const wallet = new ethers.Wallet(pk, provider);
        console.log(`\n💸 Sending ETH...`);
        console.log(`📤 From: ${wallet.address}`);
        console.log(`📥 To: ${toAddress}`);
        console.log(`💰 Amount: ${amount} ETH`);

        const tx = await wallet.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(amount),
        });

        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);

        const receipt = await tx.wait();
        if (receipt) {
            console.log(`✅ Transaction confirmed!`);
            console.log(`✅ Block: ${receipt.blockNumber}`);
            console.log(`✅ Gas Used: ${receipt.gasUsed}\n`);
        }
    } catch (error) {
        if (error instanceof Error) console.error('❌ Error:', error.message);
        else console.error('❌ Unknown error occurred');
    }
}

async function sendUSDC(toAddress: string, amount: string): Promise<void> {
    try {
        const pk = process.env.PRIVATE_KEY;
        if (!pk) {
            console.error('❌ PRIVATE_KEY not set in environment');
            return;
        }

        const wallet = new ethers.Wallet(pk, provider);
        const usdcClient = new ERC20Client(USDC_ADDRESS, wallet);

        console.log(`\n💸 Sending USDC...`);
        console.log(`📤 From: ${wallet.address}`);
        console.log(`📥 To: ${toAddress}`);
        console.log(`💰 Amount: ${amount} USDC`);

        const decimals = await usdcClient.decimals();
        const amountWithDecimals = ethers.parseUnits(amount, decimals);

        const tx = await usdcClient.transfer(toAddress, amountWithDecimals);

        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);

        const receipt = await tx.wait();
        if (receipt) {
            console.log(`✅ Transaction confirmed!`);
            console.log(`✅ Block: ${receipt.blockNumber}`);
            console.log(`✅ Gas Used: ${receipt.gasUsed}\n`);
        }
    } catch (error) {
        if (error instanceof Error) console.error('❌ Error:', error.message);
        else console.error('❌ Unknown error occurred');
    }
}

async function walletInfo(address: string): Promise<void> {
    try {
        console.log(`\n📊 Wallet Info for: ${address}`);
        console.log(`🔗 Network: ${config.name}\n`);

        const ethBalance = await provider.getBalance(address);
        const formattedETH = ethers.formatEther(ethBalance);
        console.log(`✅ ETH Balance: ${ethBalance} (${formattedETH} ETH)`);

        if (USDC_ADDRESS) {
            const usdcClient = new ERC20Client(USDC_ADDRESS, provider);
            const [usdcBalance, dec] = await Promise.all([
                usdcClient.balanceOf(address),
                usdcClient.decimals(),
            ]);
            const formattedUSDC = ethers.formatUnits(usdcBalance, dec);
            console.log(`✅ USDC Balance: ${usdcBalance}, fmt ${formattedUSDC} USDC`);
        }

        const txCount = await provider.getTransactionCount(address);
        console.log(`✅ Transaction Count: ${txCount}`);

        try {
            const latestBlock = await provider.getBlock('latest');
            if (!latestBlock) {
                console.log(`⚠️  No block data available\n`);
                return;
            }

            interface TxDetail {
                to: string;
                amount: string;
                date: string;
                timestamp: number;
            }

            const sentTransactions: TxDetail[] = [];
            const blocksToScan = 1;

            console.log(`\n🔍 Scanning ${blocksToScan} recent block for outgoing transactions...`);
            const startTime = Date.now();

            for (let i = 0; i < blocksToScan; i++) {
                const blockNum = latestBlock.number - i;
                const progress = Math.round(((i + 1) / blocksToScan) * 100);
                process.stdout.write(`\r⏳ Progress: ${progress}% (${i + 1}/${blocksToScan} block)`);

                const block = await provider.getBlock(blockNum);
                if (!block?.transactions) continue;

                for (let txIdx = 0; txIdx < block.transactions.length; txIdx++) {
                    const txHash = block.transactions[txIdx];
                    const txProgress = Math.round(((txIdx + 1) / block.transactions.length) * 100);
                    process.stdout.write(
                        `\r⏳ Progress: ${progress}% (${i + 1}/${blocksToScan} block) - Transaction: ${txProgress}% (${txIdx + 1}/${block.transactions.length})`,
                    );

                    const tx = await provider.getTransaction(txHash);
                    if (!tx) continue;

                    const normalizedFrom = tx.from?.toLowerCase();
                    const normalizedTo = tx.to?.toLowerCase();
                    const normalizedAddr = address.toLowerCase();

                    if (normalizedFrom === normalizedAddr && normalizedTo) {
                        const amountETH = ethers.formatEther(tx.value);
                        const date = new Date(block.timestamp! * 1000).toLocaleString();
                        sentTransactions.push({
                            to: normalizedTo,
                            amount: amountETH,
                            date,
                            timestamp: block.timestamp || 0,
                        });
                    }
                }
            }

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            console.log(`\r✅ Scan complete: ${blocksToScan}/${blocksToScan} block (100%) in ${duration}s`);

            const recentTransactions = sentTransactions
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5);

            if (recentTransactions.length > 0) {
                console.log(`\n📤 Last ${recentTransactions.length} Sent Transactions:`);
                recentTransactions.forEach((tx, idx) => {
                    console.log(`   ${idx + 1}. ${tx.to}`);
                    console.log(`      Amount: ${formatNumber(tx.amount)} ETH`);
                    console.log(`      Date: ${tx.date}`);
                });
            } else {
                console.log(`\n📤 No outgoing transactions found`);
            }
            console.log();
        } catch {
            console.log(`\n⚠️  Transaction scanning unavailable (RPC provider limitation)\n`);
        }
    } catch (error) {
        if (error instanceof Error) console.error('❌ Error:', error.message);
        else console.error('❌ Unknown error occurred');
    }
}

// =============================
// CLI
// =============================

async function main(): Promise<void> {
    const command = process.argv[2];
    const subcommand = process.argv[3];

    const walletSvc = new WalletService(provider);
    const swapSvc = new SwapService(
        provider,
        config.uniswapRouter,
        config.uniswapFactory,
        config.quoterV2,
        config.wethAddress,
    );

    switch (command) {
        case 'balance': {
            const tokenType = process.argv[3];
            const walletAddress = process.env.WALLET_ADDRESS;
            if (!walletAddress) {
                console.error('❌ WALLET_ADDRESS not set in environment');
                return;
            }

            if (tokenType === 'eth') {
                await walletSvc.getETHBalance(walletAddress);
            } else if (tokenType === 'weth') {
                await walletSvc.getTokenBalance(config.wethAddress, walletAddress, 'WETH');
            } else if (tokenType === 'usdc') {
                await walletSvc.getTokenBalance(USDC_ADDRESS, walletAddress, 'USDC');
            } else {
                console.error('❌ Usage: balance <eth|weth|usdc>');
            }
            break;
        }

        case 'contract': {
            const tokenType = process.argv[3];
            const action = process.argv[4];

            if (action !== 'query') {
                console.error('❌ Usage: contract <eth|weth|usdc> query');
                break;
            }

            if (tokenType === 'eth') await queryETH();
            else if (tokenType === 'weth') await queryWETH();
            else if (tokenType === 'usdc') await queryUSDC();
            else console.error('❌ Unknown contract type');
            break;
        }

        case 'block':
            await getLatestBlock();
            break;

        case 'wallet': {
            if (subcommand === 'create') {
                createWallet();
            } else if (subcommand === 'send') {
                const tokenType = process.argv[4];
                const toAddress = process.argv[5];
                const amount = process.argv[6];

                if (!tokenType || !toAddress || !amount) {
                    console.error('❌ Usage: wallet send <eth|usdc> <address> <qty>');
                    return;
                }

                if (tokenType === 'eth') await sendETH(toAddress, amount);
                else if (tokenType === 'usdc') await sendUSDC(toAddress, amount);
                else console.error('❌ Unknown token type. Use "eth" or "usdc"');
            } else if (subcommand === 'trade') {
                const amount = process.argv[4];
                const fromToken = process.argv[5];
                const toToken = process.argv[6];

                if (!amount || !fromToken || !toToken) {
                    console.error('❌ Usage: wallet trade <qty> <eth|usdc> <eth|usdc>');
                    return;
                }
                const dry = process.argv.includes('--dry') || process.argv.includes('--dry-run');
                await swapSvc.swap(amount, fromToken, toToken, { dry });
            } else if (subcommand === 'info') {
                const targetAddress = process.argv[4];
                if (!targetAddress) {
                    console.error('❌ Usage: wallet info <address>');
                    return;
                }
                await walletInfo(targetAddress);
            } else {
                console.error('❌ Usage: wallet <create|send|trade|info>');
            }
            break;
        }

        case 'help':
        case undefined:
            console.log(`
Ethereum CLI Tool (Current: ${config.name})
Usage:
  balance eth                    - Check current wallet ETH balance
  balance weth                   - Check current wallet WETH balance
  balance usdc                   - Check current wallet USDC balance
  contract eth query             - Query ETH native token info
  contract weth query            - Query WETH contract info
  contract usdc query            - Query USDC contract info
  block                          - Get latest block info
  wallet create                  - Create & save persistent wallet
  wallet send eth <addr> <qty>   - Send ETH to address
  wallet send usdc <addr> <qty>  - Send USDC to address
  wallet trade <qty> <from> <to> - Swap tokens via Uniswap (e.g., trade 0.1 eth usdc)
  wallet info <address>          - Get wallet info & transaction history
  help                           - Show this message

Environment:
  NETWORK                   - "mainnet" | "sepolia" | "base"
  <NETWORK>_RPC_URL         - RPC endpoint
  <NETWORK>_USDC_ADDRESS    - USDC contract address
  <NETWORK>_UNISWAP_FACTORY - Uniswap v3 factory
  <NETWORK>_UNISWAP_ROUTER  - Uniswap v3 SwapRouter02
  <NETWORK>_QUOTER_V2       - Uniswap v3 Quoter V2
  <NETWORK>_WETH_ADDRESS    - WETH contract address
  WALLET_ADDRESS            - Your wallet address
  PRIVATE_KEY               - Your wallet private key
`);
            break;

        default:
            console.error(`❌ Unknown command: ${command}`);
    }
}

main().catch(console.error);
