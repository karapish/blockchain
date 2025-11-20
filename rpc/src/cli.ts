#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ERC20_ABI } from './ERC20_ABI.js';
import { UNISWAP_ROUTER_ABI } from './UNISWAP_ROUTER_ABI.js';
import { UNISWAP_FACTORY_ABI } from './UNISWAP_FACTORY_ABI.js';
import { UNISWAP_V3_POOL_ABI } from './UNISWAP_V3_POOL_ABI.js';
import { WETH_ABI } from './WETH_ABI.js';
import { Token, CurrencyAmount } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';
import { execSync } from 'child_process';


dotenv.config();
path.dirname(fileURLToPath(import.meta.url));

type SupportedNetwork = 'mainnet' | 'sepolia' | 'base';

interface NetworkConfig {
    rpc: string;
    usdcAddress: string;
    name: string;
    uniswapRouter: string;
    uniswapFactory: string;
    wethAddress: string;
    chainId: number;
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

const getChainId = (network: SupportedNetwork): number => {
    const chainIds: Record<SupportedNetwork, number> = {
        mainnet: 1,
        sepolia: 11155111,
        base: 8453,
    };
    return chainIds[network];
};

const loadNetworkConfig = (network: SupportedNetwork): NetworkConfig => {
    const names: Record<SupportedNetwork, string> = {
        mainnet: 'Ethereum Mainnet',
        sepolia: 'Sepolia Testnet',
        base: 'Base Network',
    };

    const prefix = network.toUpperCase();
    let uniswapRouter = requireEnv(`${prefix}_UNISWAP_ROUTER`);
    
    if (network === 'sepolia') {
        uniswapRouter = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E';
    }
    
    return {
        rpc: requireEnv(`${prefix}_RPC_URL`),
        usdcAddress: requireEnv(`${prefix}_USDC_ADDRESS`),
        name: names[network],
        uniswapRouter,
        uniswapFactory: requireEnv(`${prefix}_UNISWAP_FACTORY`),
        wethAddress: requireEnv(`${prefix}_WETH_ADDRESS`),
        chainId: getChainId(network),
    };
};

const config = loadNetworkConfig(network);
const provider = new ethers.JsonRpcProvider(config.rpc);
const USDC_ADDRESS = ethers.getAddress(config.usdcAddress);
const FEE_TIER = 3000;

const formatNumber = (num: string | number): string =>
    Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });

const handleError = (error: unknown): void => {
    if (error instanceof Error) console.error('❌ Error:', error.message);
    else console.error('❌ Unknown error occurred');
};

const logTxReceipt = (receipt: ethers.TransactionReceipt | null): void => {
    if (receipt) {
        console.log(`✅ Transaction confirmed!`);
        console.log(`✅ Block: ${receipt.blockNumber}`);
        console.log(`✅ Gas Used: ${receipt.gasUsed}\n`);
    }
};

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

class WalletService {
    constructor(private readonly provider: ethers.JsonRpcProvider) {}

    async getBalance(tokenType: string, address: string): Promise<void> {
        try {
            const symbol = tokenType.toUpperCase();
            console.log(`\n📍 Fetching ${symbol} balance for: ${address}`);
            
            if (tokenType === 'eth') {
                const balance = await this.provider.getBalance(address);
                const formatted = ethers.formatEther(balance);
                console.log(`✅ Balance: ${balance} (${formatted} ETH)\n`);
            } else {
                const tokenAddress = tokenType === 'weth' ? config.wethAddress : USDC_ADDRESS;
                const client = new ERC20Client(tokenAddress, this.provider);
                const [bal, dec] = await Promise.all([client.balanceOf(address), client.decimals()]);
                const formatted = ethers.formatUnits(bal, dec);
                console.log(`✅ Balance: ${bal} (${formatted} ${symbol})\n`);
            }
        } catch (error) {
            handleError(error);
        }
    }
}

class SwapService {
    private readonly weth: string;
    private readonly factory: UniswapFactoryClient;
    private readonly wethToken: Token;
    private readonly usdcToken: Token;

