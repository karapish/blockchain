#!/usr/bin/env node

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://1rpc.io/sepolia';
const provider = new ethers.JsonRpcProvider(RPC_URL);

const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];

function formatNumber(num) {
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

async function getBalance(address) {
  try {
    console.log(`\n📍 Fetching ETH balance for: ${address}`);
    const balance = await provider.getBalance(address);
    const formatted = ethers.formatEther(balance);
    console.log(`✅ Balance: ${formatted} ETH\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function queryUSDC() {
  try {
    console.log(`\n💰 Querying USDC (Sepolia): ${USDC_ADDRESS}`);
    const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const totalSupply = await contract.totalSupply();
    const formattedSupply = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Symbol: ${symbol}`);
    console.log(`✅ Decimals: ${decimals}`);
    console.log(`✅ Total Supply: ${formatNumber(formattedSupply)} ${symbol}\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getLatestBlock() {
  try {
    console.log(`\n📦 Fetching latest block...`);
    const block = await provider.getBlock('latest');
    console.log(`✅ Block Number: ${block.number}`);
    console.log(`✅ Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
    console.log(`✅ Gas Used: ${block.gasUsed}`);
    console.log(`✅ Miner: ${block.miner}\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help') {
    console.log(`
Ethereum Testnet CLI Tool
Usage:
  node cli.js balance <address>    - Get ETH balance
  node cli.js usdc                 - Query USDC contract info
  node cli.js block                - Get latest block info
  node cli.js help                 - Show this message
`);
    return;
  }

  if (command === 'balance') {
    const address = process.argv[3];
    if (!address) {
      console.error('❌ Please provide an address');
      return;
    }
    await getBalance(address);
  } else if (command === 'usdc') {
    await queryUSDC();
  } else if (command === 'block') {
    await getLatestBlock();
  } else {
    console.error(`❌ Unknown command: ${command}`);
  }
}

main().catch(console.error);
