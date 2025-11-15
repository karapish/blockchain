#!/usr/bin/env node

import {ethers} from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {ERC20_ABI} from "./ERC20_ABI.js";
import {UNISWAP_ROUTER_ABI} from "./UNISWAP_ROUTER_ABI.js";

dotenv.config();
path.dirname(fileURLToPath(import.meta.url));

interface NetworkConfig {
  rpc: string;
  usdcAddress: string;
  name: string;
  uniswapRouter: string;
  wethAddress: string;
}

const network = (process.env.NETWORK!).toLowerCase() as 'mainnet' | 'sepolia' | 'base';

const networkConfigs: Record<string, NetworkConfig> = {
  mainnet: {
    rpc: process.env.MAINNET_RPC_URL!,
    usdcAddress: process.env.MAINNET_USDC_ADDRESS!,
    name: 'Ethereum Mainnet',
    uniswapRouter: process.env.MAINNET_UNISWAP_ROUTER!,
    wethAddress: process.env.MAINNET_WETH_ADDRESS!,
  },
  sepolia: {
    rpc: process.env.SEPOLIA_RPC_URL!,
    usdcAddress: process.env.SEPOLIA_USDC_ADDRESS!,
    name: 'Sepolia Testnet',
    uniswapRouter: process.env.SEPOLIA_UNISWAP_ROUTER!,
    wethAddress: process.env.SEPOLIA_WETH_ADDRESS!,
  },
  base: {
    rpc: process.env.BASE_RPC_URL!,
    usdcAddress: process.env.BASE_USDC_ADDRESS!,
    name: 'Base Network',
    uniswapRouter: process.env.BASE_UNISWAP_ROUTER!,
    wethAddress: process.env.BASE_WETH_ADDRESS!,
  },
};

if (!networkConfigs[network]) {
  console.error(`❌ Unknown network: ${network}. Use "mainnet", "sepolia", or "base"`);
  process.exit(1);
}

const config = networkConfigs[network];
const RPC_URL = config.rpc;
const USDC_ADDRESS = config.usdcAddress;

if (!RPC_URL) {
  console.error('❌ RPC_URL not set in environment');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

function formatNumber(num: string | number): string {
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

async function getBalance(address: string): Promise<void> {
  try {
    console.log(`\n📍 Fetching ETH balance for: ${address}`);
    const balance = await provider.getBalance(address);
    const formatted = ethers.formatEther(balance);
    console.log(`✅ Balance: ${balance} (${formatted} ETH)\n`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error occurred');
    }
  }
}

async function queryUSDC(): Promise<void> {
  try {
    if (!USDC_ADDRESS) {
      console.error('❌ USDC_ADDRESS not set in environment');
      return;
    }
    console.log(`\n💰 Querying USDC (${config.name}): ${USDC_ADDRESS}`);
    const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    
    const symbol: string = await contract.symbol();
    const decimals: number = await contract.decimals();
    const totalSupply: bigint = await contract.totalSupply();
    const formattedSupply = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Symbol: ${symbol}`);
    console.log(`✅ Decimals: ${decimals}`);
    console.log(`✅ Total Supply: ${formatNumber(formattedSupply)} ${symbol}\n`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error occurred');
    }
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
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error occurred');
    }
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
    
    if (envContent.includes('WALLET_ADDRESS=')) {
      envContent = envContent.replace(/WALLET_ADDRESS=.*/g, `WALLET_ADDRESS=${address}`);
    } else {
      envContent += `WALLET_ADDRESS=${address}\n`;
    }
    
    if (envContent.includes('PRIVATE_KEY=')) {
      envContent = envContent.replace(/PRIVATE_KEY=.*/g, `PRIVATE_KEY=${privateKey}`);
    } else {
      envContent += `PRIVATE_KEY=${privateKey}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log(`\n🔐 Wallet Created & Saved to .env`);
    console.log(`✅ Address:     ${address}`);
    console.log(`✅ Private Key: ${privateKey}`);
    console.log(`⚠️  Keep PRIVATE_KEY safe! Never share it.\n`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error occurred');
    }
  }
}

async function sendETH(toAddress: string, amount: string): Promise<void> {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ PRIVATE_KEY not set in environment');
      return;
    }

    const wallet = new ethers.Wallet(privateKey, provider);
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
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error occurred');
    }
  }
}