    constructor(
        private readonly provider: ethers.JsonRpcProvider,
        private readonly routerAddress: string,
        factoryAddress: string,
        wethAddress: string,
    ) {
        this.weth = ethers.getAddress(wethAddress);
        this.factory = new UniswapFactoryClient(factoryAddress, provider);
        this.wethToken = new Token(config.chainId, this.weth, 18, 'WETH', 'Wrapped Ether');
        this.usdcToken = new Token(config.chainId, USDC_ADDRESS, 6, 'USDC', 'USD Coin');
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

    private async getPoolData(): Promise<Pool | null> {
        try {
            const poolAddress = await this.factory.getPool(this.weth, USDC_ADDRESS, FEE_TIER);
            const poolContract = new ethers.Contract(
                poolAddress,
                UNISWAP_V3_POOL_ABI,
                this.provider,
            );
            const [slot0, liquidity] = await Promise.all([
                poolContract.slot0(),
                poolContract.liquidity(),
            ]);
            
            return new Pool(
                this.wethToken,
                this.usdcToken,
                FEE_TIER,
                slot0[0].toString(),
                liquidity.toString(),
                slot0[1],
            );
        } catch (e) {
            console.error('⚠️  Could not fetch pool data:', e instanceof Error ? e.message : 'Unknown error');
            return null;
        }
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

            const amountInWei = ethers.parseEther(amount);

            console.log(`\n🔄 Swapping ${fromToken.toUpperCase()} for ${toToken.toUpperCase()} via Uniswap V3 SDK...`);
            console.log(`📤 From: ${wallet.address}`);
            console.log(`💰 Amount: ${amount} ${fromToken.toUpperCase()}`);
            console.log(`🔗 Network: ${config.name}\n`);

            console.log(`📍 Verifying pool exists...`);
            const poolExists = await this.factory.verifyPoolExists(this.weth, USDC_ADDRESS, FEE_TIER);
            if (!poolExists) return;


            if (pair.from === 'weth') {
                console.log(`📍 Approving router to spend WETH...`);
                const wethContract = new ERC20Client(this.weth, wallet);
                const approvalTx = await wethContract.approve(this.routerAddress, amountInWei);
                await approvalTx.wait();
                console.log(`✔️ Approval confirmed\n`);
            }

            const params: any = {
                tokenIn: this.weth,
                tokenOut: USDC_ADDRESS,
                fee: FEE_TIER,
                recipient: wallet.address,
                amountIn: amountInWei,
                amountOutMinimum: 0n,
                deadline: 0n,
                sqrtPriceLimitX96: 0n,
            };

            if (network !== 'sepolia') {
                params.deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            }

            const overrides = pair.from === 'eth' ? { value: amountInWei } : {};
            const routerContract = new ethers.Contract(this.routerAddress, UNISWAP_ROUTER_ABI, wallet);

            if (options?.dry) {
                console.log(`🧪 Dry-run ${pair.from.toUpperCase()}→${pair.to.toUpperCase()}...`);
                const out = await routerContract.exactInputSingle.staticCall(params, overrides);
                console.log(`🔬 Preview: ${ethers.formatUnits(out, 6)} USDC`);
                return;
            }

            const tx = await routerContract.exactInputSingle(params, overrides);
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
            handleError(error);
        }
    }
}

class ContractDeploymentService {
    constructor(private readonly provider: ethers.JsonRpcProvider) {}

    private getWallet(): ethers.Wallet | null {
        const pk = process.env.PRIVATE_KEY;
        if (!pk) {
            console.error('❌ PRIVATE_KEY not set in environment');
            return null;
        }
        return new ethers.Wallet(pk, this.provider);
    }

