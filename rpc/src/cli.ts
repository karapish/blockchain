#!/usr/bin/env node

import {ethers} from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {ERC20_ABI} from "./ERC20_ABI.js";

dotenv.config();
path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.RPC_URL;
const USDC_ADDRESS = process.env.USDC_ADDRESS;

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
    console.log(`✅ Balance: ${formatted} ETH\n`);
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
    console.log(`\n💰 Querying USDC (Sepolia): ${USDC_ADDRESS}`);
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
    
    case 'wallet':
      if (subcommand === 'create') {
        createWallet();
      } else {
        console.error('❌ Usage: wallet create');
      }
      break;
    
    case 'help':
    case undefined:
      console.log(`
Ethereum Testnet CLI Tool
Usage:
  balance <address>         - Get ETH balance
  contract query usdc       - Query USDC contract info
  block                     - Get latest block info
  wallet create             - Create & save persistent wallet
  help                      - Show this message
`);
      break;
    
    default:
      console.error(`❌ Unknown command: ${command}`);
  }
}

main().catch(console.error);