async function sendUSDC(toAddress: string, amount: string): Promise<void> {
  try {
    if (!USDC_ADDRESS) {
      console.error('❌ USDC_ADDRESS not set in environment');
      return;
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ PRIVATE_KEY not set in environment');
      return;
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

    console.log(`\n💸 Sending USDC...`);
    console.log(`📤 From: ${wallet.address}`);
    console.log(`📥 To: ${toAddress}`);
    console.log(`💰 Amount: ${amount} USDC`);

    const decimals: number = await contract.decimals();
    const amountWithDecimals = ethers.parseUnits(amount, decimals);

    const tx = await contract.transfer(toAddress, amountWithDecimals);

    console.log(`⏳ Transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    if (receipt) {
      console.log(`✅ Transaction confirmed!`);
      console.log(`✅ Block: ${receipt.blockNumber}`);
      console.log(`✅ Gas Used: ${receipt.gasUsed}\n`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error occurred');
    }
  }
}

// Displays wallet information: ETH and USDC balances, transaction count, and recent outgoing transactions
async function swap(amount: string, fromToken: string, toToken: string): Promise<void> {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ PRIVATE_KEY not set in environment');
      return;
    }

    if (!USDC_ADDRESS) {
      console.error('❌ USDC_ADDRESS not set in environment');
      return;
    }

    const fromLower = fromToken.toLowerCase();
    const toLower = toToken.toLowerCase();

    if ((fromLower !== 'eth' && fromLower !== 'usdc') || (toLower !== 'eth' && toLower !== 'usdc')) {
      console.error('❌ Unsupported token. Use "eth" or "usdc"');
      return;
    }

    if (fromLower === toLower) {
      console.error('❌ Cannot swap token to itself');
      return;
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const routerAddress = config.uniswapRouter;
    const wethAddress = config.wethAddress;

    console.log(`\n🔄 Swapping ${fromToken.toUpperCase()} for ${toToken.toUpperCase()} via Uniswap...`);
    console.log(`📤 From: ${wallet.address}`);
    console.log(`💰 Amount: ${amount} ${fromToken.toUpperCase()}`);
    console.log(`🔗 Network: ${config.name}\n`);

    const router = new ethers.Contract(routerAddress, UNISWAP_ROUTER_ABI, wallet);
    let tx;

    if (fromLower === 'eth' && toLower === 'usdc') {
      const amountInWei = ethers.parseEther(amount);
      const amountOutMinimum = ethers.parseUnits('1', 6);

      const path = ethers.solidityPacked(
        ['address', 'uint24', 'address'],
        [wethAddress, 3000, USDC_ADDRESS]
      );

      const params = {
        path,
        recipient: wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        amountIn: amountInWei,
        amountOutMinimum,
      };

      tx = await router.exactInputSingle(params, { value: amountInWei });
    } else if (fromLower === 'usdc' && toLower === 'eth') {
      const usdcDecimals = 6;
      const amountInWei = ethers.parseUnits(amount, usdcDecimals);
      const amountOutMinimum = ethers.parseEther('0.0001');

      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
      const approveTx = await usdcContract.approve(routerAddress, amountInWei);
      console.log(`⏳ Approval sent: ${approveTx.hash}`);
      const approveReceipt = await approveTx.wait();
      if (!approveReceipt) {
        console.error('❌ Approval failed');
        return;
      }

      const path = ethers.solidityPacked(
        ['address', 'uint24', 'address'],
        [USDC_ADDRESS, 3000, wethAddress]
      );

      const params = {
        path,
        recipient: wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        amountIn: amountInWei,
        amountOutMinimum,
      };

      tx = await router.exactInputSingle(params);
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
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error occurred');
    }
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
      const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const usdcBalance: bigint = await contract.balanceOf(address);
      const decimals: number = await contract.decimals();
      const formattedUSDC = ethers.formatUnits(usdcBalance, decimals);
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
        try {
          const blockNum = latestBlock.number - i;
          const progress = Math.round(((i + 1) / blocksToScan) * 100);
          process.stdout.write(`\r⏳ Progress: ${progress}% (${i + 1}/${blocksToScan} block)`);

          const block = await provider.getBlock(blockNum);
          
          if (!block || !block.transactions) continue;

          for (let txIdx = 0; txIdx < block.transactions.length; txIdx++) {
            const txHash = block.transactions[txIdx];
            const txProgress = Math.round(((txIdx + 1) / block.transactions.length) * 100);
            process.stdout.write(`\r⏳ Progress: ${progress}% (${i + 1}/${blocksToScan} block) - Transaction: ${txProgress}% (${txIdx + 1}/${block.transactions.length})`);

            try {
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
            } catch {
            }
          }
        } catch {
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
    } catch (scanError) {
      console.log(`\n⚠️  Transaction scanning unavailable (RPC provider limitation)\n`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error occurred');
    }
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const subcommand = process.argv[3];
  
  switch (command) {
    case 'balance': {
      const address = process.argv[3];
      if (!address) {
        console.error('❌ Please provide an address');
        return;
      }
      await getBalance(address);
      break;
    }
    
    case 'contract':
      if (subcommand === 'query') {
        const type = process.argv[4];
        switch (type) {
          case 'usdc':
            await queryUSDC();
            break;
          default:
            console.error('❌ Unknown contract type');
        }
      } else {
        console.error('❌ Usage: contract query <type>');
      }
      break;
    
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

        if (tokenType === 'eth') {
          await sendETH(toAddress, amount);
        } else if (tokenType === 'usdc') {
          await sendUSDC(toAddress, amount);
        } else {
          console.error('❌ Unknown token type. Use "eth" or "usdc"');
        }
      } else if (subcommand === 'trade') {
        const amount = process.argv[4];
        const fromToken = process.argv[5];
        const toToken = process.argv[6];

        if (!amount || !fromToken || !toToken) {
          console.error('❌ Usage: wallet trade <qty> <eth|usdc> <eth|usdc>');
          return;
        }
        await swap(amount, fromToken, toToken);
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
  balance <address>           - Get ETH balance
  contract query usdc         - Query USDC contract info
  block                       - Get latest block info
  wallet create               - Create & save persistent wallet
  wallet send eth <addr> <qty>   - Send ETH to address
  wallet send usdc <addr> <qty>  - Send USDC to address
  wallet trade <qty> <from> <to> - Swap tokens via Uniswap (e.g., trade 0.1 eth usdc)
  wallet info <address>       - Get wallet info & transaction history
  help                        - Show this message

Environment:
  NETWORK                   - Set to "mainnet", "sepolia", or "base"
  MAINNET_RPC_URL           - Mainnet RPC endpoint
  MAINNET_USDC_ADDRESS      - Mainnet USDC contract address
  SEPOLIA_RPC_URL           - Sepolia RPC endpoint
  SEPOLIA_USDC_ADDRESS      - Sepolia USDC contract address
  BASE_RPC_URL              - Base RPC endpoint
  BASE_USDC_ADDRESS         - Base USDC contract address
`);
      break;
    
    default:
      console.error(`❌ Unknown command: ${command}`);
  }
}

main().catch(console.error);