    private compileContract(contractName: string): { abi: any[]; bytecode: string } | null {
        try {
            const projectRoot = path.resolve(process.cwd(), '..');
            const contractPath = path.join(projectRoot, 'order-book', `${contractName}.sol`);
            const openzeppelinPath = path.join(projectRoot, 'lib', 'openzeppelin-contracts');

            if (!fs.existsSync(contractPath)) {
                console.error(`❌ Contract file not found: ${contractPath}`);
                return null;
            }

            console.log(`📦 Compiling ${contractName}.sol...`);

            // Use solc to compile with import remapping
            const cmd = `solc --combined-json abi,bin --optimize "@openzeppelin/=${openzeppelinPath}/" "${contractPath}"`;

            let output: string;
            try {
                output = execSync(cmd, {
                    encoding: 'utf-8',
                    cwd: projectRoot,
                    env: { ...process.env },
                    stdio: ['pipe', 'pipe', 'pipe']
                });
            } catch (execError: any) {
                console.error('❌ Compilation error:', execError.stderr || execError.stdout || execError.message);
                return null;
            }

            // Parse JSON output
            let compiled;
            try {
                compiled = JSON.parse(output);
            } catch (parseError) {
                console.error('❌ Failed to parse compilation output');
                console.error('Output:', output.substring(0, 200));
                return null;
            }

            const contractKey = Object.keys(compiled.contracts).find(key =>
                key.includes(contractName === 'orderbook' ? 'SimpleOrderBook' : 'SortedOrderBook')
            );

            if (!contractKey) {
                console.error('❌ Contract not found in compilation output');
                console.error('Available contracts:', Object.keys(compiled.contracts));
                return null;
            }

            const contract = compiled.contracts[contractKey];

            // solc --combined-json may return ABI either as a JSON string or already parsed array
            const abi = typeof contract.abi === 'string' ? JSON.parse(contract.abi) : contract.abi;

            // Prefer legacy `bin`, fall back to newer `evm.bytecode.object` if available
            const bytecodeRaw = contract.bin ?? contract?.evm?.bytecode?.object;
            if (!bytecodeRaw) {
                console.error('❌ Bytecode not found in compilation output');
                return null;
            }
            const bytecode = bytecodeRaw.startsWith('0x') ? bytecodeRaw : '0x' + bytecodeRaw;

            console.log(`✅ Compilation successful`);
            return { abi, bytecode };
        } catch (error) {
            console.error('❌ Compilation failed:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    async deploy(contractName: string, constructorArgs?: any[]): Promise<void> {
        try {
            const wallet = this.getWallet();
            if (!wallet) return;

            console.log(`\n🚀 Deploying ${contractName} contract...`);
            console.log(`📤 From: ${wallet.address}`);
            console.log(`🔗 Network: ${config.name}\n`);

            const compiled = this.compileContract(contractName);
            if (!compiled) return;

            const { abi, bytecode } = compiled;

            // Create contract factory
            const factory = new ethers.ContractFactory(abi, bytecode, wallet);

            // Deploy
            console.log(`⏳ Deploying contract...`);
            const contract = constructorArgs
                ? await factory.deploy(...constructorArgs)
                : await factory.deploy();

            console.log(`⏳ Waiting for deployment transaction...`);
            await contract.waitForDeployment();

            const address = await contract.getAddress();

            console.log(`\n✅ Contract deployed successfully!`);
            console.log(`✅ Contract Address: ${address}`);
            console.log(`✅ Transaction Hash: ${contract.deploymentTransaction()?.hash}`);
            console.log(`✅ Block Number: ${contract.deploymentTransaction()?.blockNumber || 'pending'}\n`);

            // Save deployment info
            const deploymentInfo = {
                contractName,
                address,
                network: config.name,
                deployer: wallet.address,
                timestamp: new Date().toISOString(),
                transactionHash: contract.deploymentTransaction()?.hash,
            };

            const deploymentsPath = path.join(process.cwd(), 'deployments.json');
            let deployments: any[] = [];

            if (fs.existsSync(deploymentsPath)) {
                deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));
            }

            deployments.push(deploymentInfo);
            fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

            console.log(`💾 Deployment info saved to deployments.json\n`);
        } catch (error) {
            handleError(error);
        }
    }
}

// =============================
// OrderBook Client
// =============================

// Load ABI from sibling order-book package dynamically at runtime to avoid TS rootDir issues
async function getSimpleOrderbookAbi(): Promise<any[]> {
    try {
        const url = new URL('../../order-book/ORDERBOOK_ABI.js', import.meta.url);
        const mod: any = await import(url.href);
        const abi = mod?.SIMPLE_ORDERBOOK_ABI ?? mod?.default;
        if (!abi) throw new Error('SIMPLE_ORDERBOOK_ABI export not found');
        return abi as any[];
    } catch (e) {
        console.error('❌ Failed to load OrderBook ABI from ../order-book/ORDERBOOK_ABI.js');
        console.error('   Make sure the file exists and is accessible.');
        throw e;
    }
}

function loadDeploymentAddress(contractName: string): string | null {
    try {
        const deploymentsPath = path.join(process.cwd(), 'deployments.json');
        if (!fs.existsSync(deploymentsPath)) {
            console.error('❌ deployments.json not found. Deploy the contract first using: contract orderbook deploy');
            return null;
        }
        const entries = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8')) as Array<any>;
        const filtered = entries.filter(e => (e.contractName === contractName) && (e.network === config.name));
        if (filtered.length === 0) {
            console.error(`❌ No deployment found for ${contractName} on ${config.name}`);
            return null;
        }
        const address = filtered[filtered.length - 1].address;
        return ethers.getAddress(address);
    } catch (err) {
        console.error('❌ Failed to read deployments.json');
        return null;
    }
}

function parseArg(raw: string): any {
    const v = raw.trim();
    if (v.toLowerCase() === 'true') return true;
    if (v.toLowerCase() === 'false') return false;
    // hex address or bytes
    if (/^0x[0-9a-fA-F]+$/.test(v)) return v;
    // numeric (treat as BigInt)
    if (/^\d+$/.test(v)) return BigInt(v);
    return v;
}

class OrderBookClient {
    private readonly address: string;
    private readonly read: ethers.Contract;
    private readonly write?: ethers.Contract;

    constructor(private readonly provider: ethers.JsonRpcProvider, address: string, abi: any[]) {
        this.address = ethers.getAddress(address);
        this.read = new ethers.Contract(this.address, abi, provider);
    }

    private getWallet(): ethers.Wallet | null {
        const pk = process.env.PRIVATE_KEY;
        if (!pk) {
            console.error('❌ PRIVATE_KEY not set in environment');
            return null;
        }
        return new ethers.Wallet(pk, this.provider);
    }

    getWriteContract(abi: any[]): ethers.Contract | null {
        const wallet = this.getWallet();
        if (!wallet) return null;
        return new ethers.Contract(this.address, abi, wallet);
    }

    async call(method: string, args: string[], abi: any[]): Promise<void> {
        const contract = this.getWriteContract(abi);
        if (!contract) return;
        const parsedArgs = args.map(parseArg);
        console.log(`📤 Sending tx: ${method}(${args.join(', ')})`);
        const tx = await (contract as any)[method](...parsedArgs);
        console.log(`⏳ Waiting for confirmation... tx: ${tx.hash}`);
        const receipt = await tx.wait();
        logTxReceipt(receipt);
    }

    async readCall(method: string, args: string[]): Promise<void> {
        const parsedArgs = args.map(parseArg);
        const result = await (this.read as any)[method](...parsedArgs);
        console.log('🔎 Result:', result);
    }

    async placeOrder(isBuy: string, base: string, quote: string, price: string, amount: string, abi: any[]): Promise<void> {
        await this.call('placeOrder', [isBuy, base, quote, price, amount], abi);
    }

    async cancelOrder(orderId: string, abi: any[]): Promise<void> {
        await this.call('cancelOrder', [orderId], abi);
    }
}

class EventListenerService {
    constructor(private readonly provider: ethers.JsonRpcProvider) {}

    async listen(tokenType: string): Promise<void> {
        try {
            const token = tokenType.toLowerCase();

            if (token === 'eth') {
                console.log(`\n👂 Listening to new ETH blocks on ${config.name}...`);
                console.log(`🔄 Using polling mode (checking every 12 seconds)`);
                console.log(`Press Ctrl+C to stop\n`);

                let lastBlock = await this.provider.getBlockNumber();

                const pollInterval = setInterval(async () => {
                    try {
                        const currentBlock = await this.provider.getBlockNumber();
                        if (currentBlock > lastBlock) {
                            const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
                            console.log(`📦 New Block: ${currentBlock} at ${estTime} EST`);

                            const block = await this.provider.getBlock(currentBlock);
                            if (block) {
                                console.log(`   ⛽ Gas Used: ${block.gasUsed}`);
                                console.log(`   🔢 Transactions: ${block.transactions.length}`);
                            }
                            lastBlock = currentBlock;
                        }
                    } catch (err) {
                        console.error('⚠️  Polling error:', err instanceof Error ? err.message : 'Unknown error');
                    }
                }, 12000);

                process.on('SIGINT', () => {
                    clearInterval(pollInterval);
                    console.log('\n\n👋 Stopped listening');
                    process.exit(0);
                });
            } else if (token === 'weth' || token === 'usdc') {
                const tokenAddress = token === 'weth' ? config.wethAddress : USDC_ADDRESS;
                const tokenName = token.toUpperCase();
                const abi = token === 'weth' ? WETH_ABI : ERC20_ABI;

                console.log(`\n👂 Listening to ${tokenName} events on ${config.name}...`);
                console.log(`📍 Contract: ${tokenAddress}`);
                console.log(`🔄 Using polling mode (checking every 12 seconds)`);
                console.log(`Press Ctrl+C to stop\n`);

                const contract = new ethers.Contract(tokenAddress, abi, this.provider);
                const decimals = await contract.decimals();
                let lastBlock = await this.provider.getBlockNumber();

                const pollInterval = setInterval(async () => {
                    try {
                        const currentBlock = await this.provider.getBlockNumber();
                        if (currentBlock > lastBlock) {
                            const transferFilter = contract.filters.Transfer();
                            const approvalFilter = contract.filters.Approval();

                            const [transferLogs, approvalLogs] = await Promise.all([
                                contract.queryFilter(transferFilter, lastBlock + 1, currentBlock),
                                contract.queryFilter(approvalFilter, lastBlock + 1, currentBlock),
                            ]);

                            for (const log of transferLogs) {
                                const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
                                console.log(`\n💸 Transfer Event Detected at ${estTime} EST`);
                                console.log(`   From: ${log.args[0]}`);
                                console.log(`   To: ${log.args[1]}`);
                                console.log(`   Amount: ${ethers.formatUnits(log.args[2], decimals)} ${tokenName}`);
                                console.log(`   Block: ${log.blockNumber}`);
                                console.log(`   Tx Hash: ${log.transactionHash}`);
                            }

                            for (const log of approvalLogs) {
                                const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
                                console.log(`\n✅ Approval Event Detected at ${estTime} EST`);
                                console.log(`   Owner: ${log.args[0]}`);
                                console.log(`   Spender: ${log.args[1]}`);
                                console.log(`   Amount: ${ethers.formatUnits(log.args[2], decimals)} ${tokenName}`);
                                console.log(`   Block: ${log.blockNumber}`);
                                console.log(`   Tx Hash: ${log.transactionHash}`);
                            }

                            if (token === 'weth') {
                                const depositFilter = contract.filters.Deposit();
                                const withdrawalFilter = contract.filters.Withdrawal();

                                const [depositLogs, withdrawalLogs] = await Promise.all([
                                    contract.queryFilter(depositFilter, lastBlock + 1, currentBlock),
                                    contract.queryFilter(withdrawalFilter, lastBlock + 1, currentBlock),
                                ]);

                                for (const log of depositLogs) {
                                    const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
                                    console.log(`\n🔵 Deposit Event Detected at ${estTime} EST`);
                                    console.log(`   Depositor: ${log.args[0]}`);
                                    console.log(`   Amount: ${ethers.formatUnits(log.args[1], decimals)} WETH`);
                                    console.log(`   Block: ${log.blockNumber}`);
                                    console.log(`   Tx Hash: ${log.transactionHash}`);
                                }

                                for (const log of withdrawalLogs) {
                                    const estTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
                                    console.log(`\n🔴 Withdrawal Event Detected at ${estTime} EST`);
                                    console.log(`   Withdrawer: ${log.args[0]}`);
                                    console.log(`   Amount: ${ethers.formatUnits(log.args[1], decimals)} WETH`);
                                    console.log(`   Block: ${log.blockNumber}`);
                                    console.log(`   Tx Hash: ${log.transactionHash}`);
                                }
                            }

                            lastBlock = currentBlock;
                        }
                    } catch (err) {
                        console.error('⚠️  Polling error:', err instanceof Error ? err.message : 'Unknown error');
                    }
                }, 12000);

                process.on('SIGINT', () => {
                    clearInterval(pollInterval);
                    console.log('\n\n👋 Stopped listening');
                    process.exit(0);
                });
            } else {
                console.error('❌ Unsupported token type. Use "eth", "weth", or "usdc"');
                return;
            }

            // Keep the process running
            await new Promise(() => {});
        } catch (error) {
            handleError(error);
        }
    }
}

// =============================
// Helpers
// =============================

async function queryContract(tokenType: string): Promise<void> {
    try {
        if (tokenType === 'eth') {
            console.log(`\n💰 Querying ETH (${config.name})`);
            console.log(`✅ Symbol: ETH`);
            console.log(`✅ Decimals: 18`);
            console.log(`✅ Type: Native blockchain token (not an ERC20 contract)`);
            const feeData = await provider.getFeeData();
            if (feeData?.gasPrice) {
                console.log(`✅ Current Gas Price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} Gwei\n`);
            }
        } else {
            const tokenAddress = tokenType === 'weth' ? config.wethAddress : USDC_ADDRESS;
            const tokenName = tokenType.toUpperCase();
            console.log(`\n💰 Querying ${tokenName} (${config.name}): ${tokenAddress}`);
            const client = new ERC20Client(tokenAddress, provider);
            const [symbol, decimals, totalSupply] = await Promise.all([
                client.symbol(),
                client.decimals(),
                client.totalSupply(),
            ]);
            const formattedSupply = ethers.formatUnits(totalSupply, decimals);
            console.log(`✅ Symbol: ${symbol}`);
            console.log(`✅ Decimals: ${decimals}`);
            console.log(`✅ Total Supply: ${formatNumber(formattedSupply)} ${symbol}\n`);
        }
    } catch (error) {
        handleError(error);
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
        handleError(error);
    }
}

function createWallet(): void {
    try {
        const wallet = ethers.Wallet.createRandom();
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const filtered = envContent
            .split('\n')
            .filter(line => !line.startsWith('WALLET_ADDRESS=') && !line.startsWith('PRIVATE_KEY='))
            .join('\n');
        const updated = filtered + `\nWALLET_ADDRESS=${wallet.address}\nPRIVATE_KEY=${wallet.privateKey}\n`;
        fs.writeFileSync(envPath, updated.trim() + '\n');

        console.log(`\n🔐 Wallet Created & Saved to .env`);
        console.log(`✅ Address:     ${wallet.address}`);
        console.log(`✅ Private Key: ${wallet.privateKey}`);
        console.log(`⚠️  Keep PRIVATE_KEY safe! Never share it.\n`);
    } catch (error) {
        handleError(error);
    }
}

async function sendToken(tokenType: string, toAddress: string, amount: string): Promise<void> {
    try {
        const pk = process.env.PRIVATE_KEY;
        if (!pk) {
            console.error('❌ PRIVATE_KEY not set in environment');
            return;
        }

        const wallet = new ethers.Wallet(pk, provider);
        console.log(`\n💸 Sending ${tokenType.toUpperCase()}...`);
        console.log(`📤 From: ${wallet.address}`);
        console.log(`📥 To: ${toAddress}`);
        console.log(`💰 Amount: ${amount} ${tokenType.toUpperCase()}`);

        let tx;
        if (tokenType === 'eth') {
            tx = await wallet.sendTransaction({
                to: toAddress,
                value: ethers.parseEther(amount),
            });
        } else {
            const client = new ERC20Client(USDC_ADDRESS, wallet);
            const decimals = await client.decimals();
            tx = await client.transfer(toAddress, ethers.parseUnits(amount, decimals));
        }

        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);

        const receipt = await tx.wait();
        logTxReceipt(receipt);
    } catch (error) {
        handleError(error);
    }
}

async function walletInfo(address: string): Promise<void> {
    try {
        console.log(`\n📊 Wallet Info for: ${address}`);
        console.log(`🔗 Network: ${config.name}\n`);

        const ethBalance = await provider.getBalance(address);
        console.log(`✅ ETH Balance: ${ethBalance} (${ethers.formatEther(ethBalance)} ETH)`);

        const usdcClient = new ERC20Client(USDC_ADDRESS, provider);
        const [usdcBalance, dec] = await Promise.all([
            usdcClient.balanceOf(address),
            usdcClient.decimals(),
        ]);
        console.log(`✅ USDC Balance: ${usdcBalance} (${ethers.formatUnits(usdcBalance, dec)} USDC)`);

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
            const startTime = Date.now();
            const normalizedAddr = address.toLowerCase();

            console.log(`\n🔍 Scanning ${blocksToScan} recent block for outgoing transactions...`);

            for (let i = 0; i < blocksToScan; i++) {
                const block = await provider.getBlock(latestBlock.number - i);
                if (!block?.transactions) continue;

                for (let txIdx = 0; txIdx < block.transactions.length; txIdx++) {
                    process.stdout.write(
                        `\r⏳ Progress: ${Math.round(((i + 1) / blocksToScan) * 100)}% (${i + 1}/${blocksToScan} block) - Tx: ${Math.round(((txIdx + 1) / block.transactions.length) * 100)}% (${txIdx + 1}/${block.transactions.length})`,
                    );

                    const tx = await provider.getTransaction(block.transactions[txIdx]);
                    if (tx?.from?.toLowerCase() === normalizedAddr && tx.to) {
                        sentTransactions.push({
                            to: tx.to.toLowerCase(),
                            amount: ethers.formatEther(tx.value),
                            date: new Date((block.timestamp || 0) * 1000).toLocaleString(),
                            timestamp: block.timestamp || 0,
                        });
                    }
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\r✅ Scan complete: ${blocksToScan}/${blocksToScan} block (100%) in ${duration}s`);

            const recent = sentTransactions.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
            if (recent.length > 0) {
                console.log(`\n📤 Last ${recent.length} Sent Transactions:`);
                recent.forEach((tx, idx) => {
                    console.log(`   ${idx + 1}. ${tx.to}\n      Amount: ${formatNumber(tx.amount)} ETH\n      Date: ${tx.date}`);
                });
            } else {
                console.log(`\n📤 No outgoing transactions found`);
            }
            console.log();
        } catch {
            console.log(`\n⚠️  Transaction scanning unavailable (RPC provider limitation)\n`);
        }
    } catch (error) {
        handleError(error);
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
        config.wethAddress,
    );
    const listenerSvc = new EventListenerService(provider);
    const deploySvc = new ContractDeploymentService(provider);

    switch (command) {
        case 'balance': {
            const tokenType = process.argv[3];
            const walletAddress = process.env.WALLET_ADDRESS;
            if (!walletAddress) {
                console.error('❌ WALLET_ADDRESS not set in environment');
                return;
            }

            if (tokenType === 'eth' || tokenType === 'weth' || tokenType === 'usdc') {
                await walletSvc.getBalance(tokenType, walletAddress);
            } else {
                console.error('❌ Usage: balance <eth|weth|usdc>');
            }
            break;
        }

        case 'contract': {
            const tokenType = process.argv[3];
            const action = process.argv[4];

            if (action === 'query') {
                if (tokenType === 'eth' || tokenType === 'weth' || tokenType === 'usdc') await queryContract(tokenType);
                else console.error('❌ Unknown contract type');
            } else if (action === 'listen') {
                if (tokenType === 'eth' || tokenType === 'weth' || tokenType === 'usdc') await listenerSvc.listen(tokenType);
                else console.error('❌ Unknown contract type');
            } else if (action === 'deploy') {
                if (tokenType === 'orderbook') {
                    await deploySvc.deploy('orderbook');
                } else if (tokenType === 'orderbook-adv') {
                    const feeRecipient = process.argv[5] || process.env.WALLET_ADDRESS;
                    if (!feeRecipient) {
                        console.error('❌ Usage: contract orderbook-adv deploy <feeRecipient>');
                        console.error('   Or set WALLET_ADDRESS in .env');
                        break;
                    }
                    await deploySvc.deploy('orderbook-adv', [feeRecipient]);
                } else {
                    console.error('❌ Unknown contract. Use "orderbook" or "orderbook-adv"');
                }
            } else if (tokenType === 'orderbook') {
                const address = loadDeploymentAddress('orderbook');
                if (!address) break;
                const abi = await getSimpleOrderbookAbi();
                const ob = new OrderBookClient(provider, address, abi);

                if (action === 'call') {
                    // Generic state-changing call
                    const method = process.argv[5];
                    const args = process.argv.slice(6);
                    if (!method) {
                        console.error('❌ Usage: contract orderbook call <method> [args ...]');
                        break;
                    }
                    await ob.call(method, args, abi);
                } else if (action === 'read') {
                    // Generic read-only call
                    const method = process.argv[5];
                    const args = process.argv.slice(6);
                    if (!method) {
                        console.error('❌ Usage: contract orderbook read <method> [args ...]');
                        break;
                    }
                    await ob.readCall(method, args);
                } else if (action === 'place' || action === 'placeOrder') {
                    const isBuy = process.argv[5];
                    const base = process.argv[6];
                    const quote = process.argv[7];
                    const price = process.argv[8];
                    const amount = process.argv[9];
                    if (!isBuy || !base || !quote || !price || !amount) {
                        console.error('❌ Usage: contract orderbook place <isBuy:true|false> <baseToken> <quoteToken> <price> <amount>');
                        break;
                    }
                    await ob.placeOrder(isBuy, base, quote, price, amount, abi);
                } else if (action === 'cancel' || action === 'cancelOrder') {
                    const orderId = process.argv[5];
                    if (!orderId) {
                        console.error('❌ Usage: contract orderbook cancel <orderId>');
                        break;
                    }
                    await ob.cancelOrder(orderId, abi);
                } else if (action === 'get' || action === 'getOrder') {
                    const orderId = process.argv[5];
                    if (!orderId) {
                        console.error('❌ Usage: contract orderbook read getOrder <orderId>');
                        break;
                    }
                    await ob.readCall('getOrder', [orderId]);
                } else {
                    console.error('❌ Usage: contract orderbook <deploy|call|read|place|cancel|get>');
                }
            } else {
                console.error('❌ Usage: contract <eth|weth|usdc|orderbook|orderbook-adv> <query|listen|deploy>');
            }
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

                if (tokenType === 'eth' || tokenType === 'usdc') await sendToken(tokenType, toAddress, amount);
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
  contract eth listen            - Listen to new ETH blocks in real-time
  contract weth listen           - Listen to WETH contract events (Transfer, Approval, Deposit, Withdrawal)
  contract usdc listen           - Listen to USDC contract events (Transfer, Approval)
  contract orderbook deploy      - Deploy SimpleOrderBook contract
  contract orderbook read <method> [args...]   - Read-only call on OrderBook (e.g., read getOrder 1)
  contract orderbook call <method> [args...]   - State-changing tx (e.g., call cancelOrder 1)
  contract orderbook place <isBuy> <base> <quote> <price> <amount>
                                           - Convenience to place order
  contract orderbook cancel <orderId>       - Convenience to cancel order
  contract orderbook-adv deploy [feeRecipient] - Deploy SortedOrderBook contract with fee recipient
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

Examples:
  # Place a BUY order for 1e18 base at price 1000 quote per base
  NETWORK=sepolia PRIVATE_KEY=... node dist/cli.js contract orderbook place true 0xBase 0xQuote 1000 1000000000000000000

  # Generic call to cancel order 3
  node dist/cli.js contract orderbook call cancelOrder 3

  # Read an order
  node dist/cli.js contract orderbook read getOrder 3
`);
            break;

        default:
            console.error(`❌ Unknown command: ${command}`);
    }
}

main().catch(console.error);
